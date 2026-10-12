import { query, DatabaseNotConfiguredError } from '../_utils/db.js';
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
    if (handleCors(req, res, ['GET', 'OPTIONS'])) {
        return;
    }

    if (req.method !== 'GET') {
        return methodNotAllowedResponse(res, ['GET']);
    }

    const authUser = requireAuth(req, res);
    if (!authUser) {
        return; // requireAuth already sent 401 error response
    }

    try {
        const rows = await query<{
            id: string;
            name: string;
            email: string;
            avatar: string;
            role: 'developer' | 'lead' | 'admin';
            created_at: string;
            updated_at: string;
        }>(
            'SELECT id, name, email, avatar, role, created_at, updated_at FROM users WHERE id = $1 LIMIT 1',
            [authUser.userId]
        );

        if (rows.length === 0) {
            return errorResponse(res, 404, 'User account no longer exists', 'USER_NOT_FOUND');
        }

        const user = rows[0];

        return jsonResponse(res, 200, {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
            },
        });
    } catch (error: any) {
        if (error instanceof DatabaseNotConfiguredError) {
            return jsonResponse(res, 503, {
                error: 'Database Not Configured',
                message: error.message,
                code: 'DATABASE_NOT_CONFIGURED',
            });
        }

        console.error('Auth /me API error:', error);
        return errorResponse(res, 500, error.message || 'Internal server error', 'AUTH_ME_ERROR');
    }
}
