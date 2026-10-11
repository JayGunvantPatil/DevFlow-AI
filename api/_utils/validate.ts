export interface ValidationResult<T> {
    isValid: boolean;
    errors: string[];
    data?: T;
}

export interface ValidatedProjectInput {
    name: string;
    slug: string;
    description: string;
    status: 'active' | 'in_review' | 'archived';
    tags: string[];
    leadName: string;
    leadAvatar: string;
}

export interface ValidatedTaskInput {
    projectId: string;
    title: string;
    status: 'todo' | 'in_progress' | 'review' | 'done';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assigneeName: string;
    assigneeAvatar: string;
}

const ALLOWED_PROJECT_STATUSES = ['active', 'in_review', 'archived'] as const;
const ALLOWED_TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'] as const;
const ALLOWED_TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

/**
 * Validates and sanitizes a project creation or update payload.
 */
export function validateProjectInput(input: any): ValidationResult<ValidatedProjectInput> {
    const errors: string[] = [];

    if (!input || typeof input !== 'object') {
        return { isValid: false, errors: ['Request body must be a valid JSON object'] };
    }

    // Name validation
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name) {
        errors.push('Project name is required');
    } else if (name.length < 2 || name.length > 100) {
        errors.push('Project name must be between 2 and 100 characters');
    } else if (!/^[a-zA-Z0-9-_\s.]+$/.test(name)) {
        errors.push('Project name contains invalid characters. Use letters, numbers, dashes, or dots');
    }

    // Slug generation
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Description
    const description = typeof input.description === 'string' ? input.description.trim() : '';
    if (description.length > 1000) {
        errors.push('Description cannot exceed 1000 characters');
    }

    // Status
    let status: 'active' | 'in_review' | 'archived' = 'active';
    if (input.status !== undefined) {
        if (!ALLOWED_PROJECT_STATUSES.includes(input.status)) {
            errors.push(`Status must be one of: ${ALLOWED_PROJECT_STATUSES.join(', ')}`);
        } else {
            status = input.status;
        }
    }

    // Tags
    let tags: string[] = [];
    if (Array.isArray(input.tags)) {
        tags = input.tags
            .map((t: any) => (typeof t === 'string' ? t.trim() : ''))
            .filter((t: string) => t.length > 0 && t.length <= 30)
            .slice(0, 10);
    } else if (typeof input.tags === 'string') {
        tags = input.tags
            .split(',')
            .map((t: string) => t.trim())
            .filter((t: string) => t.length > 0 && t.length <= 30)
            .slice(0, 10);
    }

    const leadName = typeof input.leadName === 'string' && input.leadName.trim()
        ? input.leadName.trim().slice(0, 100)
        : 'Sofia Chen';

    const leadAvatar = typeof input.leadAvatar === 'string' && input.leadAvatar.trim()
        ? input.leadAvatar.trim()
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80';

    if (errors.length > 0) {
        return { isValid: false, errors };
    }

    return {
        isValid: true,
        errors: [],
        data: {
            name,
            slug,
            description,
            status,
            tags,
            leadName,
            leadAvatar,
        },
    };
}

/**
 * Validates and sanitizes a task creation or update payload.
 */
export function validateTaskInput(input: any): ValidationResult<ValidatedTaskInput> {
    const errors: string[] = [];

    if (!input || typeof input !== 'object') {
        return { isValid: false, errors: ['Request body must be a valid JSON object'] };
    }

    // Title
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    if (!title) {
        errors.push('Task title is required');
    } else if (title.length < 3 || title.length > 255) {
        errors.push('Task title must be between 3 and 255 characters');
    }

    // Project ID
    const projectId = typeof input.projectId === 'string' ? input.projectId.trim() : '';
    if (!projectId) {
        errors.push('Project ID (projectId) is required');
    }

    // Status
    let status: 'todo' | 'in_progress' | 'review' | 'done' = 'todo';
    if (input.status !== undefined) {
        if (!ALLOWED_TASK_STATUSES.includes(input.status)) {
            errors.push(`Status must be one of: ${ALLOWED_TASK_STATUSES.join(', ')}`);
        } else {
            status = input.status;
        }
    }

    // Priority
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    if (input.priority !== undefined) {
        if (!ALLOWED_TASK_PRIORITIES.includes(input.priority)) {
            errors.push(`Priority must be one of: ${ALLOWED_TASK_PRIORITIES.join(', ')}`);
        } else {
            priority = input.priority;
        }
    }

    const assigneeName = typeof input.assigneeName === 'string' && input.assigneeName.trim()
        ? input.assigneeName.trim().slice(0, 100)
        : 'Sofia Chen';

    const assigneeAvatar = typeof input.assigneeAvatar === 'string' && input.assigneeAvatar.trim()
        ? input.assigneeAvatar.trim()
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80';

    if (errors.length > 0) {
        return { isValid: false, errors };
    }

    return {
        isValid: true,
        errors: [],
        data: {
            projectId,
            title,
            status,
            priority,
            assigneeName,
            assigneeAvatar,
        },
    };
}
