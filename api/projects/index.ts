import { query, DatabaseNotConfiguredError, checkHasUserIdColumn } from '../_utils/db.js';
import { validateProjectInput } from '../_utils/validate.js';
import { extractUserFromRequest } from '../_utils/auth.js';
import projectDetailHandler from './[id].js';
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

    // Set stage headers
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

    // If request has project id, delegate to projectDetailHandler
    if ((req.method === 'DELETE' || req.method === 'PATCH' || req.method === 'PUT') && (req.query?.id || (req.body && req.body.id))) {
        return projectDetailHandler(req, res);
    }
    if (req.method === 'GET' && req.query?.id && typeof req.query.id === 'string') {
        return projectDetailHandler(req, res);
    }

    try {
        const hasUserCol = await checkHasUserIdColumn();

        if (req.method === 'GET') {
            const { status, search, tag } = req.query;

            // Construct parameterized query safely
            const conditions: string[] = [];
            const params: any[] = [];

            // Strict user isolation scoping: only return projects belonging to authenticated user
            if (hasUserCol) {
                params.push(authUser.userId);
                conditions.push(`p.user_id = $${params.length}`);
            }

            if (status && typeof status === 'string' && status !== 'all') {
                params.push(status);
                conditions.push(`p.status = $${params.length}`);
            }

            if (search && typeof search === 'string' && search.trim()) {
                params.push(`%${search.trim()}%`);
                conditions.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
            }

            if (tag && typeof tag === 'string' && tag.trim()) {
                params.push(tag.trim());
                conditions.push(`$${params.length} = ANY(p.tags)`);
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

            const sql = `
        SELECT 
          p.id,
          p.name,
          p.slug,
          p.description,
          p.status,
          p.stars,
          p.tags,
          p.lead_name AS "leadName",
          p.lead_avatar AS "leadAvatar",
          p.created_at AS "createdAt",
          p.updated_at AS "updatedAt",
          COALESCE(COUNT(t.id) FILTER (WHERE t.status != 'done'), 0)::int AS "openTasksCount"
        FROM projects p
        LEFT JOIN tasks t ON t.project_id = p.id
        ${whereClause}
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `;

            const rows = await query(sql, params);

            // Map rows to frontend-friendly camelCase structure
            const projects = rows.map((r: any) => ({
                id: r.id,
                name: r.name,
                slug: r.slug,
                description: r.description || '',
                status: r.status,
                stars: r.stars || 0,
                tags: r.tags || [],
                lead: {
                    name: r.leadName,
                    avatar: r.leadAvatar,
                },
                openTasksCount: r.openTasksCount || 0,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
                lastActivity: r.updatedAt || r.createdAt,
            }));

            return jsonResponse(res, 200, {
                projects,
                count: projects.length,
            });
        }

        if (req.method === 'POST') {
            const body = req.body || {};
            const validation = validateProjectInput(body);

            if (!validation.isValid || !validation.data) {
                return validationErrorResponse(
                    res,
                    'Project validation failed',
                    validation.errors.map((msg) => ({ field: 'body', message: msg }))
                );
            }

            const { name, slug, description, status, tags, leadName, leadAvatar } = validation.data;
            // Always derive user ID exclusively from verified server session, never trust client input
            const targetUserId = authUser.userId;
            const finalLeadName = leadName === 'Sofia Chen' && authUser.name ? authUser.name : leadName;

            let sql: string;
            let params: any[];

            if (hasUserCol) {
                sql = `
          INSERT INTO projects (name, slug, description, status, tags, lead_name, lead_avatar, user_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING 
            id, name, slug, description, status, stars, tags,
            lead_name AS "leadName",
            lead_avatar AS "leadAvatar",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        `;
                params = [name, slug, description, status, tags, finalLeadName, leadAvatar, targetUserId];
            } else {
                sql = `
          INSERT INTO projects (name, slug, description, status, tags, lead_name, lead_avatar)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING 
            id, name, slug, description, status, stars, tags,
            lead_name AS "leadName",
            lead_avatar AS "leadAvatar",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        `;
                params = [name, slug, description, status, tags, finalLeadName, leadAvatar];
            }

            const rows = await query(sql, params);
            const created = rows[0];

            return jsonResponse(res, 201, {
                project: {
                    id: created.id,
                    name: created.name,
                    slug: created.slug,
                    description: created.description,
                    status: created.status,
                    stars: created.stars,
                    tags: created.tags,
                    lead: {
                        name: created.leadName,
                        avatar: created.leadAvatar,
                    },
                    openTasksCount: 0,
                    createdAt: created.createdAt,
                    updatedAt: created.updatedAt,
                    lastActivity: created.updatedAt,
                },
                message: 'Project created successfully in Neon database',
            });
        }

        return methodNotAllowedResponse(res, ['GET', 'POST']);
    } catch (error: any) {
        if (error instanceof DatabaseNotConfiguredError) {
            return jsonResponse(res, 503, {
                error: 'Database Not Configured',
                message: error.message,
                code: 'DATABASE_NOT_CONFIGURED',
                instructions: 'Please provide a valid DATABASE_URL in .env.local or your Vercel Environment Variables.',
            });
        }

        if (error.code === '23505') { // Unique constraint violation in Postgres
            return errorResponse(res, 409, 'A project with this name already exists', 'PROJECT_NAME_EXISTS');
        }

        console.error('Projects API error:', error);
        return errorResponse(res, 500, error.message || 'Internal server error', 'PROJECTS_API_ERROR');
    }
}
