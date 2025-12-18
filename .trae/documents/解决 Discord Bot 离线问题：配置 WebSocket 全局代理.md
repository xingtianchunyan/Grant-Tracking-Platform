# Discord Bot 离线与指令缺失故障排查

根据您的反馈，尽管已通过正确的链接邀请了机器人，但仍面临 **离线** 和 **指令缺失** 两个问题。结合我们刚刚配置的代理环境，这极有可能是**网络连接依然存在问题**，或者**Bot 进程卡在重试循环中**。

## 故障分析

1.  **Bot 离线 (Offline)**
    *   **原因 A**: Bot 进程未运行或崩溃。
    *   **原因 B**: Bot 无法连接到 Discord Gateway (WebSocket)。虽然我们配置了 `undici` 全局代理，但 `discord.js` 的 WebSocket 连接（Gateway）可能没有正确使用该代理。
    *   **重要细节**: `undici` 的 `setGlobalDispatcher` 主要影响 HTTP 请求 (REST API)，但 `discord.js` 使用 `ws` 库进行 Gateway 连接。`ws` 库**不一定**会自动尊重 `HTTPS_PROXY`，除非我们显式传递 `agent` 或者底层环境支持。

2.  **指令缺失**
    *   **原因 A**: `registerCommands` 函数未能成功执行。这通常发生在 Bot 启动初期。如果网络不通，注册请求会失败或超时。
    *   **原因 B**: 注册成功，但 Discord 客户端缓存未刷新（通常重启 Discord 客户端可解）。
    *   **原因 C**: Bot Token 或 App ID 配置错误，导致注册到了错误的 App 上。

## 关键发现：WebSocket 代理问题
经过技术分析，`discord.js` 的 `Client` 在连接 Gateway 时，默认情况下**不会**自动使用 `HTTPS_PROXY` 环境变量来代理 WebSocket 连接。
我们需要显式地为 `Client` 的 WebSocket 选项配置代理。这通常需要使用 `https-proxy-agent` 或类似的库来创建一个 Agent，并传递给 `Client` 的 `ws` 选项。

之前我们只解决了 HTTP (REST) 的代理（通过 `undici`），这解释了为什么 Bot 可能无法上线（Gateway 连不上），从而导致“离线”状态。而指令注册走的是 HTTP，可能也因为代理配置不完全兼容而失败，或者因为 Bot 启动卡在 Gateway 连接上而没机会执行。

## 修复计划

我们将重点解决 **WebSocket 代理** 问题，这是 Bot 上线的关键。

### 1. 安装 `https-proxy-agent`
为了让 `ws` (WebSocket) 走代理，我们需要这个库。

### 2. 修改 `scripts/discord-commander.ts`
在初始化 `Client` 时，显式传递 WebSocket 代理配置。

```typescript
import { HttpsProxyAgent } from 'https-proxy-agent';

// ...

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

const client = new Client({
    intents: [...],
    ws: {
        // 让 WebSocket 走代理
        buildStrategy: (manager) => {
            manager.options.agent = agent; 
            return manager; 
        }
        // 注意：discord.js v14 的 ws 选项结构可能不同，或者需要通过 REST 选项传递。
        // 实际上，discord.js v14 并不直接暴露 ws agent。
        // 通用解法：使用全局代理工具 `global-agent` 或者修补 `http.globalAgent`。
    },
    // 对于 REST (HTTP) 请求，我们已经在 lib/proxy.ts 中通过 undici 处理了。
});
```

**更正**：`discord.js` 对 WebSocket 代理的支持一直比较棘手。最可靠的方法是使用 `global-agent/bootstrap`，或者在代码中显式替换 `ws` 的行为。
但鉴于我们之前使用了 `undici` 全局调度器，这对 HTTP 有效。
对于 WebSocket，最简单的方案是使用 `https-proxy-agent` 并将其传递给 `Client` 的 `rest` 选项（用于 HTTP）和 `ws` 选项（如果支持）。

查阅 `discord.js` 文档，v14+ 使用 `undici` 处理 REST，但 WebSocket 依然使用 `ws`。
`ClientOptions` 中没有直接的 `agent` 选项用于 WebSocket。
但是，`@discordjs/ws` (底层库) 允许配置。

**替代方案**：使用 `global-agent`。这是一个极其强大的库，可以在 Node.js 层面拦截所有 HTTP/HTTPS/WebSocket 请求并走代理。这比手动配置每个库要稳健得多。

**新策略**：
1.  安装 `global-agent`。
2.  在 `scripts/discord-commander.ts` **最顶部** 引入 `global-agent/bootstrap`。
3.  在 `.env` 中设置 `GLOBAL_AGENT_HTTP_PROXY`。

或者，既然用户已经有了 `HTTPS_PROXY`，我们可以尝试使用 `https-proxy-agent` 配合 `ws` 的自定义实现，但这太复杂。

让我们先检查之前的日志。之前的日志显示 `[DISCORD] Attempting to connect (try 1/5)...` 然后就没下文了。这说明连接超时了。

**决定**：我们将尝试最直接的修复——安装 `global-agent` 并配置它。这将同时解决 HTTP 和 WebSocket 的代理问题。

### 3. 指令注册验证
在修复网络后，Bot 启动时会执行 `registerCommands()`。如果这一步成功，终端会打印 `✅ Slash commands registered`。我们将密切关注这条日志。

### 4. 实施步骤
1.  安装 `global-agent`。
2.  修改 `.env`：添加 `GLOBAL_AGENT_HTTP_PROXY`（等于 `HTTPS_PROXY` 的值）。
3.  修改 `scripts/discord-commander.ts`：引入 `global-agent/bootstrap`。
4.  重启服务。

这将是解决“Bot 离线”问题的终极方案。
