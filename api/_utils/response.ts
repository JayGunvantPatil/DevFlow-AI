import type { IncomingMessage, ServerResponse } from 'http';

export interface VercelRequest extends IncomingMessage {
    query: Record<string, string | string[]>;
    body: any;
    cookies?: Record<string, string>;
}

export interface VercelResponse extends ServerResponse {
    status: (statusCode: number) => VercelResponse;
    json: (body: any) => VercelResponse;
    send: (body: any) => VercelResponse;
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown> | null;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
    timestamp: string;
}

/**
 * Sends a structured JSON response (low-level ServerResponse)
 */
export function sendJson(
    res: ServerResponse,
    statusCode: number,
    data: unknown,
    headers: Record<string, string> = {}
): void {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    for (const [key, value] of Object.entries(headers)) {
        res.setHeader(key, value);
    }

    res.end(JSON.stringify(data, null, 2));
}

/**
 * Standardized error response (low-level ServerResponse)
 */
export function sendError(
    res: ServerResponse,
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>
): void {
    sendJson(res, statusCode, {
        error: {
            code,
            message,
            ...(details ? { details } : {}),
        },
        timestamp: new Date().toISOString(),
    });
}

/**
 * Higher-level JSON response helper for VercelResponse or ServerResponse
 */
export function jsonResponse(
    res: any,
    statusCode: number,
    data: unknown,
    headers: Record<string, string> = {}
): void {
    if (typeof res.status === 'function' && typeof res.json === 'function') {
        res.status(statusCode);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        for (const [key, value] of Object.entries(headers)) {
            res.setHeader(key, value);
        }
        res.json(data);
        return;
    }
    sendJson(res, statusCode, data, headers);
}

/**
 * Standardized error response for VercelResponse or ServerResponse
 */
export function errorResponse(
    res: any,
    statusCode: number,
    message: string,
    code = 'ERROR',
    details?: any
): void {
    jsonResponse(res, statusCode, {
        error: {
            code,
            message,
            ...(details ? { details } : {}),
        },
        timestamp: new Date().toISOString(),
    });
}

/**
 * Validation error response helper (422)
 */
export function validationErrorResponse(
    res: any,
    message = 'Validation failed',
    validationErrors: Array<{ field: string; message: string }> = []
): void {
    jsonResponse(res, 422, {
        error: {
            code: 'VALIDATION_ERROR',
            message,
            validationErrors,
        },
        timestamp: new Date().toISOString(),
    });
}

/**
 * 405 Method Not Allowed helper
 */
export function methodNotAllowedResponse(res: any, allowedMethods: string[] = ['GET']): void {
    const allowed = allowedMethods.join(', ');
    jsonResponse(
        res,
        405,
        {
            error: {
                code: 'METHOD_NOT_ALLOWED',
                message: `HTTP method not allowed. Allowed methods: ${allowed}`,
            },
            timestamp: new Date().toISOString(),
        },
        { Allow: allowed }
    );
}

/**
 * Handles CORS headers and OPTIONS preflight requests.
 * Returns true if request was an OPTIONS preflight and has been handled.
 */
export function handleCors(
    req: any,
    res: any,
    allowedMethods: string[] = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
): boolean {
    const methodsStr = allowedMethods.join(', ');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', methodsStr);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
        if (typeof res.status === 'function') {
            res.status(204).end();
        } else {
            res.statusCode = 204;
            res.end();
        }
        return true;
    }
    return false;
}
