/**
 * Shared Effect Schema decoding helpers for extension boundary modules.
 */

import { Cause, Data, Schema } from 'effect';

/**
 * Tagged error for one malformed structured LSP response payload.
 */
export class StructuredPayloadDecodeError extends Data.TaggedError('StructuredPayloadDecodeError')<{
    readonly command: string;
    readonly details: string;
}> {}

/**
 * Tagged error for one malformed inbound webview message.
 */
export class PanelMessageDecodeError extends Data.TaggedError('PanelMessageDecodeError')<{
    readonly label: string;
    readonly details: string;
}> {}

function decodeUnknown<decodedPayload>(
    schema: Schema.Decoder<decodedPayload>,
    payload: unknown,
): decodedPayload | undefined {
    const decoded = Schema.decodeUnknownExit(schema)(payload);
    return decoded._tag === 'Success' ? decoded.value : undefined;
}

/**
 * Parse one payload with an Effect Schema, returning `undefined` on failure.
 */
export function parseWithSchema<decodedPayload>(
    schema: Schema.Decoder<decodedPayload>,
    payload: unknown,
): decodedPayload | undefined {
    return decodeUnknown(schema, payload);
}

/**
 * Decode one structured LSP payload with an Effect Schema.
 */
export function decodeStructuredWithSchema<decodedPayload>(
    command: string,
    payload: unknown,
    schema: Schema.Decoder<decodedPayload>,
): decodedPayload {
    if (typeof payload === 'string') {
        throw new Error(payload);
    }

    const decoded = Schema.decodeUnknownExit(schema)(payload);
    if (decoded._tag === 'Failure') {
        throw new StructuredPayloadDecodeError({
            command,
            details: Cause.pretty(decoded.cause),
        });
    }

    return decoded.value;
}

/**
 * Decode one inbound webview message with an Effect Schema.
 */
export function decodePanelMessageWithSchema<decodedPayload>(
    label: string,
    payload: unknown,
    schema: Schema.Decoder<decodedPayload>,
): decodedPayload {
    const decoded = Schema.decodeUnknownExit(schema, { onExcessProperty: 'error' })(payload);
    if (decoded._tag === 'Failure') {
        throw new PanelMessageDecodeError({
            label,
            details: Cause.pretty(decoded.cause),
        });
    }

    return decoded.value;
}
