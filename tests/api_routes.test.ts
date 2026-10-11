import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import projectsHandler from '../api/projects/index.ts';
import projectDetailHandler from '../api/projects/[id].ts';
import tasksHandler from '../api/tasks/index.ts';
import taskDetailHandler from '../api/tasks/[id].ts';
import { resetDbPool } from '../api/_utils/db.ts';

function createMockReqRes(method: string, body: any = {}, query: Record<string, string> = {}) {
    const headers: Record<string, string> = {};
    let statusCode = 200;
    let bodyData: any = null;

    const req: any = {
        method,
        body,
        query,
        headers: {},
    };

    const res: any = {
        statusCode: 200,
        setHeader(name: string, value: string) {
            headers[name.toLowerCase()] = value;
            return res;
        },
        getHeader(name: string) {
            return headers[name.toLowerCase()];
        },
        status(code: number) {
            statusCode = code;
            res.statusCode = code;
            return res;
        },
        json(data: any) {
            bodyData = data;
            return res;
        },
        end(data?: any) {
            if (data !== undefined && bodyData === null) {
                try {
                    bodyData = JSON.parse(data);
                } catch {
                    bodyData = data;
                }
            }
            return res;
        },
        _getHeaders: () => headers,
        _getStatusCode: () => statusCode,
        _getBody: () => bodyData,
    };

    return { req, res };
}

describe('API Route Handlers Integration', () => {
    const originalEnv = process.env.DATABASE_URL;

    beforeEach(() => {
        delete process.env.DATABASE_URL;
        resetDbPool();
    });

    afterEach(() => {
        if (originalEnv !== undefined) {
            process.env.DATABASE_URL = originalEnv;
        } else {
            delete process.env.DATABASE_URL;
        }
        resetDbPool();
    });

    test('projectsHandler handles OPTIONS preflight with 204 and CORS', async () => {
        const { req, res } = createMockReqRes('OPTIONS');
        await projectsHandler(req, res);

        assert.equal(res._getStatusCode(), 204);
        assert.equal(res._getHeaders()['access-control-allow-origin'], '*');
    });

    test('projectsHandler returns 405 on disallowed method (e.g. PUT)', async () => {
        const { req, res } = createMockReqRes('PUT');
        await projectsHandler(req, res);

        assert.equal(res._getStatusCode(), 405);
        assert.equal(res._getBody().error.code, 'METHOD_NOT_ALLOWED');
    });

    test('projectsHandler returns 422 on invalid POST payload', async () => {
        const { req, res } = createMockReqRes('POST', { name: '' });
        await projectsHandler(req, res);

        assert.equal(res._getStatusCode(), 422);
        assert.equal(res._getBody().error.code, 'VALIDATION_ERROR');
        assert.ok(res._getBody().error.validationErrors.length > 0);
    });

    test('projectsHandler returns 503 DATABASE_NOT_CONFIGURED when DATABASE_URL is unset', async () => {
        const { req, res } = createMockReqRes('GET');
        await projectsHandler(req, res);

        assert.equal(res._getStatusCode(), 503);
        assert.equal(res._getBody().code, 'DATABASE_NOT_CONFIGURED');
        assert.ok(res._getBody().instructions);
    });

    test('projectDetailHandler returns 400 when project id is missing', async () => {
        const { req, res } = createMockReqRes('GET', {}, {});
        await projectDetailHandler(req, res);

        assert.equal(res._getStatusCode(), 400);
        assert.equal(res._getBody().error.code, 'INVALID_ID');
    });

    test('projectDetailHandler returns 400 when PATCH payload contains no updatable fields', async () => {
        const { req, res } = createMockReqRes('PATCH', {}, { id: 'proj-123' });
        await projectDetailHandler(req, res);

        assert.equal(res._getStatusCode(), 400);
        assert.equal(res._getBody().error.code, 'NO_FIELDS_TO_UPDATE');
    });

    test('tasksHandler handles OPTIONS preflight with 204', async () => {
        const { req, res } = createMockReqRes('OPTIONS');
        await tasksHandler(req, res);

        assert.equal(res._getStatusCode(), 204);
        assert.equal(res._getHeaders()['access-control-allow-origin'], '*');
    });

    test('tasksHandler returns 422 on invalid task POST payload', async () => {
        const { req, res } = createMockReqRes('POST', { title: 'ok' }); // title too short (< 3)
        await tasksHandler(req, res);

        assert.equal(res._getStatusCode(), 422);
        assert.equal(res._getBody().error.code, 'VALIDATION_ERROR');
    });

    test('taskDetailHandler returns 400 when task id is missing', async () => {
        const { req, res } = createMockReqRes('GET', {}, {});
        await taskDetailHandler(req, res);

        assert.equal(res._getStatusCode(), 400);
        assert.equal(res._getBody().error.code, 'INVALID_ID');
    });

    test('taskDetailHandler returns 400 when PATCH body has no valid fields', async () => {
        const { req, res } = createMockReqRes('PATCH', {}, { id: 'task-1' });
        await taskDetailHandler(req, res);

        assert.equal(res._getStatusCode(), 400);
        assert.equal(res._getBody().error.code, 'NO_FIELDS_TO_UPDATE');
    });

    test('taskDetailHandler returns 400 when PATCH has invalid status', async () => {
        const { req, res } = createMockReqRes('PATCH', { status: 'invalid_status' }, { id: 'task-1' });
        await taskDetailHandler(req, res);

        assert.equal(res._getStatusCode(), 400);
        assert.equal(res._getBody().error.code, 'INVALID_STATUS');
    });

    test('taskDetailHandler returns 400 when PATCH has invalid priority', async () => {
        const { req, res } = createMockReqRes('PATCH', { priority: 'super_urgent' }, { id: 'task-1' });
        await taskDetailHandler(req, res);

        assert.equal(res._getStatusCode(), 400);
        assert.equal(res._getBody().error.code, 'INVALID_PRIORITY');
    });

    test('taskDetailHandler extracts task id from body when query is empty', async () => {
        const { req, res } = createMockReqRes('PATCH', { id: 'task-100', status: 'done' }, {});
        await taskDetailHandler(req, res);

        // Since DATABASE_URL is unset in test beforeEach, it reaches the DB query and returns 503 DATABASE_NOT_CONFIGURED
        assert.equal(res._getStatusCode(), 503);
        assert.equal(res._getBody().code, 'DATABASE_NOT_CONFIGURED');
    });

    test('tasksHandler delegates PATCH with task id to taskDetailHandler', async () => {
        const { req, res } = createMockReqRes('PATCH', { status: 'in_progress' }, { id: 'task-200' });
        await tasksHandler(req, res);

        // Validated task parameters and attempted DB query, returning 503 because DATABASE_URL is unset
        assert.equal(res._getStatusCode(), 503);
        assert.equal(res._getBody().code, 'DATABASE_NOT_CONFIGURED');
    });

    test('projectDetailHandler returns 400 when PATCH has invalid status', async () => {
        const { req, res } = createMockReqRes('PATCH', { status: 'non_existent_status' }, { id: 'proj-1' });
        await projectDetailHandler(req, res);

        assert.equal(res._getStatusCode(), 400);
        assert.equal(res._getBody().error.code, 'INVALID_STATUS');
    });

    test('endpoints include development stage headers and notices', async () => {
        const { req, res } = createMockReqRes('GET');
        await projectsHandler(req, res);

        assert.equal(res._getHeaders()['x-devflow-stage'], 'Phase-2-Development');
        assert.equal(res._getHeaders()['x-devflow-auth'], 'Unenforced-Development-Mode');
    });
});
