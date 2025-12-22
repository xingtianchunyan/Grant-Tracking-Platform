# Nervos Grant Tracking Platform

## 概览 (Overview)

这是一个基于 **Next.js 16.0.7** 和 **React 19** 构建的全栈项目，旨在自动追踪和管理 Nervos 生态系统中的 Grant 项目进度。

项目集成了以下核心功能：
- **Discord 机器人集成**：直接从 Discord 发布进度更新和里程碑状态，自动同步到仪表板。
- **GitHub 集成**：自动拉取并同步代码库中的提交（Commits）、PR 和 Issues。
- **项目风险扫描**：定期扫描项目活跃度，对超过 30 天无更新或里程碑逾期的项目发出预警。
- **AI 项目提取**：利用 AI 自动从项目描述中提取关键信息（基于 SiliconFlow）。

---

## 技术栈 (Tech Stack)

- **Frontend**: Next.js 16.0.7 (App Router), React 19, Tailwind CSS, Lucide React, Shadcn UI
- **Backend**: Next.js Server Actions & API Routes
- **Database**: PostgreSQL (支持 Neon Serverless 或本地 Docker 部署)
- **Integration**: Discord.js, GitHub REST API, SiliconFlow (AI)
- **Tooling**: TypeScript, tsx, node-cron, undici (Proxy support)

---

## 开发环境配置 (Environment Setup)

由于原开发者位于海外而后续开发在中国大陆，本项目特别优化了不同网络环境下的适配方案。

### 1. 基础环境
- **Node.js**: ≥ 20.x
- **Docker Desktop**: 用于运行本地数据库

### 2. 环境变量设置
复制 `.env.example` 并重命名为 `.env`：
```bash
cp .env.example .env
```

### 3. 网络代理配置 (中国大陆开发者必看)
中国大陆开发者在访问 Discord、GitHub 或 AI API 时可能遇到超时问题。本项目已在 `lib/proxy.ts` 中集成了全局代理支持。

在 `.env` 中设置以下变量（端口 `7078` 为常用代理示例，请根据实际调整）：
```bash
# 全局代理配置
HTTP_PROXY="http://127.0.0.1:7078"
HTTPS_PROXY="http://127.0.0.1:7078"
```
系统启动时会自动读取并配置全局 `ProxyAgent`，确保 `discord.js` 和 `fetch` 请求能够正常通行。

---

## 核心集成指南 (Integration Guides)

### 1. Discord 机器人设置 (Discord Bot)

#### 最小权限原则 (Principle of Least Privilege)
为了安全起见，请在 [Discord Developer Portal](https://discord.com/developers/applications) 中为机器人配置以下最小权限：

- **Scopes**: `bot`, `applications.commands`
- **Bot Permissions**:
    - `View Channels` (查看频道)
    - `Send Messages` (发送消息)
    - `Embed Links` (嵌入链接)
    - `Use Application Commands` (使用应用指令)
- **权限位 (Permissions Integer)**: `2147486720` (或精简版的 `3072`)

#### 机器人部署步骤
1. 在 Portal 中获取 `TOKEN`, `APP_ID` 和 `GUILD_ID`。
2. 将其填入 `.env` 文件。
3. 运行指令注册脚本：
   ```bash
   npx tsx scripts/discord-commander.ts
   ```

### 2. GitHub 集成设置 (GitHub Integration)

项目支持通过 GitHub URL 自动同步活动，包括特定分支的支持（格式如 `.../tree/branch-name`）。

#### 设置步骤
1. 生成一个 [GitHub Personal Access Token (PAT)](https://github.com/settings/tokens)，至少勾选 `repo` 权限。
2. 将 Token 填入 `.env` 中的 `GITHUB_TOKEN`。
3. 在管理后台编辑项目时，填入正确的 GitHub 仓库地址，系统将自动进行格式规范化处理。

---

## 本地运行 (Running Locally)

### 1. 启动数据库
```bash
npm run db:up
```

### 2. 初始化数据库 (首次运行)
```bash
npm run db:setup
```

### 3. 一键启动所有服务
该命令将同时启动前端开发服务器、Discord 机器人和 Cron 定时任务：
```bash
npm run dev:all
```

---

## 常用指令 (Common Scripts)

| 指令 | 说明 |
| :--- | :--- |
| `npm run dev` | 仅启动 Next.js 前端 |
| `npm run risk:scan` | 手动触发一次项目风险扫描 |
| `npm run risk:schedule` | 启动定时任务调度器 (Cron) |
| `npm run discord` | 仅启动 Discord 机器人 |
| `npm run db:setup` | 初始化数据库表结构并填充种子数据 |

---

## 安全与维护 (Security & Maintenance)

- **敏感信息**: 严禁将 `.env` 文件提交至版本控制系统。
- **数据库备份**: 生产环境建议使用 Neon 的 Point-in-Time Recovery 功能。
- **代码规范**: 请确保所有外部请求均通过 `lib/proxy.ts` 配置的全局 Agent，以保证跨境协作的连通性。

---

*注：原项目的 README 内容已备份至 `README_OLD.md`。*
