import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { query, executeTransaction, transaction, getDbPool, DatabaseNotConfiguredError } from '../api/_utils/db.ts';

describe('Neon Database Transactions & Query Engine', () => {
    const hasDbUrl = !!(process.env.DATABASE_URL && process.env.DATABASE_URL.trim() && !process.env.DATABASE_URL.includes('your_neon_database_url_here'));

    it('throws DatabaseNotConfiguredError when DATABASE_URL is missing', async () => {
        const savedUrl = process.env.DATABASE_URL;
        try {
            delete process.env.DATABASE_URL;
            await assert.rejects(async () => {
                await query('SELECT 1');
            }, DatabaseNotConfiguredError);

            await assert.rejects(async () => {
                await executeTransaction([{ text: 'SELECT 1' }]);
            }, DatabaseNotConfiguredError);
        } finally {
            if (savedUrl !== undefined) {
                process.env.DATABASE_URL = savedUrl;
            }
        }
    });

    it('executes a simple parameterized query (SELECT 1 as n)', async (t) => {
        if (!hasDbUrl) {
            t.skip('Skipping live DB test because DATABASE_URL is not configured in this test runner');
            return;
        }

        const rows = await query<{ n: number }>('SELECT 1 as n');
        assert.ok(Array.isArray(rows));
        assert.equal(rows.length, 1);
        assert.equal(rows[0].n, 1);
    });

    it('safely handles multi-command transaction query without error 42601', async (t) => {
        if (!hasDbUrl) {
            t.skip('Skipping live DB test because DATABASE_URL is not configured in this test runner');
            return;
        }

        // Exact pattern that previously failed with code 42601
        const rows = await query<{ n: number }>('BEGIN; SELECT 1 as n; COMMIT;');
        assert.ok(Array.isArray(rows));
        assert.equal(rows.length, 1);
        assert.equal(rows[0].n, 1);
    });

    it('executes batch transactions atomically via executeTransaction', async (t) => {
        if (!hasDbUrl) {
            t.skip('Skipping live DB test because DATABASE_URL is not configured in this test runner');
            return;
        }

        const results = await executeTransaction([
            { text: 'SELECT $1::int as val', params: [100] },
            { text: 'SELECT $1::text as label', params: ['devflow'] },
        ]);

        assert.ok(Array.isArray(results));
        assert.equal(results.length, 2);
        assert.equal(results[0][0].val, 100);
        assert.equal(results[1][0].label, 'devflow');
    });

    it('transaction alias works identically to executeTransaction', async (t) => {
        if (!hasDbUrl) {
            t.skip('Skipping live DB test because DATABASE_URL is not configured in this test runner');
            return;
        }

        const results = await transaction([
            { text: 'SELECT 42 as answer' },
        ]);

        assert.equal(results.length, 1);
        assert.equal(results[0][0].answer, 42);
    });

    it('rolls back automatically when a transaction query fails', async (t) => {
        if (!hasDbUrl) {
            t.skip('Skipping live DB test because DATABASE_URL is not configured in this test runner');
            return;
        }

        await assert.rejects(
            async () => {
                await executeTransaction([
                    { text: 'SELECT 1 as valid_first_step' },
                    { text: 'SELECT * FROM nonexistent_table_devflow_fail_test_999' },
                ]);
            },
            (err: any) => {
                assert.ok(err instanceof Error);
                assert.ok(!err.message.includes('postgres://'));
                return true;
            }
        );
    });
});
