# 修复 "Failed to fetch message content" 错误计划

用户反馈在自动填充项目表单时，前端控制台报错 `Failed to fetch message content`。
经过代码分析，问题出在前端 `fetch` 请求后端 API `/api/discord/temp-message/[id]` 时返回了非 200 状态码（导致 `msgRes.ok` 为 false）。

## 1. 根本原因分析
根据 `app/api/discord/temp-message/[id]/route.ts` 的逻辑，API 可能返回 404 或 500。
*   **404 (Not Found)**: 可能是 `tempId` 无效，或者数据库中的消息已过期。但考虑到是刚创建的流程，最可能的原因是**数据库表结构未正确更新**，导致插入失败（虽然 POST 返回了 ID，但可能实际上没存进去或查询逻辑有误？），或者查询时 SQL 语句有问题。
*   **500 (Server Error)**: 可能是数据库查询执行出错。
*   **其他原因**: 数据库连接问题。

但更细致地检查 `app/api/discord/temp-message/[id]/route.ts` 的代码：
```typescript
const [row] = await sql`...`
```
如果 `sql` 模板标签函数返回的不是数组，而是直接的结果对象（取决于 `postgres` 库的版本和配置），解构赋值 `[row]` 可能会出错，或者 `row` 本身为空。

**关键疑点**：之前的数据库迁移脚本 `scripts/03-create-temp-messages.sql` 是否真的被成功执行了？
虽然我之前运行了 `run-sql.ts`，但如果表没创建成功，`POST` 请求会失败（返回 500），导致前端拿不到 ID；或者 `POST` 成功了但 `GET` 失败。
由于前端已经拿到了 `tempId`（否则不会进入 fetch 逻辑），说明 `POST` 请求是成功的，并且返回了一个 ID。
那么问题大概率出在 `GET` 请求上。

**GET 请求逻辑检查**：
```typescript
const [row] = await sql`
  SELECT content, metadata 
  FROM temp_messages 
  WHERE id = ${id} AND expires_at > NOW()
`
```
这里使用了 UUID 类型。如果传入的 `id` 格式不对，Postgres 会抛错。

**另一个可能性**：`params` 的异步访问问题。
在 Next.js 15+ (及部分 14 版本) 中，`params` 是一个 Promise，需要 `await params`。
虽然用户使用的是 Next.js 16.0.7，但 `route.ts` 中写的是：
```typescript
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id // 直接访问
```
在 Next.js App Router 的某些配置下，这可能没问题，但在较新版本中，建议将其视为 Promise。不过，通常如果必须 await，TypeScript 或运行时会有提示。
**纠正**：Next.js 15 breaking change 确实提到 `params` 现在是异步的。如果代码没 await，可能拿不到 id。
参考：Next.js 15 文档 "Async Request APIs (Breaking Change)"。
`params` 应该被 await： `const { id } = await params;`

## 2. 修复方案

### A. 修复 Next.js `params` 访问 (最可能的根本原因)
将 `app/api/discord/temp-message/[id]/route.ts` 中的 `params` 访问改为异步。

### B. 增加详细日志
在 `GET` 路由中增加 `console.log`，打印接收到的 `id` 和查询结果，以便排查数据库层面的问题。

### C. 验证数据库表
为了保险，重新运行一次建表脚本（它是 `CREATE TABLE IF NOT EXISTS`，所以是安全的）。

## 3. 执行步骤
1.  **修改 API 代码**：更新 `app/api/discord/temp-message/[id]/route.ts`，正确处理 `params` Promise，并添加调试日志。
2.  **验证**：重启应用，再次尝试流程。

我将优先修复 `params` 的异步访问问题，这是 Next.js 新版本最常见的陷阱。
