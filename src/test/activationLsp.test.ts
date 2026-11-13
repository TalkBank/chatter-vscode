import { describe, expect, it, vi } from 'vitest';
import type { FileSystemWatcher } from 'vscode';
import { extensionPaths } from './mocks/childProcess';
const showErrorMessage = vi.fn();
const executeCommand = vi.fn();
vi.mock('vscode', () => ({ DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2 },
    window: { showErrorMessage: (...args: unknown[]) => showErrorMessage(...args) },
    commands: { executeCommand: (...args: unknown[]) => executeCommand(...args) },
}));
vi.mock('vscode-languageclient/node', () => ({ LanguageClient: class {} }));
import { activateLanguageServer, filterDiagnosticsBySeverity, type LanguageServerActivationServices, type LanguageClientLifecycle } from '../activation/lsp';

function watcherDouble(): FileSystemWatcher {
    const event: FileSystemWatcher['onDidCreate'] = () => ({ dispose() {} });
    return { ignoreCreateEvents: false, ignoreChangeEvents: false, ignoreDeleteEvents: false,
        onDidCreate: event, onDidChange: event, onDidDelete: event, dispose: vi.fn() };
}

function observations(binary: string | null, watcher: FileSystemWatcher): LanguageServerActivationServices {
    return { executableService: { findTalkbankLspBinary: () => binary },
        runtimeContext: { getConfiguredLspBinaryPath: () => '/configured/lsp', getInlayHintsEnabled: () => true, getValidationSeverity: () => 'all' },
        workspace: { createFileSystemWatcher: () => watcher } };
}

describe('LSP activation', () => {
    /**
     * Guards: diagnostic filtering preserves only the requested severity observations in original order.
     * Kind: policy
     * Not a type: the severity union excludes unsupported settings, while the user-selected filtering policy determines which real diagnostics remain visible.
     * State: pure severity values, without fabricated editor documents, URIs or middleware calls.
     * Concurrency: none.
     */
    it('filters diagnostic observations according to current policy', () => {
        const diagnostics = [{ severity: 0, label: 'error' }, { severity: 1, label: 'warning' }, { severity: 2, label: 'info' }, { severity: 3, label: 'hint' }, { label: 'unspecified' }];
        expect(filterDiagnosticsBySeverity(diagnostics, 'errorsOnly')).toEqual(diagnostics.slice(0, 1));
        expect(filterDiagnosticsBySeverity(diagnostics, 'errorsAndWarnings')).toEqual(diagnostics.slice(0, 2));
        expect(filterDiagnosticsBySeverity(diagnostics, 'all')).toEqual(diagnostics);
        expect(filterDiagnosticsBySeverity(Object.freeze(diagnostics), 'all')).not.toBe(diagnostics);
        for (const mode of ['all', 'errorsOnly', 'errorsAndWarnings'] as const) {
            expect(filterDiagnosticsBySeverity([], mode)).toEqual([]);
        }
    });

    /**
     * Guards: startup transfers a live watcher to extension ownership and failed startup stops the client and releases the watcher.
     * Kind: contract
     * Not a type: the narrow lifecycle port excludes incomplete fake clients, while real startup can reject after allocating external resources.
     * State: typed watcher and lifecycle effect doubles model only start, stop and disposal, without a server or filesystem watcher.
     * Concurrency: each startup promise settles before its ownership assertions.
     */
    it('transfers resources only after successful startup', async () => {
        for (const startup of ['ready', 'failure'] as const) {
            const watcher = watcherDouble();
            const context = { ...extensionPaths, subscriptions: [] as { dispose(): void }[] };
            const client: LanguageClientLifecycle = { start: vi.fn(async () => { if (startup === 'failure') { throw new Error('Start failed'); } }), stop: vi.fn(async () => {}) };
            const factory = vi.fn(() => client);
            const pending = activateLanguageServer(context, { ...observations('/tools/lsp', watcher), createLanguageClient: factory });
            if (startup === 'failure') {
                await expect(pending).rejects.toThrow('Start failed');
                expect(client.stop).toHaveBeenCalledOnce();
                expect(watcher.dispose).toHaveBeenCalledOnce();
                expect(context.subscriptions).toEqual([]);
            } else {
                expect(await pending).toBe(client);
                expect(context.subscriptions).toEqual([watcher]);
                expect(watcher.dispose).not.toHaveBeenCalled();
                watcher.dispose();
            }
            expect(factory).toHaveBeenCalledWith('talkbank-lsp', 'TalkBank Language Server', { command: '/tools/lsp', args: [] },
                expect.objectContaining({ synchronize: { fileEvents: watcher }, initializationOptions: { inlayHintsEnabled: true } }));
        }
    });

    /**
     * Guards: missing executable discovery offers the exact settings action without allocating a watcher or client.
     * Kind: contract
     * Not a type: the missing-path observation prevents startup admission, while the native UI action remains an external effect.
     * State: narrow discovery, watcher and lifecycle doubles plus per-test dialog observations, without native resources.
     * Concurrency: the dialog and settings action are awaited before checking effects.
     */
    it('offers settings when no executable is available', async () => {
        showErrorMessage.mockReset().mockResolvedValueOnce('Open Settings');
        executeCommand.mockReset();
        const watcher = watcherDouble();
        const services = observations(null, watcher);
        const factory = vi.fn(() => ({ start: async () => {}, stop: async () => {} }));
        const createFileSystemWatcher = vi.fn(services.workspace.createFileSystemWatcher);
        expect(await activateLanguageServer({ ...extensionPaths, subscriptions: [] }, {
            ...services, workspace: { createFileSystemWatcher }, createLanguageClient: factory,
        })).toBeUndefined();
        expect(factory).not.toHaveBeenCalled();
        expect(createFileSystemWatcher).not.toHaveBeenCalled();
        expect(executeCommand).toHaveBeenCalledWith('workbench.action.openSettings', 'talkbank.lsp.binaryPath');
    });
});
