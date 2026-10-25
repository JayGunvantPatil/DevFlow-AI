import { query, DatabaseNotConfiguredError, checkHasUserIdColumn } from '../_utils/db.js';
import { extractUserFromRequest } from '../_utils/auth.js';
import {
    VercelRequest,
    VercelResponse,
    jsonResponse,
    errorResponse,
    methodNotAllowedResponse,
    handleCors,
} from '../_utils/response.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (handleCors(req, res, ['GET', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'])) {
        return;
    }

    res.setHeader('X-DevFlow-Stage', 'Phase-3B-Production-Ready');
    res.setHeader('X-DevFlow-Auth', 'Enforced');

    // Enforce server-side authentication
    const authUser = extractUserFromRequest(req);
    if (req.headers?.authorization && !authUser) {
        return errorResponse(res, 401, 'Invalid or expired authentication token', 'UNAUTHORIZED');
    }
    if (!authUser) {
        return errorResponse(
            res,
            401,
            'Authentication required. Please provide a valid Bearer token in the Authorization header.',
            'UNAUTHORIZED'
        );
    }

    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch {
            body = {};
        }
    }
    body = body || {};

    const rawId = req.query?.id;
    const id = (Array.isArray(rawId) ? rawId[0] : typeof rawId === 'string' ? rawId : undefined) ||
               (typeof body.id === 'string' ? body.id : undefined);

    if (!id || typeof id !== 'string' || !id.trim()) {
        return errorResponse(res, 400, 'Invalid or missing task id parameter', 'INVALID_ID');
    }
    const cleanId = id.trim();

    try {
        const hasUserCol = await checkHasUserIdColumn();

        if (req.method === 'GET') {
            const sql = `
        SELECT 
          t.id, t.project_id AS "projectId", p.name AS "projectName",
          t.title, t.status, t.priority,
          t.assignee_name AS "assigneeName", t.assignee_avatar AS "assigneeAvatar",
          t.created_at AS "createdAt", t.updated_at AS "updatedAt",
          t.user_id AS "userId"
        FROM tasks t
        JOIN projects p ON p.id = t.project_id
        WHERE t.id::text = $1
      `;

            const rows = await query(sql, [cleanId]);

            if (rows.length === 0) {
                return errorResponse(res, 404, `Task not found with id: ${cleanId}`, 'TASK_NOT_FOUND');
            }

            const r = rows[0];

            // Enforce ownership: 403 Forbidden if task belongs to another user
            if (hasUserCol && r.userId && r.userId !== authUser.userId) {
                return errorResponse(
                    res,
                    403,
                    'Access forbidden: You do not have permission to access this task',
                    'FORBIDDEN'
                );
            }

            return jsonResponse(res, 200, {
                task: {
                    id: r.id,
                    projectId: r.projectId,
                    projectName: r.projectName,
                    title: r.title,
                    status: r.status,
                    priority: r.priority,
                    assignee: { name: r.assigneeName, avatar: r.assigneeAvatar },
                    createdAt: r.createdAt,
                    updatedAt: r.updatedAt,
                },
            });
        }

        if (req.method === 'PATCH' || req.method === 'PUT') {
            const updates: string[] = [];
            const params: any[] = [];

            if (body.status !== undefined) {
                if (!['todo', 'in_progress', 'review', 'done'].includes(body.status)) {
                    return errorResponse(
                        res,
                        400,
                        `Invalid task status: '${body.status}'. Allowed statuses: todo, in_progress, review, done`,
                        'INVALID_STATUS'
                    );
                }
                params.push(body.status);
                updates.push(`status = $${params.length}`);
            }

            if (body.priority !== undefined) {
                if (!['low', 'medium', 'high', 'urgent'].includes(body.priority)) {
                    return errorResponse(
                        res,
                        400,
                        `Invalid task priority: '${body.priority}'. Allowed priorities: low, medium, high, urgent`,
                        'INVALID_PRIORITY'
                    );
                }
                params.push(body.priority);
                updates.push(`priority = $${params.length}`);
            }

            if (body.title !== undefined) {
                if (typeof body.title !== 'string' || body.title.trim().length < 3 || body.title.trim().length > 255) {
                    return errorResponse(
                        res,
                        400,
                        'Task title must be between 3 and 255 characters',
                        'INVALID_TITLE'
                    );
                }
                params.push(body.title.trim());
                updates.push(`title = $${params.length}`);
            }

            if (typeof body.assigneeName === 'string' && body.assigneeName.trim().length > 0) {
                params.push(body.assigneeName.trim().slice(0, 100));
                updates.push(`assignee_name = $${params.length}`);
            }

            if (typeof body.assigneeAvatar === 'string' && body.assigneeAvatar.trim().length > 0) {
                params.push(body.assigneeAvatar.trim());
                updates.push(`assignee_avatar = $${params.length}`);
            }

            if (updates.length === 0) {
                return errorResponse(res, 400, 'No valid fields provided for update', 'NO_FIELDS_TO_UPDATE');
            }

            // Verify task existence and ownership before updating
            if (hasUserCol) {
                const existing = await query<{ id: string; user_id: string }>(
                    'SELECT id, user_id FROM tasks WHERE id::text = $1',
                    [cleanId]
                );
                if (existing.length === 0) {
                    return errorResponse(res, 404, `Task not found with id: ${cleanId}`, 'TASK_NOT_FOUND');
                }
                if (existing[0].user_id && existing[0].user_id !== authUser.userId) {
                    return errorResponse(
                        res,
                        403,
                        'Access forbidden: You do not have permission to modify this task',
                        'FORBIDDEN'
                    );
                }
            }

            params.push(cleanId);
            const idPlaceholder = `$${params.length}`;
            let userWhereClause = '';

            if (hasUserCol) {
                params.push(authUser.userId);
                userWhereClause = `AND user_id = $${params.length}`;
            }

            const sql = `
        UPDATE tasks
        SET ${updates.join(', ')}
        WHERE id::text = ${idPlaceholder} ${userWhereClause}
        RETURNING 
          id, project_id AS "projectId", title, status, priority,
          assignee_name AS "assigneeName", assignee_avatar AS "assigneeAvatar",
          created_at AS "createdAt", updated_at AS "updatedAt"
      `;

            const rows = await query(sql, params);

            if (rows.length === 0) {
                return errorResponse(res, 404, `Task not found with id: ${cleanId}`, 'TASK_NOT_FOUND');
            }

            const r = rows[0];
            return jsonResponse(res, 200, {
                task: {
                    id: r.id,
                    projectId: r.projectId,
                    title: r.title,
                    status: r.status,
                    priority: r.priority,
                    assignee: { name: r.assigneeName, avatar: r.assigneeAvatar },
                    createdAt: r.createdAt,
                    updatedAt: r.updatedAt,
                },
                message: 'Task updated successfully',
            });
        }

        if (req.method === 'DELETE') {
            // Verify task existence and ownership before deleting
            if (hasUserCol) {
                const existing = await query<{ id: string; user_id: string }>(
                    'SELECT id, user_id FROM tasks WHERE id::text = $1',
                    [cleanId]
                );
                if (existing.length === 0) {
                    return errorResponse(res, 404, `Task not found with id: ${cleanId}`, 'TASK_NOT_FOUND');
                }
                if (existing[0].user_id && existing[0].user_id !== authUser.userId) {
                    return errorResponse(
                        res,
                        403,
                        'Access forbidden: You do not have permission to delete this task',
                        'FORBIDDEN'
                    );
                }
            }

            const params: any[] = [cleanId];
            let userWhere = '';

            if (hasUserCol) {
                params.push(authUser.userId);
                userWhere = `AND user_id = $${params.length}`;
            }

            const sql = `DELETE FROM tasks WHERE id::text = $1 ${userWhere} RETURNING id`;
            const rows = await query(sql, params);

            if (rows.length === 0) {
                return errorResponse(res, 404, `Task not found with id: ${cleanId}`, 'TASK_NOT_FOUND');
            }

            return jsonResponse(res, 200, {
                success: true,
                deletedId: cleanId,
                message: 'Task deleted successfully',
            });
        }

        return methodNotAllowedResponse(res, ['GET', 'PATCH', 'PUT', 'DELETE']);
    } catch (error: any) {
        if (error instanceof DatabaseNotConfiguredError) {
            return jsonResponse(res, 503, {
                error: 'Database Not Configured',
                message: error.message,
                code: 'DATABASE_NOT_CONFIGURED',
            });
        }

        console.error(`Task [id] API error:`, error);
        return errorResponse(res, 500, error.message || 'Internal server error', 'TASK_API_ERROR');
    }
}
