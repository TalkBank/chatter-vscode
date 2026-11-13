
import { CacheStatisticsManager, type CacheStatistics } from './models/cacheStatistics';
import type { ExtensionRuntimeServices } from './runtimeServices';
import { findProjectRoot, type ProjectSearchResult } from './utils/projectLocator';

type Awaitable<T> = T | PromiseLike<T>;

export interface CacheManagerStatusBarItem {
    text: string;
    tooltip?: unknown;
    command?: unknown;
    show(): unknown;
    dispose(): unknown;
}

export interface CacheManagerWindow {
    showInformationMessage(message: string): Awaitable<unknown>;
    showWarningMessage(message: string, ...items: string[]): Awaitable<string | undefined>;
    showErrorMessage(message: string): Awaitable<unknown>;
}

export interface CacheManagerDependencies {
    readonly runtimeContext: Pick<ExtensionRuntimeServices['runtimeContext'], 'getPrimaryWorkspaceRoot'>;
    readonly executableService: Pick<ExtensionRuntimeServices['executableService'], 'findTalkBankCli' | 'runTalkBankCli'>;
    readonly window: CacheManagerWindow;
    readonly statusBarItem: CacheManagerStatusBarItem;
    readonly findProjectRootFn?: (options: { startPath: string }) => Promise<ProjectSearchResult>;
}

/**
 * Manages the validation cache
 */
export class CacheManager {
    private readonly window: CacheManagerWindow;
    private readonly statusBarItem: CacheManagerStatusBarItem;
    private readonly findProjectRootFn: (
        options: { startPath: string }
    ) => Promise<ProjectSearchResult>;
    private phase: { readonly kind: 'active'; readonly interval: NodeJS.Timeout } | { readonly kind: 'disposed' };
    private projectRoot: string | undefined;

    private constructor(
        private readonly dependencies: CacheManagerDependencies,
    ) {
        this.window = dependencies.window;
        this.statusBarItem = dependencies.statusBarItem;
        this.findProjectRootFn = dependencies.findProjectRootFn ?? findProjectRoot;
        this.statusBarItem.command = 'talkbank.viewCacheStatistics';
        this.statusBarItem.tooltip = 'Click to view cache statistics';
        this.statusBarItem.show();
        this.phase = { kind: 'active', interval: setInterval(() => { void this.updateCacheStats(); }, 5000) };
        void this.findProjectRootDir();
        void this.updateCacheStats();
    }

    /** Admit a running cache UI with one owned refresh schedule. */
    static start(dependencies: CacheManagerDependencies): CacheManager {
        return new CacheManager(dependencies);
    }

    /**
     * Find the project root by looking for Cargo.toml
     */
    private async findProjectRootDir(): Promise<void> {
        const workspaceRoot = this.dependencies.runtimeContext.getPrimaryWorkspaceRoot();
        if (!workspaceRoot) {
            return;
        }

        const result = await this.findProjectRootFn({
            startPath: workspaceRoot
        });

        if (result.found) {
            this.projectRoot = result.path;
        }
    }

    /**
     * Update cache statistics in the status bar
     */
    private async updateCacheStats(): Promise<void> {
        try {
            const stats = await this.getCacheStats();
            if (this.phase.kind === 'disposed') {
                return;
            }
            if (stats) {
                switch (stats.database) {
                    case 'current':
                        this.statusBarItem.text = `$(database) Cache: ${stats.total_entries} files`;
                        break;
                    case 'absent':
                        this.statusBarItem.text = '$(database) Cache: No database';
                        break;
                    case 'older_schema':
                        this.statusBarItem.text = '$(database) Cache: Older schema';
                        break;
                }
            } else {
                this.statusBarItem.text = '$(database) Cache: Unavailable';
            }
        } catch (error) {
            console.error('Error updating cache stats:', error);
            this.statusBarItem.text = '$(database) Cache: Error';
        }
    }

    /**
     * Get cache statistics from the unified cache database
     */
    private async getCacheStats(): Promise<CacheStatistics | null> {
        try {
            const cliPath = await this.findTalkBankCliPath();
            if (!cliPath) {
                return null;
            }

            const manager = new CacheStatisticsManager(
                cliPath,
                this.dependencies.executableService,
            );
            const response = await manager.getCacheStatistics();

            if (!response) {
                return null;
            }

            return response;
        } catch (error) {
            console.error('Error getting cache stats:', error);
            return null;
        }
    }

    /**
     * View detailed cache statistics
     */
    async viewCacheStatistics(): Promise<void> {
        const stats = await this.getCacheStats();

        if (!stats) {
            await this.window.showInformationMessage(
                'Cache statistics unavailable. Check that the current chatter CLI is installed and the cache is readable.',
            );
            return;
        }

        const message = stats.database === 'absent'
            ? `No cache database at ${stats.cache_dir}.`
            : stats.database === 'older_schema'
                ? `Older cache schema at ${stats.cache_dir}. Chatter will migrate it during a writing operation.`
                : [
                    'Cache Statistics',
                    `Total Entries: ${stats.total_entries}`,
                    `Cache Directory: ${stats.cache_dir ?? 'In memory'}`,
                    `Cache Size: ${stats.cache_size_bytes === null ? 'No database file' : CacheStatisticsManager.formatBytes(stats.cache_size_bytes)}`,
                    `Last Updated: ${stats.last_modified ?? 'No database file'}`,
                ].join('\n');

        await this.window.showInformationMessage(message);
    }

    /**
     * Clear entire validation cache
     */
    async clearCache(): Promise<void> {
        const selection = await this.window.showWarningMessage(
            'Clear all validation cache?',
            'Clear All',
            'Cancel'
        );

        if (selection !== 'Clear All') {
            return;
        }

        try {
            const cliPath = await this.findTalkBankCliPath();
            if (!cliPath) {
                throw new Error('Install the current chatter CLI to clear its cache.');
            }
            const result = this.dependencies.executableService.runTalkBankCli(cliPath, ['cache', 'clear', '--all', '--apply']);
            await this.window.showInformationMessage(result);
            void this.updateCacheStats();
        } catch (error) {
            await this.window.showErrorMessage(`Failed to clear cache: ${error}`);
        }
    }

    /**
     * Clear cache for a specific file or directory
     */
    async clearCacheForPath(itemPath: string): Promise<void> {
        try {
            const cliPath = await this.findTalkBankCliPath();
            if (!cliPath) {
                throw new Error('Install the current chatter CLI to clear its cache.');
            }
            const result = this.dependencies.executableService.runTalkBankCli(cliPath, ['cache', 'clear', '--prefix', itemPath, '--apply']);
            await this.window.showInformationMessage(result);
            void this.updateCacheStats();
        } catch (error) {
            await this.window.showErrorMessage(`Failed to clear cache: ${error}`);
        }
    }

    /**
     * Find the talkbank CLI binary
     */
    private async findTalkBankCliPath(): Promise<string | null> {
        return await this.dependencies.executableService.findTalkBankCli({
            projectRoot: this.projectRoot
        });
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        const owned = this.phase;
        this.phase = { kind: 'disposed' };
        if (owned.kind === 'active') {
            clearInterval(owned.interval);
            this.statusBarItem.dispose();
        }
    }
}
