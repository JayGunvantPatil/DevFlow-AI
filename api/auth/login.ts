import { query, DatabaseNotConfiguredError } from '../_utils/db.js';
import { verifyPassword, createSessionToken, hashPassword } from '../_utils/auth.js';
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
            console.warn('[Auth/Login] Validation rejected login payload:', validation.errors);
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
            'SELECT id, name, email, password_hash, avatar, role, created_at FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
            [email]
        );

        if (rows.length === 0) {
            console.warn(`[Auth/Login] Authentication failed: user account with email "${email}" not found.`);
            return errorResponse(res, 401, 'Invalid email or password', 'INVALID_CREDENTIALS');
        }

        const user = rows[0];

        // Verify password using timing-safe comparison
        const isPasswordValid = await verifyPassword(password, user.password_hash);
        if (!isPasswordValid) {
            console.warn(`[Auth/Login] Authentication failed: invalid password supplied for email "${email}".`);
            return errorResponse(res, 401, 'Invalid email or password', 'INVALID_CREDENTIALS');
        }

        // Self-heal/upgrade legacy seed hash if present
        if (user.password_hash.includes('bWlncmF0aW9uX3NhbHQx')) {
            try {
                const upgradedHash = await hashPassword(password);
                await query('UPDATE users SET password_hash = $1 WHERE id = $2', [upgradedHash, user.id]);
                console.log(`[Auth/Login] Upgraded legacy password hash to modern scrypt for user: "${user.email}"`);
            } catch (upgradeErr) {
                // Non-blocking background upgrade failure
                console.error('[Auth/Login] Could not upgrade legacy password hash:', upgradeErr);
            }
        }

        console.log(`[Auth/Login] Authentication successful for user ID: ${user.id} (${user.email})`);

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
