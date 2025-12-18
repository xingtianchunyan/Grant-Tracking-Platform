# Discord 斜杠指令故障排查计划

根据用户反馈“斜杠指令没有成功”以及之前的日志分析，我们面临以下情况：
1.  **连接超时**：之前的日志显示 `ConnectTimeoutError`，这意味着 `discord-commander.ts` 无法连接到 Discord API 网关。这通常是网络问题。
2.  **指令注册**：如果连接失败，斜杠指令可能根本没有注册到 Discord 服务器上，或者注册过程超时。
3.  **交互失败**：即使用户能在 Discord 客户端看到指令，如果 Bot 离线或无法响应 webhook/gateway 事件，指令也会失败。

鉴于这是本地开发环境 (`localhost`)，且日志明确指出了网络超时，最可能的原因是**本地网络无法稳定访问 Discord API**。

但是，我们作为开发人员，需要确保代码逻辑本身是健壮的，并排除其他可能性（如 Token 错误、权限问题或后端 API 错误）。

## 故障排查步骤

### 1. 验证 Discord Bot 运行状态
*   **动作**：重新启动 `discord-commander.ts`（包含在 `npm run dev:all` 中），并密切观察控制台输出。
*   **目标**：寻找 `✅ Slash commands registered for guild.` 和 `🤖 Logged in as ...` 的成功日志。如果再次出现 `ConnectTimeoutError`，则确认是网络问题。

### 2. 模拟网络环境或重试
*   **动作**：如果确实是网络问题，建议用户检查代理设置。在代码层面，我们可以增加重试逻辑，让 Bot 在启动失败时自动重试，而不是直接退出。

### 3. 检查后端 API 依赖
*   **动作**：Discord Bot 依赖 `/api/discord/assigned-projects` 接口。我们需要验证这个接口是否工作正常。
*   **验证**：虽然这不影响 Bot 启动，但影响指令执行。如果 Bot 能启动但指令报错“No projects assigned”，则需要检查数据库中是否有项目分配给了测试用户的 Discord ID。

### 4. 增强 `discord-commander.ts` 的健壮性
*   **问题**：当前代码在启动失败时直接退出（`process.exit(1)` 的行为，虽然代码里没显式写，但未捕获的 Promise 异常会导致 Node 进程退出）。
*   **方案**：
    *   在 `registerCommands` 和 `client.login` 周围添加 `try-catch` 和重试循环。
    *   这样即使网络暂时抖动，Bot 也能尝试重新连接。

## 实施方案

我们将重点放在**增强 Bot 启动的稳定性**上，因为这是目前最明显的错误来源。

1.  **修改 `scripts/discord-commander.ts`**：
    *   封装启动逻辑到 `startBot()` 函数中。
    *   添加重试机制：如果 `registerCommands` 或 `client.login` 失败，等待 5 秒后重试，最多重试 5 次。
    *   捕获全局未处理异常，防止进程直接崩溃。

2.  **验证**：
    *   重启服务，观察日志是否在重试后成功连接。

这是一个针对“连接不稳定”环境的防御性编程改进。
