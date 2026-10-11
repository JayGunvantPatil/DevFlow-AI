import { query, DatabaseNotConfiguredError } from '../_utils/db.js';
import { validateTaskInput } from '../_utils/validate.js';
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
    if (handleCors(req, res, ['GET', 'POST', 'OPTIONS'])) {
        return;
    }

    res.setHeader('X-DevFlow-Stage', 'Phase-2-Development');
    res.setHeader('X-DevFlow-Auth', 'Unenforced-Development-Mode');

    try {
        if (req.method === 'GET') {
            const { status, priority, projectId, search } = req.query;

            const conditions: string[] = [];
            const params: any[] = [];

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

            // Verify whether projectId is an existing project UUID or name
            const projectCheck = await query<{ id: string; name: string }>(
                'SELECT id, name FROM projects WHERE id::text = $1 OR name = $1 LIMIT 1',
                [projectId]
            );

            if (projectCheck.length === 0) {
                return errorResponse(res, 404, `Linked project '${projectId}' does not exist`, 'PROJECT_NOT_FOUND');
            }

            const realProjectId = projectCheck[0].id;
            const realProjectName = projectCheck[0].name;

            const sql = `
        INSERT INTO tasks (project_id, title, status, priority, assignee_name, assignee_avatar)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING 
          id, project_id AS "projectId", title, status, priority,
          assignee_name AS "assigneeName", assignee_avatar AS "assigneeAvatar",
          created_at AS "createdAt", updated_at AS "updatedAt"
      `;

            const rows = await query(sql, [
                realProjectId,
                title,
                status,
                priority,
                assigneeName,
                assigneeAvatar,
            ]);
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

        return methodNotAllowedResponse(res, ['GET', 'POST']);
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
