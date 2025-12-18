# 架构重构第二阶段：实施计划

根据用户提供的详细步骤，我们将启动第二阶段的架构重构工作。这将涉及对现有系统的全面审计、设计模块化拆分策略、搭建双运行基础设施以及建立实施规范。

## 1. 架构评估与分析

### 1.1 技术审计
*   **目标**：识别当前单体架构（Next.js API Routes + Cron Scripts + Discord Bot 单文件）的局限性。
*   **行动**：
    *   分析 `app/api` 下的路由耦合度。
    *   分析 `scripts/` 目录下脚本与核心业务逻辑的依赖关系。
    *   检查数据库连接管理（`lib/db.ts`）在并发下的表现。

### 1.2 痛点识别
*   **当前痛点**：
    *   Discord Bot 逻辑集中在单个文件 (`discord-commander.ts`)，难以维护和扩展。
    *   Cron Jobs (`scheduler.ts`, `risk-scan.ts`) 与 Web Server 共享代码但运行环境不同，导致依赖管理复杂。
    *   缺乏统一的服务层，API 直接操作数据库，复用性差。

## 2. 重构方案设计

### 2.1 模块化拆分策略
我们将采用 **Vertical Slice Architecture (垂直切片架构)** 与 **Service Layer (服务层)** 相结合的方式。

*   **Core Domain (核心领域)**：
    *   `ProjectService`: 处理项目 CRUD、状态流转。
    *   `ActivityService`: 处理活动日志记录、查询。
    *   `IntegrationService`: 处理 GitHub/Discord 外部交互。
*   **Infrastructure (基础设施)**：
    *   `Database`: 统一的数据访问层（DAL）。
    *   `Queue`: 用于解耦 Cron 任务和即时响应（如 Discord 交互）。

### 2.2 渐进式迁移路径
1.  **Phase 1**: 提取 `lib/services` 层。将 API 路由中的逻辑下沉到 Service 类中。
2.  **Phase 2**: 重构 Discord Bot 为独立应用或模块化结构（Command Pattern）。
3.  **Phase 3**: 引入消息队列（如 Redis/BullMQ 或 Postgres SKIP LOCKED）处理异步任务。

## 3. 基础设施准备

### 3.1 CI/CD 流水线
*   配置 GitHub Actions，增加：
    *   **Lint/Type Check**: 严格模式。
    *   **Unit Tests**: 针对 Service 层的单元测试。
    *   **Integration Tests**: 针对 API 路由的集成测试。

### 3.2 监控告警
*   集成 Sentry 或类似工具捕获后端异常。
*   增加 API 响应时间日志记录。

## 4. 交付物

本次任务我们将重点产出：
1.  **架构审计报告**（作为文档提交）。
2.  **重构技术方案设计文档** (Architecture Decision Record - ADR)。
3.  **初步的代码结构调整**：创建 `lib/services` 目录并迁移一个核心功能（如 Project Service）作为示例。

## 实施步骤 (本次会话)

1.  **创建 ADR 文档**：记录重构决策。
2.  **创建 Service 层骨架**：建立 `lib/services` 目录。
3.  **迁移 Project 逻辑**：将 `app/api/projects/route.ts` 的逻辑重构为 `ProjectService`。
4.  **验证**：确保重构后的 API 依然工作正常。

这将是“零停机迁移”的第一步：在不改变 API 契约的前提下优化内部结构。
