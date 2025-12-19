# 修复 AI 提取失败 (AI extraction failed) 计划

用户反馈在解决前一个问题后，遇到了新的报错 `AI extraction failed`。
错误发生位置在 `app/admin/projects/new/page.tsx:66`，即 `if (!aiRes.ok)` 检查失败。
这意味着 `POST /api/ai/extract-project-info` 返回了非 200 状态码。

## 1. 根本原因分析
查看 `app/api/ai/extract-project-info/route.ts`，可能的失败点：
1.  **缺少 Content**: 请求体为空（不太可能，因为上一步已经获取到 content）。
2.  **API Key 问题**: 虽然 `.env` 中配置了 `SILICONFLOW_API_KEY`，但如果 Key 无效或过期，或者 `config.ts` 未正确加载，代码会尝试调用 SiliconFlow API。
3.  **API 调用失败 (500)**:
    *   **代理问题**: 本地环境配置了 `HTTPS_PROXY`，但 Next.js 的 `fetch` 默认不走 Node.js 进程环境变量中的代理（除非使用了 `undici` 或特定配置）。如果 SiliconFlow 的 API 在国内无法直连，或者被墙，请求会超时或失败。
    *   **SiliconFlow 响应错误**: API Key 额度不足，或者模型名称错误。代码中使用的是 `deepseek-ai/DeepSeek-V3`。
    *   **JSON 解析错误**: 如果 AI 返回的不是合法 JSON，代码会捕获异常并返回 fallback (200 OK)，所以这**不会**导致 `!response.ok`。

**最可能的疑点：网络/代理问题**
用户的 `.env` 配置了 `HTTPS_PROXY="http://127.0.0.1:7078"`。
但是，Next.js App Router 的 `fetch` 在服务端运行时，**不会自动使用**这些环境变量作为代理。
在之前的步骤中，我们为 Discord Bot 配置了 `GLOBAL_AGENT`，但 Next.js 的 API Route 是独立的进程/环境。

## 2. 修复方案

### A. 配置 fetch 代理
在 `app/api/ai/extract-project-info/route.ts` 中，我们需要确保对 SiliconFlow 的请求走代理（如果需要）。
或者，更简单地，使用 `global-agent` 或 `https-proxy-agent` 来为 `fetch` 添加 agent。
鉴于 Next.js 环境的复杂性，显式地为 `fetch` 添加 `dispatcher` (对于 undici/Next.js 15+) 或 `agent` (旧版 node-fetch) 是最稳妥的。
但 Next.js 的 `fetch` 是基于 Web Standards 的。

**替代方案**：使用 `lib/proxy.ts` 中已经配置好的 `Global Proxy` 逻辑？
我们在 `scripts/discord-commander.ts` 中用了 `lib/proxy.ts`，但在 Next.js 的 server runtime 中，我们没有全局引入它。
我们可以在 `route.ts` 顶部引入 `import "@/lib/proxy"` 来尝试激活全局代理。

### B. 增强错误日志
目前 API 返回 500 时只说了 "Failed to extract info"。我们需要在 `NextResponse` 中返回具体的错误信息（如 `error: error.message`），以便前端或控制台能看到是 "Connect Timeout" 还是 "Unauthorized"。

### C. 验证 SiliconFlow 模型
确认 `deepseek-ai/DeepSeek-V3` 是 SiliconFlow 上的有效模型 ID。如果是免费版 Key，可能需要使用特定模型。

## 3. 执行步骤
1.  **修改 API 路由**：在 `app/api/ai/extract-project-info/route.ts` 中：
    *   引入 `import "@/lib/proxy"` (尝试全局代理)。
    *   或者，显式地配置 `fetch` 的 `agent` (如果 Next.js 允许)。
    *   **更稳妥的做法**：在 `fetch` 调用外层 `try/catch` 中，打印更详细的 `error` 对象。并且在返回 500 时，把 `error.message` 带回去。

2.  **验证**：重启应用，再次尝试。

考虑到 Next.js 自身对 `fetch` 的封装，直接修改 `route.ts` 增加错误详情是最快定位网络问题的手段。同时，我会尝试在文件头部引入代理配置。
