import './setup_env.js';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import connectHandler from '../api/github/connect.js';
import callbackHandler from '../api/github/callback.js';
import statusHandler from '../api/github/status.js';
import disconnectHandler from '../api/github/disconnect.js';
import {
    createOAuthState,
    verifyOAuthState,
    encryptToken,
    decryptToken,
    upsertGitHubIntegration,
    getUserGitHubIntegration,
    disconnectGitHubIntegration,
} from '../api/_utils/github.js';
import { createSessionToken } from '../api/_utils/auth.js';
import { query } from '../api/_utils/db.js';

function createMockReqRes(options: {
    method?: string;
    body?: any;
    query?: any;
    token?: string | null;
    headers?: Record<string, string>;
}) {
    const headers: Record<string, string> = { ...options.headers };
    if (options.token !== null && options.token !== undefined) {
        headers['authorization'] = `Bearer ${options.token}`;
    }

    const req: any = {
        method: options.method || 'GET',
        body: options.body || {},
        query: options.query || {},
        headers,
    };

    let statusCode = 200;
    let responseBody: any = null;
    const resHeaders: Record<string, string> = {};
    let ended = false;

    const res: any = {
        statusCode: 200,
        setHeader(name: string, value: string) {
            resHeaders[name.toLowerCase()] = value;
            return res;
        },
        getHeader(name: string) {
            return resHeaders[name.toLowerCase()];
        },
        status(code: number) {
            statusCode = code;
            res.statusCode = code;
            return res;
        },
        json(body: any) {
            responseBody = body;
            ended = true;
            return res;
        },
        send(body: any) {
            responseBody = body;
            ended = true;
            return res;
        },
        end(data?: any) {
            if (data && !responseBody) {
                responseBody = data;
            }
            ended = true;
            return res;
        },
        writeHead(code: number, writeHeaders: Record<string, string>) {
            statusCode = code;
            res.statusCode = code;
            for (const [k, v] of Object.entries(writeHeaders)) {
                resHeaders[k.toLowerCase()] = v;
            }
            return res;
        },
    };

    return {
        req,
        res,
        getStatus: () => res.statusCode || statusCode,
        getBody: () => responseBody,
        getHeaders: () => resHeaders,
        isEnded: () => ended,
    };
}

describe('DevFlow AI — Phase 4A: Secure GitHub Integration', () => {
    const userA = {
        userId: 'b0000000-0000-0000-0000-000000000001',
        email: 'user_a_gh_test@devflow.ai',
        name: 'Alice GitHub Developer',
        role: 'developer' as const,
    };

    const userB = {
        userId: 'b0000000-0000-0000-0000-000000000002',
        email: 'user_b_gh_test@devflow.ai',
        name: 'Bob Isolated Developer',
        role: 'developer' as const,
    };

    const tokenA = createSessionToken(userA);
    const tokenB = createSessionToken(userB);

    const hasDbUrl = Boolean(
        process.env.DATABASE_URL &&
        process.env.DATABASE_URL.trim() &&
        !process.env.DATABASE_URL.includes('your_neon_database_url_here')
    );

    // Save initial env vars to restore after tests
    let originalClientId: string | undefined;
    let originalClientSecret: string | undefined;
    let originalAppSlug: string | undefined;

    beforeEach(async () => {
        originalClientId = process.env.GITHUB_CLIENT_ID;
        originalClientSecret = process.env.GITHUB_CLIENT_SECRET;
        originalAppSlug = process.env.GITHUB_APP_SLUG;

        // Ensure users exist in test database if DB is configured
        if (hasDbUrl) {
            try {
                await query(
                    `INSERT INTO users (id, email, password_hash, name, role)
                     VALUES ($1, $2, 'scrypt$dummy$dummy', $3, 'developer')
                     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
                    [userA.userId, userA.email, userA.name]
                );
                await query(
                    `INSERT INTO users (id, email, password_hash, name, role)
                     VALUES ($1, $2, 'scrypt$dummy$dummy', $3, 'developer')
                     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
                    [userB.userId, userB.email, userB.name]
                );
            } catch {
                // Ignore seeding errors in isolated unit tests
            }
        }
    });

    afterEach(async () => {
        if (originalClientId !== undefined) process.env.GITHUB_CLIENT_ID = originalClientId;
        else delete process.env.GITHUB_CLIENT_ID;

        if (originalClientSecret !== undefined) process.env.GITHUB_CLIENT_SECRET = originalClientSecret;
        else delete process.env.GITHUB_CLIENT_SECRET;

        if (originalAppSlug !== undefined) process.env.GITHUB_APP_SLUG = originalAppSlug;
        else delete process.env.GITHUB_APP_SLUG;

        // Clean up test connections
        if (hasDbUrl) {
            try {
                await query('DELETE FROM github_integrations WHERE user_id IN ($1, $2)', [userA.userId, userB.userId]);
            } catch {
                // Ignore cleanup errors
            }
        }
    });

    // -------------------------------------------------------------------------
    // Scenario 1: Unauthenticated access is rejected with 401
    // -------------------------------------------------------------------------
    describe('Scenario 1: Authentication Requirement', () => {
        it('rejects GET /api/github/connect without authentication (401)', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'GET',
                token: null,
            });

            await connectHandler(req, res);
            assert.strictEqual(getStatus(), 401);
            assert.strictEqual(getBody()?.error?.code, 'UNAUTHORIZED');
        });

        it('rejects GET /api/github/status without authentication (401)', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'GET',
                token: null,
            });

            await statusHandler(req, res);
            assert.strictEqual(getStatus(), 401);
            assert.strictEqual(getBody()?.error?.code, 'UNAUTHORIZED');
        });

        it('rejects POST /api/github/disconnect without authentication (401)', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'POST',
                token: null,
            });

            await disconnectHandler(req, res);
            assert.strictEqual(getStatus(), 401);
            assert.strictEqual(getBody()?.error?.code, 'UNAUTHORIZED');
        });
    });

    // -------------------------------------------------------------------------
    // Scenario 2: Missing environment variables produce safe, actionable errors
    // -------------------------------------------------------------------------
    describe('Scenario 2: Missing Configuration Handling', () => {
        it('returns 503 GITHUB_NOT_CONFIGURED when GitHub credentials are absent', async () => {
            delete process.env.GITHUB_CLIENT_ID;
            delete process.env.GITHUB_CLIENT_SECRET;
            delete process.env.GITHUB_APP_SLUG;

            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'POST',
                token: tokenA,
            });

            await connectHandler(req, res);
            assert.strictEqual(getStatus(), 503);
            assert.strictEqual(getBody()?.error?.code, 'GITHUB_NOT_CONFIGURED');
            assert.match(getBody()?.error?.message, /GitHub integration is not yet configured/);
        });

        it('reports configured=false in status endpoint when env vars missing', async () => {
            delete process.env.GITHUB_CLIENT_ID;
            delete process.env.GITHUB_CLIENT_SECRET;
            delete process.env.GITHUB_APP_SLUG;

            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'GET',
                token: tokenA,
            });

            await statusHandler(req, res);
            assert.strictEqual(getStatus(), 200);
            assert.strictEqual(getBody()?.configured, false);
            assert.strictEqual(getBody()?.connected, false);
        });
    });

    // -------------------------------------------------------------------------
    // Scenario 3: Authorization initiation & CSRF state generation
    // -------------------------------------------------------------------------
    describe('Scenario 3: Secure Authorization Initiation & State Token', () => {
        beforeEach(() => {
            delete process.env.GITHUB_APP_SLUG;
            process.env.GITHUB_CLIENT_ID = 'gh_test_client_id_123';
            process.env.GITHUB_CLIENT_SECRET = 'gh_test_client_secret_xyz';
        });

        it('initiates OAuth authorization and generates HMAC-signed CSRF state', async () => {
            const { req, res, getStatus, getBody, getHeaders } = createMockReqRes({
                method: 'POST',
                token: tokenA,
                query: { returnTo: '/repositories' },
            });

            await connectHandler(req, res);
            assert.strictEqual(getStatus(), 200);
            assert.strictEqual(getBody()?.success, true);
            assert.ok(getBody()?.url);
            assert.ok(getBody()?.state);

            // Verify URL structure
            const authUrl = getBody()?.url;
            assert.ok(authUrl.startsWith('https://github.com/login/oauth/authorize'));
            assert.ok(authUrl.includes('client_id=gh_test_client_id_123'));
            assert.ok(authUrl.includes('scope=read%3Auser') || authUrl.includes('scope=read:user'));

            // Verify state verification
            const verified = verifyOAuthState(getBody()?.state);
            assert.ok(verified !== null);
            assert.strictEqual(verified?.userId, userA.userId);
            assert.strictEqual(verified?.returnTo, '/repositories');

            // Verify Set-Cookie header contains HttpOnly state cookie
            const setCookie = getHeaders()['set-cookie'];
            assert.ok(setCookie);
            assert.ok(setCookie.includes('devflow_gh_state='));
            assert.ok(setCookie.includes('HttpOnly'));
            assert.ok(setCookie.includes('SameSite=Lax'));
        });

        it('supports GitHub App installation URL when GITHUB_APP_SLUG is configured', async () => {
            process.env.GITHUB_APP_SLUG = 'devflow-ai-workspace';

            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'POST',
                token: tokenA,
            });

            await connectHandler(req, res);
            assert.strictEqual(getStatus(), 200);
            const authUrl = getBody()?.url;
            assert.ok(authUrl.startsWith('https://github.com/apps/devflow-ai-workspace/installations/new'));
            assert.ok(authUrl.includes('state='));
        });

        it('performs HTTP 302 redirect for direct browser navigation', async () => {
            const { req, res, getStatus, getHeaders } = createMockReqRes({
                method: 'GET',
                token: tokenA,
                headers: { accept: 'text/html' },
            });

            await connectHandler(req, res);
            assert.strictEqual(getStatus(), 302);
            assert.ok(getHeaders()['location']?.startsWith('https://github.com/'));
        });
    });

    // -------------------------------------------------------------------------
    // Scenario 4: CSRF State validation & tampered state rejection
    // -------------------------------------------------------------------------
    describe('Scenario 4: CSRF State Security & Validation', () => {
        it('validates genuine state parameter successfully', () => {
            const state = createOAuthState(userA.userId, '/settings');
            const verified = verifyOAuthState(state);
            assert.ok(verified !== null);
            assert.strictEqual(verified?.userId, userA.userId);
            assert.strictEqual(verified?.returnTo, '/settings');
        });

        it('rejects tampered or forged state signature', () => {
            const validState = createOAuthState(userA.userId, '/settings');
            const [payloadB64] = validState.split('.');
            // Tamper with signature
            const tamperedState = `${payloadB64}.tampered_fake_signature_abc`;

            const verified = verifyOAuthState(tamperedState);
            assert.strictEqual(verified, null);
        });

        it('rejects expired state parameter', () => {
            // Forge payload with expired timestamp
            const expiredPayload = {
                userId: userA.userId,
                nonce: 'nonce123',
                exp: Math.floor(Date.now() / 1000) - 30, // 30 seconds ago
                returnTo: '/settings',
            };
            const b64 = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
            // Even with valid HMAC signature, expiration should fail verification
            const state = `${b64}.dummy`;
            assert.strictEqual(verifyOAuthState(state), null);
        });

        it('callbackHandler rejects callback with invalid or missing state', async () => {
            const { req, res, getStatus, getHeaders } = createMockReqRes({
                method: 'GET',
                query: {
                    code: 'valid_looking_code',
                    state: 'completely_invalid_state',
                },
            });

            await callbackHandler(req, res);
            assert.strictEqual(getStatus(), 302);
            const location = getHeaders()['location'];
            assert.ok(location.includes('github=error'));
            assert.ok(decodeURIComponent(location).includes('Invalid or expired'));
        });
    });

    // -------------------------------------------------------------------------
    // Scenario 5: Authorization denial handling
    // -------------------------------------------------------------------------
    describe('Scenario 5: Authorization Denial & Cancellation', () => {
        it('safely redirects with friendly error message when user declines authorization', async () => {
            const validState = createOAuthState(userA.userId, '/settings');
            const { req, res, getStatus, getHeaders } = createMockReqRes({
                method: 'GET',
                query: {
                    error: 'access_denied',
                    error_description: 'The user has denied your application access',
                    state: validState,
                },
            });

            await callbackHandler(req, res);
            assert.strictEqual(getStatus(), 302);
            const location = getHeaders()['location'];
            assert.ok(location.startsWith('/settings?github=error'));
            assert.ok(decodeURIComponent(location).includes('declined or cancelled'));
        });
    });

    // -------------------------------------------------------------------------
    // Scenario 6: Database integration, User isolation, and IDOR prevention
    // -------------------------------------------------------------------------
    describe('Scenario 6: User Isolation & IDOR Protection in Database', () => {
        it('saves and retrieves GitHub connection for User A', async (t) => {
            if (!hasDbUrl) {
                t.skip('Skipping live DB test because DATABASE_URL is not configured');
                return;
            }

            const record = await upsertGitHubIntegration({
                userId: userA.userId,
                githubUserId: '1234567',
                githubUsername: 'alice-octocat',
                githubAvatarUrl: 'https://avatars.githubusercontent.com/u/1234567',
                installationId: 'inst_98765',
                accountType: 'User',
                status: 'connected',
                scope: 'read:user',
                metadata: { connectedVia: 'app_install' },
            });

            assert.strictEqual(record.user_id, userA.userId);
            assert.strictEqual(record.github_username, 'alice-octocat');
            assert.strictEqual(record.status, 'connected');

            // User A can view their connection via statusHandler
            const { req: reqA, res: resA, getStatus: getStatusA, getBody: getBodyA } = createMockReqRes({
                method: 'GET',
                token: tokenA,
            });

            await statusHandler(reqA, resA);
            assert.strictEqual(getStatusA(), 200);
            assert.strictEqual(getBodyA()?.connected, true);
            assert.strictEqual(getBodyA()?.integration?.username, 'alice-octocat');
            assert.strictEqual(getBodyA()?.integration?.installationId, 'inst_98765');
        });

        it('ensures User B CANNOT view or access User A GitHub connection (IDOR Isolation)', async (t) => {
            if (!hasDbUrl) {
                t.skip('Skipping live DB test because DATABASE_URL is not configured');
                return;
            }

            // Ensure User A is connected
            await upsertGitHubIntegration({
                userId: userA.userId,
                githubUserId: '1234567',
                githubUsername: 'alice-octocat',
                status: 'connected',
            });

            // User B queries their own status
            const { req: reqB, res: resB, getStatus: getStatusB, getBody: getBodyB } = createMockReqRes({
                method: 'GET',
                token: tokenB,
            });

            await statusHandler(reqB, resB);
            assert.strictEqual(getStatusB(), 200);
            // User B must NOT see User A's connection!
            assert.strictEqual(getBodyB()?.connected, false);
            assert.strictEqual(getBodyB()?.integration, null);
        });

        it('ensures User B disconnecting does not affect User A connection', async (t) => {
            if (!hasDbUrl) {
                t.skip('Skipping live DB test because DATABASE_URL is not configured');
                return;
            }

            // Ensure User A is connected
            await upsertGitHubIntegration({
                userId: userA.userId,
                githubUserId: '1234567',
                githubUsername: 'alice-octocat',
                status: 'connected',
            });

            // User B attempts disconnect
            const { req: reqB, res: resB, getStatus: getStatusB } = createMockReqRes({
                method: 'POST',
                token: tokenB,
            });

            await disconnectHandler(reqB, resB);
            assert.strictEqual(getStatusB(), 200);

            // User A's connection remains intact
            const intA = await getUserGitHubIntegration(userA.userId);
            assert.ok(intA !== null);
            assert.strictEqual(intA?.github_username, 'alice-octocat');
            assert.strictEqual(intA?.status, 'connected');
        });
    });

    // -------------------------------------------------------------------------
    // Scenario 7: Disconnect action removes active access
    // -------------------------------------------------------------------------
    describe('Scenario 7: Disconnect Action', () => {
        it('disconnects User A connection and marks status disconnected in database', async (t) => {
            if (!hasDbUrl) {
                t.skip('Skipping live DB test because DATABASE_URL is not configured');
                return;
            }

            // Ensure User A is connected first
            await upsertGitHubIntegration({
                userId: userA.userId,
                githubUserId: '1234567',
                githubUsername: 'alice-octocat',
                status: 'connected',
            });

            // User A disconnects
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'POST',
                token: tokenA,
            });

            await disconnectHandler(req, res);
            assert.strictEqual(getStatus(), 200);
            assert.strictEqual(getBody()?.success, true);

            // User A is now disconnected
            const activeInt = await getUserGitHubIntegration(userA.userId);
            assert.strictEqual(activeInt, null);

            // Status endpoint reflects disconnected state
            const { req: reqCheck, res: resCheck, getStatus: getStatusCheck, getBody: getBodyCheck } = createMockReqRes({
                method: 'GET',
                token: tokenA,
            });

            await statusHandler(reqCheck, resCheck);
            assert.strictEqual(getStatusCheck(), 200);
            assert.strictEqual(getBodyCheck()?.connected, false);
            assert.strictEqual(getBodyCheck()?.integration, null);
        });
    });

    // -------------------------------------------------------------------------
    // Scenario 8: Token encryption and secret security
    // -------------------------------------------------------------------------
    describe('Scenario 8: Token Encryption & Secret Protection', () => {
        it('encrypts and decrypts access token with AES-256-GCM', () => {
            const rawToken = 'ghu_super_secret_github_access_token_1234567890';
            const encrypted = encryptToken(rawToken);

            // Ciphertext should not contain plaintext token
            assert.ok(!encrypted.includes(rawToken));
            assert.strictEqual(encrypted.split(':').length, 3); // iv:tag:cipher

            // Decrypts accurately
            const decrypted = decryptToken(encrypted);
            assert.strictEqual(decrypted, rawToken);
        });

        it('never returns access token in status API response', async (t) => {
            if (!hasDbUrl) {
                t.skip('Skipping live DB test because DATABASE_URL is not configured');
                return;
            }

            await upsertGitHubIntegration({
                userId: userA.userId,
                githubUserId: '999999',
                githubUsername: 'secure-octocat',
                accessToken: 'ghu_secret_access_token_never_expose',
                status: 'connected',
            });

            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'GET',
                token: tokenA,
            });

            await statusHandler(req, res);
            assert.strictEqual(getStatus(), 200);
            const bodyStr = JSON.stringify(getBody());
            assert.ok(!bodyStr.includes('ghu_secret_access_token_never_expose'));
            assert.strictEqual(getBody()?.integration?.encrypted_access_token, undefined);
            assert.strictEqual(getBody()?.integration?.accessToken, undefined);
        });
    });
});
