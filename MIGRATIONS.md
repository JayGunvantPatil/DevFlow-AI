# Neon PostgreSQL Migrations Guide — DevFlow AI

This guide documents the database schema and exact manual steps required to set up and run migrations in the **Neon Console SQL Editor**.

---

## 1. Migration Files

The project contains two SQL files under the [`migrations/`](file:///migrations/) directory:

| File | Purpose | Required / Optional |
| :--- | :--- | :--- |
| [`001_init_projects_and_tasks.sql`](file:///migrations/001_init_projects_and_tasks.sql) | Creates the `projects` and `tasks` tables, extensions, triggers, and performance indexes. | **Required** |
| [`002_user_authentication.sql`](file:///migrations/002_user_authentication.sql) | Creates `users` table, adds non-destructive `user_id` foreign keys to `projects` and `tasks`, backfills default migration owner, and adds indexes. | **Required for Auth** |
| [`seed.sql`](file:///migrations/seed.sql) | Inserts 3 sample engineering projects and 5 linked tasks for immediate testing. | *Optional* |

---

## 2. Step-by-Step Instructions in Neon

### Step 1: Open Neon Console
1. Navigate to [https://console.neon.tech](https://console.neon.tech) and log in.
2. Select your DevFlow AI project (e.g. `devflow-db`).

### Step 2: Open the SQL Editor
1. In the left-hand navigation menu, click **SQL Editor**.
2. Select the database branch you want to migrate (usually `main`).
3. Make sure the database selected is `neondb` (the default database).

### Step 3: Run Primary Schema Migration (`001_init_projects_and_tasks.sql`)
1. In your editor or repository, open [`migrations/001_init_projects_and_tasks.sql`](file:///migrations/001_init_projects_and_tasks.sql).
2. Copy the entire file content.
3. Paste it into the Neon SQL Editor query tab.
4. Click the green **Run** button (or press `Ctrl+Enter` on Windows / `Cmd+Enter` on Mac).
5. Verify the results table indicates successful execution:
   ```text
   CREATE EXTENSION
   CREATE FUNCTION
   CREATE TABLE
   CREATE TABLE
   CREATE INDEX
   CREATE INDEX
   CREATE INDEX
   CREATE INDEX
   CREATE TRIGGER
   CREATE TRIGGER
   ```

### Step 4: (Optional) Run Seed Data (`seed.sql`)
1. Open [`migrations/seed.sql`](file:///migrations/seed.sql).
2. Copy the content and paste into a new query tab in the Neon SQL Editor.
3. Click **Run**.
4. Verify by running a quick query:
   ```sql
   SELECT p.name, p.status, count(t.id) as task_count
   FROM projects p
   LEFT JOIN tasks t ON t.project_id = p.id
   GROUP BY p.name, p.status;
   ```
   You should see 3 rows returned (`devflow-core`, `syntax-analyzer`, `cloud-agent-runner`).

### Step 5: Run User Authentication Migration (`002_user_authentication.sql`)
1. Open [`migrations/002_user_authentication.sql`](file:///migrations/002_user_authentication.sql).
2. Copy the entire file content.
3. Paste it into the Neon SQL Editor query tab.
4. Click **Run** (`Ctrl+Enter` on Windows / `Cmd+Enter` on Mac).
5. This safely creates the `users` table, adds `user_id` foreign key columns to `projects` and `tasks` without deleting existing records, provisions a migration user, and creates performance indexes.

---

## 3. Obtaining your Connection String for `.env.local` and Vercel

1. In the Neon Console, navigate to the **Dashboard** overview.
2. Under the **Connection Details** panel:
   - Select **Pooled connection** (recommended for serverless environments).
   - Select **Postgres / Node.js** from the connection language dropdown.
3. Copy the connection string format:
   ```text
   postgresql://[user]:[password]@[endpoint]-pooler.[region].aws.neon.tech/[dbname]?sslmode=require
   ```
4. Configure locally:
   - Paste into `.env.local`:
     ```env
     DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-YOUR-ENDPOINT-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
5. Configure in Vercel:
   - Go to your Vercel Project → **Settings** → **Environment Variables**.
   - Name: `DATABASE_URL`
   - Value: (your pooled Neon connection string)
   - Target: `Production`, `Preview`, `Development`.
