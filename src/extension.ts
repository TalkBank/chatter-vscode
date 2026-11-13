import { ClanClient } from './lsp/clanClient';
import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { CacheManager } from './cacheManager';
import { ClanIntegration } from './clanIntegration';
import { disposeSpecialChars } from './specialChars';
import { activateLanguageServer } from './activation/lsp';
import { registerBulletDecorations } from './activation/bullets';
import { registerReviewDecorations } from './activation/reviewDecorations';
import { registerReviewStatusBarCleanup } from './commands/review';
import { activateValidationExplorer } from './activation/validation';
import { registerExtensionCommands } from './activation/commands';
import { createExtensionCommandRunner, type ExtensionCommandRunner } from './effectCommandRuntime';
import { TalkbankExecuteCommandClient } from './lsp/executeCommandClient';
import { createExtensionRuntimeServices } from './runtimeServices';

type ExtensionSession =
    | { readonly kind: 'inactive' }
    | { readonly kind: 'client'; readonly client: LanguageClient }
    | { readonly kind: 'running'; readonly client: LanguageClient; readonly runner: ExtensionCommandRunner };
let session: ExtensionSession = { kind: 'inactive' };

export async function activate(context: vscode.ExtensionContext) {
    console.log('TalkBank extension activated');

    const runtimeServices = createExtensionRuntimeServices(vscode.workspace);
    const subscriptionStart = context.subscriptions.length;
    const client = await activateLanguageServer(context, {
        ...runtimeServices,
        workspace: vscode.workspace,
    });
    if (!client) {
        // Every feature below depends on a live language client.
        return;
    }
    session = { kind: 'client', client };
    try {
        const commandClient = new TalkbankExecuteCommandClient(client);
        context.subscriptions.push(...registerBulletDecorations(runtimeServices.runtimeContext));
        context.subscriptions.push(...registerReviewDecorations());
        context.subscriptions.push(registerReviewStatusBarCleanup());
        context.subscriptions.push(
            ...activateValidationExplorer({
                ...runtimeServices,
                window: vscode.window,
                commands: vscode.commands,
            }).disposables
        );

        const cacheManager = CacheManager.start({
            ...runtimeServices,
            window: vscode.window,
            statusBarItem: vscode.window.createStatusBarItem(
                'talkbank.cache-stats',
                vscode.StatusBarAlignment.Right,
                100,
            ),
        });
        context.subscriptions.push(cacheManager);
        const clanIntegration = new ClanIntegration({
            ...runtimeServices,
            window: vscode.window,
        });
        const clanClient = new ClanClient(client, () => vscode.workspace.textDocuments);
        const services = {
            clanClient,
            ...runtimeServices,
            client,
            commands: commandClient,
            cacheManager,
            clanIntegration,
        };
        const runner = createExtensionCommandRunner(context, services);
        session = { kind: 'running', client, runner };
        context.subscriptions.push(
            ...registerExtensionCommands(context, services, runner),
        );
        return { clan: clanClient };
    } catch (error) {
        try { await deactivate(); }
        finally {
            for (const disposable of context.subscriptions.splice(subscriptionStart).reverse()) { disposable.dispose(); }
        }
        throw error;
    }
}

export async function deactivate(): Promise<void> {
    const owned = session;
    session = { kind: 'inactive' };
    try { disposeSpecialChars(); }
    finally {
        switch (owned.kind) {
            case 'inactive': break;
            case 'client': await owned.client.stop(); break;
            case 'running':
                try { await owned.runner.dispose(); }
                finally { await owned.client.stop(); }
        }
    }
}
