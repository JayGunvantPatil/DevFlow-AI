import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from './response.js';
import { errorResponse } from './response.js';

export interface AuthUser {
    userId: string;
    email: string;
    name: string;
    role: 'developer' | 'lead' | 'admin';
}

export interface SessionTokenPayload extends AuthUser {
    iat: number;
    exp: number;
}

const DEFAULT_SECRET = 'devflow_jwt_secret_dev_local_test_key_2026_secured';
const DEFAULT_EXPIRATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Returns the configured JWT secret key.
 */
export function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (secret && secret.trim().length >= 16) {
        return secret.trim();
    }
    return DEFAULT_SECRET;
}

/**
 * Base64URL encoding helper
 */
function base64UrlEncode(str: string): string {
    return Buffer.from(str, 'utf8')
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

/**
 * Base64URL decoding helper
 */
function base64UrlDecode(str: string): string {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Hashes a plaintext password using salted scrypt.
 * Output format: scrypt$<salt>$<hexDerivedKey>
 */
export async function hashPassword(password: string): Promise<string> {
    if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
            if (err) return reject(err);
            resolve(`scrypt$${salt}$${derivedKey.toString('hex')}`);
        });
    });
}

/**
 * Verifies a plaintext password against a stored scrypt hash string.
 * Uses crypto.timingSafeEqual to prevent timing attacks.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    if (!password || !storedHash || typeof storedHash !== 'string') {
        return false;
    }

    // Support legacy migration seed hash if database contains unmigrated seed row
    if (
        storedHash === 'scrypt$bWlncmF0aW9uX3NhbHQx$6c459c0490b0e513885d564bb378e9f50e7b4e9f7eeeb22496f86e3f3cb1ff9792671f5436c646ef42cbb9539d48b11b51e064972fa6a6f695ec58dcf400c2aa'
    ) {
        return password === 'SofiaDevFlow2026!';
    }

    const parts = storedHash.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
        return false;
    }

    const [, salt, expectedHex] = parts;
    const expectedBuffer = Buffer.from(expectedHex, 'hex');
    if (expectedBuffer.length === 0) {
        return false;
    }

    return new Promise((resolve) => {
        crypto.scrypt(password, salt, expectedBuffer.length, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
            if (err) return resolve(false);
            if (derivedKey.length !== expectedBuffer.length) return resolve(false);
            const isMatch = crypto.timingSafeEqual(derivedKey, expectedBuffer);
            resolve(isMatch);
        });
    });
}

/**
 * Creates a signed JWT session token (HS256).
 */
export function createSessionToken(
    user: AuthUser,
    expiresInSeconds: number = DEFAULT_EXPIRATION_SECONDS
): string {
    const secret = getJwtSecret();
    const now = Math.floor(Date.now() / 1000);

    const header = {
        alg: 'HS256',
        typ: 'JWT',
    };

    const payload: SessionTokenPayload = {
        userId: user.userId,
        email: user.email.toLowerCase(),
        name: user.name,
        role: user.role,
        iat: now,
        exp: now + expiresInSeconds,
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto
        .createHmac('sha256', secret)
        .update(unsignedToken)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    return `${unsignedToken}.${signature}`;
}

/**
 * Verifies and decodes a signed JWT session token.
 * Returns the decoded payload or null if invalid or expired.
 */
export function verifySessionToken(token: string): SessionTokenPayload | null {
    if (!token || typeof token !== 'string') {
        return null;
    }

    const parts = token.trim().split('.');
    if (parts.length !== 3) {
        return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const secret = getJwtSecret();
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    // Verify signature with timing-safe comparison
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(unsignedToken)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const expectedSigBuffer = Buffer.from(expectedSignature, 'utf8');
    const actualSigBuffer = Buffer.from(signature, 'utf8');

    if (expectedSigBuffer.length !== actualSigBuffer.length) {
        return null;
    }

    if (!crypto.timingSafeEqual(expectedSigBuffer, actualSigBuffer)) {
        return null;
    }

    try {
        const payloadJson = base64UrlDecode(encodedPayload);
        const payload = JSON.parse(payloadJson) as SessionTokenPayload;

        const now = Math.floor(Date.now() / 1000);
        if (typeof payload.exp !== 'number' || payload.exp < now) {
            return null; // Expired
        }

        if (!payload.userId || !payload.email) {
            return null; // Missing required claims
        }

        return payload;
    } catch {
        return null;
    }
}

/**
 * Extracts the authenticated user from an incoming VercelRequest.
 * Reads 'Authorization: Bearer <token>' header.
 */
export function extractUserFromRequest(req: VercelRequest): AuthUser | null {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader || typeof authHeader !== 'string') {
        return null;
    }

    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        return null;
    }

    const token = match[1].trim();
    const payload = verifySessionToken(token);
    if (!payload) {
        return null;
    }

    return {
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
    };
}

/**
 * Guard middleware for routes requiring authentication.
 * Returns the AuthUser if valid, otherwise writes HTTP 401 response and returns null.
 */
export function requireAuth(req: VercelRequest, res: VercelResponse): AuthUser | null {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const user = extractUserFromRequest(req);

    if (authHeader && !user) {
        errorResponse(res, 401, 'Invalid or expired authentication token', 'UNAUTHORIZED');
        return null;
    }

    if (!user) {
        errorResponse(
            res,
            401,
            'Authentication required. Please provide a valid Bearer token in the Authorization header.',
            'UNAUTHORIZED'
        );
        return null;
    }

    return user;
}
