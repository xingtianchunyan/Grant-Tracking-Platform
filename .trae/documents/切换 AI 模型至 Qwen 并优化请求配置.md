# 修复 AI 提取失败 (AI extraction failed) 计划

用户反馈 `AI extraction failed` 错误依然存在，并明确指出确认 API Key 无误，要求切换模型为 **Qwen** (`Qwen/Qwen3-Embedding-0.6B`)。
这表明：

1. 虽然我们添加了代理配置，但可能仍然无法连接 SiliconFlow API (如超时)。
2. 或者 SiliconFlow 的 `deepseek-ai/DeepSeek-V3` 模型暂时不可用/报错。
3. 用户明确要求使用 `Qwen` 模型。

## 1. 根本原因推测

* **模型名称问题**：SiliconFlow 上 DeepSeek V3 的模型 ID 可能是 `deepseek-ai/DeepSeek-V3`，但也可能需要检查是否正确。

* **网络问题**：即使加了代理，如果代理本身不稳定，也会失败。

* **API 错误**：如果 Key 有效但返回 4xx/5xx，可能是模型权限或余额问题。

但既然用户指定了 "用Key调用Qwen3AI" (推测是指 SiliconFlow 上的 Qwen 系列，通常是 `Qwen/Qwen3-Embedding-0.6B` 或类似)，我们将遵照指示更改模型。

## 2. 修复方案

### A. 切换模型

将 `app/api/ai/extract-project-info/route.ts` 中的模型 ID 从 `deepseek-ai/DeepSeek-V3` 更改为 `Qwen/Qwen3-Embedding-0.6B` (这是 SiliconFlow 上目前最适合处理文本重排列的 Qwen 模型之一)。

使用模型 `Qwen/Qwen3-Embedding-0.6B` 的链接为：`https://cloud.siliconflow.cn/models?target=Qwen/Qwen3-Embedding-0.6B`

### B. 增加超时设置

`fetch` 默认没有超时，或者超时很长。为了避免前端无限等待，我们可以设置一个合理的 `signal` 或检查是否因为超时导致的问题。

### C. 确保代理生效

再次确认 `lib/proxy.ts` 是否正确导出了设置。
(注意：在 Next.js Edge Runtime 或某些 Serverless 环境中，直接修改 `global.fetch` 可能无效，但在 Node.js Runtime (默认) 中通常有效)。

## 3. 执行步骤

1. **修改 API 代码**：更新 `app/api/ai/extract-project-info/route.ts`，将模型切换为 `Qwen/Qwen3-Embedding-0.6B`。
2. **验证**：重启应用，再次尝试。

我将立即执行模型切换。
