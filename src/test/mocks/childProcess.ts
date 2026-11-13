/** Typed observations for the native argument-vector and file-discovery ports. */
import { vi } from 'vitest';
import type { ExecFileSyncFn, ExtensionPaths } from '../../executableService';
import * as path from 'node:path';

export type ProcessOutcome =
    | { readonly kind: 'stdout'; readonly value: string }
    | { readonly kind: 'failure'; readonly error: Error };

export interface ProcessObservation {
    readonly executable: string;
    readonly args: readonly string[];
    readonly outcome: ProcessOutcome;
}

export function createExecFileDouble(observations: readonly ProcessObservation[]) {
    return vi.fn<ExecFileSyncFn>((executable, args) => {
        const observation = observations.find(item => item.executable === executable
            && item.args.length === args.length && item.args.every((arg, index) => arg === args[index]));
        if (!observation) { throw new Error(`Unexpected executable invocation ${JSON.stringify({ executable, args })}`); }
        switch (observation.outcome.kind) {
            case 'stdout': return observation.outcome.value;
            case 'failure': throw observation.outcome.error;
        }
    });
}

export function observedFiles(files: readonly string[]) {
    const paths = new Set(files);
    return { existsSync: (candidate: string) => paths.has(candidate) };
}

export const extensionPaths: ExtensionPaths = { asAbsolutePath: relative => path.resolve('/extension', relative) };
