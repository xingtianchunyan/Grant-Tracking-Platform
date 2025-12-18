# Database Setup & Startup Plan

The local database is currently unreachable (Port 5432 closed) and the Docker daemon appears to be stopped or inaccessible. I will configure a Docker-based Postgres environment to resolve this.

## 1. Configuration
*   **Create `docker-compose.yml`**: Define a Postgres service matching the `.env` configuration:
    *   User: `postgres`
    *   Password: `password`
    *   Database: `grant_db`
    *   Port: `5432`

## 2. Scripts
*   **Update `package.json`**: Add database management scripts for convenience:
    *   `"db:up"`: `docker-compose up -d`
    *   `"db:down"`: `docker-compose down`
    *   `"db:setup"`: `tsx scripts/setup-db.ts` (to run table creation/seeding)

## 3. Execution
1.  Generate the `docker-compose.yml` file.
2.  Update `package.json`.
3.  **User Action Required**: You will need to ensure Docker Desktop (or the Docker daemon) is running.
4.  Once Docker is active, we can run `npm run db:up` followed by `npm run db:setup` to initialize the database schema.

I will proceed with creating the configuration files now.
