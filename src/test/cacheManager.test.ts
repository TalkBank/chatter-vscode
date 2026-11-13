import { describe, expect, it, vi } from 'vitest';
import { CacheManager, type CacheManagerStatusBarItem } from '../cacheManager';

function statusBar(): CacheManagerStatusBarItem {
    return { text: '', show: vi.fn(), dispose: vi.fn() };
}

describe('cache UI lifecycle', () => {
    /**
     * Guards: startup owns one refresh timer and disposal releases it.
     * Kind: contract
     * Not a type: a private constructor exposes only the started manager, while actual timer registration and release cross the timer API.
     * State: fake timers plus a typed status-bar and unavailable-CLI observation, without files or native processes.
     * Concurrency: timer state is isolated by try/finally and every manager is disposed.
     */
    it('owns one refresh schedule', async () => {
        vi.useFakeTimers();
        const item = statusBar();
        const manager = CacheManager.start({ statusBarItem: item,
            runtimeContext: { getPrimaryWorkspaceRoot: () => undefined },
            executableService: { findTalkBankCli: async () => null, runTalkBankCli: () => { throw new Error('Unexpected execution'); } },
            window: { showInformationMessage: vi.fn(), showWarningMessage: vi.fn(), showErrorMessage: vi.fn() },
        });
        try {
            await vi.advanceTimersByTimeAsync(0);
            expect(vi.getTimerCount()).toBe(1);
            expect(item.text).toBe('$(database) Cache: Unavailable');
            expect(item.command).toBe('talkbank.viewCacheStatistics');
        } finally { manager.dispose(); vi.useRealTimers(); }
        expect(item.dispose).toHaveBeenCalledOnce();
    });

    /**
     * Guards: confirmation governs the CLI apply operation, and cache display preserves absence and measured counts without fabricated counters.
     * Kind: contract
     * Not a type: narrow executable and dialog ports exclude direct database deletion, while user choice and returned wire bytes remain external observations.
     * State: per-case typed dialog, status-bar and executable doubles, with fake timers, without a database or filesystem access.
     * Concurrency: each dialog, command and follow-up refresh is awaited before the next observation.
     */
    it('clears through Chatter and presents observed cache facts', async () => {
        vi.useFakeTimers();
        try {
            for (const choice of ['Clear All', 'Cancel', undefined]) {
                const runTalkBankCli = vi.fn((_binary: string, args: string[]) => args[1] === 'clear'
                    ? 'Cleared 4 cache entries' : JSON.stringify({ database: 'absent', cache_dir: '/cache' }));
                const information = vi.fn();
                const manager = CacheManager.start({ statusBarItem: statusBar(),
                    runtimeContext: { getPrimaryWorkspaceRoot: () => undefined },
                    executableService: { findTalkBankCli: async () => '/tools/chatter', runTalkBankCli },
                    window: { showInformationMessage: information, showWarningMessage: async () => choice, showErrorMessage: vi.fn() },
                });
                await vi.advanceTimersByTimeAsync(0);
                runTalkBankCli.mockClear();
                await manager.clearCache();
                if (choice === 'Clear All') {
                    expect(runTalkBankCli).toHaveBeenCalledWith('/tools/chatter', ['cache', 'clear', '--all', '--apply']);
                    expect(information).toHaveBeenCalledWith('Cleared 4 cache entries');
                } else { expect(runTalkBankCli).not.toHaveBeenCalled(); }
                await manager.viewCacheStatistics();
                expect(information).toHaveBeenCalledWith('No cache database at /cache.');
                manager.dispose();
            }
        } finally { vi.useRealTimers(); }
    });
});
