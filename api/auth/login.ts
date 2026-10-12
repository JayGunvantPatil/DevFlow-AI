import { query, DatabaseNotConfiguredError } from '../_utils/db.js';
import { verifyPassword, createSessionToken } from '../_utils/auth.js';
import { validateLoginInput } from '../_utils/validate.js';
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
    if (handleCors(req, res, ['POST', 'OPTIONS'])) {
        return;
    }

    if (req.method !== 'POST') {
        return methodNotAllowedResponse(res, ['POST']);
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch {
                body = {};
            }
        }

        const validation = validateLoginInput(body);
        if (!validation.isValid || !validation.data) {
            return validationErrorResponse(
                res,
                'Login validation failed',
                validation.errors.map((msg) => ({ field: 'body', message: msg }))
            );
        }

        const { email, password } = validation.data;

        // Fetch user by lowercase email
        const rows = await query<{
            id: string;
            name: string;
            email: string;
            password_hash: string;
            avatar: string;
            role: 'developer' | 'lead' | 'admin';
            created_at: string;
        }>(
            'SELECT id, name, email, password_hash, avatar, role, created_at FROM users WHERE email = $1 LIMIT 1',
            [email]
        );

        if (rows.length === 0) {
            // Constant-time dummy check could be added, but 401 prevents enumeration
            return errorResponse(res, 401, 'Invalid email or password', 'INVALID_CREDENTIALS');
        }

        const user = rows[0];

        // Verify password using timing-safe comparison
        const isPasswordValid = await verifyPassword(password, user.password_hash);
        if (!isPasswordValid) {
            return errorResponse(res, 401, 'Invalid email or password', 'INVALID_CREDENTIALS');
        }

        // Generate signed JWT token
        const token = createSessionToken({
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        });

        return jsonResponse(res, 200, {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                createdAt: user.created_at,
            },
            token,
            message: 'Logged in successfully',
        });
    } catch (error: any) {
        if (error instanceof DatabaseNotConfiguredError) {
            return jsonResponse(res, 503, {
                error: 'Database Not Configured',
                message: error.message,
                code: 'DATABASE_NOT_CONFIGURED',
            });
        }

        console.error('Login API error:', error);
        return errorResponse(res, 500, error.message || 'Internal server error during login', 'LOGIN_ERROR');
    }
}
