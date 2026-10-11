import { Project, Task, ActivityItem } from '../types';

export const initialProjects: Project[] = [
    {
        id: 'proj-1',
        name: 'devflow-core',
        description: 'High-throughput developer workspace engine and AST parser framework.',
        status: 'active',
        repository: 'devflow-ai/devflow-core',
        stars: 128,
        openTasksCount: 6,
        tags: ['TypeScript', 'Vite', 'React'],
        lastActivity: new Date(Date.now() - 1000 * 60 * 42).toISOString(), // 42 mins ago
        lead: {
            name: 'Elena Rostova',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
        },
    },
    {
        id: 'proj-2',
        name: 'cloud-agent-runner',
        description: 'Stateless task runner executing isolated security scans and review jobs.',
        status: 'in_review',
        repository: 'devflow-ai/cloud-agent-runner',
        stars: 84,
        openTasksCount: 3,
        tags: ['Go', 'Docker', 'Serverless'],
        lastActivity: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
        lead: {
            name: 'Marcus Vance',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
        },
    },
    {
        id: 'proj-3',
        name: 'syntax-analyzer',
        description: 'Tree-sitter powered semantic tokenizer for TypeScript, Rust, and Go diff analysis.',
        status: 'active',
        repository: 'devflow-ai/syntax-analyzer',
        stars: 215,
        openTasksCount: 4,
        tags: ['Rust', 'WASM', 'Tree-Sitter'],
        lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(), // 22 hours ago
        lead: {
            name: 'Sofia Chen',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        },
    },
    {
        id: 'proj-4',
        name: 'docs-portal',
        description: 'Interactive API reference and documentation with automated schema sync.',
        status: 'archived',
        repository: 'devflow-ai/docs-portal',
        stars: 42,
        openTasksCount: 0,
        tags: ['Next.js', 'Tailwind', 'MDX'],
        lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
        lead: {
            name: 'Alex Rivera',
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
        },
    },
];

export const initialTasks: Task[] = [
    {
        id: 'task-101',
        title: 'Migrate serverless route handlers to edge middleware contracts',
        description: 'Ensure low-latency responses for regional function endpoints.',
        projectId: 'proj-1',
        projectName: 'devflow-core',
        status: 'in_progress',
        priority: 'urgent',
        assignee: {
            name: 'Elena Rostova',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
        },
        dueDate: '2026-10-18',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    },
    {
        id: 'task-102',
        title: 'Implement JSON error schema validation for health endpoint',
        description: 'Ensure RFC 7807 compliant error objects across all API responses.',
        projectId: 'proj-1',
        projectName: 'devflow-core',
        status: 'done',
        priority: 'high',
        assignee: {
            name: 'Alex Rivera',
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
        },
        dueDate: '2026-10-14',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
        id: 'task-103',
        title: 'Containerize sandboxed code execution workers',
        description: 'Prevent memory leakage during concurrent AST tree computations.',
        projectId: 'proj-2',
        projectName: 'cloud-agent-runner',
        status: 'todo',
        priority: 'high',
        assignee: {
            name: 'Marcus Vance',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
        },
        dueDate: '2026-10-22',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    },
    {
        id: 'task-104',
        title: 'Benchmark Tree-sitter WASM bundle load time in browser worker',
        description: 'Target <80ms warm cold-start latency for web syntax highlighting.',
        projectId: 'proj-3',
        projectName: 'syntax-analyzer',
        status: 'review',
        priority: 'medium',
        assignee: {
            name: 'Sofia Chen',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        },
        dueDate: '2026-10-25',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    },
    {
        id: 'task-105',
        title: 'Prepare Neon PostgreSQL migration schemas and indexes',
        description: 'Draft DDL tables for Phase 2 database integration.',
        projectId: 'proj-1',
        projectName: 'devflow-core',
        status: 'todo',
        priority: 'low',
        assignee: {
            name: 'Marcus Vance',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
        },
        dueDate: '2026-11-01',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
];

export const initialActivities: ActivityItem[] = [
    {
        id: 'act-1',
        type: 'pr_reviewed',
        actor: {
            name: 'Elena Rostova',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
        },
        target: 'PR #142 in devflow-core',
        detail: 'Approved pull request: feat(api): implement /api/health with system metadata',
        timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    },
    {
        id: 'act-2',
        type: 'task_updated',
        actor: {
            name: 'Sofia Chen',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        },
        target: 'syntax-analyzer',
        detail: 'Moved "Benchmark Tree-sitter WASM" to In Review',
        timestamp: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    },
    {
        id: 'act-3',
        type: 'code_review_requested',
        actor: {
            name: 'Marcus Vance',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
        },
        target: 'cloud-agent-runner',
        detail: 'Requested peer review for Dockerized isolated sandbox worker',
        timestamp: new Date(Date.now() - 1000 * 60 * 190).toISOString(),
    },
    {
        id: 'act-4',
        type: 'project_created',
        actor: {
            name: 'Alex Rivera',
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
        },
        target: 'devflow-ai',
        detail: 'Initialized Phase 1 workspace repository with TypeScript & Tailwind',
        timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    },
];

export const sampleDiffPresets = [
    {
        name: 'JWT Auth Handshake (Security Fix)',
        language: 'typescript',
        diff: `@@ -12,8 +12,12 @@ export async function verifyToken(req: Request) {
   const token = req.headers.get('authorization')?.split(' ')[1];
   if (!token) {
-    return null;
+    throw new UnauthorizedError('Missing bearer token in authorization header');
   }
-  return jwt.verify(token, process.env.SECRET!);
+  try {
+    return jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['RS256'] });
+  } catch (err) {
+    throw new TokenExpiredOrInvalidError('Token validation failed');
+  }
 }`,
    },
    {
        name: 'SQL Connection Pool Guard (Database)',
        language: 'sql',
        diff: `@@ -4,6 +4,11 @@ CREATE TABLE IF NOT EXISTS audit_logs (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   event_type VARCHAR(64) NOT NULL,
+  project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
   created_at TIMESTAMPTZ DEFAULT NOW(),
-  payload TEXT
+  payload JSONB NOT NULL DEFAULT '{}'::jsonb
 );
+
+CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_project_date
+ON audit_logs (project_id, created_at DESC);`,
    },
];
