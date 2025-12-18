# 解决剩余的控制台错误和优化活动显示

您提到的“仍然能看到多条信息”可能指的是前端展示了过多的 GitHub 活动记录，尽管我们之前在后端 `risk-scan` 中限制了**单次同步**的数量，但数据库中可能已经积累了大量的历史记录。同时，控制台依然有报错。

## 1. 控制台报错 (`net::ERR_ABORTED`)

报错 `http://localhost:3001/individual-project?id=5&_rsc=1wtp7` 表明在加载项目详情页时，Next.js 的 React Server Component (RSC) 渲染过程崩溃或被中断。

经过之前的排查，`recent-updates` 和 `projects` 的 API 已经修复了嵌套 SQL 问题。如果错误依旧，可能是前端组件在数据加载或渲染时触发了异常，或者是某个 API 返回的数据格式不符合预期导致 RSC 序列化失败。

根据日志堆栈，错误发生在 `navigate` -> `startTransition` 之后，这通常意味着客户端导航时，服务端返回的 payload 有问题。

**排查方向**：
*   **`app/api/recent-updates/route.ts`**：
    *   我注意到 `sql([query], ...params)` 的调用方式。虽然我们在 `lib/db.ts` 中做了兼容，但如果 `params` 中包含 `undefined`（例如 `projectId` 为 null 时），`pg` 驱动可能会报错。
    *   在 `route.ts` 中：
        ```typescript
        const params: any[] = []
        if (projectId) { ... params.push(projectId) }
        query += ` ... LIMIT $${params.length + 1}`
        params.push(limit)
        ```
        这个逻辑看起来是正确的。`params` 数组是紧凑的。

*   **数据库中的脏数据**：
    *   可能 `activity_logs` 表中某些字段（如 `description` 或 `title`）包含了无法被 JSON 序列化的特殊字符，或者 `timestamp` 格式异常。

## 2. “仍然能看到多条信息”

用户希望只看到最后两次提交。我们之前的修改是在 `risk-scan` 脚本中限制了**每次抓取**的数量。
但是，如果数据库中**已经**存入了旧的 10 条记录，前端依然会显示它们。

**解决方案**：
*   **清理历史数据**（可选）：删除旧的 activity logs。
*   **限制前端查询**：在 `app/api/projects/[id]/activity/route.ts` 中，限制返回的记录数量。目前代码是 `LIMIT ${limit}`，默认 50。我们可以将其默认值调小，或者在前端调用时传入更小的 limit。

## 实施计划

### 1. 限制活动日志显示数量
为了满足“只看最近两条”的视觉需求（或者至少不显示太多），我们将：
*   修改 `app/api/projects/[id]/activity/route.ts`，将默认 `limit` 从 50 调整为 10（或者更小，如 5），并允许前端控制。
*   或者建议用户：如果指的是**抓取逻辑**，我们已经改了。如果指的是**展示逻辑**，我们需要知道具体想展示多少条。假设用户是觉得列表太长，我们将默认限制调小。

### 2. 彻底解决 RSC 错误
鉴于之前修复了嵌套 SQL 但错误仍在，我怀疑是 `recent-updates` 或 `activity` API 在某些边缘情况下（例如 `projectId` 参数处理）依然有问题，或者 `lib/db.ts` 的兼容层在处理 `sql([query], ...params)` 时有隐患。

我们将：
*   **重构 `app/api/recent-updates/route.ts`**：不再使用 `sql([query], ...params)` 这种通过 `lib/db.ts` 兼容层的方式，而是直接使用 `sql` 模板字面量拼接（虽然我们之前说不支持嵌套，但可以通过逻辑分支来分别调用完整的 SQL 语句，避免手动拼接字符串带来的风险和兼容性问题）。
    *   例如：如果 `projectId` 存在，执行带 WHERE 的 SQL；否则执行不带 WHERE 的 SQL。这样就完全避免了手动拼接 SQL 字符串和参数索引的复杂性。

*   **重构 `app/api/projects/[id]/activity/route.ts`**：同上，确保绝对安全。

这一步将消除所有因“手动拼接 SQL 字符串 + 参数数组”与“Tag Function 兼容层”之间可能存在的细微不匹配而导致的潜在崩溃。

### 3. 清理旧数据（可选但建议）
*   为了让用户看到“只读取最后两次”的效果，我们可以清空 `test1` 项目的活动日志，让它重新抓取一次（只有2条）。

我们将优先执行 API 重构，因为这能同时解决稳定性问题。

**具体操作**：
1.  修改 `app/api/recent-updates/route.ts`：使用分支逻辑代替字符串拼接。
2.  修改 `app/api/projects/[id]/activity/route.ts`：确认逻辑稳健。
3.  （如果用户同意）清理 `activity_logs` 表中 `test1` 的数据。

鉴于不能与用户交互确认清理数据，我将只做代码层面的限制和修复。
