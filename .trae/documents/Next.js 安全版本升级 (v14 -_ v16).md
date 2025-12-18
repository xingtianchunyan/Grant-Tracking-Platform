# Next.js 安全更新实施计划

根据用户提供的 Next.js 安全更新要求，我们需要将项目中的 `next` 版本从当前的 `14.2.16` 升级到指定的目标版本 `16.0.7`。这是一个跨主版本的升级（v14 -> v16），风险较高，需要严格按照流程执行。

## 1. 版本升级必要性确认
用户已明确指示进行安全更新，因此我们假定该版本存在必须修复的漏洞。当前版本 `14.2.16` 确实较旧，升级到 `16.0.7` 是合理的维护动作。

## 2. 升级实施步骤

我们将遵循标准的依赖更新流程：

1.  **修改 `package.json`**：将 `next` 依赖版本手动锁定为 `16.0.7`。
2.  **清理旧依赖**：删除 `node_modules` 目录和 `package-lock.json`（如果存在，或者直接运行 install 覆盖）。
    *   注意：由于项目使用 `npm`，我们需要关注 `package-lock.json`。
3.  **重新安装依赖**：运行 `npm install`。
4.  **React 版本兼容性检查**：Next.js 15+ 通常要求 React 19。当前 `package.json` 中是 `react: "^18"`。
    *   **关键风险点**：直接升级 Next.js 到 16 而不升级 React 可能会导致 peer dependency 警告甚至运行时错误。我们需要检查 Next.js 16 的官方要求。通常 Next.js 15 就已经推荐 React 19 RC 或更高。
    *   **策略**：我们将先尝试仅更新 Next.js，观察 `npm install` 的输出。如果提示 React 版本不兼容，我们将同步升级 React 和 React DOM 到 `^19.0.0`（或兼容版本）。

## 3. 升级后验证

1.  **构建验证**：运行 `npm run build`（虽然当前是 dev 环境，但构建能暴露大部分类型和配置错误）。
2.  **启动验证**：运行 `npm run dev:all`，确保 Web 服务、Discord Bot 和 Cron 任务都能正常启动。
3.  **功能抽查**：
    *   访问首页。
    *   检查 Discord Bot 是否依然在线（不受 Next.js 版本影响，但共享 node_modules）。

## 4. 兼容性处理

*   `lucide-react`, `radix-ui` 等 UI 库通常兼容性较好。
*   `server-only` 包可能需要更新。

## 实施操作

1.  修改 `package.json`。
2.  执行 `npm install`。
3.  如果遇到 React 版本冲突，更新 React 相关依赖。
4.  重启服务验证。

**注意**：由于这是一个较大的升级，我们应当先停止当前运行的服务。
