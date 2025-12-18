# Discord 机器人权限配置与实施计划

根据开发团队会议的讨论，我们制定了以下技术实施方案。作为负责 Discord 集成模块的开发者，我将重点关注权限最小化配置、未来功能扩展以及安全审计机制。

## 1. 生产环境权限配置方案（当前版本）

为了遵循“最小权限原则”，我们将明确 Discord Bot 所需的权限范围。

### 1.1 权限位掩码计算 (Permissions Bitmask)
对于当前版本（支持 `/progress-update` 和 `/milestone-status`），Bot 需要的权限如下：

*   **View Channels (查看频道)**: `VIEW_CHANNEL (0x400)`
    *   用途：Bot 需要能看到并在频道中运行。虽然斜杠指令是全局的，但 Bot 需要权限来发送确认消息到特定频道。
*   **Send Messages (发送消息)**: `SEND_MESSAGES (0x800)`
    *   用途：响应斜杠指令，发送项目更新通知到公共频道。
*   **Embed Links (嵌入链接)**: `EMBED_LINKS (0x4000)`
    *   用途：虽然目前主要发送纯文本，但保留此权限用于未来美化消息（如项目卡片）。
*   **Use Application Commands (使用应用指令)**: `USE_APPLICATION_COMMANDS (0x80000000)`
    *   用途：这是斜杠指令的基础权限（默认授予，但在邀请链接中需明确）。

**不需要的权限（当前版本移除）**：
*   Administrator (管理员)
*   Manage Channels (管理频道)
*   Manage Messages (管理消息)
*   Mention Everyone (提及所有人)

**生成的 OAuth2 URL 权限参数**：
`permissions=2147486720` (View + Send + Embed + Use Slash Commands)
或者更精简的：`permissions=3072` (View + Send) + `scope=bot%20applications.commands`

### 1.2 `discord-commander.ts` 代码更新
我们需要在代码中显式声明 `GatewayIntentBits`，确保与 Bot 实际申请的权限匹配。目前代码中：
```typescript
intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
```
这是合理的，保持不变。

## 2. 未来功能扩展规划（Q3/Q4）

### 2.1 新指令架构设计
为了支持 AI 驱动的自动化流程，我们将重构 `discord-commander.ts`，使其支持动态加载指令模块，而不是将所有逻辑写在 `interactionCreate` 回调中。

**指令：`/create-project`**
*   **参数**: `name` (String), `description` (String), `repo_url` (String, Optional)
*   **权限需求**: 这是一个高风险操作。我们需要实现**权限隔离**。
    *   **Discord 层面**: 在注册该指令时，设置 `default_member_permissions` 为 `ManageGuild` (管理服务器)，确保只有管理员能使用。
    *   **代码层面**: Bot 需要 `MANAGE_CHANNELS` 权限来自动创建项目专属频道。

**指令：`/set-milestone`**
*   **参数**: `project_id` (Integer), `title` (String), `due_date` (String)
*   **权限需求**: 项目维护者权限。可以通过 Discord 的 Role（角色）进行绑定。

### 2.2 实施步骤
1.  **重构指令注册**：将指令定义从 `commands` 数组拆分为独立文件。
2.  **添加 AI 处理层**：集成 OpenAI API，解析自然语言描述并生成结构化的项目数据。

## 3. 安全与审计

### 3.1 权限变更日志
我们将创建一个新的数据库表 `permission_audit_logs` 或复用 `activity_logs`（添加新的 `source` 类型 `SYSTEM_AUDIT`），记录每次 Bot 权限的变更或高敏感指令的调用。

### 3.2 自动检测机制
在 `discord-commander.ts` 启动时 (`client.on('ready')`)，添加一段逻辑来检查当前 Bot 在 Guild 中的实际权限。
*   如果检测到缺少核心权限（如 Send Messages），自动报警（日志 Error）。
*   如果检测到拥有过多权限（如 Administrator），发出安全警告（日志 Warn）。

## 4. 实施路线图与文档更新

本次我将更新 `README.md`，添加一个新的章节 **"Discord Bot Permissions & Security"**，详细记录上述配置，作为本次会议的技术文档输出。

## 5. 立即行动
我将立即更新 `README.md` 文档，详细说明生产环境的权限配置要求，供运维团队参考。
