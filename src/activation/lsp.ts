/**
 * Language-server activation helpers for the TalkBank VS Code extension.
 */

import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import type {
    LanguageClientOptions,
    ServerOptions,
} from 'vscode-languageclient/node';
import {
    type ValidationSeverity,
} from '../runtimeContext';
import type { ExtensionRuntimeServices } from '../runtimeServices';
import type { ExtensionPaths } from '../executableService';

const LSP_BINARY_PATH_SETTING = 'talkbank.lsp.binaryPath';
const OPEN_SETTINGS_ACTION = 'Open Settings';
const LSP_BINARY_NOT_FOUND_MESSAGE =
    'TalkBank LSP binary not found. Install the platform-specific VSIX, '
    + `place talkbank-lsp on PATH, or set "${LSP_BINARY_PATH_SETTING}" to an absolute path.`;

export interface LanguageServerWorkspace {
    createFileSystemWatcher(globPattern: string): vscode.FileSystemWatcher;
}

export interface LanguageClientLifecycle {
    start(): Promise<void>;
    stop(): Promise<void>;
}

export type LanguageClientFactory<Client extends LanguageClientLifecycle> = (
    id: string,
    name: string,
    serverOptions: ServerOptions,
    clientOptions: LanguageClientOptions,
) => Client;

export interface LanguageServerActivationServices {
    readonly runtimeContext: Pick<ExtensionRuntimeServices['runtimeContext'], 'getConfiguredLspBinaryPath' | 'getInlayHintsEnabled' | 'getValidationSeverity'>;
    readonly executableService: Pick<ExtensionRuntimeServices['executableService'], 'findTalkbankLspBinary'>;
    readonly workspace: LanguageServerWorkspace;
}

type ActivationContext = ExtensionPaths & Pick<vscode.ExtensionContext, 'subscriptions'>;

/**
 * Filter diagnostics according to the current runtime validation-severity setting.
 */
export function filterDiagnosticsBySeverity<T extends { severity?: vscode.DiagnosticSeverity }>(
    diagnostics: readonly T[],
    severity: ValidationSeverity,
): T[] {
    if (severity === 'errorsOnly') {
        return diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
    }

    if (severity === 'errorsAndWarnings') {
        return diagnostics.filter(d =>
            d.severity === vscode.DiagnosticSeverity.Error ||
            d.severity === vscode.DiagnosticSeverity.Warning
        );
    }

    return [...diagnostics];
}

/**
 * Build language-client options from injected runtime services.
 */
export function createLanguageClientOptions(
    services: Pick<LanguageServerActivationServices, 'runtimeContext'>,
    watcher: vscode.FileSystemWatcher,
): LanguageClientOptions {
    const { runtimeContext } = services;

    return {
        documentSelector: [{ scheme: 'file', language: 'chat' }],
        synchronize: {
            fileEvents: watcher
        },
        initializationOptions: {
            inlayHintsEnabled: runtimeContext.getInlayHintsEnabled(),
        },
        middleware: {
            handleDiagnostics(uri, diagnostics, next) {
                next(uri, filterDiagnosticsBySeverity(
                    diagnostics,
                    runtimeContext.getValidationSeverity(),
                ));
            },
            provideInlayHints(document, range, token, next) {
                if (!runtimeContext.getInlayHintsEnabled()) {
                    return [];
                }

                return next(document, range, token);
            },
        },
    };
}

/**
 * Start and return the TalkBank language client.
 *
 * Returns `undefined` when no `talkbank-lsp` binary can be located, in that
 * case an actionable error message is shown to the user instead of spawning a
 * process that would fail with a cryptic ENOENT. Callers must treat the
 * absence of a client as "LSP features unavailable" and proceed accordingly.
 *
 * @param context - Extension activation context.
 * @returns Started language client instance, or `undefined` when no LSP binary
 *   was discovered.
 */
export function activateLanguageServer<Client extends LanguageClientLifecycle>(
    context: ActivationContext,
    services: LanguageServerActivationServices & { readonly createLanguageClient: LanguageClientFactory<Client> },
): Promise<Client | undefined>;
export function activateLanguageServer(
    context: ActivationContext,
    services: LanguageServerActivationServices,
): Promise<LanguageClient | undefined>;
export async function activateLanguageServer(
    context: ActivationContext,
    services: LanguageServerActivationServices & { readonly createLanguageClient?: LanguageClientFactory<LanguageClientLifecycle> },
): Promise<LanguageClientLifecycle | undefined> {
    const lspBinary = services.executableService.findTalkbankLspBinary(
        context,
        services.runtimeContext.getConfiguredLspBinaryPath(),
    );
    if (!lspBinary) {
        const choice = await vscode.window.showErrorMessage(
            LSP_BINARY_NOT_FOUND_MESSAGE,
            OPEN_SETTINGS_ACTION,
        );
        if (choice === OPEN_SETTINGS_ACTION) {
            await vscode.commands.executeCommand(
                'workbench.action.openSettings',
                LSP_BINARY_PATH_SETTING,
            );
        }
        return undefined;
    }

    // The standalone `talkbank-lsp` binary takes no subcommand; it speaks LSP
    // over stdio as soon as it starts.
    const serverOptions: ServerOptions = {
        command: lspBinary,
        args: [],
    };

    const watcher = services.workspace.createFileSystemWatcher('**/*.cha');
    let client: LanguageClientLifecycle;
    try {
        const clientOptions = createLanguageClientOptions(services, watcher);
        const createLanguageClient = services.createLanguageClient
            ?? ((id, name, server, options) => new LanguageClient(id, name, server, options));
        client = createLanguageClient('talkbank-lsp', 'TalkBank Language Server', serverOptions, clientOptions);
    } catch (error) {
        watcher.dispose();
        throw error;
    }
    try {
        await client.start();
    } catch (error) {
        try { await client.stop(); }
        finally { watcher.dispose(); }
        throw error;
    }
    // Raw watchers supplied in synchronize.fileEvents remain caller-owned.
    context.subscriptions.push(watcher);
    return client;
}
