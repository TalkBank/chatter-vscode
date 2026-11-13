import * as vscode from 'vscode';

import { editParticipants } from '../../commands/analysis';
import { runAnalysis, runEvalPanel } from '../../commands/clanAnalysis';
import {
    ExtensionCommandRunner,
    registerEffectCommand,
} from '../../effectCommandRuntime';
import type { ExtensionServices } from './types';

/**
 * Register analysis and evaluation commands.
 *
 * @param _context - Extension activation context.
 * @param services - Shared runtime services.
 * @returns Analysis-related disposables.
 */
export function registerAnalysisCommands(
    _context: vscode.ExtensionContext,
    _services: ExtensionServices,
    runner: ExtensionCommandRunner,
): vscode.Disposable[] {
    return [
        registerEffectCommand('talkbank.runAnalysis', runner, () => runAnalysis(runner, 'document')),
        registerEffectCommand('talkbank.runAnalysisOnDirectory', runner, () => runAnalysis(runner, 'directory')),
        registerEffectCommand('talkbank.runKideval', runner, () => runEvalPanel(runner, 'kideval')),
        registerEffectCommand('talkbank.runEval', runner, () => runEvalPanel(runner, 'eval')),
        registerEffectCommand('talkbank.runEvald', runner, () => runEvalPanel(runner, 'evald')),
        registerEffectCommand('talkbank.editParticipants', runner, () => editParticipants(runner)),
    ];
}
