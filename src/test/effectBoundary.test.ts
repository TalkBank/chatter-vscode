/**
 * Tests for shared Effect Schema boundary helpers.
 */

import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';

import {
    PanelMessageDecodeError,
    StructuredPayloadDecodeError,
    decodePanelMessageWithSchema,
    decodeStructuredWithSchema,
    parseWithSchema,
} from '../effectBoundary';

const ExampleSchema = Schema.Struct({
    name: Schema.String,
});

describe('effect boundary helpers', () => {
    /**
     * Guards: schema mismatch produces explicit absence and valid input produces the decoded value.
     * Kind: wire
     * Not a type: unknown values may contain a numeric name despite the decoded string type.
     * State: exact in-memory payload values, with no browser, disk or process state.
     * Concurrency: none, synchronous admission is local to each payload.
     */
    it('parses valid payloads and returns undefined on schema mismatch', () => {
        expect(parseWithSchema(ExampleSchema, { name: 'TalkBank' })).toEqual({
            name: 'TalkBank',
        });
        expect(parseWithSchema(ExampleSchema, { name: 42 })).toBeUndefined();
    });

    /**
     * Guards: malformed LSP objects retain the command-specific error family.
     * Kind: wire
     * Not a type: an external numeric name must fail the decoder-only admission.
     * State: exact in-memory payload values, with no browser, disk or process state.
     * Concurrency: none, synchronous admission is local to each payload.
     */
    it('wraps malformed structured payloads in a tagged decode error', () => {
        expect(() => decodeStructuredWithSchema(
            'talkbank/example',
            { name: 42 },
            ExampleSchema,
        )).toThrow(StructuredPayloadDecodeError);
    });

    /**
     * Guards: malformed panel objects retain the panel-specific error family.
     * Kind: wire
     * Not a type: a browser message can contain a numeric name before admission.
     * State: exact in-memory payload values, with no browser, disk or process state.
     * Concurrency: none, synchronous admission is local to each payload.
     */
    it('wraps malformed webview payloads in a tagged panel error', () => {
        expect(() => decodePanelMessageWithSchema(
            'example panel',
            { name: 42 },
            ExampleSchema,
        )).toThrow(PanelMessageDecodeError);
    });
});
