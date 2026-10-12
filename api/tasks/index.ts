import { query, DatabaseNotConfiguredError, checkHasUserIdColumn } from '../_utils/db.js';
import { validateTaskInput } from '../_utils/validate.js';
import { extractUserFromRequest } from '../_utils/auth.js';
import taskDetailHandler from './[id].js';
import {
    VercelRequest,
    VercelResponse,
    jsonResponse,
    errorResponse,
    validationErrorResponse,
    methodNotAllowedResponse,
    handleCors,
} from '../_utils/response.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (handleCors(req, res, ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'])) {
        return;
    }

    res.setHeader('X-DevFlow-Stage', 'Phase-2-Development');
    res.setHeader('X-DevFlow-Auth', 'Unenforced-Development-Mode');

    // Extract authenticated user if token present
    const authUser = extractUserFromRequest(req);
    if (req.headers?.authorization && !authUser) {
        return errorResponse(res, 401, 'Invalid or expired authentication token', 'UNAUTHORIZED');
    }

    // If request uses detail methods (PATCH/PUT/DELETE) or GET with an id, delegate to taskDetailHandler
    if (req.method === 'PATCH' || req.method === 'PUT' || req.method === 'DELETE') {
        return taskDetailHandler(req, res);
    }

    if (req.method === 'GET' && req.query?.id && typeof req.query.id === 'string') {
        return taskDetailHandler(req, res);
    }

    try {
        const hasUserCol = await checkHasUserIdColumn();

        if (req.method === 'GET') {
            const { status, priority, projectId, search } = req.query;

            const conditions: string[] = [];
            const params: any[] = [];

            // User isolation scoping
            if (hasUserCol) {
                if (authUser) {
                    params.push(authUser.userId);
                    conditions.push(`t.user_id = $${params.length}`);
                } else {
                    params.push('a0000000-0000-0000-0000-000000000001');
                    conditions.push(`(t.user_id = $${params.length} OR t.user_id IS NULL)`);
                }
            }

            if (status && typeof status === 'string' && status !== 'all') {
                params.push(status);
                conditions.push(`t.status = $${params.length}`);
            }

            if (priority && typeof priority === 'string' && priority !== 'all') {
                params.push(priority);
                conditions.push(`t.priority = $${params.length}`);
            }

            if (projectId && typeof projectId === 'string' && projectId !== 'all') {
                params.push(projectId);
                conditions.push(`(t.project_id::text = $${params.length} OR p.name = $${params.length})`);
            }

            if (search && typeof search === 'string' && search.trim()) {
                params.push(`%${search.trim()}%`);
                conditions.push(`(t.title ILIKE $${params.length} OR p.name ILIKE $${params.length})`);
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

            const sql = `
        SELECT 
          t.id,
          t.project_id AS "projectId",
          p.name AS "projectName",
          t.title,
          t.status,
          t.priority,
          t.assignee_name AS "assigneeName",
          t.assignee_avatar AS "assigneeAvatar",
          t.created_at AS "createdAt",
          t.updated_at AS "updatedAt"
        FROM tasks t
        JOIN projects p ON p.id = t.project_id
        ${whereClause}
        ORDER BY t.created_at DESC
      `;

            const rows = await query(sql, params);

            const tasks = rows.map((r: any) => ({
                id: r.id,
                projectId: r.projectId,
                projectName: r.projectName,
                title: r.title,
                status: r.status,
                priority: r.priority,
                assignee: {
                    name: r.assigneeName,
                    avatar: r.assigneeAvatar,
                },
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
            }));

            return jsonResponse(res, 200, {
                tasks,
                count: tasks.length,
                isDevelopmentStage: true,
                disclaimer: 'Development-stage API: Write access is unenforced until Phase 3 authentication is implemented. Not ready for public production use.',
            });
        }

        if (req.method === 'POST') {
            const body = req.body || {};
            const validation = validateTaskInput(body);

            if (!validation.isValid || !validation.data) {
                return validationErrorResponse(
                    res,
                    'Task validation failed',
                    validation.errors.map((msg) => ({ field: 'body', message: msg }))
                );
            }

            const { projectId, title, status, priority, assigneeName, assigneeAvatar } = validation.data;
            const targetUserId = authUser?.userId || 'a0000000-0000-0000-0000-000000000001';

            // Verify project exists and belongs to the user
            let projectCheckSql = 'SELECT id, name FROM projects WHERE (id::text = $1 OR name = $1)';
            const checkParams: any[] = [projectId];

            if (hasUserCol && authUser) {
                checkParams.push(authUser.userId);
                projectCheckSql += ` AND user_id = $${checkParams.length}`;
            }

            projectCheckSql += ' LIMIT 1';
            const projectCheck = await query<{ id: string; name: string }>(projectCheckSql, checkParams);

            if (projectCheck.length === 0) {
                return errorResponse(res, 404, `Linked project '${projectId}' does not exist or does not belong to you`, 'PROJECT_NOT_FOUND');
            }

            const realProjectId = projectCheck[0].id;
            const realProjectName = projectCheck[0].name;

            let sql: string;
            let params: any[];

            if (hasUserCol) {
                sql = `
          INSERT INTO tasks (project_id, title, status, priority, assignee_name, assignee_avatar, user_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING 
            id, project_id AS "projectId", title, status, priority,
            assignee_name AS "assigneeName", assignee_avatar AS "assigneeAvatar",
            created_at AS "createdAt", updated_at AS "updatedAt"
        `;
                params = [realProjectId, title, status, priority, assigneeName, assigneeAvatar, targetUserId];
            } else {
                sql = `
          INSERT INTO tasks (project_id, title, status, priority, assignee_name, assignee_avatar)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING 
            id, project_id AS "projectId", title, status, priority,
            assignee_name AS "assigneeName", assignee_avatar AS "assigneeAvatar",
            created_at AS "createdAt", updated_at AS "updatedAt"
        `;
                params = [realProjectId, title, status, priority, assigneeName, assigneeAvatar];
            }

            const rows = await query(sql, params);
            const created = rows[0];

            return jsonResponse(res, 201, {
                task: {
                    id: created.id,
                    projectId: created.projectId,
                    projectName: realProjectName,
                    title: created.title,
                    status: created.status,
                    priority: created.priority,
                    assignee: {
                        name: created.assigneeName,
                        avatar: created.assigneeAvatar,
                    },
                    createdAt: created.createdAt,
                    updatedAt: created.updatedAt,
                },
                message: 'Task created successfully in Neon database',
            });
        }

        return methodNotAllowedResponse(res, ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']);
    } catch (error: any) {
        if (error instanceof DatabaseNotConfiguredError) {
            return jsonResponse(res, 503, {
                error: 'Database Not Configured',
                message: error.message,
                code: 'DATABASE_NOT_CONFIGURED',
            });
        }

        console.error('Tasks API error:', error);
        return errorResponse(res, 500, error.message || 'Internal server error', 'TASKS_API_ERROR');
    }
}
