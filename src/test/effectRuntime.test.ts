/**
 * Tests for the shared Effect runtime foundation.
 */

import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { AsyncOperationError, tryAsync } from '../effectRuntime';

describe('effect runtime foundation', () => {
    /**
     * Guards: a rejected external Promise enters the typed failure channel with its operation identity.
     * Kind: boundary
     * Not a type: Promise rejection originates outside Effect's typed error channel.
     * State: one rejecting Promise, without disk or process state.
     * Concurrency: none, the rejection is awaited.
     */
    it('wraps rejected async work in a tagged Effect error', async () => {
        await expect(
            Effect.runPromise(Effect.result(tryAsync('load participants', async () => {
                throw new Error('boom');
            }))),
        ).resolves.toMatchObject({
            _tag: 'Failure',
            failure: {
                _tag: 'AsyncOperationError',
                operation: 'load participants',
            },
        } satisfies {
            _tag: 'Failure';
            failure: Pick<AsyncOperationError, '_tag' | 'operation'>;
        });
    });
});
