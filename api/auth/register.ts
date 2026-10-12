import { query, DatabaseNotConfiguredError } from '../_utils/db.js';
import { hashPassword, createSessionToken } from '../_utils/auth.js';
import { validateRegisterInput } from '../_utils/validate.js';
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

        const validation = validateRegisterInput(body);
        if (!validation.isValid || !validation.data) {
            return validationErrorResponse(
                res,
                'Registration validation failed',
                validation.errors.map((msg) => ({ field: 'body', message: msg }))
            );
        }

        const { name, email, password } = validation.data;

        // Check if user already exists
        const existingUsers = await query<{ id: string }>(
            'SELECT id FROM users WHERE email = $1 LIMIT 1',
            [email]
        );

        if (existingUsers.length > 0) {
            return errorResponse(res, 409, 'An account with this email address already exists', 'EMAIL_ALREADY_EXISTS');
        }

        // Hash password with salted scrypt
        const passwordHash = await hashPassword(password);
        const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;

        // Insert new user
        const sql = `
            INSERT INTO users (name, email, password_hash, avatar, role)
            VALUES ($1, $2, $3, $4, 'developer')
            RETURNING id, name, email, avatar, role, created_at AS "createdAt"
        `;

        const rows = await query(sql, [name, email, passwordHash, defaultAvatar]);
        const newUser = rows[0];

        // Generate signed JWT token
        const token = createSessionToken({
            userId: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
        });

        return jsonResponse(
            res,
            201,
            {
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    avatar: newUser.avatar,
                    role: newUser.role,
                    createdAt: newUser.createdAt,
                },
                token,
                message: 'Account created successfully',
            }
        );
    } catch (error: any) {
        if (error instanceof DatabaseNotConfiguredError) {
            return jsonResponse(res, 503, {
                error: 'Database Not Configured',
                message: error.message,
                code: 'DATABASE_NOT_CONFIGURED',
            });
        }

        // Handle unique constraint violation in Postgres
        if (error.code === '23505') {
            return errorResponse(res, 409, 'An account with this email address already exists', 'EMAIL_ALREADY_EXISTS');
        }

        console.error('Registration API error:', error);
        return errorResponse(res, 500, error.message || 'Internal server error during registration', 'REGISTRATION_ERROR');
    }
}
