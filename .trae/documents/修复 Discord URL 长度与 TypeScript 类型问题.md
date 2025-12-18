# 系统修复计划：解决 Discord URL 超长与 TypeScript 类型错误

针对你反馈的 `Invalid Form Body` (URL 仍超长) 和 Linter 报错问题，分析如下：

## 1. Discord URL 超长问题 (BASE\_TYPE\_MAX\_LENGTH)

虽然我们之前将 `content` 截断到了 300 字符，但报错 `Must be 512 or fewer` 依然存在。这说明 `backendUrl` + 查询参数的总长度依然超过了 512 字符。

* **原因**：`discordConfig.backendUrl` 如果未在 `.env` 中正确配置（例如默认为空或很长），或者 `encodeURIComponent` 后的中文字符占用字节较多（一个中文转义后占 9 个字符），导致 300 字符的截断仍然不够。

* **解决方案**：**只传递 ID**。修改前端页面，使其能够通过 `messageId` 回调 Discord Bot 的 API 来获取完整内容。但考虑到目前没有公开的 API 供前端回调，我们采取 **最安全的截断策略**：只保留前 **100** 个字符，并打印出生成的 URL 长度进行调试。

## 2. TypeScript 类型错误修复

Linter 报告了两个主要错误：

### A. `create-project.ts` 中的类型不匹配

* **错误 1**：`channel.messages.fetch(messageId)` 中 `messageId` 可能是 `string | undefined`，但 `fetch` 期望 `string`。

  * **修复**：在调用前断言 `messageId` 存在（正则匹配已确保它是 string，但 TS 不知道）。

* **错误 2**：`channel` 类型可能是 `undefined` 或者不是 `TextBasedChannel`。

  * **修复**：加强类型守卫，明确 `channel` 是 `TextChannel` 或 `ThreadChannel`。

### B. `page.tsx` 中的潜在未定义对象

* **错误**：`Line 65` 附近的正则匹配结果 `line.split(':')[1]` 可能是未定义的。

  * **修复**：添加非空检查 `if (parts.length > 1) ...`。

## 3. 执行步骤

1. **修复** **`create-project.ts`**：

   * 将 URL 内容截断长度改为 **100**。

   * 修复 `channel.messages.fetch` 的类型错误。

   * 添加 `console.log` 打印最终 URL 长度，以便排查。

2. **修复** **`page.tsx`**：

   * 增加对 `split` 结果的安全检查。

3. **重启验证**：

   * 重启 `npm run dev:all`。

   * 再次测试 Discord 指令。

我将立即开始代码修复。
