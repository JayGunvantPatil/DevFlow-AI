import './setup_env.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import projectsHandler from '../api/projects/index.ts';
import projectDetailHandler from '../api/projects/[id].ts';
import tasksHandler from '../api/tasks/index.ts';
import taskDetailHandler from '../api/tasks/[id].ts';
import registerHandler from '../api/auth/register.ts';
import loginHandler from '../api/auth/login.ts';
import meHandler from '../api/auth/me.ts';
import logoutHandler from '../api/auth/logout.ts';
import { createSessionToken } from '../api/_utils/auth.ts';
import { query } from '../api/_utils/db.ts';

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
        json(data: any) {
            responseBody = data;
            return res;
        },
        send(data: any) {
            responseBody = data;
            return res;
        },
        end(data?: any) {
            if (data !== undefined && responseBody === null) {
                try {
                    responseBody = JSON.parse(data);
                } catch {
                    responseBody = data;
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
        getHeaders: () => resHeaders,
    };
}

describe('Phase 3B: Server-Side Authorization & User Data Isolation', () => {
    // Existing provisioned users in Neon PostgreSQL
    const userA = {
        userId: 'a0000000-0000-0000-0000-000000000001',
        email: 'sofia.chen@devflow.ai',
        name: 'Sofia Chen',
        role: 'lead' as const,
    };

    const userB = {
        userId: 'b43051a5-6ff8-4254-a1cd-7856b685a5c2',
        email: 'test_local@devflow.ai',
        name: 'Test User',
        role: 'developer' as const,
    };

    const tokenA = createSessionToken(userA);
    const tokenB = createSessionToken(userB);

    const hasDbUrl = !!(process.env.DATABASE_URL && process.env.DATABASE_URL.trim() && !process.env.DATABASE_URL.includes('your_neon_database_url_here'));

    describe('Scenario 1: Unauthenticated users cannot access protected APIs (401)', () => {
        it('rejects GET /api/projects without token', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({ method: 'GET', token: null });
            await projectsHandler(req, res);
            assert.equal(getStatus(), 401);
            assert.equal(getBody()?.error?.code, 'UNAUTHORIZED');
        });

        it('rejects POST /api/projects without token', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'POST',
                body: { name: 'Unauthorized Project' },
                token: null,
            });
            await projectsHandler(req, res);
            assert.equal(getStatus(), 401);
            assert.equal(getBody()?.error?.code, 'UNAUTHORIZED');
        });

        it('rejects GET /api/projects/:id without token', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'GET',
                query: { id: 'some-proj-id' },
                token: null,
            });
            await projectDetailHandler(req, res);
            assert.equal(getStatus(), 401);
            assert.equal(getBody()?.error?.code, 'UNAUTHORIZED');
        });

        it('rejects PATCH /api/projects/:id without token', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'PATCH',
                query: { id: 'some-proj-id' },
                body: { name: 'New Name' },
                token: null,
            });
            await projectDetailHandler(req, res);
            assert.equal(getStatus(), 401);
            assert.equal(getBody()?.error?.code, 'UNAUTHORIZED');
        });

        it('rejects DELETE /api/projects/:id without token', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'DELETE',
                query: { id: 'some-proj-id' },
                token: null,
            });
            await projectDetailHandler(req, res);
            assert.equal(getStatus(), 401);
            assert.equal(getBody()?.error?.code, 'UNAUTHORIZED');
        });

        it('rejects GET /api/tasks without token', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({ method: 'GET', token: null });
            await tasksHandler(req, res);
            assert.equal(getStatus(), 401);
            assert.equal(getBody()?.error?.code, 'UNAUTHORIZED');
        });

        it('rejects POST /api/tasks without token', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'POST',
                body: { projectId: 'some-proj', title: 'Task Title' },
                token: null,
            });
            await tasksHandler(req, res);
            assert.equal(getStatus(), 401);
            assert.equal(getBody()?.error?.code, 'UNAUTHORIZED');
        });

        it('rejects GET /api/tasks/:id without token', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'GET',
                query: { id: 'some-task-id' },
                token: null,
            });
            await taskDetailHandler(req, res);
            assert.equal(getStatus(), 401);
            assert.equal(getBody()?.error?.code, 'UNAUTHORIZED');
        });
    });

    describe('Scenarios 2, 3, 4, 6: User Isolation, Ownership, CRUD & 403 Forbidden', () => {
        let createdProjectIdA: string;
        let createdTaskIdA: string;

        it('Scenario 2 & 6: User A can create and retrieve their own project in Neon DB', async (t) => {
            if (!hasDbUrl) {
                t.skip('Skipping live DB CRUD test because DATABASE_URL is not configured');
                return;
            }

            const uniqueName = `Project-Alpha-${Date.now()}`;
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'POST',
                body: {
                    name: uniqueName,
                    description: 'User A project description',
                    status: 'active',
                    tags: ['TypeScript', 'Neon'],
                },
                token: tokenA,
            });

            await projectsHandler(req, res);
            assert.equal(getStatus(), 201);
            const created = getBody()?.project;
            assert.ok(created?.id);
            createdProjectIdA = created.id;

            // User A lists projects: User A project is visible
            const listRes = createMockReqRes({ method: 'GET', token: tokenA });
            await projectsHandler(listRes.req, listRes.res);
            assert.equal(listRes.getStatus(), 200);
            const projectsA = listRes.getBody()?.projects || [];
            const foundA = projectsA.find((p: any) => p.id === createdProjectIdA);
            assert.ok(foundA, 'User A should see their created project');
        });

        it('Scenario 3: User B cannot see User A\'s project in project list', async (t) => {
            if (!hasDbUrl || !createdProjectIdA) {
                t.skip('Skipping live DB test');
                return;
            }

            const { req, res, getStatus, getBody } = createMockReqRes({ method: 'GET', token: tokenB });
            await projectsHandler(req, res);
            assert.equal(getStatus(), 200);
            const projectsB = getBody()?.projects || [];
            const foundB = projectsB.find((p: any) => p.id === createdProjectIdA);
            assert.equal(foundB, undefined, 'User B must NOT see User A project in list');
        });

        it('Scenario 3: User B receives 403 Forbidden when trying to GET User A\'s project by ID', async (t) => {
            if (!hasDbUrl || !createdProjectIdA) {
                t.skip('Skipping live DB test');
                return;
            }

            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'GET',
                query: { id: createdProjectIdA },
                token: tokenB,
            });

            await projectDetailHandler(req, res);
            assert.equal(getStatus(), 403);
            assert.equal(getBody()?.error?.code, 'FORBIDDEN');
            assert.ok(getBody()?.error?.message.includes('do not have permission'));
        });

        it('Scenario 3: User B receives 403 Forbidden when trying to modify (PATCH) User A\'s project', async (t) => {
            if (!hasDbUrl || !createdProjectIdA) {
                t.skip('Skipping live DB test');
                return;
            }

            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'PATCH',
                query: { id: createdProjectIdA },
                body: { name: 'Tampered Name by User B' },
                token: tokenB,
            });

            await projectDetailHandler(req, res);
            assert.equal(getStatus(), 403);
            assert.equal(getBody()?.error?.code, 'FORBIDDEN');
        });

        it('Scenario 3: User B receives 403 Forbidden when trying to DELETE User A\'s project', async (t) => {
            if (!hasDbUrl || !createdProjectIdA) {
                t.skip('Skipping live DB test');
                return;
            }

            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'DELETE',
                query: { id: createdProjectIdA },
                token: tokenB,
            });

            await projectDetailHandler(req, res);
            assert.equal(getStatus(), 403);
            assert.equal(getBody()?.error?.code, 'FORBIDDEN');
        });

        it('Scenario 4: User B cannot create tasks under User A\'s project (403 Forbidden)', async (t) => {
            if (!hasDbUrl || !createdProjectIdA) {
                t.skip('Skipping live DB test');
                return;
            }

            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'POST',
                body: {
                    projectId: createdProjectIdA,
                    title: 'Unauthorized task by User B',
                    status: 'todo',
                    priority: 'high',
                },
                token: tokenB,
            });

            await tasksHandler(req, res);
            assert.equal(getStatus(), 403);
            assert.equal(getBody()?.error?.code, 'FORBIDDEN');
        });

        it('User A can create task under their own project and User B cannot access it', async (t) => {
            if (!hasDbUrl || !createdProjectIdA) {
                t.skip('Skipping live DB test');
                return;
            }

            // User A creates task
            const createReq = createMockReqRes({
                method: 'POST',
                body: {
                    projectId: createdProjectIdA,
                    title: 'Valid Task by User A',
                    status: 'in_progress',
                    priority: 'medium',
                },
                token: tokenA,
            });

            await tasksHandler(createReq.req, createReq.res);
            assert.equal(createReq.getStatus(), 201);
            createdTaskIdA = createReq.getBody()?.task?.id;
            assert.ok(createdTaskIdA);

            // User B tries to GET User A's task -> 403 Forbidden
            const getReq = createMockReqRes({
                method: 'GET',
                query: { id: createdTaskIdA },
                token: tokenB,
            });
            await taskDetailHandler(getReq.req, getReq.res);
            assert.equal(getReq.getStatus(), 403);
            assert.equal(getReq.getBody()?.error?.code, 'FORBIDDEN');

            // User B tries to PATCH User A's task -> 403 Forbidden
            const patchReq = createMockReqRes({
                method: 'PATCH',
                query: { id: createdTaskIdA },
                body: { status: 'done' },
                token: tokenB,
            });
            await taskDetailHandler(patchReq.req, patchReq.res);
            assert.equal(patchReq.getStatus(), 403);
            assert.equal(patchReq.getBody()?.error?.code, 'FORBIDDEN');

            // User B tries to DELETE User A's task -> 403 Forbidden
            const delReq = createMockReqRes({
                method: 'DELETE',
                query: { id: createdTaskIdA },
                token: tokenB,
            });
            await taskDetailHandler(delReq.req, delReq.res);
            assert.equal(delReq.getStatus(), 403);
            assert.equal(delReq.getBody()?.error?.code, 'FORBIDDEN');
        });

        it('Cleans up: User A deletes their project and tasks atomically', async (t) => {
            if (!hasDbUrl || !createdProjectIdA) {
                t.skip('Skipping live DB test');
                return;
            }

            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'DELETE',
                query: { id: createdProjectIdA },
                token: tokenA,
            });

            await projectDetailHandler(req, res);
            assert.equal(getStatus(), 200);
            assert.equal(getBody()?.success, true);

            // Verify project is deleted
            const verifyReq = createMockReqRes({
                method: 'GET',
                query: { id: createdProjectIdA },
                token: tokenA,
            });
            await projectDetailHandler(verifyReq.req, verifyReq.res);
            assert.equal(verifyReq.getStatus(), 404);
        });
    });

    describe('Scenario 6: Client-supplied user IDs cannot override authenticated identity', () => {
        it('ignores client-supplied user_id in project and task creation, deriving identity exclusively from token', async (t) => {
            if (!hasDbUrl) {
                t.skip('Skipping live DB test because DATABASE_URL is not configured');
                return;
            }

            const spoofProjectName = `Spoof-Test-${Date.now()}`;
            // User A creates project, attempting to spoof user_id as User B's ID in body
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'POST',
                body: {
                    name: spoofProjectName,
                    description: 'Spoof attempt',
                    status: 'active',
                    userId: userB.userId,
                    user_id: userB.userId,
                },
                token: tokenA,
            });

            await projectsHandler(req, res);
            assert.equal(getStatus(), 201);
            const createdProj = getBody()?.project;
            assert.ok(createdProj?.id);

            // Verify in DB that project was assigned to User A (not User B)
            const dbCheck = await query<{ user_id: string }>(
                'SELECT user_id FROM projects WHERE id::text = $1',
                [createdProj.id]
            );
            assert.equal(dbCheck[0]?.user_id, userA.userId, 'Project user_id must be User A, ignoring spoofed client ID');

            // User A creates task, attempting to spoof user_id as User B's ID
            const taskReq = createMockReqRes({
                method: 'POST',
                body: {
                    projectId: createdProj.id,
                    title: 'Spoof Task Validation',
                    status: 'todo',
                    priority: 'low',
                    userId: userB.userId,
                    user_id: userB.userId,
                },
                token: tokenA,
            });

            await tasksHandler(taskReq.req, taskReq.res);
            assert.equal(taskReq.getStatus(), 201);
            const createdTask = taskReq.getBody()?.task;
            assert.ok(createdTask?.id);

            const taskDbCheck = await query<{ user_id: string }>(
                'SELECT user_id FROM tasks WHERE id::text = $1',
                [createdTask.id]
            );
            assert.equal(taskDbCheck[0]?.user_id, userA.userId, 'Task user_id must be User A, ignoring spoofed client ID');

            // Cleanup
            await query('DELETE FROM tasks WHERE id::text = $1', [createdTask.id]);
            await query('DELETE FROM projects WHERE id::text = $1', [createdProj.id]);
        });
    });

    describe('Scenario 7: Invalid IDs and malformed input are handled safely', () => {
        it('returns 400 when project id is missing or empty', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'GET',
                query: { id: '   ' },
                token: tokenA,
            });
            await projectDetailHandler(req, res);
            assert.equal(getStatus(), 400);
            assert.equal(getBody()?.error?.code, 'INVALID_ID');
        });

        it('returns 404 when project id is non-existent without throwing 500 SQL error', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'GET',
                query: { id: '99999999-9999-9999-9999-999999999999' },
                token: tokenA,
            });
            await projectDetailHandler(req, res);
            assert.equal(getStatus(), 404);
            assert.equal(getBody()?.error?.code, 'PROJECT_NOT_FOUND');
        });

        it('returns 404 when project slug has special characters without SQL crash', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'GET',
                query: { id: "' OR '1'='1" },
                token: tokenA,
            });
            await projectDetailHandler(req, res);
            assert.equal(getStatus(), 404);
        });

        it('returns 400 when task id is missing or empty', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'GET',
                query: { id: '' },
                token: tokenA,
            });
            await taskDetailHandler(req, res);
            assert.equal(getStatus(), 400);
            assert.equal(getBody()?.error?.code, 'INVALID_ID');
        });

        it('returns 404 when task id is non-existent without throwing 500 SQL error', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'GET',
                query: { id: '00000000-0000-0000-0000-000000000000' },
                token: tokenA,
            });
            await taskDetailHandler(req, res);
            assert.equal(getStatus(), 404);
            assert.equal(getBody()?.error?.code, 'TASK_NOT_FOUND');
        });

        it('returns 422 on invalid project creation (short name)', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'POST',
                body: { name: 'A' },
                token: tokenA,
            });
            await projectsHandler(req, res);
            assert.equal(getStatus(), 422);
            assert.equal(getBody()?.error?.code, 'VALIDATION_ERROR');
        });

        it('returns 422 on invalid task creation (missing title)', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'POST',
                body: { projectId: 'some-id', title: '' },
                token: tokenA,
            });
            await tasksHandler(req, res);
            assert.equal(getStatus(), 422);
            assert.equal(getBody()?.error?.code, 'VALIDATION_ERROR');
        });

        it('returns 400 when updating project with invalid status', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'PATCH',
                query: { id: 'some-id' },
                body: { status: 'invalid_status_value' },
                token: tokenA,
            });
            await projectDetailHandler(req, res);
            assert.equal(getStatus(), 400);
            assert.equal(getBody()?.error?.code, 'INVALID_STATUS');
        });

        it('returns 400 when updating task with invalid priority', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'PATCH',
                query: { id: 'some-task' },
                body: { priority: 'invalid_priority_value' },
                token: tokenA,
            });
            await taskDetailHandler(req, res);
            assert.equal(getStatus(), 400);
            assert.equal(getBody()?.error?.code, 'INVALID_PRIORITY');
        });
    });

    describe('Scenario 8: Login, registration, logout, and session validation continue to work', () => {
        const testEmail = `sec_iso_${Date.now()}@devflow.ai`;
        const testPassword = 'SecureIsoPassword2026!';
        let registeredToken: string;
        let registeredUserId: string;

        it('registers a new isolated test account with 201', async (t) => {
            if (!hasDbUrl) {
                t.skip('Skipping live DB test');
                return;
            }

            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'POST',
                body: {
                    name: 'Isolated Security Account',
                    email: testEmail,
                    password: testPassword,
                },
            });

            await registerHandler(req, res);
            assert.equal(getStatus(), 201);
            const body = getBody();
            assert.ok(body?.token);
            assert.ok(body?.user?.id);
            registeredToken = body.token;
            registeredUserId = body.user.id;
        });

        it('rejects duplicate registration with 409 EMAIL_ALREADY_EXISTS', async (t) => {
            if (!hasDbUrl || !registeredUserId) {
                t.skip('Skipping live DB test');
                return;
            }

            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'POST',
                body: {
                    name: 'Isolated Security Account',
                    email: testEmail,
                    password: testPassword,
                },
            });

            await registerHandler(req, res);
            assert.equal(getStatus(), 409);
            assert.equal(getBody()?.error?.code, 'EMAIL_ALREADY_EXISTS');
        });

        it('authenticates login with valid credentials with 200 and generates session token', async (t) => {
            if (!hasDbUrl || !registeredUserId) {
                t.skip('Skipping live DB test');
                return;
            }

            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'POST',
                body: {
                    email: testEmail,
                    password: testPassword,
                },
            });

            await loginHandler(req, res);
            assert.equal(getStatus(), 200);
            assert.ok(getBody()?.token);
            assert.equal(getBody()?.user?.email, testEmail);
        });

        it('verifies session via GET /api/auth/me with 200', async (t) => {
            if (!hasDbUrl || !registeredToken) {
                t.skip('Skipping live DB test');
                return;
            }

            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'GET',
                token: registeredToken,
            });

            await meHandler(req, res);
            assert.equal(getStatus(), 200);
            assert.equal(getBody()?.user?.id, registeredUserId);
            assert.equal(getBody()?.user?.email, testEmail);
        });

        it('performs logout successfully with 200', async () => {
            const { req, res, getStatus, getBody } = createMockReqRes({
                method: 'POST',
            });

            await logoutHandler(req, res);
            assert.equal(getStatus(), 200);
            assert.equal(getBody()?.success, true);
        });

        it('cleans up isolated test account in DB', async (t) => {
            if (!hasDbUrl || !registeredUserId) {
                t.skip('Skipping cleanup');
                return;
            }

            await query('DELETE FROM users WHERE id::text = $1', [registeredUserId]);
        });
    });
});
