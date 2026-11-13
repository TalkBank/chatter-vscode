/**
 * analysisPanel.ts
 *
 * VS Code WebviewPanel for displaying CLAN analysis results (freq, mlu, mlt, etc.).
 * Follows the same singleton-panel pattern as GraphPanel.
 *
 * Renders admitted JSON results from the composed CLAN library
 * as a styled HTML table without requiring per-command renderers.
 */

import { injectPanelScript } from './webviewScript';
import * as vscode from 'vscode';
import * as path from 'path';
import { Effect, type Schema } from 'effect';
import { AnalysisPresentation } from './analysisPresentation';
import type { ClanCommand } from './lsp/clanClient';
import { decodePanelMessage, disposePanelResources, reuseOrCreatePanel } from './panelLifecycle';
import { resolveWebviewPanelAssetPaths, type WebviewPanelAssetPaths } from './panelAssets';
import {
    createExtensionWebviewPanel,
    readWebviewPanelTemplate,
    type WebviewPanelDependencies,
} from './panelHost';
import { decodeAnalysisPanelWebviewMessage } from './webviewMessageContracts';
import {
    ExtensionCommandRequirements,
    ExtensionCommandRunner,
    VSCodeWindowService,
    VSCodeWorkspaceService,
    runPanelEffect,
} from './effectCommandRuntime';
import { tryAsync } from './effectRuntime';

/** CLAN analysis command name branded type, prevents mixing with other strings. */
export type AnalysisCommandName = ClanCommand['command'];

export class AnalysisPanel {
    public static currentPanel: AnalysisPanel | undefined;

    private readonly _panel: vscode.WebviewPanel;
    private readonly _disposables: vscode.Disposable[] = [];
    private readonly _assetPaths: WebviewPanelAssetPaths;
    private readonly _panelDependencies: WebviewPanelDependencies;

    // -----------------------------------------------------------------------
    // Static factory
    // -----------------------------------------------------------------------

    /**
     * Creates a new AnalysisPanel or updates the existing one with new results.
     *
     * @param context  - Extension context (for resource URIs).
     * @param json     - Parsed JSON output from `chatter analyze`.
     * @param cmdName  - The analysis command name (e.g. "mlu", "freq").
     * @param fileName - Base name of the analysed .cha file (for the title).
     */
    public static createOrShow(
        context: vscode.ExtensionContext,
        runner: ExtensionCommandRunner,
        json: Schema.JsonObject,
        cmdName: AnalysisCommandName,
        fileName: string,
        dependencies: WebviewPanelDependencies = {},
    ): void {
        const column = vscode.ViewColumn.Beside;
        const assetPaths = resolveWebviewPanelAssetPaths(context, 'analysisPanel');

        reuseOrCreatePanel(
            AnalysisPanel.currentPanel,
            currentPanel => {
                currentPanel._update(json, cmdName, fileName);
                currentPanel._panel.reveal(column);
            },
            () => {
                const panel = createExtensionWebviewPanel(
                    context,
                    {
                        viewType: 'talkbankAnalysis',
                        title: `Analysis - ${cmdName} - ${path.basename(fileName)}`,
                        column,
                    },
                    dependencies,
                );

                const currentPanel = new AnalysisPanel(
                    panel,
                    runner,
                    assetPaths,
                    dependencies,
                    json,
                    cmdName,
                    fileName,
                );
                AnalysisPanel.currentPanel = currentPanel;
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
        json: Schema.JsonObject,
        cmdName: AnalysisCommandName,
        fileName: string,
    ) {
        this._panel = panel;
        this._assetPaths = assetPaths;
        this._panelDependencies = panelDependencies;
        this._panel.onDidDispose(() => this._dispose(), null, this._disposables);

        // Handle messages from webview.
        this._panel.webview.onDidReceiveMessage(
            (message: unknown) => {
                const msg = decodePanelMessage(
                    message,
                    'analysis panel',
                    decodeAnalysisPanelWebviewMessage,
                );
                if (msg === undefined) {
                    return;
                }

                runPanelEffect(
                    'analysis panel',
                    runner,
                    this._handleMessage(msg),
                    errorMessage => {
                        void vscode.window.showErrorMessage(errorMessage);
                    },
                );
            },
            null,
            this._disposables,
        );

        this._update(json, cmdName, fileName);
    }

    private _handleMessage(
        message: ReturnType<typeof decodeAnalysisPanelWebviewMessage>,
    ): Effect.Effect<void, unknown, ExtensionCommandRequirements> {
        switch (message.command) {
            case 'exportCsv':
                return Effect.gen(function*() {
                    const window = yield* VSCodeWindowService;
                    const workspace = yield* VSCodeWorkspaceService;
                    const uri = yield* tryAsync('show analysis CSV save dialog', () => Promise.resolve(
                        window.showSaveDialog({
                            filters: { 'CSV files': ['csv'] },
                            defaultUri: vscode.Uri.file('analysis.csv'),
                        }),
                    ));
                    if (!uri) {
                        return;
                    }

                    yield* Effect.asVoid(tryAsync('write analysis CSV', () => Promise.resolve(
                        workspace.fs.writeFile(
                            uri,
                            Buffer.from(message.csv, 'utf-8'),
                        ),
                    )));
                    yield* Effect.asVoid(tryAsync('show analysis CSV export message', () => Promise.resolve(
                        window.showInformationMessage(`Exported to ${uri.fsPath}`),
                    )));
                });
        }
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private _update(json: Schema.JsonObject, cmdName: AnalysisCommandName, fileName: string): void {
        this._panel.title = `Analysis - ${cmdName} - ${path.basename(fileName)}`;
        this._panel.webview.html = this._getHtmlForWebview(json, cmdName, fileName);
    }

    /**
     * Generates the webview HTML.
     *
     * One typed preparation separates nested records into scalar tables and
     * carries complete rows, column kinds and maxima to rendering and export.
     */
    private _getHtmlForWebview(json: Schema.JsonObject, cmdName: AnalysisCommandName, fileName: string): string {
        const webview = this._panel.webview;

        // Read the HTML template from disk.
        let html = readWebviewPanelTemplate(this._assetPaths.htmlPath, this._panelDependencies);

        // Build the webview-safe URI for the external JS file.
        const jsUri = webview.asWebviewUri(
            vscode.Uri.file(this._assetPaths.scriptPath),
        );

        html = injectPanelScript(html, {
            kind: 'analysis', presentation: AnalysisPresentation.prepare(json),
            command: cmdName, fileName: path.basename(fileName),
        });
        html = html.replace('<!--INJECT_SCRIPT-->', () => `<script src="${jsUri}"></script>`);

        return html;
    }

    // -----------------------------------------------------------------------
    // Disposal
    // -----------------------------------------------------------------------

    private _dispose(): void {
        disposePanelResources(this._panel, this._disposables, () => {
            AnalysisPanel.currentPanel = undefined;
        });
    }
}
