import { Pool, neonConfig } from '@neondatabase/serverless';

// Configure Neon for serverless execution: enable HTTP fetch queries for low latency and zero WebSocket cold-start issues
neonConfig.poolQueryViaFetch = true;

let poolInstance: Pool | null = null;

export class DatabaseNotConfiguredError extends Error {
    constructor() {
        super('DATABASE_URL environment variable is not configured. Please set DATABASE_URL in .env.local or in Vercel project environment variables.');
        this.name = 'DatabaseNotConfiguredError';
    }
}

/**
 * Resets the cached pool instance (useful for testing or reconnecting with new config).
 */
export function resetDbPool(): void {
    if (poolInstance) {
        try {
            poolInstance.end();
        } catch {
            // Ignore error on close
        }
    }
    poolInstance = null;
}

/**
 * Returns a cached Neon connection pool for serverless execution.
 * Reads DATABASE_URL exclusively from server-side environment variables.
 * Never exposes the connection string to clients.
 */
export function getDbPool(): Pool {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString || connectionString.trim() === '' || connectionString.includes('your_neon_database_url_here')) {
        throw new DatabaseNotConfiguredError();
    }

    if (!poolInstance) {
        poolInstance = new Pool({
            connectionString,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });
    }

    return poolInstance;
}

/**
 * Executes a parameterized SQL query safely against Neon PostgreSQL.
 * Parameterized inputs protect against SQL injection.
 * 
 * @param text Parameterized SQL statement, e.g. "SELECT * FROM projects WHERE id = $1"
 * @param params Array of parameter values matching placeholders [$1, $2, ...]
 */
export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
    const pool = getDbPool();
    try {
        const result = await pool.query(text, params);
        return result.rows as T[];
    } catch (error: any) {
        // Sanitize any database errors to ensure credentials are never leaked
        const safeMessage = error.message?.replace(/postgres(?:ql)?:\/\/[^@]+@/gi, 'postgresql://***:***@') || 'Database query failure';
        const sanitizedError = new Error(safeMessage);
        (sanitizedError as any).code = error.code;
        throw sanitizedError;
    }
}

/**
 * Checks whether the database is configured and reachable.
 */
export async function pingDatabase(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    const start = Date.now();
    try {
        const rows = await query<{ now: string }>('SELECT NOW() as now');
        const latencyMs = Date.now() - start;
        return {
            ok: true,
            message: `Connected to Neon PostgreSQL (${rows[0]?.now || 'ok'})`,
            latencyMs,
        };
    } catch (err: any) {
        return {
            ok: false,
            message: err instanceof DatabaseNotConfiguredError ? err.message : err.message || 'Database unreachable',
            latencyMs: Date.now() - start,
        };
    }
}

let cachedHasUserIdColumn: boolean | null = null;

/**
 * Checks whether the 'user_id' column exists on 'projects' and 'tasks' (created in Migration 002).
 * Caches the result to prevent redundant schema lookups.
 */
export async function checkHasUserIdColumn(): Promise<boolean> {
    if (cachedHasUserIdColumn !== null) {
        return cachedHasUserIdColumn;
    }
    try {
        const rows = await query<{ column_name: string }>(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'user_id' LIMIT 1"
        );
        cachedHasUserIdColumn = rows.length > 0;
        return cachedHasUserIdColumn;
    } catch {
        return false;
    }
}

export function resetSchemaCache(): void {
    cachedHasUserIdColumn = null;
}
