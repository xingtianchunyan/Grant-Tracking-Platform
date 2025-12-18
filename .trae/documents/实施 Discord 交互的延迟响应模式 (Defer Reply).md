# Discord "该应用程序未响应" 故障排查与修复

用户在 Discord 中输入指令后收到 "该应用程序未响应" (The application did not respond) 错误。这是一个经典的 Discord Bot 错误，通常意味着 Bot 收到了交互请求，但未在规定的 3 秒窗口内做出响应（或 `deferReply`）。

尽管我们之前添加了连接重试逻辑，但这主要解决了 Bot **启动** 时的连接问题。现在的错误发生在 **交互** 阶段。

## 根本原因分析

1.  **3秒超时限制**：Discord 要求 Bot 在收到交互后的 3 秒内必须回复（`reply`）或延迟回复（`deferReply`）。如果后端处理（如查询数据库、调用 API）耗时超过 3 秒且未 defer，Discord 就会显示“未响应”。
2.  **网络延迟**：在本地开发环境中，Bot 连接 Discord Gateway 的延迟可能较高，加上本地数据库查询，很容易超出 3 秒。
3.  **错误处理缺失**：如果 `getAssignedProjects` 或其他 API 调用抛出异常，且未被 `try-catch` 正确捕获并回复 Discord，用户也会看到“未响应”。

## 解决方案

我们将模拟专业开发团队的流程，重点改进前端（Bot 交互逻辑）和后端（API 响应）。

### 1. 前端开发者（Bot 逻辑）改进
*   **立即 Defer**：对于所有需要查询数据库或调用 API 的指令（`progress-update`, `milestone-status`），在执行任何耗时操作前，**第一时间**调用 `interaction.deferReply({ ephemeral: true })`。
*   **使用 editReply**：defer 后，后续的响应必须使用 `interaction.editReply` 而不是 `reply`。
*   **优化错误捕获**：确保所有路径（包括异步 fetch）的错误都能被捕获，并尝试发送一个用户友好的错误消息（即使已经超时，也可以尝试 editReply）。

### 2. 后端开发者（API）排查
*   检查 `/api/discord/assigned-projects` 的性能。虽然目前只是简单的 SQL 查询，但在大量数据下可能会慢。不过对于当前规模，主要瓶颈还在网络。

### 3. DevOps/基础设施
*   确认本地网络环境稳定。

## 实施计划

我们将修改 `scripts/discord-commander.ts`，对所有交互进行“先 defer，后处理”的改造。

**具体修改点**：
1.  **`/progress-update` 指令**：
    *   收到指令 -> `await interaction.deferReply({ ephemeral: true })`
    *   `await getAssignedProjects(...)`
    *   构建 UI -> `await interaction.editReply(...)`
    *   **注意**：`editReply` 不支持直接发送 Modal（模态框）。**这是一个关键的技术限制**。
    *   **修正**：Discord API 规定，Modal **必须** 是对交互的直接响应（不能 defer 后再 showModal）。
    *   **矛盾**：如果 `getAssignedProjects` 慢于 3 秒，我们就无法显示 Modal 了。
    *   **新策略**：
        *   对于 `Select Menu`（选择项目）：可以 defer。
        *   对于 `Command` -> `Modal`：不能 defer。但我们的流程是 `Command` -> `Select Menu` -> `Modal`。
        *   第一步 `Command` -> `Select Menu`：我们需要获取项目列表。如果这个 fetch 慢，就会超时。我们可以 defer 这一步。
        *   第二步 `Select Menu` -> `Modal`：这一步是用户选了项目，我们直接显示 Modal。这一步不需要 fetch，应该很快，所以不需要 defer（也无法 defer）。

**最终方案**：
1.  在处理 `/progress-update` 和 `/milestone-status` 指令时，先 `deferReply`。
2.  获取项目列表。
3.  使用 `editReply` 发送下拉菜单。
4.  用户选择下拉菜单后，Bot 收到 `StringSelectMenu` 交互。
5.  此时我们需要显示 Modal。**关键点**：`showModal` 必须是交互的第一个响应。
    *   我们不能在 Select Menu 的处理中 fetch 数据然后 showModal（如果 fetch 慢）。
    *   幸好，我们在 Select Menu 的处理中只需要构建 Modal，不需要 fetch 远程数据（项目 ID 已经在 value 里了）。所以这一步通常很快，不会超时。

**待修复的代码逻辑**：
目前代码中：
```typescript
if (interaction.commandName === "progress-update") {
    // 这里直接 fetch，没有 defer
    const projects = await getAssignedProjects(discordId); 
    // ...
    await interaction.reply(...)
}
```
如果 `getAssignedProjects` 超过 3 秒，就挂了。

**修改为**：
```typescript
if (interaction.commandName === "progress-update") {
    await interaction.deferReply({ ephemeral: true }); // 立即 defer
    try {
        const projects = await getAssignedProjects(discordId);
        // ...
        await interaction.editReply(...) // 改用 editReply
    } catch (e) {
        await interaction.editReply(...)
    }
}
```

同理，应用于 `milestone-status`。

对于 `ModalSubmit` 和 `StringSelectMenu` (status update)，它们涉及后端写操作，更应该 defer。
目前代码：
*   `ModalSubmit`: `await interaction.deferReply({ ephemeral: true });` (已经有了！很好)
*   `StringSelectMenu` (set_status): `await interaction.update(...)`。这会更新消息。如果后续 `patchJson` 慢，可能会超时？
    *   `interaction.update` 本身就是一种响应，它重置了 3 秒计时器吗？不，它只是更新了 UI。如果后续还有操作，最好是先 update UI 说“处理中...”，然后再发结果。
    *   代码里：
        ```typescript
        await interaction.update({ content: "Updating milestone…", components: [] });
        await patchJson(...)
        await interaction.followUp(...)
        ```
        这样是正确的，因为 `update` 已经算是响应了交互。

**结论**：主要问题出在**初始指令处理**（获取项目列表）没有 defer。我们将修复这一点。
