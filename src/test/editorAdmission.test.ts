/**
 * Tests for the Effect-native command runtime helpers.
 */


import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';

import {
    NoActiveChatEditorError,
    NoActiveEditorError,
    admitChatEditor,
    admitActiveEditor,
} from '../editorAdmission';

describe('effect command runtime', () => {
    /**
     * Guards: an absent editor is refused at VS Code admission.
     * Kind: boundary
     * Not a type: VS Code can report no editor before this admission transition.
     * State: pure admitted observations, with no editor host or mutable facade.
     * Concurrency: none, each Effect execution is awaited.
     */
    it('requires an active editor', async () => {
        const result = await Effect.runPromise(Effect.result(
            admitActiveEditor(undefined),
        ));

        expect(result._tag).toBe('Failure');
        if (result._tag === 'Failure') {
            expect(result.failure).toBeInstanceOf(NoActiveEditorError);
        }
    });

    /**
     * Guards: a non-CHAT document is refused before a CHAT-only command receives it.
     * Kind: boundary
     * Not a type: the external language string must be checked before the CHAT admission brand can be constructed.
     * State: pure admitted observations, with no editor host or mutable facade.
     * Concurrency: none, each Effect execution is awaited.
     */
    it('rejects non-chat editors for chat-only commands', async () => {
        const result = await Effect.runPromise(Effect.result(
            admitChatEditor({ document: { languageId: 'plaintext' } }),
        ));

        expect(result._tag).toBe('Failure');
        if (result._tag === 'Failure') {
            expect(result.failure).toBeInstanceOf(NoActiveChatEditorError);
        }
    });

});
