import { Project, Task, ActivityItem } from '../types';

/**
 * Preview fixtures isolated for design and offline UI testing.
 * Kept separate from real Neon database data flow.
 */
export const previewProjects: Project[] = [
    {
        id: 'proj-1',
        name: 'devflow-core',
        description: 'Core runtime architecture, micro-service orchestration, and unified RPC gateway.',
        status: 'active',
        stars: 128,
        openTasksCount: 3,
        tags: ['TypeScript', 'Node.js', 'Vercel', 'PostgreSQL'],
        lastActivity: '2026-10-11T16:42:00Z',
        lead: {
            name: 'Sofia Chen',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        },
    },
    {
        id: 'proj-2',
        name: 'syntax-analyzer',
        description: 'AST parser and token extraction pipeline for real-time pull request diff analysis.',
        status: 'active',
        stars: 84,
        openTasksCount: 2,
        tags: ['Rust', 'WebAssembly', 'Parser'],
        lastActivity: '2026-10-11T14:15:00Z',
        lead: {
            name: 'Marcus Vance',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
        },
    },
    {
        id: 'proj-3',
        name: 'cloud-agent-runner',
        description: 'Autonomous worker container executing CI test validations and security checks.',
        status: 'in_review',
        stars: 42,
        openTasksCount: 1,
        tags: ['Docker', 'Go', 'Kubernetes'],
        lastActivity: '2026-10-10T22:00:00Z',
        lead: {
            name: 'Elena Rostova',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
        },
    },
];

export const previewTasks: Task[] = [
    {
        id: 'task-1',
        title: 'Connect Neon PostgreSQL serverless client with connection pool caching',
        projectId: 'proj-1',
        projectName: 'devflow-core',
        status: 'in_progress',
        priority: 'urgent',
        assignee: {
            name: 'Sofia Chen',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        },
        createdAt: '2026-10-11T12:00:00Z',
    },
    {
        id: 'task-2',
        title: 'Add RFC-7807 structured JSON error envelopes to all serverless routes',
        projectId: 'proj-1',
        projectName: 'devflow-core',
        status: 'done',
        priority: 'high',
        assignee: {
            name: 'Sofia Chen',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        },
        createdAt: '2026-10-10T11:30:00Z',
    },
    {
        id: 'task-3',
        title: 'Optimize diff tree AST generation for PRs exceeding 2,000 lines',
        projectId: 'proj-2',
        projectName: 'syntax-analyzer',
        status: 'todo',
        priority: 'high',
        assignee: {
            name: 'Marcus Vance',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
        },
        createdAt: '2026-10-11T09:20:00Z',
    },
];

export const previewActivities: ActivityItem[] = [
    {
        id: 'act-1',
        type: 'task_updated',
        actor: {
            name: 'Sofia Chen',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        },
        target: 'Connect Neon PostgreSQL serverless client',
        detail: 'Updated status to in_progress',
        timestamp: '2026-10-11T16:30:00Z',
    },
    {
        id: 'act-2',
        type: 'project_created',
        actor: {
            name: 'Sofia Chen',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        },
        target: 'devflow-core',
        detail: 'Initialized repository workspace',
        timestamp: '2026-10-10T10:00:00Z',
    },
];
