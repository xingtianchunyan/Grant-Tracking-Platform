# 解决 GitHub 更新问题和控制台报错

## 问题分析

### 1. GitHub 更新问题 ("Failed to load updates")
根据用户反馈和代码分析，`test1` 项目的 GitHub 更新信息未正确读取。这通常是因为 `risk-scan` 任务在检查 GitHub API 时失败了。

在 `app/api/cron/risk-scan/route.ts` 中：
*   代码使用了 `fetch(url, { headers, cache: "no-store" })` 来请求 GitHub API。
*   如果 `config.githubToken` 为空，请求将不带 Token，这很容易触发 GitHub 的 API 速率限制（每小时 60 次）。
*   错误日志显示 `commits_check_failed:404` 或其他 4xx/5xx 错误，这表明请求被拒绝或仓库不存在。
*   当前逻辑中，如果 GitHub API 检查失败，它会返回 `repo_check: "error"`，并且**不会**尝试插入任何活动日志（即使可能有部分数据）。
*   **关键点**：目前的逻辑**只检查** GitHub 活动用于风险评估，**并没有**一个专门的 "Sync GitHub Updates" 功能来把 GitHub 的所有历史 Commit/PR 同步到 `activity_logs` 表中。现有的 `checkGithubActivity` 只是为了看"最近30天有没有动静"，而且只在动静存在时才顺便插入**最新的一条** Commit/PR。这意味着如果用户想要看到 GitHub 的历史更新列表，目前的功能是做不到的。

我们需要增强 GitHub 同步逻辑：
1.  确保 `config.githubToken` 被正确读取。
2.  优化 `checkGithubActivity`，使其不仅用于风险检查，还能更可靠地抓取最近的活动并存入数据库（不仅仅是最新的一条）。

### 2. 控制台报错 (`net::ERR_ABORTED`)
这些错误（如 `http://localhost:3001/?_rsc=r3yhw`）通常是 Next.js 的 RSC (React Server Component) Payload 请求失败。
*   **原因**: 前端组件（如 `RecentUpdates` 或 `ProjectCard`）发起数据请求时，后端 API（如 `/api/projects` 或 `/api/recent-updates`）崩溃了。
*   **根源**: 我们之前修复了 `recent-updates` 的嵌套 SQL 问题，但可能还有其他 API 路由存在类似问题，或者 `risk-scan` 路由本身在被前端调用时出错。
*   **关联**: 用户提到的 `5 条日志` 很可能就是指这些 RSC 请求失败的日志。

## 实施计划

### 任务 1: 修复 GitHub 数据同步 (优先级高)
我们将修改 `app/api/cron/risk-scan/route.ts`，使其不仅用于风险扫描，还能作为数据同步器。

1.  **验证 Token**: 在日志中输出是否检测到 `GITHUB_TOKEN`（注意脱敏）。
2.  **增强同步逻辑**:
    *   遍历项目时，如果发现是有效的 GitHub 仓库，尝试获取最近的 5-10 条 Commits 和 PRs。
    *   将这些活动与数据库中已有的 `activity_logs` 进行比对（通过 URL 或 SHA 去重）。
    *   插入缺失的记录。
3.  **错误处理**: 优化 GitHub API 请求的错误捕获，区分 "Rate Limit"、"Not Found" 和 "Network Error"。

### 任务 2: 消除控制台报错
我们将检查并加固前端调用的主要 API：
1.  `app/api/projects/route.ts`: 检查是否有嵌套 SQL。
2.  `app/api/projects/[id]/activity/route.ts`: 检查是否有嵌套 SQL。
3.  `app/api/recent-updates/route.ts`: 再次确认修复是否生效（之前已修复）。

### 任务 3: 收集与验证
1.  运行 `npm run dev:all`。
2.  手动触发一次风险扫描：`POST /api/cron/risk-scan`。
3.  观察控制台输出，确认 GitHub 同步成功。
4.  刷新前端页面，确认报错消失且数据展示正确。

---
**注意**: 由于用户特别强调要从“真实环境”获取数据，我们将确保代码直接调用 `api.github.com`，而不是使用 mock 数据。当前的实现已经是调用真实 API，但可能因为 Token 缺失或逻辑缺陷导致看起来像没数据。
