import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import projectsHandler from '../api/projects/index.js';
import projectDetailHandler from '../api/projects/[id].js';
import tasksHandler from '../api/tasks/index.js';
import taskDetailHandler from '../api/tasks/[id].js';
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

    const res: any = {
        statusCode: 200,
        setHeader: (name: string, value: string) => {
            headersSent[name.toLowerCase()] = value;
            return res;
        },
        getHeader: (name: string) => headersSent[name.toLowerCase()],
        status: (code: number) => {
            statusCode = code;
            res.statusCode = code;
            return res;
        },
        json: (body: any) => {
            responseBody = body;
            return res;
        },
        send: (body: any) => {
            responseBody = body;
            return res;
        },
        end: (body?: any) => {
            if (body && responseBody === null) {
                try {
                    responseBody = JSON.parse(body);
                } catch {
                    responseBody = body;
                }
            }
            return res;
        },
    };

    return {
        req,
        res,
        getStatus: () => statusCode,
        getBody: () => responseBody,
    };
}

describe('Backend Authorization & Token Verification', () => {
    it('projectsHandler rejects request with invalid or tampered Bearer token (401)', async () => {
        const { req, res, getStatus, getBody } = createMockReqRes({
            method: 'GET',
            headers: { authorization: 'Bearer totally.invalid.signature' },
        });

        await projectsHandler(req, res);
        assert.equal(getStatus(), 401);
        assert.equal(getBody()?.error?.code, 'UNAUTHORIZED');
        assert.ok(getBody()?.error?.message.includes('Invalid or expired'));
    });

    it('projectDetailHandler rejects request with invalid Bearer token (401)', async () => {
        const { req, res, getStatus, getBody } = createMockReqRes({
            method: 'GET',
            query: { id: 'test-proj-id' },
            headers: { authorization: 'Bearer bad.token.here' },
        });

        await projectDetailHandler(req, res);
        assert.equal(getStatus(), 401);
        assert.equal(getBody()?.error?.code, 'UNAUTHORIZED');
    });

    it('tasksHandler rejects request with expired Bearer token (401)', async () => {
        const expiredToken = createSessionToken(
            {
                userId: 'user-expired',
                email: 'expired@devflow.ai',
                name: 'Expired User',
                role: 'developer',
            },
            -3600 // Expired 1 hour ago
        );

        const { req, res, getStatus, getBody } = createMockReqRes({
            method: 'GET',
            headers: { authorization: `Bearer ${expiredToken}` },
        });

        await tasksHandler(req, res);
        assert.equal(getStatus(), 401);
        assert.equal(getBody()?.error?.code, 'UNAUTHORIZED');
    });

    it('taskDetailHandler rejects request with invalid Bearer token (401)', async () => {
        const { req, res, getStatus, getBody } = createMockReqRes({
            method: 'GET',
            query: { id: 'task-123' },
            headers: { authorization: 'Bearer corrupted' },
        });

        await taskDetailHandler(req, res);
        assert.equal(getStatus(), 401);
        assert.equal(getBody()?.error?.code, 'UNAUTHORIZED');
    });

    it('valid Bearer token passes authorization check and reaches business logic', async () => {
        const validToken = createSessionToken({
            userId: 'user-authorized-123',
            email: 'auth.user@devflow.ai',
            name: 'Authorized User',
            role: 'developer',
        });

        // Test with invalid body to verify it passes auth and reaches validation logic (returns 422, NOT 401)
        const { req, res, getStatus, getBody } = createMockReqRes({
            method: 'POST',
            body: { name: '' }, // Invalid name
            headers: { authorization: `Bearer ${validToken}` },
        });

        await projectsHandler(req, res);
        assert.equal(getStatus(), 422); // Validation failed, auth succeeded!
        assert.equal(getBody()?.error?.code, 'VALIDATION_ERROR');
    });
});
