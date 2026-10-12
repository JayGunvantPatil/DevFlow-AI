import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { apiClient } from '../src/services/apiClient.ts';

describe('Frontend ApiClient Authentication & Session Management', () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
        mockStorage = {};
        // Mock window.localStorage for Node test environment
        (global as any).window = {
            localStorage: {
                getItem: (key: string) => mockStorage[key] || null,
                setItem: (key: string, value: string) => {
                    mockStorage[key] = value;
                },
                removeItem: (key: string) => {
                    delete mockStorage[key];
                },
            },
        };
        apiClient.setToken(null);
    });

    afterEach(() => {
        delete (global as any).window;
    });

    it('stores token in memory and localStorage via setToken', () => {
        const testToken = 'test.jwt.token';
        apiClient.setToken(testToken);

        assert.equal(apiClient.getToken(), testToken);
        assert.equal(mockStorage['devflow_auth_token'], testToken);
    });

    it('clears token on logout', async () => {
        apiClient.setToken('initial.jwt.token');
        assert.equal(apiClient.getToken(), 'initial.jwt.token');

        // Mock global fetch for /api/auth/logout
        const originalFetch = global.fetch;
        (global as any).fetch = async () => ({
            ok: true,
            status: 200,
            headers: {
                get: () => 'application/json',
            },
            json: async () => ({ success: true, message: 'Logged out successfully' }),
        });

        try {
            await apiClient.logout();
            assert.equal(apiClient.getToken(), null);
            assert.equal(mockStorage['devflow_auth_token'], undefined);
        } finally {
            global.fetch = originalFetch;
        }
    });

    it('attaches Authorization: Bearer header when token exists', async () => {
        apiClient.setToken('bearer.test.token');
        let capturedHeaders: any = null;

        const originalFetch = global.fetch;
        (global as any).fetch = async (url: string, options: any) => {
            capturedHeaders = options.headers;
            return {
                ok: true,
                status: 200,
                headers: {
                    get: () => 'application/json',
                },
                json: async () => ({ user: { id: 'u1', name: 'Test' } }),
            };
        };

        try {
            await apiClient.getMe();
            assert.ok(capturedHeaders !== null);
            assert.equal(capturedHeaders['Authorization'], 'Bearer bearer.test.token');
        } finally {
            global.fetch = originalFetch;
        }
    });

    it('notifies listeners and clears token on 401 unauthorized session expiry', async () => {
        apiClient.setToken('expired.test.token');
        let errorNotified = false;

        const unsubscribe = apiClient.onAuthError(() => {
            errorNotified = true;
        });

        const originalFetch = global.fetch;
        (global as any).fetch = async () => ({
            ok: false,
            status: 401,
            headers: {
                get: () => 'application/json',
            },
            json: async () => ({ error: { code: 'UNAUTHORIZED', message: 'Token expired' } }),
        });

        try {
            await assert.rejects(async () => {
                await apiClient.getProjects();
            });

            assert.equal(errorNotified, true, 'Auth error listener must be triggered on 401');
            assert.equal(apiClient.getToken(), null, 'Token must be cleared upon 401 expiry');
        } finally {
            global.fetch = originalFetch;
            unsubscribe();
        }
    });
});
