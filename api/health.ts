import type { IncomingMessage, ServerResponse } from 'http';
import { sendJson, sendError } from './_utils/response';
import { pingDatabase } from './_utils/db';

export interface ServiceStatus {
    database: string;
    ai: string;
    github: string;
}

export interface HealthResponse {
    status: 'ok' | 'degraded' | 'error';
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
    services: ServiceStatus;
    meta: {
        runtime: string;
        region: string;
        platform: string;
        databaseLatencyMs?: number;
    };
}

/**
 * GET /api/health
 * Production-ready Vercel Serverless Function with Neon DB Ping
 */
export default async function handler(
    req: IncomingMessage,
    res: ServerResponse
): Promise<void> {
    // Enforce GET method only
    if (req.method !== 'GET') {
        sendError(
            res,
            405,
            'METHOD_NOT_ALLOWED',
            `HTTP method ${req.method} not allowed for /api/health. Use GET.`
        );
        return;
    }

    try {
        const dbPing = await pingDatabase();

        const healthData: HealthResponse = {
            status: dbPing.ok ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime: process.uptime ? Math.round(process.uptime() * 100) / 100 : 0,
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            services: {
                database: dbPing.ok
                    ? `connected (Neon PostgreSQL, ${dbPing.latencyMs}ms)`
                    : `not_configured (${dbPing.message})`,
                ai: 'not_configured (LLM API planned for Phase 3)',
                github: 'not_configured (GitHub OAuth planned for Phase 2)',
            },
            meta: {
                runtime: `Node.js ${process.version}`,
                region: process.env.VERCEL_REGION || 'local',
                platform: process.env.VERCEL ? 'vercel' : 'local-dev',
                databaseLatencyMs: dbPing.latencyMs,
            },
        };

        sendJson(res, 200, healthData, {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown health check failure';
        sendError(res, 500, 'INTERNAL_SERVER_ERROR', message);
    }
}
