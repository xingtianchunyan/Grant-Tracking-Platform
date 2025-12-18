# 解决本地 Docker 数据库连接问题

您遇到的错误 `NeonDbError: Error connecting to database: TypeError: fetch failed` (底层原因是 `ECONNREFUSED`) 表明 Node.js 脚本无法连接到您运行的 Docker PostgreSQL 容器。

虽然您的 Docker 容器已成功运行并映射了 `5432:5432` 端口，但问题出在您使用的数据库驱动 `@neondatabase/serverless` 上。

### 根本原因
`@neondatabase/serverless` 是专为 Serverless 环境（如 Vercel, Neon）设计的驱动，它默认使用 **HTTP/WebSocket** 协议（基于 `fetch`）来连接数据库，这需要数据库端支持 WebSocket 代理（如 Neon 的架构）。而标准的本地 PostgreSQL Docker 容器只支持 **TCP** 协议。

这就是为什么它报错 `fetch failed` —— 它试图发起 HTTP 请求到 `localhost:5432`，但那是一个 TCP 端口。

### 解决方案
我们需要修改 `lib/db.ts` 和相关脚本，使其在本地开发环境（非 Serverless 环境）下使用标准的 PostgreSQL 驱动（如 `pg` 或 `postgres`），或者配置 `@neondatabase/serverless` 回退到 WebSocket 以外的模式（但这通常需要额外配置）。最稳妥且标准的做法是：**引入 `pg` 驱动作为本地开发的替代方案**。

我们将实施以下步骤：

1.  **安装 `pg` 和 `@types/pg`**：这是 Node.js 生态中最标准的 PostgreSQL 客户端，支持原生 TCP 连接。
2.  **重构 `lib/db.ts`**：创建一个兼容层。
    *   当检测到 `DATABASE_URL` 指向 Neon/Serverless 时，使用 `@neondatabase/serverless`。
    *   当检测到本地环境（如 `localhost`）时，使用 `pg`。
3.  **更新 `scripts/setup-db.ts`**：确保脚本引用的 `sql` 对象能兼容这两种驱动的调用方式。

### 实施计划

#### 第一步：安装依赖
我们将运行 `npm install pg` 和 `npm install -D @types/pg`。

#### 第二步：修改 `lib/db.ts`
我们将重写该文件，使其根据 `DATABASE_URL` 智能选择驱动。
*   如果是 `neondatabase`，保留原有逻辑。
*   如果是 `localhost`，使用 `pg.Pool` 并封装一个类似 `sql` 的标签函数，以保持 API 统一。

#### 第三步：重新运行初始化脚本
再次运行 `npx tsx scripts/setup-db.ts --seed`，这次它将通过 TCP 成功连接到您的 Docker 容器。
