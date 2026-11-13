import * as path from 'path';

export interface ExtensionAssetPathContext {
    asAbsolutePath(relativePath: string): string;
}

export interface WebviewPanelAssetPaths {
    htmlPath: string;
    scriptPath: string;
}

type PanelName = 'analysisPanel' | 'graphPanel' | 'idEditorPanel'
    | 'kidevalPanel' | 'mediaPanel' | 'waveformPanel';

export function resolveWebviewPanelAssetPaths(
    context: ExtensionAssetPathContext,
    panelName: PanelName,
): WebviewPanelAssetPaths {
    return {
        htmlPath: context.asAbsolutePath(
            path.join('out', 'webview', `${panelName}.html`),
        ),
        scriptPath: context.asAbsolutePath(
            path.join('out', 'webview', `${panelName}.js`),
        ),
    };
}
