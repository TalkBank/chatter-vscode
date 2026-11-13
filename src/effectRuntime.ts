/**
 * Shared Effect foundation for the VS Code extension.
 *
 * Activation supplies the shared services once. Distinct service identifiers
 * preserve each dependency through command and panel effects.
 */


import type * as vscode from 'vscode';
import { Context, Data, Effect, Layer } from 'effect';
import type { LanguageClient } from 'vscode-languageclient/node';

import type { ExtensionServices } from './activation/commands';
import type { CacheManager } from './cacheManager';
import type { ClanIntegration } from './clanIntegration';
import type { TalkbankExecuteCommandClient } from './lsp/executeCommandClient';
import type { ExtensionExecutableService } from './runtimeServices';
import type { ExtensionRuntimeContext } from './runtimeContext';
import { ClanClientService } from './lsp/clanClient';

/**
 * Tagged error for one rejected or thrown async boundary operation.
 */
export class AsyncOperationError extends Data.TaggedError('AsyncOperationError')<{
    readonly operation: string;
    readonly cause: unknown;
}> {}

/**
 * Effect service for the VS Code extension activation context.
 */
export class ExtensionContextService extends Context.Service<ExtensionContextService, vscode.ExtensionContext>()('talkbank/ExtensionContext') {}

/**
 * Effect service for the raw LSP client.
 */
export class LanguageClientService extends Context.Service<LanguageClientService, LanguageClient>()('talkbank/LanguageClient') {}

/**
 * Effect service for the typed execute-command client facade.
 */
export class ExecuteCommandClientService extends Context.Service<ExecuteCommandClientService, TalkbankExecuteCommandClient>()('talkbank/ExecuteCommandClient') {}

/**
 * Effect service for the shared executable boundary.
 */
export class ExecutableServiceService extends Context.Service<ExecutableServiceService, ExtensionExecutableService>()('talkbank/ExecutableService') {}

/**
 * Effect service for the cache manager.
 */
export class CacheManagerService extends Context.Service<CacheManagerService, CacheManager>()('talkbank/CacheManager') {}

/**
 * Effect service for CLAN integration helpers.
 */
export class ClanIntegrationService extends Context.Service<ClanIntegrationService, ClanIntegration>()('talkbank/ClanIntegration') {}

/**
 * Effect service for the shared runtime context boundary.
 */
export class ExtensionRuntimeContextService extends Context.Service<ExtensionRuntimeContextService, ExtensionRuntimeContext>()('talkbank/ExtensionRuntimeContext') {}

/**
 * Current Effect environment provided by extension activation.
 */
export type ExtensionEffectRequirements =
    | ExtensionContextService
    | LanguageClientService
    | ExecuteCommandClientService
    | ExecutableServiceService
    | CacheManagerService
    | ClanIntegrationService
    | ExtensionRuntimeContextService
    | ClanClientService;

/**
 * Build one Layer from the current extension activation context plus service bag.
 */
export function makeExtensionServicesLayer(
    context: vscode.ExtensionContext,
    services: ExtensionServices,
) {
    return Layer.mergeAll(
        Layer.succeed(ExtensionContextService, context),
        Layer.succeed(LanguageClientService, services.client),
        Layer.succeed(ClanClientService, services.clanClient),
        Layer.succeed(ExecuteCommandClientService, services.commands),
        Layer.succeed(ExecutableServiceService, services.executableService),
        Layer.succeed(CacheManagerService, services.cacheManager),
        Layer.succeed(ClanIntegrationService, services.clanIntegration),
        Layer.succeed(ExtensionRuntimeContextService, services.runtimeContext),
    );
}

/**
 * Wrap one async boundary operation in a tagged Effect error.
 */
export function tryAsync<A>(
    operation: string,
    evaluate: () => Promise<A>,
): Effect.Effect<A, AsyncOperationError> {
    return Effect.tryPromise({
        try: evaluate,
        catch: cause => new AsyncOperationError({
            operation,
            cause,
        }),
    });
}
