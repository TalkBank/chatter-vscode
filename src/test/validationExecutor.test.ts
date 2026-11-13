import { describe, expect, it } from 'vitest';
import { createExecFileDouble } from './mocks/childProcess';
import { ExecutableService } from '../executableService';
import { parseValidationResult, ValidationExecutor, ValidationStatus } from '../validation/executor';

const filePath = '/data/example.cha';
function completedRun(file: Record<string, unknown>): string {
    return [JSON.stringify({ type: 'file', file: filePath, ...file }),
        JSON.stringify({ type: 'summary', outcome: 'complete', total_files: 1 })].join('\n');
}
class NativeExit extends Error {
    constructor(readonly status: number, readonly stdout: string) { super(`CLI exit ${status}`); }
}

describe('single-file validation admission', () => {
    /**
     * Guards: JSONL file variants preserve verdicts and source identity, and incomplete, mismatched, duplicate or obsolete records are refused.
     * Kind: wire
     * Not a type: the admitted result union excludes impossible field combinations, while raw JSONL must establish completion and exact source association.
     * State: serialized values from one completed-run fixture producer, without files, cache or processes.
     * Concurrency: none, parsing is synchronous.
     */
    it('admits only a complete run for the requested source', () => {
        for (const [file, status] of [
            [{ status: 'valid', cache_hit: false }, ValidationStatus.Valid],
            [{ status: 'valid', cache_hit: true }, ValidationStatus.Cached],
            [{ status: 'invalid', error_count: 1, errors: [{ code: 'E001', severity: 'Error', message: 'Invalid data' }] }, ValidationStatus.Invalid],
            [{ status: 'read_error', error: 'Permission denied' }, ValidationStatus.ReadError],
            [{ status: 'internal_failure', error: 'Worker failed', errors: [] }, ValidationStatus.InternalError],
        ] as const) {
            expect(parseValidationResult(filePath, completedRun(file)).status).toBe(status);
        }
        const valid = completedRun({ status: 'valid', cache_hit: false });
        for (const bytes of [
            '{"status":"valid"}',
            completedRun({ status: 'mystery' }),
            completedRun({ status: 'valid' }),
            valid.split('\n')[0],
            valid.replace(filePath, '/data/other.cha'),
            valid.split('\n')[0] + '\n' + valid,
            valid + '\n' + valid.split('\n')[0],
            valid.replace('complete', 'stopped'),
        ]) { expect(() => parseValidationResult(filePath, bytes)).toThrow(); }
    });

    /**
     * Guards: successful and exit-one CLI runs retain JSONL verdicts, while usage errors and unavailable executables remain failures.
     * Kind: contract
     * Not a type: a captured exit carries stdout provenance, while the native process can terminate with externally chosen bytes and status.
     * State: the shared typed exact-argv double observes command arguments and native exit payloads, without launching a process.
     * Concurrency: each validation promise is awaited before the next case.
     */
    it('uses the current CLI contract for success and rejected transcripts', async () => {
        const invalid = completedRun({ status: 'invalid', error_count: 1, errors: [{ code: 'E001', severity: 'Error', message: 'Invalid data' }] });
        for (const outcome of [
            { kind: 'stdout', value: completedRun({ status: 'valid', cache_hit: false }) },
            { kind: 'failure', error: new NativeExit(1, invalid) },
            { kind: 'failure', error: new NativeExit(2, '') },
        ] as const) {
            const executor = new ValidationExecutor({ executableService: new ExecutableService({ execFileSync: createExecFileDouble([
                { executable: '/tools/chatter', args: ['validate', filePath, '--format', 'json'], outcome },
            ]) }), locateCli: async () => '/tools/chatter' });
            if (outcome.kind === 'failure' && outcome.error.status === 2) {
                await expect(executor.validateFile(filePath)).rejects.toThrow();
            } else {
                expect((await executor.validateFile(filePath)).status).toBe(outcome.kind === 'stdout' ? ValidationStatus.Valid : ValidationStatus.Invalid);
            }
        }
        const missing = new ValidationExecutor({ executableService: new ExecutableService({ execFileSync: createExecFileDouble([]) }), locateCli: async () => null });
        await expect(missing.validateFile(filePath)).rejects.toThrow('chatter CLI not found');
    });

    /**
     * Guards: preview omits write authority and confirmed clearing supplies --apply with the original path.
     * Kind: contract
     * Not a type: distinct public preview and apply operations still need the correct CLI argument encoding at the process boundary.
     * State: shared exact-argv observations return two distinct native messages, without touching a cache.
     * Concurrency: each operation is awaited serially.
     */
    it('keeps preview and applying cache operations distinct', async () => {
        const executable = '/tools/chatter';
        const prefix = '/data/a $HOME corpus';
        const executor = new ValidationExecutor({ executableService: new ExecutableService({ execFileSync: createExecFileDouble([
            { executable, args: ['cache', 'clear', '--prefix', prefix], outcome: { kind: 'stdout', value: 'Would clear 2 entries' } },
            { executable, args: ['cache', 'clear', '--prefix', prefix, '--apply'], outcome: { kind: 'stdout', value: 'Cleared 2 entries' } },
        ]) }), locateCli: async () => executable });
        expect(await executor.previewCacheClear(prefix)).toBe('Would clear 2 entries');
        expect(await executor.clearCache(prefix)).toBe('Cleared 2 entries');
    });
});
