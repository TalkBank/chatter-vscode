/** CLAN command selection and result presentation through the composed server. */
import * as path from 'path';
import * as vscode from 'vscode';
import { Effect } from 'effect';
import { AnalysisPanel } from '../analysisPanel';
import { KidevalPanel, type EvalMode } from '../kidevalPanel';
import { ClanClientService, clanRequest, type AnalysisTarget } from '../lsp/clanClient';
import { AnalysisSelection } from '../lsp/clanSelection';
import { ExtensionContextService, tryAsync } from '../effectRuntime';
import { type ExtensionCommandRequirements, type ExtensionCommandRunner, VSCodeWindowService, requireActiveChatEditor } from '../effectCommandRuntime';

export function runAnalysis(runner: ExtensionCommandRunner, scope: 'document' | 'directory'):
Effect.Effect<void, unknown, ExtensionCommandRequirements> {
    return Effect.gen(function*() {
        const window = yield* VSCodeWindowService;
        const context = yield* ExtensionContextService;
        const client = yield* ClanClientService;
        const commands = yield* client.commands();
        const command = yield* tryAsync('select CLAN analysis', () => Promise.resolve(window.showQuickPick(
            commands.map(choice => ({ label: choice.command.toUpperCase(), choice })),
            { placeHolder: 'Select CLAN analysis' },
        )));
        if (!command) { return; }
        const choice = command.choice;
        const selection = yield* tryAsync('prepare analysis input', () => AnalysisSelection.prepare(choice, window));
        if (!selection) { return; }
        let target: AnalysisTarget;
        if (scope === 'document') {
            const editor = yield* requireActiveChatEditor();
            target = { kind: 'document', uri: editor.document.uri.toString(), version: editor.document.version };
        } else {
            const directories = yield* tryAsync('select analysis directory', () => Promise.resolve(window.showOpenDialog({
                canSelectMany: false, canSelectFiles: false, canSelectFolders: true, openLabel: 'Analyze directory',
            })));
            const directory = directories?.[0];
            if (!directory) { return; }
            target = { kind: 'directory', uri: directory.toString() };
        }
        const preparedSelection = selection;
        const selectedTarget = target;
        yield* clanRequest(() => window.withProgress({
            location: vscode.ProgressLocation.Notification, title: `Running ${choice.command.toUpperCase()}`, cancellable: true,
        }, async (_progress, cancellation) => {
            const result = await runner.runResult(client.analyze(selectedTarget, preparedSelection, cancellation));
            if (result._tag === 'Failure') { throw result.failure; }
            AnalysisPanel.createOrShow(context, runner, result.success.forPresentation(),
                choice.command, path.basename(vscode.Uri.parse(selectedTarget.uri).fsPath));
        }));
    });
}

export function runEvalPanel(runner: ExtensionCommandRunner, mode: EvalMode):
Effect.Effect<void, unknown, ExtensionCommandRequirements> {
    return Effect.gen(function*() {
        const editor = yield* requireActiveChatEditor();
        const context = yield* ExtensionContextService;
        const client = yield* ClanClientService;
        yield* client.commands();
        KidevalPanel.createOrShow(context, runner, editor.document.uri.toString(), editor.document.uri.fsPath, client, mode);
    });
}
