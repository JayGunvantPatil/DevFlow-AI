import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import registerHandler from '../api/auth/register.js';
import loginHandler from '../api/auth/login.js';
import meHandler from '../api/auth/me.js';
import logoutHandler from '../api/auth/logout.js';
import { createSessionToken } from '../api/_utils/auth.js';

function createMockReqRes(options: {
    method?: string;
    body?: any;
    query?: any;
    headers?: Record<string, string>;
}) {
    const req: any = {
        method: options.method || 'GET',
        body: options.body || {},
        query: options.query || {},
        headers: options.headers || {},
    };

    let statusCode = 200;
    let responseBody: any = null;
    let headersSent: Record<string, string> = {};
    let ended = false;

    const res: any = {
        statusCode: 200,
        setHeader: (name: string, value: string) => {
            headersSent[name.toLowerCase()] = value;
            return res;
        },
        status: (code: number) => {
            statusCode = code;
            res.statusCode = code;
            return res;
        },
        json: (body: any) => {
            responseBody = body;
            ended = true;
            return res;
        },
        send: (body: any) => {
            responseBody = body;
            ended = true;
            return res;
        },
        end: (body?: any) => {
            if (body) responseBody = body;
            ended = true;
            return res;
        },
    };

    return {
        req,
        res,
        getStatus: () => statusCode,
        getBody: () => responseBody,
        getHeaders: () => headersSent,
        isEnded: () => ended,
    };
}

describe('Auth Route Handlers Integration', () => {
    it('registerHandler handles OPTIONS preflight with 204 and CORS headers', async () => {
        const { req, res, getStatus } = createMockReqRes({ method: 'OPTIONS' });
        await registerHandler(req, res);
        assert.equal(getStatus(), 204);
    });

    it('registerHandler returns 405 on non-POST method (e.g. GET)', async () => {
        const { req, res, getStatus, getBody } = createMockReqRes({ method: 'GET' });
        await registerHandler(req, res);
        assert.equal(getStatus(), 405);
        assert.equal(getBody()?.error?.code, 'METHOD_NOT_ALLOWED');
    });

    it('registerHandler returns 422 on invalid registration payload', async () => {
        const { req, res, getStatus, getBody } = createMockReqRes({
            method: 'POST',
            body: { name: '', email: 'not-an-email', password: '123' },
        });
        await registerHandler(req, res);
        assert.equal(getStatus(), 422);
        assert.equal(getBody()?.error?.code, 'VALIDATION_ERROR');
    });

    it('loginHandler handles OPTIONS preflight with 204', async () => {
        const { req, res, getStatus } = createMockReqRes({ method: 'OPTIONS' });
        await loginHandler(req, res);
        assert.equal(getStatus(), 204);
    });

    it('loginHandler returns 405 on non-POST method (e.g. GET)', async () => {
        const { req, res, getStatus, getBody } = createMockReqRes({ method: 'GET' });
        await loginHandler(req, res);
        assert.equal(getStatus(), 405);
        assert.equal(getBody()?.error?.code, 'METHOD_NOT_ALLOWED');
    });

    it('loginHandler returns 422 on invalid login payload', async () => {
        const { req, res, getStatus, getBody } = createMockReqRes({
            method: 'POST',
            body: { email: '', password: '' },
        });
        await loginHandler(req, res);
        assert.equal(getStatus(), 422);
        assert.equal(getBody()?.error?.code, 'VALIDATION_ERROR');
    });

    it('meHandler returns 401 when Authorization header is absent', async () => {
        const { req, res, getStatus, getBody } = createMockReqRes({ method: 'GET' });
        await meHandler(req, res);
        assert.equal(getStatus(), 401);
        assert.equal(getBody()?.error?.code, 'UNAUTHORIZED');
    });

    it('meHandler returns 401 when Authorization token is invalid or corrupted', async () => {
        const { req, res, getStatus, getBody } = createMockReqRes({
            method: 'GET',
            headers: { authorization: 'Bearer corrupted.token.value' },
        });
        await meHandler(req, res);
        assert.equal(getStatus(), 401);
        assert.equal(getBody()?.error?.code, 'UNAUTHORIZED');
    });

    it('meHandler handles OPTIONS preflight with 204', async () => {
        const { req, res, getStatus } = createMockReqRes({ method: 'OPTIONS' });
        await meHandler(req, res);
        assert.equal(getStatus(), 204);
    });

    it('meHandler rejects non-GET methods with 405', async () => {
        const { req, res, getStatus, getBody } = createMockReqRes({
            method: 'POST',
            headers: {
                authorization: `Bearer ${createSessionToken({
                    userId: '123',
                    email: 'test@devflow.ai',
                    name: 'Test',
                    role: 'developer',
                })}`,
            },
        });
        await meHandler(req, res);
        assert.equal(getStatus(), 405);
        assert.equal(getBody()?.error?.code, 'METHOD_NOT_ALLOWED');
    });

    it('logoutHandler handles POST with 200 success', async () => {
        const { req, res, getStatus, getBody } = createMockReqRes({ method: 'POST' });
        await logoutHandler(req, res);
        assert.equal(getStatus(), 200);
        assert.equal(getBody()?.success, true);
    });

    it('logoutHandler handles OPTIONS preflight with 204', async () => {
        const { req, res, getStatus } = createMockReqRes({ method: 'OPTIONS' });
        await logoutHandler(req, res);
        assert.equal(getStatus(), 204);
    });
});
