import { query, executeTransaction, DatabaseNotConfiguredError, checkHasUserIdColumn } from '../_utils/db.js';
import { requireAuth } from '../_utils/auth.js';
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
    const authUser = requireAuth(req, res);
    if (!authUser) {
        return;
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
        return errorResponse(res, 400, 'Invalid or missing project id parameter', 'INVALID_ID');
    }
    const cleanId = id.trim();

    try {
        const hasUserCol = await checkHasUserIdColumn();

        if (req.method === 'GET') {
            // First look up the project to check existence and ownership
            const sql = `
        SELECT 
          p.id, p.name, p.slug, p.description, p.status, p.stars, p.tags,
          p.lead_name AS "leadName",
          p.lead_avatar AS "leadAvatar",
          p.created_at AS "createdAt",
          p.updated_at AS "updatedAt",
          p.user_id AS "userId",
          COALESCE(COUNT(t.id) FILTER (WHERE t.status != 'done'), 0)::int AS "openTasksCount"
        FROM projects p
        LEFT JOIN tasks t ON t.project_id = p.id
        WHERE (p.id::text = $1 OR p.slug = $1)
        GROUP BY p.id
      `;

            const rows = await query(sql, [cleanId]);

            if (rows.length === 0) {
                return errorResponse(res, 404, `Project not found with id or slug: ${cleanId}`, 'PROJECT_NOT_FOUND');
            }

            const r = rows[0];

            // Enforce ownership: 403 Forbidden if project belongs to another user
            if (hasUserCol && r.userId && r.userId !== authUser.userId) {
                return errorResponse(res, 403, 'Access forbidden: You do not have permission to access this project', 'FORBIDDEN');
            }

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
            const updates: string[] = [];
            const params: any[] = [];

            if (body.name !== undefined) {
                const name = typeof body.name === 'string' ? body.name.trim() : '';
                if (!name || name.length < 2 || name.length > 100) {
                    return errorResponse(res, 400, 'Project name must be between 2 and 100 characters', 'INVALID_NAME');
                }
                if (!/^[a-zA-Z0-9-_\s.]+$/.test(name)) {
                    return errorResponse(res, 400, 'Project name contains invalid characters. Use letters, numbers, dashes, or dots', 'INVALID_NAME');
                }
                const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                params.push(name);
                updates.push(`name = $${params.length}`);
                params.push(slug);
                updates.push(`slug = $${params.length}`);
            }

            if (body.status !== undefined) {
                if (!['active', 'in_review', 'archived'].includes(body.status)) {
                    return errorResponse(
                        res,
                        400,
                        `Invalid project status: '${body.status}'. Allowed statuses: active, in_review, archived`,
                        'INVALID_STATUS'
                    );
                }
                params.push(body.status);
                updates.push(`status = $${params.length}`);
            }

            if (body.description !== undefined) {
                const desc = typeof body.description === 'string' ? body.description.trim() : '';
                if (desc.length > 1000) {
                    return errorResponse(res, 400, 'Description cannot exceed 1000 characters', 'INVALID_DESCRIPTION');
                }
                params.push(desc);
                updates.push(`description = $${params.length}`);
            }

            if (body.tags !== undefined) {
                let tagsArray: string[] = [];
                if (Array.isArray(body.tags)) {
                    tagsArray = body.tags.map((t: any) => String(t).trim()).filter(Boolean);
                } else if (typeof body.tags === 'string') {
                    tagsArray = body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
                }
                params.push(tagsArray);
                updates.push(`tags = $${params.length}`);
            }

            if (typeof body.stars === 'number' && body.stars >= 0) {
                params.push(body.stars);
                updates.push(`stars = $${params.length}`);
            }

            if (typeof body.leadName === 'string' && body.leadName.trim()) {
                params.push(body.leadName.trim().slice(0, 100));
                updates.push(`lead_name = $${params.length}`);
            }

            if (typeof body.leadAvatar === 'string' && body.leadAvatar.trim()) {
                params.push(body.leadAvatar.trim());
                updates.push(`lead_avatar = $${params.length}`);
            }

            if (updates.length === 0) {
                return errorResponse(res, 400, 'No valid fields provided for update', 'NO_FIELDS_TO_UPDATE');
            }

            // Verify project existence and ownership before updating
            if (hasUserCol) {
                const existing = await query<{ id: string; user_id: string }>(
                    'SELECT id, user_id FROM projects WHERE id::text = $1',
                    [cleanId]
                );
                if (existing.length === 0) {
                    return errorResponse(res, 404, `Project not found with id: ${cleanId}`, 'PROJECT_NOT_FOUND');
                }
                if (existing[0].user_id && existing[0].user_id !== authUser.userId) {
                    return errorResponse(res, 403, 'Access forbidden: You do not have permission to modify this project', 'FORBIDDEN');
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
        UPDATE projects
        SET ${updates.join(', ')}
        WHERE id::text = ${idPlaceholder} ${userWhereClause}
        RETURNING 
          id, name, slug, description, status, stars, tags,
          lead_name AS "leadName",
          lead_avatar AS "leadAvatar",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `;

            const rows = await query(sql, params);

            if (rows.length === 0) {
                return errorResponse(res, 404, `Project not found with id: ${cleanId}`, 'PROJECT_NOT_FOUND');
            }

            const countRes = await query<{ count: number }>(
                'SELECT COALESCE(COUNT(id) FILTER (WHERE status != \'done\'), 0)::int AS count FROM tasks WHERE project_id::text = $1',
                [cleanId]
            );
            const openTasksCount = countRes[0]?.count ?? 0;

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
                    openTasksCount,
                    createdAt: r.createdAt,
                    updatedAt: r.updatedAt,
                },
                message: 'Project updated successfully',
            });
        }

        if (req.method === 'DELETE') {
            // Verify project existence and ownership before deleting
            if (hasUserCol) {
                const existing = await query<{ id: string; user_id: string }>(
                    'SELECT id, user_id FROM projects WHERE id::text = $1',
                    [cleanId]
                );
                if (existing.length === 0) {
                    return errorResponse(res, 404, `Project not found with id: ${cleanId}`, 'PROJECT_NOT_FOUND');
                }
                if (existing[0].user_id && existing[0].user_id !== authUser.userId) {
                    return errorResponse(res, 403, 'Access forbidden: You do not have permission to delete this project', 'FORBIDDEN');
                }
            }

            // Atomic project and tasks deletion using database transaction
            await executeTransaction([
                { text: 'DELETE FROM tasks WHERE project_id::text = $1', params: [cleanId] },
                {
                    text: hasUserCol
                        ? 'DELETE FROM projects WHERE id::text = $1 AND user_id = $2'
                        : 'DELETE FROM projects WHERE id::text = $1',
                    params: hasUserCol ? [cleanId, authUser.userId] : [cleanId],
                },
            ]);

            return jsonResponse(res, 200, {
                success: true,
                deletedId: cleanId,
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

        if (error.code === '23505') {
            return errorResponse(res, 409, 'A project with this name already exists', 'PROJECT_NAME_EXISTS');
        }

        console.error(`Project [id] API error:`, error);
        return errorResponse(res, 500, error.message || 'Internal server error', 'PROJECT_API_ERROR');
    }
}
