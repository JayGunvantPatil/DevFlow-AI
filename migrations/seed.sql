-- ============================================================================
-- DevFlow AI — Seed Data (Optional for Neon SQL Editor)
-- Inserts initial projects and linked tasks
-- ============================================================================

DO $$
DECLARE
  p1_id UUID;
  p2_id UUID;
  p3_id UUID;
BEGIN
  -- Insert Project 1
  INSERT INTO projects (name, slug, description, status, stars, tags, lead_name, lead_avatar)
  VALUES (
    'devflow-core',
    'devflow-core',
    'Core runtime architecture, micro-service orchestration, and unified RPC gateway.',
    'active',
    128,
    ARRAY['TypeScript', 'Node.js', 'Vercel', 'PostgreSQL'],
    'Sofia Chen',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
  )
  ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO p1_id;

  -- Insert Project 2
  INSERT INTO projects (name, slug, description, status, stars, tags, lead_name, lead_avatar)
  VALUES (
    'syntax-analyzer',
    'syntax-analyzer',
    'AST parser and token extraction pipeline for real-time pull request diff analysis.',
    'active',
    84,
    ARRAY['Rust', 'WebAssembly', 'Parser'],
    'Marcus Vance',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
  )
  ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO p2_id;

  -- Insert Project 3
  INSERT INTO projects (name, slug, description, status, stars, tags, lead_name, lead_avatar)
  VALUES (
    'cloud-agent-runner',
    'cloud-agent-runner',
    'Autonomous worker container executing CI test validations and security checks.',
    'in_review',
    42,
    ARRAY['Docker', 'Go', 'Kubernetes'],
    'Elena Rostova',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80'
  )
  ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO p3_id;

  -- Insert Tasks for Project 1
  IF p1_id IS NOT NULL THEN
    INSERT INTO tasks (project_id, title, status, priority, assignee_name, assignee_avatar)
    VALUES
      (p1_id, 'Connect Neon PostgreSQL serverless client with connection pool caching', 'in_progress', 'urgent', 'Sofia Chen', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'),
      (p1_id, 'Add RFC-7807 structured JSON error envelopes to all serverless routes', 'done', 'high', 'Sofia Chen', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'),
      (p1_id, 'Implement database retry exponential backoff for cold-start serverless pings', 'todo', 'medium', 'Marcus Vance', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80');
  END IF;

  -- Insert Tasks for Project 2
  IF p2_id IS NOT NULL THEN
    INSERT INTO tasks (project_id, title, status, priority, assignee_name, assignee_avatar)
    VALUES
      (p2_id, 'Optimize diff tree AST generation for PRs exceeding 2,000 lines', 'todo', 'high', 'Marcus Vance', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'),
      (p2_id, 'Benchmark WebAssembly binary compilation against V8 engine limits', 'done', 'low', 'Marcus Vance', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80');
  END IF;

END $$;
