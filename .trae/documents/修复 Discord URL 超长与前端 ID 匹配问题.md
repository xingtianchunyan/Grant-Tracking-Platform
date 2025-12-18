# 系统修复与优化计划

针对你提出的两个问题（前端数据获取失败、Discord指令URL超长报错），我制定了以下修复计划。

## 1. 修复 Discord "Invalid Form Body" 错误

### 问题原因
你提供的 Discord 消息链接 (`https://discord.com/channels/...`) 包含了 `1450472041852567685` 这样的 ID，这可能是一个有效的消息 ID。
但是，报错 `components[0].components[0].url[BASE_TYPE_MAX_LENGTH]: Must be 512 or fewer in length` 表明我们生成的 "Open Creation Page" 按钮的 URL 超过了 Discord 允许的 512 字符限制。
这通常是因为我们把 **整个消息内容** (`content`) 都直接放到了 URL 参数 (`?content=...`) 中。如果消息内容很长，URL 就会非常长。

### 修复方案
我们不能将整个消息内容放在 Button 的 URL 中。
1.  **修改策略**：不直接传递 `content`，而是只传递 `messageId`、`channelId` 等引用信息，或者对内容进行大幅截断（例如截取前 200 字符）。
2.  **更优解（推荐）**：
    *   在 Discord Bot 端（`create-project.ts`），我们已经获取到了 `content`。
    *   我们将其截断（比如只保留前 400 字符作为预览），或者如果内容真的很长，我们应该考虑只传递 ID，让前端页面（如果可能）或 Bot 自身通过某种方式（如缓存）传递数据。
    *   **本次实施**：将 `create-project.ts` 中的 `safeContent` 截断长度限制在 **300字符** 以内，以确保加上 Base URL 后不超过 512 字符。

## 2. 修复前端 "Failed to fetch data" 与数据不一致

### 问题原因
虽然我们重建了数据库并运行了 `db:setup`，但你提到 "点击具体项目卡片进入项目详情页面仍然显示 Error"。
这通常是因为：
1.  **ID 不匹配**：前端页面可能缓存了旧的项目 ID（例如 ID=9），但新初始化的数据库中项目 ID 是从 1 开始的（ID=1, 2, 3, 4）。
2.  **前端缓存**：Next.js 的 Router Cache 或 Data Cache 可能保留了旧的链接列表。
3.  **日志确认**：`net::ERR_ABORTED` 表示请求被中断，可能是服务端直接抛错或连接重置。

### 修复方案
1.  **验证数据**：检查 `02-seed-data.sql` 确认初始化的项目 ID（目前是 1, 2, 3, 4）。
2.  **前端调整**：
    *   进入首页，**强制刷新**（Ctrl+F5）以获取最新的项目列表（包含正确的 ID）。
    *   如果直接访问 `http://localhost:3001/individual-project?id=9` 肯定会报错，因为新库里没有 ID=9 的项目。请尝试访问 `http://localhost:3001/individual-project?id=1`。
3.  **代码防御**：在 `app/api/projects/[id]/route.ts` 中，`GET` 方法已经处理了 `!project` 返回 404 的情况，但我们应该确保前端能优雅处理 404 而不是直接崩坏。

## 3. 执行步骤

1.  **修改 Discord 指令 (`lib/discord/commands/create-project.ts`)**：
    *   将 `content.slice(0, 1500)` 修改为 `content.slice(0, 200)` 或更短，确保 URL 不超长。
    *   或者，改为 POST 临时存储模式（但在无 Redis 情况下较复杂），目前先采用截断策略。

2.  **前端验证**：
    *   在执行完上述修改后，重启 `npm run dev:all`。
    *   打开浏览器，访问首页，点击列表中的第一个项目（ID 应为 1），确认详情页能否打开。

3.  **额外优化**：
    *   检查 `app/api/projects/[id]/route.ts`，确认 SQL 查询逻辑无误。

准备开始执行代码修改。
