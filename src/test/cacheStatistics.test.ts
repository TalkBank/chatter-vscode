import { describe, expect, it } from 'vitest';
import { CacheStatisticsManager } from '../models/cacheStatistics';
import { createExecFileDouble } from './mocks/childProcess';
import { ExecutableService } from '../executableService';

describe('cache statistics admission', () => {
    /**
     * Guards: current tagged cache bytes retain absent, older-schema and current storage facts, while malformed or obsolete records are refused.
     * Kind: wire
     * Not a type: the decoded union excludes partial storage states, but raw CLI bytes arrive without a static guarantee.
     * State: the shared exact-argv process double returns serialized observations, without a database or child process.
     * Concurrency: none, each admission is awaited and owns its observation.
     */
    it('admits the current wire variants and rejects fabricated statistics', async () => {
        const current = { database: 'current', total_entries: 4, cache_dir: '/cache', cache_size_bytes: 1024, last_modified: '2026-11-13T10:00:00.000Z' };
        for (const [bytes, expected] of [
            ...[
                { database: 'absent', cache_dir: '/cache' },
                { database: 'older_schema', cache_dir: '/cache' },
                current,
                { ...current, cache_size_bytes: null, last_modified: null },
                { ...current, cache_dir: null, cache_size_bytes: null, last_modified: null },
            ].map(value => [JSON.stringify(value), value] as const),
            ['invalid json{{', null],
            [JSON.stringify({ ...current, cache_size_bytes: null }), null],
            [JSON.stringify({ ...current, total_entries: -1 }), null],
            [JSON.stringify({ ...current, total_entries: Number.MAX_SAFE_INTEGER + 1 }), null],
            [JSON.stringify({ statistics: { totalEntries: 4 }, corpora: [] }), null],
        ] as const) {
            const manager = new CacheStatisticsManager('/tools/chatter', new ExecutableService({
                execFileSync: createExecFileDouble([{ executable: '/tools/chatter', args: ['cache', 'stats', '--format', 'json'],
                    outcome: { kind: 'stdout', value: bytes } }]),
            }));
            expect(await manager.getCacheStatistics()).toEqual(expected);
        }
        const failed = new CacheStatisticsManager('/tools/chatter', new ExecutableService({ execFileSync: createExecFileDouble([
            { executable: '/tools/chatter', args: ['cache', 'stats', '--format', 'json'], outcome: { kind: 'failure', error: new Error('Unreadable cache') } },
        ]) }));
        expect(await failed.getCacheStatistics()).toBeNull();
    });

    /**
     * Guards: byte labels preserve zero, unit boundaries and large u64-scale values.
     * Kind: policy
     * Not a type: admitted nonnegative byte counts do not determine display rounding or unit selection.
     * State: pure numeric values, without external resources.
     * Concurrency: none.
     */
    it('formats measured sizes', () => {
        for (const [bytes, label] of [[0, '0 B'], [1023, '1023 B'], [1024, '1.0 KB'], [1536, '1.5 KB'], [1048576, '1.0 MB'], [1073741824, '1.0 GB'], [2 ** 60, '1048576.0 TB']] as const) {
            expect(CacheStatisticsManager.formatBytes(bytes)).toBe(label);
        }
    });
});
