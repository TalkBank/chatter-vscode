/**
 * Tests for the Effect-native execute-command client facade.
 */

import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';

import {
    ExecuteCommandRequestError,
    ExecuteCommandResponseError,
    TalkbankExecuteCommandClient,
    type ExecuteCommandTransport,
} from '../lsp/executeCommandClient';

function createClient(sendRequest: ExecuteCommandTransport['sendRequest']) {
    return new TalkbankExecuteCommandClient({
        isRunning: () => true,
        sendRequest,
    });
}

describe('execute command client', () => {
    /**
     * Guards: a tagged DOT response is decoded before rendering.
     * Kind: wire
     * Not a type: Rust RPC payloads are unknown bytes until Schema admission.
     * State: a shared typed transport double supplies the exact payload or rejection, without a process.
     * Concurrency: none, each request is awaited independently.
     */
    it('decodes a dot variant from the dependency-graph response', async () => {
        const client = createClient(async () => ({ kind: 'dot', source: 'digraph G {}' }));

        await expect(Effect.runPromise(client.showDependencyGraph(
            'file:///tmp/sample.cha',
            { line: 4, character: 2 },
        ))).resolves.toEqual({ kind: 'dot', source: 'digraph G {}' });
    });

    /**
     * Guards: a tagged unavailable response retains its explanation.
     * Kind: wire
     * Not a type: a server response may carry the unavailable semantic variant.
     * State: a shared typed transport double supplies the exact payload or rejection, without a process.
     * Concurrency: none, each request is awaited independently.
     */
    it('decodes an unavailable variant without ever passing text as DOT', async () => {
        const client = createClient(async () => ({ kind: 'unavailable', reason: 'No %mor tier found' }));

        await expect(Effect.runPromise(client.showDependencyGraph(
            'file:///tmp/sample.cha',
            { line: 4, character: 2 },
        ))).resolves.toEqual({ kind: 'unavailable', reason: 'No %mor tier found' });
    });

    /**
     * Guards: a string payload is rejected before structured graph consumption.
     * Kind: wire
     * Not a type: untyped RPC bytes can omit the required discriminant.
     * State: a shared typed transport double supplies the exact payload or rejection, without a process.
     * Concurrency: none, each request is awaited independently.
     */
    it('rejects a bare string response that does not carry a kind discriminant', async () => {
        // Guards against a regression to the old stringly-typed protocol where
        // the Graphviz renderer could receive "No %mor tier found" as DOT.
        const client = createClient(async () => 'digraph G {}');

        const result = await Effect.runPromise(Effect.result(client.showDependencyGraph(
            'file:///tmp/sample.cha',
            { line: 4, character: 2 },
        )));
        expect(result._tag).toBe('Failure');
    });

    /**
     * Guards: a rejected RPC Promise retains its command identity.
     * Kind: wire
     * Not a type: a transport Promise can reject outside the typed failure channel.
     * State: a shared typed transport double supplies the exact payload or rejection, without a process.
     * Concurrency: none, each request is awaited independently.
     */
    it('wraps transport failures in a tagged request error', async () => {
        const client = createClient(async () => {
            throw new Error('socket closed');
        });

        const result = await Effect.runPromise(Effect.result(client.getAlignmentSidecar(
            'file:///tmp/sample.cha',
        )));
        expect(result._tag).toBe('Failure');
        if (result._tag === 'Failure') {
            expect(result.failure).toBeInstanceOf(ExecuteCommandRequestError);
            expect(result.failure.command).toBe('talkbank/getAlignmentSidecar');
        }
    });

    /**
     * Guards: a non-string format response is rejected.
     * Kind: wire
     * Not a type: external RPC values can violate the declared string result.
     * State: a shared typed transport double supplies the exact payload or rejection, without a process.
     * Concurrency: none, each request is awaited independently.
     */
    it('wraps unexpected string commands responses in a tagged response error', async () => {
        const client = createClient(async () => ({ ok: false }));

        const result = await Effect.runPromise(Effect.result(client.formatIdLine({
            language: 'eng',
            corpus: 'Example',
            speaker: 'CHI',
            age: '2;03',
            sex: 'male',
            group: '',
            ses: '',
            role: 'Target_Child',
            education: '',
            custom: '',
        })));
        expect(result._tag).toBe('Failure');
        if (result._tag === 'Failure') {
            expect(result.failure).toBeInstanceOf(ExecuteCommandResponseError);
            expect(result.failure.command).toBe('talkbank/formatIdLine');
        }
    });
});
