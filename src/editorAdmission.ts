/** Pure admission of observations supplied by VS Code's active editor. */
import { Data, Effect } from 'effect';

/**
 * Tagged error for commands that require an active editor.
 */
export class NoActiveEditorError extends Data.TaggedError('NoActiveEditorError')<{}> {}

/**
 * Tagged error for commands that require an active CHAT editor.
 */
export class NoActiveChatEditorError extends Data.TaggedError('NoActiveChatEditorError')<{}> {}

/** A CHAT language observation admitted for this captured editor. */
const chatEditorAdmission: unique symbol = Symbol('ChatEditorAdmission');
export type AdmittedChatEditor<Editor> = Editor & { readonly [chatEditorAdmission]: true };

/** Admit one optional editor observation before an editor operation. */
export function admitActiveEditor<Editor>(editor: Editor | undefined): Effect.Effect<Editor, NoActiveEditorError> {
    return editor === undefined
        ? Effect.fail(new NoActiveEditorError())
        : Effect.succeed(editor);
}

/** Admit the external language identifier and retain the captured editor. */
export function admitChatEditor<Editor extends { readonly document: { readonly languageId: string } }>(
    editor: Editor,
): Effect.Effect<AdmittedChatEditor<Editor>, NoActiveChatEditorError> {
    return editor.document.languageId === 'chat'
        ? Effect.succeed(editor as AdmittedChatEditor<Editor>)
        : Effect.fail(new NoActiveChatEditorError());
}

