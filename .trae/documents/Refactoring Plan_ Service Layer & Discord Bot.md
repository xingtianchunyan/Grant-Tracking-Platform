# Phase 2: Architecture Refactoring & Discord Bot Modernization

This plan addresses the migration of Activity and Integration logic to the Service Layer and the modularization of the Discord Bot.

## 1. Service Layer Migration
We will create two new services to centralize business logic and external API interactions.

### A. Activity Service (`lib/services/activity.service.ts`)
Centralizes all activity logging and retrieval logic.
- **Methods:**
    - `getProjectActivities(projectId, limit)`: For individual project activity feeds.
    - `getRecentActivities(limit)`: For the global "Recent Updates" feed.
    - `createActivity(data)`: For logging new activities (Discord, Manual, GitHub).
    - `activityExists(projectId, type, url)`: To prevent duplicate logs (e.g., from GitHub scans).
    - `getDiscordActivityCount(projectId, since)`: For risk scanning.
- **Refactoring:**
    - Update `app/api/projects/[id]/activity/route.ts` to use this service.
    - Update `app/api/recent-updates/route.ts` to use this service.

### B. Integration Service (`lib/services/integration.service.ts`)
Encapsulates external API logic (primarily GitHub for now) to keep controllers clean.
- **Methods:**
    - `normalizeRepo(repoUrl)`: Helper to parse GitHub URLs.
    - `checkGithubActivity(repo, since)`: Fetches commits and PRs from GitHub (moved from risk-scan).
- **Refactoring:**
    - Update `app/api/cron/risk-scan/route.ts` to use `IntegrationService` for GitHub checks and `ActivityService` for logging results.

## 2. Discord Bot Refactoring
We will transform the monolithic `scripts/discord-commander.ts` into a modular, maintainable system.

### A. Directory Structure (`lib/discord/`)
- `lib/discord/config.ts`: Bot configuration and validation.
- `lib/discord/client.ts`: Client initialization with proxy support (`undici`, `global-agent`).
- `lib/discord/utils.ts`: Helpers like `safeChannelSend`, `postJson`.
- `lib/discord/commands/`: Directory for command modules.
    - `index.ts`: Command registry and dispatcher.
    - `progress-update.ts`: Handler for `/progress-update`.
    - `milestone-status.ts`: Handler for `/milestone-status`.

### B. Main Script (`scripts/discord-commander.ts`)
- Will become a lightweight entry point that:
    1. Bootstraps the proxy.
    2. Initializes the client.
    3. Registers commands via the registry.
    4. Starts the bot.

## 3. Implementation Steps
1.  **Create Services:** Implement `ActivityService` and `IntegrationService`.
2.  **Refactor API Routes:** Update `risk-scan`, `recent-updates`, and `project activity` routes to use the new services.
3.  **Modularize Bot:** Create the `lib/discord` structure and migrate logic from `discord-commander.ts`.
4.  **Verify:**
    - Check API endpoints (Recent Updates, Project Activity).
    - Run the Risk Scan (via POST or manual trigger) to ensure GitHub integration still works.
    - Restart the Discord bot and verify commands.
