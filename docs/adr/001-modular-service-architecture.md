# ADR 001: Modular Service Architecture

## Status
Accepted

## Context
The current application follows a monolithic structure where business logic is tightly coupled with Next.js API Routes and standalone scripts. This leads to code duplication (e.g., database queries repeated in API and Cron jobs), difficulty in testing, and challenges in maintaining the Discord bot logic which is currently a single large file.

## Decision
We will refactor the backend architecture to adopt a **Service-Oriented** approach within the monolith (Modular Monolith).

1.  **Service Layer**: Business logic will be moved from `app/api/...` and `scripts/...` into `lib/services/...`.
    *   `ProjectService`: Manage project lifecycle.
    *   `ActivityService`: Manage activity logs.
    *   `IntegrationService`: Handle external APIs (GitHub, Discord).
2.  **Dependency Injection**: Services will receive their dependencies (like DB clients) where possible, or use a singleton `db` module, to facilitate testing.
3.  **Unified Data Access**: Raw SQL queries will be encapsulated within these services or a dedicated DAL (Data Access Layer), reducing scattered SQL strings.

## Consequences
### Positive
*   **Reusability**: Logic can be shared between Next.js API routes, Cron scripts, and the Discord bot.
*   **Testability**: Services can be unit tested in isolation without spinning up a Next.js server.
*   **Maintainability**: Clear separation of concerns.

### Negative
*   **Initial Overhead**: Refactoring existing working code requires effort and regression testing.
*   **Boilerplate**: Adding a service layer adds a small amount of boilerplate code compared to direct DB calls in route handlers.

## Implementation Plan
1.  Create `lib/services`.
2.  Migrate `Project` logic first.
3.  Migrate `Discord` bot command handlers to use services.
