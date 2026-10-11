import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    jsonResponse,
    errorResponse,
    validationErrorResponse,
    methodNotAllowedResponse,
    handleCors,
} from '../api/_utils/response.ts';

function createMockResponse() {
    const headers: Record<string, string> = {};
    let statusCode = 200;
    let bodyData: any = null;
    let ended = false;

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
            ended = true;
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
            ended = true;
            return res;
        },
        _getHeaders: () => headers,
        _getStatusCode: () => statusCode,
        _getBody: () => bodyData,
        _isEnded: () => ended,
    };

    return res;
}

describe('API Response Helpers', () => {
    test('jsonResponse sets status code, CORS headers, and serializes payload', () => {
        const res = createMockResponse();
        jsonResponse(res, 201, { message: 'Created successfully', id: '123' }, { 'X-Custom': 'Value' });

        assert.equal(res._getStatusCode(), 201);
        assert.equal(res._getHeaders()['access-control-allow-origin'], '*');
        assert.equal(res._getHeaders()['x-custom'], 'Value');
        assert.deepEqual(res._getBody(), { message: 'Created successfully', id: '123' });
    });

    test('errorResponse sets consistent RFC-compliant error format and timestamp', () => {
        const res = createMockResponse();
        errorResponse(res, 404, 'Project not found with id 42', 'NOT_FOUND', { resourceId: '42' });

        assert.equal(res._getStatusCode(), 404);
        const body = res._getBody();
        assert.ok(body.error);
        assert.equal(body.error.code, 'NOT_FOUND');
        assert.equal(body.error.message, 'Project not found with id 42');
        assert.deepEqual(body.error.details, { resourceId: '42' });
        assert.ok(body.timestamp);
        assert.ok(new Date(body.timestamp).getTime() > 0);
    });

    test('validationErrorResponse formats 422 with validation errors list', () => {
        const res = createMockResponse();
        validationErrorResponse(res, 'Invalid request input', [
            { field: 'name', message: 'Project name is required' },
            { field: 'status', message: 'Invalid status' },
        ]);

        assert.equal(res._getStatusCode(), 422);
        const body = res._getBody();
        assert.equal(body.error.code, 'VALIDATION_ERROR');
        assert.equal(body.error.message, 'Invalid request input');
        assert.equal(body.error.validationErrors.length, 2);
        assert.equal(body.error.validationErrors[0].field, 'name');
    });

    test('methodNotAllowedResponse sends 405 with Allow header', () => {
        const res = createMockResponse();
        methodNotAllowedResponse(res, ['GET', 'POST']);

        assert.equal(res._getStatusCode(), 405);
        assert.equal(res._getHeaders()['allow'], 'GET, POST');
        const body = res._getBody();
        assert.equal(body.error.code, 'METHOD_NOT_ALLOWED');
        assert.ok(body.error.message.includes('Allowed methods: GET, POST'));
    });

    test('handleCors responds with 204 to OPTIONS requests', () => {
        const res = createMockResponse();
        const req = { method: 'OPTIONS' };
        const isOptions = handleCors(req, res, ['GET', 'POST']);

        assert.equal(isOptions, true);
        assert.equal(res._getStatusCode(), 204);
        assert.equal(res._getHeaders()['access-control-allow-origin'], '*');
        assert.equal(res._getHeaders()['access-control-allow-methods'], 'GET, POST');
    });

    test('handleCors attaches headers and passes non-OPTIONS requests through', () => {
        const res = createMockResponse();
        const req = { method: 'GET' };
        const isOptions = handleCors(req, res, ['GET', 'POST']);

        assert.equal(isOptions, false);
        assert.equal(res._isEnded(), false);
        assert.equal(res._getHeaders()['access-control-allow-origin'], '*');
    });
});
