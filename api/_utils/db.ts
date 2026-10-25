import { Pool, neon, neonConfig } from '@neondatabase/serverless';

// Configure Neon for serverless execution: enable HTTP fetch queries for low latency and zero WebSocket cold-start issues
neonConfig.poolQueryViaFetch = true;

let poolInstance: Pool | null = null;
let sqlInstance: ReturnType<typeof neon> | null = null;

export class DatabaseNotConfiguredError extends Error {
    constructor() {
        super('DATABASE_URL environment variable is not configured. Please set DATABASE_URL in .env.local or in Vercel project environment variables.');
        this.name = 'DatabaseNotConfiguredError';
    }
}

/**
 * Resets the cached pool and sql instances (useful for testing or reconnecting with new config).
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
    sqlInstance = null;
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
 * Returns a cached Neon HTTP query client for serverless fetch execution and transactions.
 */
export function getNeonSql(): ReturnType<typeof neon> {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString || connectionString.trim() === '' || connectionString.includes('your_neon_database_url_here')) {
        throw new DatabaseNotConfiguredError();
    }

    if (!sqlInstance) {
        sqlInstance = neon(connectionString);
    }

    return sqlInstance;
}

export interface QueryItem {
    text: string;
    params?: any[];
}

/**
 * Parses a raw SQL string into clean, individual executable statements,
 * filtering out transaction wrapper commands (BEGIN, COMMIT, ROLLBACK, END)
 * since transaction handling is managed by the transaction driver.
 */
function parseSqlStatements(sqlText: string): string[] {
    return sqlText
        .split(';')
        .map((s) => s.trim())
        .filter((s) => {
            if (!s) return false;
            const upper = s.toUpperCase();
            return upper !== 'BEGIN' && upper !== 'COMMIT' && upper !== 'ROLLBACK' && upper !== 'END';
        });
}

/**
 * Executes a batch of parameterized queries atomically in a single transaction
 * using Neon's native HTTP transaction batching API.
 * If any query fails, the entire transaction is rolled back automatically by Neon.
 * 
 * @param queries Array of query objects ({ text, params }) or raw SQL query strings.
 * @returns Array of result sets, one for each query in the batch.
 */
export async function executeTransaction<T = any>(
    queries: Array<QueryItem | string>
): Promise<T[][]> {
    const sql = getNeonSql();

    const queryPromises = queries.map((q) => {
        if (typeof q === 'string') {
            return sql.query(q, []);
        }
        return sql.query(q.text, q.params || []);
    });

    if (queryPromises.length === 0) {
        return [];
    }

    try {
        const results = await sql.transaction(queryPromises);
        return results as T[][];
    } catch (error: any) {
        const safeMessage = error.message?.replace(/postgres(?:ql)?:\/\/[^@]+@/gi, 'postgresql://***:***@') || 'Transaction failed';
        const sanitizedError = new Error(safeMessage);
        (sanitizedError as any).code = error.code;
        throw sanitizedError;
    }
}

/**
 * Alias for executeTransaction for convenient transaction execution.
 */
export const transaction = executeTransaction;

/**
 * Executes a parameterized SQL query safely against Neon PostgreSQL.
 * Parameterized inputs protect against SQL injection.
 * 
 * If the input SQL contains multiple statements or transaction boundary commands
 * (e.g. "BEGIN; SELECT 1 as n; COMMIT;"), it delegates execution to Neon's HTTP
 * transaction batching API to prevent error 42601 ("cannot insert multiple commands
 * into a prepared statement").
 * 
 * @param text Parameterized SQL statement, e.g. "SELECT * FROM projects WHERE id = $1"
 * @param params Array of parameter values matching placeholders [$1, $2, ...]
 */
export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
    // If text contains multiple semicolon-separated statements (e.g. BEGIN; SELECT 1 as n; COMMIT;),
    // handle it safely through Neon's transaction batching rather than failing with 42601.
    if (params.length === 0 && text.includes(';')) {
        const statements = parseSqlStatements(text);
        if (statements.length > 1 || (statements.length === 1 && /BEGIN|COMMIT/i.test(text))) {
            const batchResults = await executeTransaction(statements.map((stmt) => ({ text: stmt, params: [] })));
            const lastResult = batchResults.length > 0 ? batchResults[batchResults.length - 1] : [];
            return lastResult as T[];
        }
    }

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
