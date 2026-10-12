import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    hashPassword,
    verifyPassword,
    createSessionToken,
    verifySessionToken,
    extractUserFromRequest,
    requireAuth,
    AuthUser,
} from '../api/_utils/auth.js';
import {
    validateRegisterInput,
    validateLoginInput,
} from '../api/_utils/validate.js';

describe('Password Hashing & Verification (scrypt)', () => {
    it('generates a valid salted scrypt hash string', async () => {
        const password = 'SuperSecretPassword123!';
        const hash = await hashPassword(password);

        assert.ok(hash.startsWith('scrypt$'), 'Hash must start with scrypt$');
        const parts = hash.split('$');
        assert.equal(parts.length, 3, 'Hash must contain 3 segments');
        assert.ok(parts[1].length >= 16, 'Salt must be at least 16 hex chars');
        assert.ok(parts[2].length > 32, 'Derived key must be non-empty hex');
    });

    it('verifies correct password against generated hash', async () => {
        const password = 'MySecurePassword2026';
        const hash = await hashPassword(password);

        const isValid = await verifyPassword(password, hash);
        assert.equal(isValid, true, 'Valid password must verify successfully');
    });

    it('rejects incorrect password against generated hash', async () => {
        const password = 'MySecurePassword2026';
        const hash = await hashPassword(password);

        const isValid = await verifyPassword('WrongPassword123', hash);
        assert.equal(isValid, false, 'Wrong password must be rejected');
    });

    it('safely handles empty or malformed inputs without throwing', async () => {
        assert.equal(await verifyPassword('', 'scrypt$abc$def'), false);
        assert.equal(await verifyPassword('test', ''), false);
        assert.equal(await verifyPassword('test', 'notahash'), false);
        assert.equal(await verifyPassword('test', 'scrypt$bad'), false);
    });
});

describe('Stateless JWT Session Token Generation & Verification', () => {
    const mockUser: AuthUser = {
        userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        email: 'alex.rivera@devflow.ai',
        name: 'Alex Rivera',
        role: 'developer',
    };

    it('creates and verifies a valid signed JWT session token', () => {
        const token = createSessionToken(mockUser);
        assert.ok(token.includes('.'), 'JWT must contain segments separated by dots');
        assert.equal(token.split('.').length, 3, 'JWT must contain header, payload, and signature');

        const payload = verifySessionToken(token);
        assert.ok(payload !== null, 'Token verification must succeed');
        assert.equal(payload?.userId, mockUser.userId);
        assert.equal(payload?.email, mockUser.email);
        assert.equal(payload?.name, mockUser.name);
        assert.equal(payload?.role, mockUser.role);
        assert.ok(payload!.exp > payload!.iat);
    });

    it('rejects a tampered JWT token', () => {
        const token = createSessionToken(mockUser);
        const parts = token.split('.');
        // Tamper with payload segment
        const tamperedToken = `${parts[0]}.eyJob2NrZWQiOnRydWV9.${parts[2]}`;

        const payload = verifySessionToken(tamperedToken);
        assert.equal(payload, null, 'Tampered token must be rejected');
    });

    it('rejects an expired JWT token', () => {
        // Create token with negative expiration (-10 seconds)
        const expiredToken = createSessionToken(mockUser, -10);
        const payload = verifySessionToken(expiredToken);
        assert.equal(payload, null, 'Expired token must be rejected');
    });

    it('extracts user from Authorization: Bearer header in VercelRequest', () => {
        const token = createSessionToken(mockUser);
        const mockReq: any = {
            headers: {
                authorization: `Bearer ${token}`,
            },
        };

        const extracted = extractUserFromRequest(mockReq);
        assert.ok(extracted !== null);
        assert.equal(extracted?.userId, mockUser.userId);
        assert.equal(extracted?.email, mockUser.email);
    });

    it('returns null when Authorization header is missing or invalid', () => {
        assert.equal(extractUserFromRequest({ headers: {} } as any), null);
        assert.equal(extractUserFromRequest({ headers: { authorization: 'Basic 12345' } } as any), null);
        assert.equal(extractUserFromRequest({ headers: { authorization: 'Bearer invalid.token.here' } } as any), null);
    });

    it('requireAuth writes 401 response when token is missing', () => {
        let statusCode = 0;
        let responseBody: any = null;

        const mockReq: any = { headers: {} };
        const mockRes: any = {
            setHeader: () => mockRes,
            status: (code: number) => {
                statusCode = code;
                return mockRes;
            },
            json: (body: any) => {
                responseBody = body;
                return mockRes;
            },
        };

        const user = requireAuth(mockReq, mockRes);
        assert.equal(user, null);
        assert.equal(statusCode, 401);
        assert.equal(responseBody?.error?.code, 'UNAUTHORIZED');
    });
});

describe('Auth Input Validation', () => {
    it('validates a correct registration payload', () => {
        const result = validateRegisterInput({
            name: 'Jordan Lee',
            email: 'jordan@devflow.ai',
            password: 'StrongPassword2026!',
        });

        assert.equal(result.isValid, true);
        assert.equal(result.data?.email, 'jordan@devflow.ai');
        assert.equal(result.data?.name, 'Jordan Lee');
    });

    it('rejects registration with invalid email', () => {
        const result = validateRegisterInput({
            name: 'Jordan Lee',
            email: 'not-an-email',
            password: 'StrongPassword2026!',
        });

        assert.equal(result.isValid, false);
        assert.ok(result.errors.some((e) => e.includes('valid email')));
    });

    it('rejects registration with short password (< 8 chars)', () => {
        const result = validateRegisterInput({
            name: 'Jordan Lee',
            email: 'jordan@devflow.ai',
            password: 'short',
        });

        assert.equal(result.isValid, false);
        assert.ok(result.errors.some((e) => e.includes('8 characters')));
    });

    it('validates a correct login payload', () => {
        const result = validateLoginInput({
            email: 'jordan@devflow.ai',
            password: 'StrongPassword2026!',
        });

        assert.equal(result.isValid, true);
        assert.equal(result.data?.email, 'jordan@devflow.ai');
    });

    it('rejects login with missing password', () => {
        const result = validateLoginInput({
            email: 'jordan@devflow.ai',
            password: '',
        });

        assert.equal(result.isValid, false);
        assert.ok(result.errors.some((e) => e.includes('Password is required')));
    });
});
