export type ProjectStatus = 'active' | 'in_review' | 'archived' | 'paused';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: 'developer' | 'lead' | 'admin';
    createdAt?: string;
    updatedAt?: string;
}

export interface AuthResponse {
    user: User;
    token: string;
    message?: string;
}

export interface Project {
    id: string;
    name: string;
    slug?: string;
    description: string;
    status: ProjectStatus;
    repository?: string;
    stars?: number;
    openTasksCount: number;
    tags: string[];
    lastActivity: string;
    lead: {
        name: string;
        avatar: string;
    };
    createdAt?: string;
    updatedAt?: string;
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    projectId: string;
    projectName: string;
    status: TaskStatus;
    priority: TaskPriority;
    assignee: {
        name: string;
        avatar: string;
    };
    dueDate?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface Repository {
    id: string;
    name: string;
    fullName: string;
    description: string;
    isPrivate: boolean;
    defaultBranch: string;
    starsCount: number;
    forksCount: number;
    updatedAt: string;
    language: string;
}

export interface ActivityItem {
    id: string;
    type: 'task_updated' | 'pr_reviewed' | 'project_created' | 'code_review_requested' | 'comment_added';
    actor: {
        name: string;
        avatar: string;
    };
    target: string;
    detail: string;
    timestamp: string;
}

export interface ServiceStatus {
    database: string;
    ai: string;
    github: string;
}

export interface HealthResponse {
    status: 'ok' | 'degraded' | 'error';
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
    services: ServiceStatus;
    meta?: {
        runtime: string;
        region: string;
        platform: string;
    };
}

export interface HealthCheckResult {
    data: HealthResponse | null;
    latencyMs: number | null;
    error: string | null;
    loading: boolean;
    lastChecked: Date | null;
}

export interface BreadcrumbItem {
    label: string;
    path?: string;
}

export interface GitHubIntegration {
    id: string;
    username: string | null;
    avatarUrl: string | null;
    accountType: string;
    installationId: string | null;
    status: 'connected' | 'disconnected' | 'suspended';
    scope: string | null;
    connectedAt: string;
    updatedAt: string;
}

export interface GitHubStatusResponse {
    configured: boolean;
    connected: boolean;
    integration: GitHubIntegration | null;
    error?: string;
}
