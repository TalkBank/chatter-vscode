/**
 * kidevalPanel.ts
 *
 * VS Code WebviewPanel for KidEval and Eval analysis with normative database
 * comparison. Both commands share the same UI pattern: database selector,
 * age/gender filtering, comparison table with z-scores.
 *
 * The preserved mode controls presentation and the default database directory.
 * Analysis and database discovery use the composed server's library RPCs.
 *
 * Communication is bidirectional via PostMessage:
 *   Extension → Webview: databases, results, errors, config
 *   Webview → Extension: discoverDatabases, runAnalysis
 */

import { injectPanelScript, type AssessmentScriptConfig } from './webviewScript';
import * as vscode from 'vscode';
import * as path from 'path';
import { Effect } from 'effect';
import { ClanClient, clanRequest } from './lsp/clanClient';
import { AnalysisSelection } from './lsp/clanSelection';
import type { AnalysisDatabaseFilter } from './lsp/executeCommandPayloads';
import { decodePanelMessage, disposePanelResources, reuseOrCreatePanel } from './panelLifecycle';
import {
    KidevalPanelExtensionMessage,
    createAssessmentFailureMessage,
    createKidevalDatabasesMessage,
    createKidevalResultsMessage,
    createKidevalFileInfoMessage,
    decodeKidevalPanelWebviewMessage,
} from './webviewMessageContracts';
import { resolveWebviewPanelAssetPaths, type WebviewPanelAssetPaths } from './panelAssets';
import {
    ExtensionCommandRequirements,
    ExtensionCommandRunner,
    VSCodeWindowService,
    VSCodeWorkspaceService,
    runPanelEffect,
} from './effectCommandRuntime';
import { tryAsync } from './effectRuntime';
import {
    createExtensionWebviewPanel,
    readWebviewPanelTemplate,
    type WebviewPanelDependencies,
} from './panelHost';

/** Analysis mode, determines command name, lib dir, and display labels. */
export type EvalMode = 'kideval' | 'eval' | 'evald';

type ModeConfig = AssessmentScriptConfig & { readonly defaultLibDir: string };

const MODE_CONFIGS: Record<EvalMode, ModeConfig> = {
    kideval: {
        analyzeCommand: 'kideval',
        title: 'Child Evaluation',
        description: 'DSS + IPSyn + MLU combined child language measures with normative database comparison',
        defaultLibDir: 'kideval',
    },
    eval: {
        analyzeCommand: 'eval',
        title: 'Language Evaluation',
        description: 'Comprehensive morphosyntactic evaluation with normative database comparison',
        defaultLibDir: 'eval',
    },
    evald: {
        analyzeCommand: 'eval-d',
        title: 'Dementia Evaluation',
        description: 'Language evaluation with DementiaBank normative database comparison',
        defaultLibDir: 'eval',
    },
};

export class KidevalPanel {
    public static currentPanel: KidevalPanel | undefined;

    private readonly _panel: vscode.WebviewPanel;
    private readonly _disposables: vscode.Disposable[] = [];
    private readonly _assetPaths: WebviewPanelAssetPaths;
    private readonly _panelDependencies: WebviewPanelDependencies;
    private _selection: Readonly<{ mode: EvalMode; fileUri: string; filePath: string }>;
    private readonly _client: ClanClient;
    private _analysis: { kind: 'ready' } | { kind: 'running'; cancellation: vscode.CancellationTokenSource } = { kind: 'ready' };

    // -----------------------------------------------------------------------
    // Static factory
    // -----------------------------------------------------------------------

    public static createOrShow(
        context: vscode.ExtensionContext,
        runner: ExtensionCommandRunner,
        fileUri: string,
        filePath: string,
        commands: ClanClient,
        mode: EvalMode = 'kideval',
        dependencies: WebviewPanelDependencies = {},
    ): void {
        const column = vscode.ViewColumn.Beside;
        const modeConfig = MODE_CONFIGS[mode];
        const assetPaths = resolveWebviewPanelAssetPaths(context, 'kidevalPanel');

        reuseOrCreatePanel(
            KidevalPanel.currentPanel,
            currentPanel => {
                currentPanel.cancelAnalysis();
                currentPanel._selection = { mode, fileUri, filePath };
                currentPanel._panel.webview.html = currentPanel._getHtml();
                currentPanel._panel.reveal(column);
                currentPanel._sendFileInfo();
            },
            () => {
                const panel = createExtensionWebviewPanel(
                    context,
                    {
                        viewType: 'talkbankKideval',
                        title: `${modeConfig.title} - ${path.basename(filePath)}`,
                        column,
                    },
                    dependencies,
                );

                const currentPanel = new KidevalPanel(
                    panel,
                    runner,
                    assetPaths,
                    dependencies,
                    fileUri,
                    filePath,
                    commands,
                    mode,
                );
                KidevalPanel.currentPanel = currentPanel;
                return currentPanel;
            },
        );
    }

    // -----------------------------------------------------------------------
    // Constructor (private, use createOrShow)
    // -----------------------------------------------------------------------

    private constructor(
        panel: vscode.WebviewPanel,
        runner: ExtensionCommandRunner,
        assetPaths: WebviewPanelAssetPaths,
        panelDependencies: WebviewPanelDependencies,
        fileUri: string,
        filePath: string,
        commands: ClanClient,
        mode: EvalMode,
    ) {
        this._panel = panel;
        this._assetPaths = assetPaths;
        this._panelDependencies = panelDependencies;
        this._selection = { mode, fileUri, filePath };
        this._client = commands;

        this._panel.webview.html = this._getHtml();
        this._panel.onDidDispose(() => this._dispose(), null, this._disposables);

        // Handle messages from webview.
        this._panel.webview.onDidReceiveMessage(
            (message: unknown) => {
                const msg = decodePanelMessage(
                    message,
                    'kideval panel',
                    decodeKidevalPanelWebviewMessage,
                );
                if (msg === undefined) {
                    return;
                }

                const selection = this._selection;
                switch (msg.command) {
                    case 'discoverDatabases':
                        runPanelEffect(
                            'kideval database discovery',
                            runner,
                            this._discoverDatabases(msg.libDir),
                            errorMessage => {
                                if (this._selection === selection) { this._postMessage(createAssessmentFailureMessage('discovery', errorMessage)); }
                            },
                        );
                        break;
                    case 'runAnalysis':
                        runPanelEffect(
                            'kideval analysis',
                            runner,
                            this._runAnalysis(runner, msg.databasePath, msg.databaseFilter),
                            errorMessage => {
                                if (this._selection === selection) { this._postMessage(createAssessmentFailureMessage('analysis', errorMessage)); }
                            },
                        );
                        break;
                    case 'exportCsv': {
                        runPanelEffect(
                            'kideval export CSV',
                            runner,
                            this._exportCsv(msg.csv),
                            errorMessage => {
                                if (this._selection === selection) { this._postMessage(createAssessmentFailureMessage('export', errorMessage)); }
                            },
                        );
                        break;
                    }
                }
            },
            null,
            this._disposables,
        );

        this._sendFileInfo();
    }

    // -----------------------------------------------------------------------
    // Message handlers
    // -----------------------------------------------------------------------

    private _postMessage(message: KidevalPanelExtensionMessage): void {
        this._panel.webview.postMessage(message);
    }

    private _sendFileInfo(): void {
        const modeConfig = MODE_CONFIGS[this._selection.mode];
        this._panel.title = `${modeConfig.title} - ${path.basename(this._selection.filePath)}`;
        this._postMessage(createKidevalFileInfoMessage(path.basename(this._selection.filePath)));
    }

    private cancelAnalysis(): void {
        if (this._analysis.kind === 'running') {
            this._analysis.cancellation.cancel();
            this._analysis.cancellation.dispose();
        }
        this._analysis = { kind: 'ready' };
    }

    private _discoverDatabases(directory: string): Effect.Effect<void, unknown> {
        const selection = this._selection;
        return Effect.map(Effect.result(this._client.databases(directory)), outcome => {
            if (this._selection !== selection) { return; }
            const message = outcome._tag === 'Failure'
                ? createAssessmentFailureMessage('discovery', outcome.failure.details)
                : createKidevalDatabasesMessage(outcome.success);
            this._postMessage(message);
        });
    }

    private _runAnalysis(
        runner: ExtensionCommandRunner,
        databasePath: string | undefined,
        databaseFilter: AnalysisDatabaseFilter | undefined,
    ): Effect.Effect<void, unknown, ExtensionCommandRequirements> {
        const panel = this;
        return Effect.gen(function*() {
            const window = yield* VSCodeWindowService;
            const workspace = yield* VSCodeWorkspaceService;
            const document = workspace.textDocuments.find(item => item.uri.toString() === panel._selection.fileUri);
            if (!document) { return yield* Effect.fail(new Error('Open the selected CHAT document before analysis.')); }
            panel.cancelAnalysis();
            const run = { kind: 'running' as const, cancellation: new vscode.CancellationTokenSource() };
            panel._analysis = run;
            const target = { kind: 'document' as const, uri: document.uri.toString(), version: document.version };
            const command = panel._selection.mode === 'evald' ? 'eval-d' : panel._selection.mode;
            const selection = AnalysisSelection.normative(command, databasePath, databaseFilter);
            yield* clanRequest(() => window.withProgress({
                location: vscode.ProgressLocation.Notification, title: `Running ${command.toUpperCase()}`, cancellable: true,
            }, async (_progress, cancellation) => {
                const subscription = cancellation.onCancellationRequested(() => run.cancellation.cancel());
                try {
                    const result = await runner.runResult(panel._client.analyze(target, selection, run.cancellation.token));
                    if (panel._analysis !== run) { return; }
                    if (result._tag === 'Failure') {
                        panel._postMessage(createAssessmentFailureMessage('analysis', result.failure.details));
                        return;
                    }
                    panel._postMessage(createKidevalResultsMessage(result.success.forPresentation()));
                } finally {
                    subscription.dispose();
                    run.cancellation.dispose();
                    if (panel._analysis === run) { panel._analysis = { kind: 'ready' }; }
                }
            }));
        });
    }

    private _exportCsv(
        csv: string,
    ): Effect.Effect<void, unknown, ExtensionCommandRequirements> {
        return Effect.gen(function*() {
            const window = yield* VSCodeWindowService;
            const workspace = yield* VSCodeWorkspaceService;
            const uri = yield* tryAsync('show kideval CSV save dialog', () => Promise.resolve(
                window.showSaveDialog({
                    filters: { 'CSV files': ['csv'] },
                    defaultUri: vscode.Uri.file('analysis.csv'),
                }),
            ));
            if (!uri) {
                return;
            }

            yield* Effect.asVoid(tryAsync('write kideval CSV', () => Promise.resolve(
                workspace.fs.writeFile(
                    uri,
                    Buffer.from(csv, 'utf-8'),
                ),
            )));
            yield* Effect.asVoid(tryAsync('show kideval CSV export message', () => Promise.resolve(
                window.showInformationMessage(`Exported to ${uri.fsPath}`),
            )));
        });
    }

    // -----------------------------------------------------------------------
    // HTML generation
    // -----------------------------------------------------------------------

    private _getHtml(): string {
        const webview = this._panel.webview;
        const modeConfig = MODE_CONFIGS[this._selection.mode];

        let html = readWebviewPanelTemplate(this._assetPaths.htmlPath, this._panelDependencies);

        const jsUri = webview.asWebviewUri(
            vscode.Uri.file(this._assetPaths.scriptPath),
        );

        // Inject mode configuration so the webview JS knows its context.
        const libraryDirectory = vscode.workspace.getConfiguration('talkbank').get<string>('clan.libraryDirectory');
        const config = { ...modeConfig, defaultLibDir: libraryDirectory
            ? path.join(libraryDirectory, modeConfig.defaultLibDir) : null };
        html = injectPanelScript(html, { kind: 'assessment', config });
        html = html.replace('<!--INJECT_SCRIPT-->', () => `<script src="${jsUri}"></script>`);
        return html;
    }

    // -----------------------------------------------------------------------
    // Disposal
    // -----------------------------------------------------------------------

    private _dispose(): void {
        this.cancelAnalysis();
        disposePanelResources(this._panel, this._disposables, () => {
            KidevalPanel.currentPanel = undefined;
        });
    }
}
