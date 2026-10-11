import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateProjectInput, validateTaskInput } from '../api/_utils/validate.ts';

describe('Project Input Validation', () => {
    test('accepts valid project payload', () => {
        const result = validateProjectInput({
            name: 'devflow-api',
            description: 'Core microservice engine',
            status: 'active',
            tags: ['typescript', 'node', 'neon'],
            leadName: 'Sofia Chen',
        });

        assert.equal(result.isValid, true);
        assert.equal(result.errors.length, 0);
        assert.ok(result.data);
        assert.equal(result.data.name, 'devflow-api');
        assert.equal(result.data.slug, 'devflow-api');
        assert.equal(result.data.description, 'Core microservice engine');
        assert.equal(result.data.status, 'active');
        assert.deepEqual(result.data.tags, ['typescript', 'node', 'neon']);
    });

    test('generates valid slug from complex name', () => {
        const result = validateProjectInput({
            name: 'DevFlow AI Engine v2.0',
            description: 'Test description',
        });

        assert.equal(result.isValid, true);
        assert.ok(result.data);
        assert.equal(result.data.slug, 'devflow-ai-engine-v2-0');
    });

    test('parses comma-separated tags string', () => {
        const result = validateProjectInput({
            name: 'search-service',
            tags: 'PostgreSQL, Search, Vector',
        });

        assert.equal(result.isValid, true);
        assert.ok(result.data);
        assert.deepEqual(result.data.tags, ['PostgreSQL', 'Search', 'Vector']);
    });

    test('rejects empty or missing project name', () => {
        const result1 = validateProjectInput({ name: '' });
        assert.equal(result1.isValid, false);
        assert.ok(result1.errors.some((e) => e.includes('required')));

        const result2 = validateProjectInput({});
        assert.equal(result2.isValid, false);
        assert.ok(result2.errors.some((e) => e.includes('required')));
    });

    test('rejects project name shorter than 2 chars or longer than 100 chars', () => {
        const short = validateProjectInput({ name: 'a' });
        assert.equal(short.isValid, false);
        assert.ok(short.errors.some((e) => e.includes('between 2 and 100 characters')));

        const long = validateProjectInput({ name: 'a'.repeat(101) });
        assert.equal(long.isValid, false);
        assert.ok(long.errors.some((e) => e.includes('between 2 and 100 characters')));
    });

    test('rejects invalid project status', () => {
        const result = validateProjectInput({
            name: 'auth-service',
            status: 'deleted' as any,
        });

        assert.equal(result.isValid, false);
        assert.ok(result.errors.some((e) => e.includes('Status must be one of')));
    });

    test('rejects non-object body', () => {
        const result = validateProjectInput(null);
        assert.equal(result.isValid, false);
        assert.ok(result.errors.some((e) => e.includes('valid JSON object')));
    });

    test('rejects description longer than 1000 characters', () => {
        const result = validateProjectInput({
            name: 'valid-project',
            description: 'x'.repeat(1001),
        });
        assert.equal(result.isValid, false);
        assert.ok(result.errors.some((e) => e.includes('Description cannot exceed 1000 characters')));
    });
});

describe('Task Input Validation', () => {
    test('accepts valid task payload', () => {
        const result = validateTaskInput({
            title: 'Configure Neon PostgreSQL connection pooling',
            projectId: '123e4567-e89b-12d3-a456-426614174000',
            status: 'in_progress',
            priority: 'urgent',
            assigneeName: 'Marcus Vance',
        });

        assert.equal(result.isValid, true);
        assert.equal(result.errors.length, 0);
        assert.ok(result.data);
        assert.equal(result.data.title, 'Configure Neon PostgreSQL connection pooling');
        assert.equal(result.data.projectId, '123e4567-e89b-12d3-a456-426614174000');
        assert.equal(result.data.status, 'in_progress');
        assert.equal(result.data.priority, 'urgent');
        assert.equal(result.data.assigneeName, 'Marcus Vance');
    });

    test('defaults status to todo and priority to medium if omitted', () => {
        const result = validateTaskInput({
            title: 'Write comprehensive integration tests',
            projectId: 'proj-1',
        });

        assert.equal(result.isValid, true);
        assert.ok(result.data);
        assert.equal(result.data.status, 'todo');
        assert.equal(result.data.priority, 'medium');
    });

    test('rejects empty or missing title', () => {
        const result = validateTaskInput({
            title: '',
            projectId: 'proj-1',
        });
        assert.equal(result.isValid, false);
        assert.ok(result.errors.some((e) => e.includes('Task title is required')));
    });

    test('rejects title shorter than 3 characters or longer than 255', () => {
        const short = validateTaskInput({ title: 'ab', projectId: 'proj-1' });
        assert.equal(short.isValid, false);
        assert.ok(short.errors.some((e) => e.includes('between 3 and 255 characters')));

        const long = validateTaskInput({ title: 'a'.repeat(256), projectId: 'proj-1' });
        assert.equal(long.isValid, false);
        assert.ok(long.errors.some((e) => e.includes('between 3 and 255 characters')));
    });

    test('rejects missing projectId', () => {
        const result = validateTaskInput({ title: 'Valid task title' });
        assert.equal(result.isValid, false);
        assert.ok(result.errors.some((e) => e.includes('Project ID (projectId) is required')));
    });

    test('rejects invalid task status', () => {
        const result = validateTaskInput({
            title: 'Valid task title',
            projectId: 'proj-1',
            status: 'in_limbo' as any,
        });
        assert.equal(result.isValid, false);
        assert.ok(result.errors.some((e) => e.includes('Status must be one of')));
    });

    test('rejects invalid task priority', () => {
        const result = validateTaskInput({
            title: 'Valid task title',
            projectId: 'proj-1',
            priority: 'blocker' as any,
        });
        assert.equal(result.isValid, false);
        assert.ok(result.errors.some((e) => e.includes('Priority must be one of')));
    });
});
