-- ============================================================================
-- DevFlow AI — Migration 003: Secure GitHub Integration Schema
-- Target: Neon Serverless PostgreSQL (PostgreSQL 15+)
-- Run in Neon SQL Editor or via database migration runner
-- ============================================================================

-- 1. Create github_integrations table
CREATE TABLE IF NOT EXISTS github_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  github_user_id VARCHAR(100),
  github_username VARCHAR(255),
  github_avatar_url TEXT,
  installation_id VARCHAR(100),
  account_type VARCHAR(50) NOT NULL DEFAULT 'User',
  status VARCHAR(50) NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'suspended')),
  scope VARCHAR(255) DEFAULT 'read:user',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  encrypted_access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for fast lookup and user isolation
CREATE INDEX IF NOT EXISTS idx_github_integrations_user_id ON github_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_github_integrations_installation_id ON github_integrations(installation_id);
CREATE INDEX IF NOT EXISTS idx_github_integrations_status ON github_integrations(status);

-- 3. Automatic updated_at trigger binding
DROP TRIGGER IF EXISTS trg_github_integrations_updated_at ON github_integrations;
CREATE TRIGGER trg_github_integrations_updated_at
  BEFORE UPDATE ON github_integrations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();
