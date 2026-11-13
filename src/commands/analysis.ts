/** Participant editing through the current language-server contract. */

import { Effect } from 'effect';
import {
    ExtensionCommandRequirements,
    ExtensionCommandRunner,
    LanguageServerNotRunningError,
    requireActiveChatEditor,
    requireRunningLanguageServer,
} from '../effectCommandRuntime';
import { ExecuteCommandClientService, ExtensionContextService } from '../effectRuntime';
import { IdEditorPanel } from '../idEditorPanel';

export function editParticipants(
    runner: ExtensionCommandRunner,
): Effect.Effect<void, LanguageServerNotRunningError | unknown, ExtensionCommandRequirements> {
    return Effect.gen(function*() {
        const editor = yield* requireActiveChatEditor();
        const context = yield* ExtensionContextService;
        const commands = yield* ExecuteCommandClientService;
        yield* requireRunningLanguageServer(commands.isRunning());

        yield* Effect.sync(() => {
            IdEditorPanel.createOrShow(context, runner, editor.document, commands);
        });
    });
}
