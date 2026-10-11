import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getDbPool, DatabaseNotConfiguredError, resetDbPool } from '../api/_utils/db.ts';

describe('Database Safety & Environment Configuration', () => {
    const originalEnv = process.env.DATABASE_URL;

    beforeEach(() => {
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

    test('throws DatabaseNotConfiguredError when DATABASE_URL is not set', () => {
        delete process.env.DATABASE_URL;
        assert.throws(
            () => {
                getDbPool();
            },
            (err: any) => {
                assert.ok(err instanceof DatabaseNotConfiguredError);
                assert.ok(err.message.includes('DATABASE_URL environment variable is not configured'));
                return true;
            }
        );
    });

    test('throws DatabaseNotConfiguredError when DATABASE_URL is an empty string', () => {
        process.env.DATABASE_URL = '   ';
        assert.throws(
            () => {
                getDbPool();
            },
            DatabaseNotConfiguredError
        );
    });

    test('throws DatabaseNotConfiguredError when DATABASE_URL contains placeholder', () => {
        process.env.DATABASE_URL = 'postgres://user:your_neon_database_url_here@ep-test.neon.tech/db';
        assert.throws(
            () => {
                getDbPool();
            },
            DatabaseNotConfiguredError
        );
    });

    test('sanitizes connection string credentials in error messages', () => {
        const rawError = new Error('Connection failed to postgresql://neondb_owner:npg_SecretPass123@ep-test.us-east-2.aws.neon.tech/neondb');
        const safeMessage = rawError.message.replace(/postgres(?:ql)?:\/\/[^@]+@/gi, 'postgresql://***:***@');

        assert.equal(
            safeMessage,
            'Connection failed to postgresql://***:***@ep-test.us-east-2.aws.neon.tech/neondb'
        );
        assert.ok(!safeMessage.includes('npg_SecretPass123'));
        assert.ok(!safeMessage.includes('neondb_owner'));
    });
});
