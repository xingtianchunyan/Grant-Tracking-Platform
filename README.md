# Nervos Grant Tracking Plaform

## Overview

This project is a full-stack Next.js 14 application integrating:

- Discord Bot Integration — posts progress updates and milestone completions directly from Discord
- GitHub Integration — fetches and syncs project data or issues from repositories
- Neon Postgres Database for persistent project and activity tracking
- Activity Logs and Project Dashboard automatically reflecting Discord and GitHub actions

All backend APIs (milestones, progress updates, project syncs) are built as server routes under `/app/api/...`, secured with a service bot token (`SERVICE_BOT_TOKEN`).

## Integrations

### Discord Integration

The included bot connects to your Discord server and enables:

- `/progress-update` — posts recent updates to linked projects
- `/milestone-status` — marks active milestones as completed
- Automatically syncs data to the dashboard and activity log

**Configuration:**

```
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_GUILD_ID=your_server_id
SERVICE_BOT_TOKEN=super-long-secret-token
```

You can register and test commands with:

```bash
npx tsx scripts/discord-commander.ts
```

### GitHub Integration

Connects to GitHub repositories for each project to:

- Sync commits, PRs, or issues as activity logs
- Track active development directly in the dashboard

**Configuration:**

```
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

GitHub events (like push or milestone close) trigger updates in `activity_logs` via `/api/github/webhook`.

## Discord Bot Permissions & Security

### Production Permissions (Minimum Required)

For the current version (v1.0), the Discord Bot adheres to the Principle of Least Privilege. When generating the invite link in the Discord Developer Portal, select ONLY the following permissions:

*   **View Channels** (`VIEW_CHANNEL` - 0x400): Required to see channels and verify bot presence.
*   **Send Messages** (`SEND_MESSAGES` - 0x800): Required to post update notifications to public channels.
*   **Embed Links** (`EMBED_LINKS` - 0x4000): Required for rich text formatting in update messages.
*   **Use Application Commands** (`USE_APPLICATION_COMMANDS` - 0x80000000): Required for Slash Commands (`/progress-update`, etc.).

**Generated OAuth2 URL Scope:** `bot applications.commands`
**Permissions Integer:** `2147486720` (or `3072` for basic text permissions + implicit slash commands).

**Explicitly EXCLUDED Permissions:**
*   Administrator (⛔ Dangerous)
*   Manage Channels (Reserved for future auto-channel features)
*   Mention Everyone (⛔ Anti-spam)

### Future Roadmap & Permissions

As outlined in the Q3/Q4 roadmap, future features will require elevated permissions. These must be audited before enabling:

1.  **AI-Driven Project Creation** (`/create-project`):
    *   **Integration**: Uses **siliconflow API** to parse natural language project descriptions into structured data.
    *   **New Permission**: `MANAGE_CHANNELS` (to create project-specific channels).
    *   **Security**: This command will be restricted to `Manage Guild` role holders via Discord's Integration settings.

2.  **Milestone Management** (`/set-milestone`):
    *   **Permission**: No new bot permission, but command access will be restricted to project maintainer roles.

### Security Audit

*   **Audit Logs**: All sensitive bot actions (e.g., changing milestone status) are logged in the `activity_logs` table with `source: 'DISCORD'` and the caller's Discord ID.
*   **Review Cycle**: Permissions should be reviewed quarterly to ensure no deprecated permissions remain active.

## Local Development

### Prerequisites

- Node.js ≥ 20
- PostgreSQL (Neon, Supabase, or local Postgres)
- A `.env.local` file with all required tokens and DB URL

**Example `.env.local`:**

```
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
SERVICE_BOT_TOKEN=super-long-secret-token
DISCORD_BOT_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_GUILD_ID=...
GITHUB_TOKEN=...
```

### Run All Services at Once

You can launch everything — frontend, cron jobs, and Discord bot — with one command:

```bash
npm run dev:all
```

This runs concurrently:

- `next dev` (frontend)
- `tsx scripts/scheduler.ts` (cron jobs)
- `tsx scripts/discord-commander.ts` (Discord bot registration)

### Other Commands

| Command                      | Description                       |
| ---------------------------- | --------------------------------- |
| `npm run dev`                | Run frontend only                 |
| `npm run cron`               | Start scheduled tasks             |
| `npm run discord`            | Launch Discord bot                |
| `npm run reset-db`           | Clear all data (development only) |
| `npm run build && npm start` | Production build & start          |

## Deployment

The test project is live :https://sparkproject1.vercel.app/
Video demo: https://www.youtube.com/watch?v=EG7_mFDe-sA

## Database Reset (Optional)

You can clear all data (keeping tables) via:

```bash
npx tsx scripts/reset-db.ts
```

## Security Note

- Never commit `.env` files.
- Keep a `.env.local.example` for developers to copy from.
- All secrets (DB URLs, bot tokens) should be created individually per user.
