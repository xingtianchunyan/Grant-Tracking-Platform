# 修复“Failed to load updates”错误

问题定位：

1. **Dashboard 页面的** **`Recent Updates`** **组件报错**：

   * 原因：后端 API `app/api/recent-updates/route.ts` 使用了嵌套的 `sql` 标签函数调用 (`${projectId ? sql`... ` : sql``}`)。

   * 分析：在我们当前的数据库驱动实现（以及标准的 `pg` 驱动）中，`sql` 函数是立即执行查询的，而不是返回 SQL 片段。尝试执行不完整的 SQL（如 `WHERE ...`）会导致数据库语法错误，从而导致 API 返回 500，前端显示加载失败。

2. **详情页面的** **`Activity`** **组件报错**（如果存在）：

   * 原因：可能受到同类问题影响，或者由于 `lib/db.ts` 调试信息不足导致难以排查。虽然详情页 API 看起来没有嵌套调用，但我们也会一并检查。

解决方案：

1. **重构** **`app/api/recent-updates/route.ts`**：

   * 移除嵌套的 `sql` 调用。

   * 改用动态字符串拼接的方式构建 SQL 查询，并手动管理参数数组。

   * 使用 `sql([query], ...params)` 的方式调用数据库（利用我们在 `lib/db.ts` 中实现的兼容逻辑）。

2. **增强** **`lib/db.ts`** **的调试能力**（可选但推荐）：

   * 在 `pg` 模式下添加 SQL 执行日志，以便在终端清楚看到实际执行的 SQL 语句，方便排查后续问题。

实施步骤：

1. 修改 `app/api/recent-updates/route.ts`。
2. 修改 `lib/db.ts` 添加日志（仅在本地开发模式）。
3. 验证修复结果。

