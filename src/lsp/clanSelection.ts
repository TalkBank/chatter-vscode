/** UI admission of a command's required input, driven by server capabilities. */
import type * as vscode from 'vscode';
import type { ClanCommand } from './clanClient';
import type { AnalysisDatabaseFilter } from './executeCommandPayloads';

/** Constructed only after the selected command's required prompt is satisfied. */
export class AnalysisSelection {
    private constructor(readonly wire: Readonly<Record<string, unknown>>) {}

    static async prepare(choice: ClanCommand, window: Pick<typeof vscode.window, 'showInputBox' | 'showOpenDialog'>): Promise<AnalysisSelection | undefined> {
        switch (choice.prompt) {
            case 'none': return new AnalysisSelection({ command: choice.command });
            case 'keywords':
            case 'search': {
                const value = await window.showInputBox({
                    prompt: choice.prompt === 'keywords' ? 'Enter space-separated keywords' : 'Enter a COMBO search expression',
                });
                if (!value?.trim()) { return undefined; }
                return new AnalysisSelection(choice.prompt === 'keywords'
                    ? { command: choice.command, keywords: value.trim().split(/\s+/) }
                    : { command: choice.command, search: [value.trim()] });
            }
            case 'scriptPath':
            case 'secondFile':
            case 'templateFile': {
                const files = await window.showOpenDialog({
                    canSelectMany: false, canSelectFiles: true, canSelectFolders: false,
                    openLabel: choice.prompt === 'scriptPath' ? 'Select script' : 'Select CHAT input',
                });
                const file = files?.[0];
                if (!file) { return undefined; }
                switch (choice.prompt) {
                    case 'scriptPath': return new AnalysisSelection({ command: choice.command, script_path: file.fsPath });
                    case 'secondFile': return new AnalysisSelection({ command: choice.command, second_file: file.toString() });
                    case 'templateFile': return new AnalysisSelection({ command: choice.command, template_file: file.toString() });
                }
            }
        }
    }

    static normative(
        command: 'kideval' | 'eval' | 'eval-d',
        databasePath: string | undefined,
        filter: AnalysisDatabaseFilter | undefined,
    ): AnalysisSelection {
        return new AnalysisSelection({
            command,
            comparison: databasePath ? { path: databasePath, filter: filter ?? null } : null,
        });
    }
}
