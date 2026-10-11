import { query, DatabaseNotConfiguredError } from '../_utils/db';
import {
    VercelRequest,
    VercelResponse,
    jsonResponse,
    errorResponse,
    methodNotAllowedResponse,
    handleCors,
} from '../_utils/response';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (handleCors(req, res, ['GET', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'])) {
        return;
    }

    res.setHeader('X-DevFlow-Stage', 'Phase-2-Development');
    res.setHeader('X-DevFlow-Auth', 'Unenforced-Development-Mode');

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return errorResponse(res, 400, 'Invalid or missing project id parameter', 'INVALID_ID');
    }

    try {
        if (req.method === 'GET') {
            const sql = `
        SELECT 
          p.id, p.name, p.slug, p.description, p.status, p.stars, p.tags,
          p.lead_name AS "leadName",
          p.lead_avatar AS "leadAvatar",
          p.created_at AS "createdAt",
          p.updated_at AS "updatedAt",
          COALESCE(COUNT(t.id) FILTER (WHERE t.status != 'done'), 0)::int AS "openTasksCount"
        FROM projects p
        LEFT JOIN tasks t ON t.project_id = p.id
        WHERE p.id::text = $1 OR p.slug = $1
        GROUP BY p.id
      `;

            const rows = await query(sql, [id]);

            if (rows.length === 0) {
                return errorResponse(res, 404, `Project not found with id or slug: ${id}`, 'PROJECT_NOT_FOUND');
            }

            const r = rows[0];
            return jsonResponse(res, 200, {
                project: {
                    id: r.id,
                    name: r.name,
                    slug: r.slug,
                    description: r.description,
                    status: r.status,
                    stars: r.stars,
                    tags: r.tags,
                    lead: { name: r.leadName, avatar: r.leadAvatar },
                    openTasksCount: r.openTasksCount,
                    createdAt: r.createdAt,
                    updatedAt: r.updatedAt,
                },
            });
        }

        if (req.method === 'PATCH' || req.method === 'PUT') {
            const body = req.body || {};
            const updates: string[] = [];
            const params: any[] = [];

            if (body.status && ['active', 'in_review', 'archived'].includes(body.status)) {
                params.push(body.status);
                updates.push(`status = $${params.length}`);
            }

            if (typeof body.description === 'string') {
                params.push(body.description.trim());
                updates.push(`description = $${params.length}`);
            }

            if (Array.isArray(body.tags)) {
                params.push(body.tags);
                updates.push(`tags = $${params.length}`);
            }

            if (typeof body.stars === 'number' && body.stars >= 0) {
                params.push(body.stars);
                updates.push(`stars = $${params.length}`);
            }

            if (updates.length === 0) {
                return errorResponse(res, 400, 'No valid fields provided for update', 'NO_FIELDS_TO_UPDATE');
            }

            params.push(id);
            const sql = `
        UPDATE projects
        SET ${updates.join(', ')}
        WHERE id::text = $${params.length}
        RETURNING 
          id, name, slug, description, status, stars, tags,
          lead_name AS "leadName",
          lead_avatar AS "leadAvatar",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `;

            const rows = await query(sql, params);

            if (rows.length === 0) {
                return errorResponse(res, 404, `Project not found with id: ${id}`, 'PROJECT_NOT_FOUND');
            }

            const r = rows[0];
            return jsonResponse(res, 200, {
                project: {
                    id: r.id,
                    name: r.name,
                    slug: r.slug,
                    description: r.description,
                    status: r.status,
                    stars: r.stars,
                    tags: r.tags,
                    lead: { name: r.leadName, avatar: r.leadAvatar },
                    createdAt: r.createdAt,
                    updatedAt: r.updatedAt,
                },
                message: 'Project updated successfully',
            });
        }

        if (req.method === 'DELETE') {
            const sql = `DELETE FROM projects WHERE id::text = $1 RETURNING id`;
            const rows = await query(sql, [id]);

            if (rows.length === 0) {
                return errorResponse(res, 404, `Project not found with id: ${id}`, 'PROJECT_NOT_FOUND');
            }

            return jsonResponse(res, 200, {
                success: true,
                deletedId: id,
                message: 'Project and associated tasks deleted successfully',
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

        console.error(`Project [id] API error:`, error);
        return errorResponse(res, 500, error.message || 'Internal server error', 'PROJECT_API_ERROR');
    }
}
