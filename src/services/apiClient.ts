import { HealthResponse, Project, ProjectStatus, Task } from '../types';

export class ApiError extends Error {
    code?: string;
    status: number;
    details?: any;

    constructor(message: string, status: number, code?: string, details?: any) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

/**
 * DevFlow AI API Client
 * Interfaces with Vercel Serverless Functions (/api/*) backed by Neon PostgreSQL
 */
class ApiClient {
    private baseUrl: string;

    constructor() {
        this.baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };

        const res = await fetch(url, {
            ...options,
            headers,
        });

        const isJson = res.headers.get('content-type')?.includes('application/json');
        const data = isJson ? await res.json() : await res.text();

        if (!res.ok) {
            const errorMsg =
                typeof data === 'object' && data?.error?.message
                    ? data.error.message
                    : typeof data === 'object' && data?.message
                        ? data.message
                        : `Request failed with status ${res.status}`;
            const errorCode = typeof data === 'object' && (data?.error?.code || data?.code);
            throw new ApiError(errorMsg, res.status, errorCode, data);
        }

        return data as T;
    }

    /**
     * Health Check Request
     * Calls GET /api/health and measures response latency
     */
    async checkHealth(): Promise<{ data: HealthResponse; latencyMs: number }> {
        const startTime = performance.now();
        try {
            const data = await this.request<HealthResponse>('/api/health', { method: 'GET' });
            const latencyMs = Math.round(performance.now() - startTime);
            return { data, latencyMs };
        } catch (err: any) {
            const latencyMs = Math.round(performance.now() - startTime);
            const message = err.message || 'Failed to connect to /api/health';
            throw { message, latencyMs, code: err.code, status: err.status };
        }
    }

    /**
     * Projects CRUD
     */
    async getProjects(params?: { status?: string; search?: string; tag?: string }): Promise<{ projects: Project[]; count: number }> {
        const searchParams = new URLSearchParams();
        if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
        if (params?.search) searchParams.set('search', params.search);
        if (params?.tag) searchParams.set('tag', params.tag);

        const queryStr = searchParams.toString();
        const endpoint = `/api/projects${queryStr ? `?${queryStr}` : ''}`;
        return this.request<{ projects: Project[]; count: number }>(endpoint, { method: 'GET' });
    }

    async createProject(payload: {
        name: string;
        description?: string;
        status?: 'active' | 'in_review' | 'archived';
        tags?: string[];
    }): Promise<{ project: Project; message: string }> {
        return this.request<{ project: Project; message: string }>('/api/projects', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async updateProject(
        id: string,
        updates: {
            name?: string;
            description?: string;
            status?: ProjectStatus;
            tags?: string[];
        }
    ): Promise<{ project: Project; message: string }> {
        return this.request<{ project: Project; message: string }>(`/api/projects/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ ...updates, id }),
        });
    }

    async deleteProject(id: string): Promise<{ success: boolean; deletedId: string }> {
        return this.request<{ success: boolean; deletedId: string }>(`/api/projects/${id}`, {
            method: 'DELETE',
        });
    }

    /**
     * Tasks CRUD
     */
    async getTasks(params?: {
        status?: string;
        priority?: string;
        projectId?: string;
        search?: string;
    }): Promise<{ tasks: Task[]; count: number }> {
        const searchParams = new URLSearchParams();
        if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
        if (params?.priority && params.priority !== 'all') searchParams.set('priority', params.priority);
        if (params?.projectId && params.projectId !== 'all') searchParams.set('projectId', params.projectId);
        if (params?.search) searchParams.set('search', params.search);

        const queryStr = searchParams.toString();
        const endpoint = `/api/tasks${queryStr ? `?${queryStr}` : ''}`;
        return this.request<{ tasks: Task[]; count: number }>(endpoint, { method: 'GET' });
    }

    async createTask(payload: {
        projectId: string;
        title: string;
        status?: 'todo' | 'in_progress' | 'review' | 'done';
        priority?: 'low' | 'medium' | 'high' | 'urgent';
    }): Promise<{ task: Task; message: string }> {
        return this.request<{ task: Task; message: string }>('/api/tasks', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async updateTask(
        id: string,
        updates: { status?: 'todo' | 'in_progress' | 'review' | 'done'; priority?: string; title?: string }
    ): Promise<{ task: Task; message: string }> {
        return this.request<{ task: Task; message: string }>(`/api/tasks/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ ...updates, id }),
        });
    }

    async deleteTask(id: string): Promise<{ success: boolean; deletedId: string }> {
        return this.request<{ success: boolean; deletedId: string }>(`/api/tasks/${id}`, {
            method: 'DELETE',
        });
    }
}

export const apiClient = new ApiClient();
