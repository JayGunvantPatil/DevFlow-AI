# DevFlow AI — Phase 2: Neon Database Integration

> A modern, collaborative developer workspace with telemetry monitoring, serverless PostgreSQL persistence, and scheduled AI-powered code review intelligence.

---

## 1. Project Overview

**DevFlow AI** is an engineering workspace designed to unify project tracking, task sprints, repository telemetry, and automated code review workflows.

**Phase 2** establishes persistent database integration using **Neon Serverless PostgreSQL**:
- **Neon Serverless PostgreSQL Driver (`@neondatabase/serverless`)**: Optimized connection pooling via HTTP fetch (`neonConfig.poolQueryViaFetch = true`) tailored for Vercel Functions and fast serverless cold starts.
- **Server-Side Security**: Database connection strings are read exclusively from server-side environment variable `DATABASE_URL`. Zero credentials or connection strings are ever exposed to the client bundle or committed to Git.
- **Documented SQL Schema & Migrations**: Normalized schema for `projects` and `tasks` with UUID keys, foreign key cascading, enum constraints, timestamps, automatic update triggers, and indexes for query optimization.
- **Full Serverless CRUD API**: RESTful endpoints for listing, creating, updating, and deleting projects and tasks with parameterized SQL queries, strict payload validation, and RFC-compliant error structures.
- **Live Frontend Integration**: The Projects and Tasks pages connect directly to the real API endpoints, complete with loading, empty, success, and informative error banners. Preview fixtures remain isolated for offline design development.
- **Automated Test Suite**: 36 unit and integration tests covering input validation, API response utilities, database safety, and route handlers.
- **Development-Stage Guardrails**: API routes are clearly labeled with `X-DevFlow-Stage` and `X-DevFlow-Auth` headers, indicating that authentication is scheduled for Phase 3.

---

## 2. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18, TypeScript 5, Vite 5 |
| **Styling** | Tailwind CSS 3, PostCSS, Autoprefixer |
| **Routing** | React Router v6 |
| **Iconography** | Lucide React |
| **Serverless Backend** | Vercel Serverless Functions (`api/*.ts` in TypeScript) |
| **Database** | Neon Serverless PostgreSQL (`@neondatabase/serverless` v1.2+) |
| **Testing** | Node.js Test Runner (`node:test`) + `tsx` |
| **Future Integrations** | GitHub OAuth & Webhooks (Phase 2 Part 2), LLM APIs / pgvector RAG (Phase 3), WebSockets (Phase 4) |

---

## 3. Architecture & Directory Structure

```text
devflow-ai/
├── api/                           # Vercel Serverless Functions
│   ├── _utils/
│   │   ├── db.ts                  # Neon pool singleton, query runner, credential sanitizer
│   │   ├── response.ts            # Standardized JSON response envelopes & CORS handler
│   │   └── validate.ts            # Strict input validators for projects and tasks
│   ├── projects/
│   │   ├── [id].ts                # GET, PATCH/PUT, DELETE /api/projects/:id
│   │   └── index.ts               # GET, POST /api/projects
│   ├── tasks/
│   │   ├── [id].ts                # GET, PATCH/PUT, DELETE /api/tasks/:id
│   │   └── index.ts               # GET, POST /api/tasks
│   └── health.ts                  # GET /api/health with live Neon DB ping
├── migrations/
│   ├── 001_init_projects_and_tasks.sql # Primary schema migration
│   └── seed.sql                   # Optional seed data for initial testing
├── tests/                         # Automated test suite
│   ├── api_routes.test.ts         # Route handler integration tests
│   ├── db.test.ts                 # Database config & credential safety tests
│   ├── response.test.ts           # Response envelope and CORS tests
│   └── validate.test.ts           # Project & task validation tests
├── src/
│   ├── components/ui/             # Reusable UI component library
│   ├── layouts/
│   │   └── AppLayout.tsx          # App shell with live API telemetry pill
│   ├── lib/
│   │   ├── previewFixtures.ts     # Offline design preview fixtures
│   │   └── utils.ts               # CSS class merging and date formatting
│   ├── pages/
│   │   ├── Dashboard.tsx          # Workspace overview with live DB data & health ping
│   │   ├── Projects.tsx           # Real project directory, creation modal, delete action
│   │   └── Tasks.tsx              # Real task directory (Table & Kanban Board views)
│   ├── services/
│   │   └── apiClient.ts           # Frontend HTTP client calling /api/*
│   ├── types/
│   │   └── index.ts               # Central TypeScript interfaces
│   ├── App.tsx                    # React router definition
│   └── main.tsx                   # Client entrypoint
├── .env.example                   # Environment template with blank DATABASE_URL
├── .env.local                     # Local overrides (git-ignored)
├── .gitignore                     # Git ignore rules
├── package.json                   # Dependencies, scripts, and test runner
├── tsconfig.json                  # TypeScript compiler configuration
└── vite.config.ts                 # Bundler configuration & local serverless middleware
```

---

## 4. Database Schema & Architecture

### Tables

#### `projects`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique project identifier |
| `name` | `VARCHAR(100)` | `NOT NULL UNIQUE` | Human-readable project name |
| `slug` | `VARCHAR(120)` | `NOT NULL UNIQUE` | URL-safe slug generated from name |
| `description` | `TEXT` | `DEFAULT ''` | Project summary (max 1000 chars) |
| `status` | `VARCHAR(30)` | `NOT NULL DEFAULT 'active' CHECK ('active', 'in_review', 'archived')` | Project lifecycle status |
| `stars` | `INT` | `NOT NULL DEFAULT 0 CHECK (stars >= 0)` | Star counter |
| `tags` | `TEXT[]` | `NOT NULL DEFAULT '{}'` | Array of technology tags |
| `lead_name` | `VARCHAR(100)` | `NOT NULL DEFAULT 'Sofia Chen'` | Project lead name |
| `lead_avatar` | `TEXT` | `DEFAULT ...` | Avatar image URL |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Record update timestamp |

#### `tasks`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique task identifier |
| `project_id` | `UUID` | `NOT NULL REFERENCES projects(id) ON DELETE CASCADE` | Linked parent project |
| `title` | `VARCHAR(255)` | `NOT NULL` | Task summary (3–255 chars) |
| `status` | `VARCHAR(30)` | `NOT NULL DEFAULT 'todo' CHECK ('todo', 'in_progress', 'review', 'done')` | Sprint state |
| `priority` | `VARCHAR(30)` | `NOT NULL DEFAULT 'medium' CHECK ('low', 'medium', 'high', 'urgent')` | Priority level |
| `assignee_name`| `VARCHAR(100)` | `NOT NULL DEFAULT 'Sofia Chen'` | Assignee name |
| `assignee_avatar`| `TEXT` | `DEFAULT ...` | Assignee avatar URL |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Record update timestamp |

### Indexes & Triggers
- **`idx_projects_status`** and **`idx_projects_created_at`** for fast directory filtering.
- **`idx_tasks_project_id`**, **`idx_tasks_status`**, and **`idx_tasks_priority`** for rapid sprint queries.
- **Triggers**: `trg_projects_updated_at` and `trg_tasks_updated_at` execute `set_updated_at_timestamp()` before any update row operation.

---

## 5. Migration Guide: Running in Neon SQL Editor

Follow these exact steps to initialize your Neon database:

1. **Sign in to Neon Console**: Go to [https://console.neon.tech](https://console.neon.tech).
2. **Select or Create a Project**: Choose your DevFlow AI database project (e.g., `devflow-db`).
3. **Open SQL Editor**: In the left sidebar of the Neon Console, click **SQL Editor**.
4. **Run Primary Schema Migration**:
   - Open [`migrations/001_init_projects_and_tasks.sql`](file:///migrations/001_init_projects_and_tasks.sql).
   - Copy the entire SQL script.
   - Paste it into the Neon SQL Editor.
   - Click the green **Run** button (or press `Ctrl + Enter`).
   - Verify the output confirms tables `projects` and `tasks` were created along with indexes and triggers.
5. **(Optional) Run Seed Data**:
   - Open [`migrations/seed.sql`](file:///migrations/seed.sql).
   - Paste into the Neon SQL Editor and click **Run**.
   - This seeds 3 realistic engineering projects (`devflow-core`, `syntax-analyzer`, `cloud-agent-runner`) and linked tasks.

---

## 6. Local Setup & Configuration

### Prerequisites
- Node.js `v18.0.0` or higher (`node -v`)
- npm `v9.0.0` or higher (`npm -v`)

### Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure your local `.env.local`:**
   Copy the template:
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and add your Neon connection string:
   ```env
   # Server-side only: never expose to frontend
   DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-YOUR-ENDPOINT-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.
   
   > **Note:** The local Vite development server automatically intercepts `/api/*` requests and executes the TypeScript serverless functions locally with live `DATABASE_URL` bindings. You do not need the Vercel CLI for local frontend and API development!

---

## 7. Testing & Quality Checks

Run the available automated checks:

```bash
# 1. Typecheck the entire project
npm run lint

# 2. Run the automated test suite (36 tests)
npm test

# 3. Build the production bundle
npm run build
```

### What the test suite verifies:
- **`tests/validate.test.ts`**: Ensures strict validation of project and task names, character bounds, valid statuses, tags parsing, and rejection of malformed payloads.
- **`tests/response.test.ts`**: Tests standardized JSON responses, RFC-compliant error structures, 422 validation errors, 405 Method Not Allowed headers, and CORS preflight.
- **`tests/db.test.ts`**: Verifies that `DatabaseNotConfiguredError` is thrown when `DATABASE_URL` is missing, and confirms database credentials are never leaked in error logs.
- **`tests/api_routes.test.ts`**: Tests request routing, missing parameter validation, and development-stage headers.

---

## 8. API Reference

All endpoints return JSON and require no authentication during Phase 2 development.

### Health
- **`GET /api/health`**: Tests serverless runtime and executes `SELECT NOW()` against Neon PostgreSQL to report live database latency.

### Projects
- **`GET /api/projects`**: Lists projects. Supports query parameters `?status=active`, `?search=term`, `?tag=TypeScript`. Includes `openTasksCount`.
- **`POST /api/projects`**: Creates a project. Body: `{ name, description?, status?, tags? }`. Returns 201 Created.
- **`GET /api/projects/:id`**: Retrieves a single project by UUID or slug. Returns 404 if not found.
- **`PATCH /api/projects/:id`**: Updates project fields (`status`, `description`, `tags`, `stars`).
- **`DELETE /api/projects/:id`**: Deletes project and cascades to linked tasks. Returns 200.

### Tasks
- **`GET /api/tasks`**: Lists tasks. Supports query parameters `?status=todo`, `?priority=high`, `?projectId=UUID`, `?search=term`.
- **`POST /api/tasks`**: Creates a task linked to an existing project. Body: `{ projectId, title, status?, priority? }`. Returns 201 Created.
- **`GET /api/tasks/:id`**: Retrieves a single task by UUID.
- **`PATCH /api/tasks/:id`**: Updates task fields (`status`, `priority`, `title`).
- **`DELETE /api/tasks/:id`**: Deletes task. Returns 200.

---

## 9. Deploying to Vercel

1. **Push your code to GitHub / GitLab**.
2. **Import the repository in Vercel Dashboard**: [https://vercel.com/new](https://vercel.com/new).
3. **Configure Environment Variables in Vercel**:
   - Go to **Project Settings** → **Environment Variables**.
   - Add:
     - **Key**: `DATABASE_URL`
     - **Value**: Your Neon PostgreSQL pooled connection string (`postgresql://neondb_owner:YOUR_PASSWORD@ep-YOUR-ENDPOINT-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`)
     - **Environments**: Check `Production`, `Preview`, and `Development`.
4. **Deploy**:
   - Click **Deploy**. Vercel will build the Vite frontend to `dist/` and automatically deploy `api/health.ts`, `api/projects/*.ts`, and `api/tasks/*.ts` as serverless functions.
5. **Verify Live Deployment**:
   - Visit `https://your-devflow-app.vercel.app/api/health` to confirm `status: "ok"` and `services.database: "connected (Neon PostgreSQL, ...ms)"`.
   - Visit the Projects and Tasks pages to create real persistent entries.

---

## 10. Development-Stage Security Notice

> [!WARNING]
> **Authentication is not yet implemented (scheduled for Phase 3).**
> All API endpoints are labeled with `X-DevFlow-Stage: Phase-2-Development` and `X-DevFlow-Auth: Unenforced-Development-Mode`. Do not expose these endpoints to public production write traffic until session authorization and user roles are established in Phase 3.
