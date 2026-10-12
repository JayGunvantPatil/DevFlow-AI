-- ============================================================================
-- DevFlow AI — Migration 002: User Authentication & Ownership Schema
-- Target: Neon Serverless PostgreSQL (PostgreSQL 15+)
-- Run in Neon SQL Editor or via database migration runner
-- ============================================================================

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  avatar TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  role VARCHAR(50) NOT NULL DEFAULT 'developer' CHECK (role IN ('developer', 'lead', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for instant email lookups during login & registration
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Trigger for automatic updated_at timestamp on users
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

-- 2. Non-destructively Add user_id column to Projects (nullable for safe migration)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 3. Non-destructively Add user_id column to Tasks (nullable for safe migration)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 4. Provision Seed Migration User (for backfilling existing unowned projects/tasks)
-- Email: sofia.chen@devflow.ai
-- Password: SofiaDevFlow2026!
INSERT INTO users (id, email, password_hash, name, avatar, role)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'sofia.chen@devflow.ai',
  'scrypt$bWlncmF0aW9uX3NhbHQx$6c459c0490b0e513885d564bb378e9f50e7b4e9f7eeeb22496f86e3f3cb1ff9792671f5436c646ef42cbb9539d48b11b51e064972fa6a6f695ec58dcf400c2aa',
  'Sofia Chen',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  'lead'
)
ON CONFLICT (email) DO NOTHING;

-- 5. Safe Backfill: Associate any existing projects with the migration user
UPDATE projects
SET user_id = (SELECT id FROM users WHERE email = 'sofia.chen@devflow.ai' LIMIT 1)
WHERE user_id IS NULL;

-- 6. Safe Backfill: Associate any existing tasks with the migration user
UPDATE tasks
SET user_id = (SELECT id FROM users WHERE email = 'sofia.chen@devflow.ai' LIMIT 1)
WHERE user_id IS NULL;

-- 7. Indexes for fast user-scoped filtering (IDOR prevention queries)
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_project ON tasks(user_id, project_id);
