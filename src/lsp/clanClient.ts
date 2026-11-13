/** Typed client for the composed server's in-process CLAN analysis boundary. */

import type * as vscode from 'vscode';
import { Context, Data, Effect, Schema } from 'effect';
import type { LanguageClient } from 'vscode-languageclient/node';
import { StructuredPayloadDecodeError, decodeStructuredWithSchema } from '../effectBoundary';
import { ClanAnalysisUnavailable } from './executeCommandErrors';
import type { AnalysisSelection } from './clanSelection';
import { decodeAvailableDatabaseList, type AvailableDatabase } from './executeCommandPayloads';

const CommandSchema = Schema.Struct({
    command: Schema.NonEmptyString.pipe(Schema.brand('ClanCommand')),
    prompt: Schema.Literals(['none', 'keywords', 'search', 'scriptPath', 'secondFile', 'templateFile']),
});
export type ClanCommand = Schema.Schema.Type<typeof CommandSchema>;

const SourceSchema = Schema.Struct({
    uri: Schema.String,
    version: Schema.NullOr(Schema.Int),
    digest: Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/)),
});
const ResultSchema = Schema.Struct({
    data: Schema.JsonObject,
    sources: Schema.Array(SourceSchema),
});
type WireResult = Schema.Schema.Type<typeof ResultSchema>;

/** A decoded result bound to the client document objects present at dispatch. */
export class ClanResult {
    private constructor(private readonly result: WireResult, private readonly documents: ReadonlyMap<string, vscode.TextDocument>, private readonly currentDocuments: () => readonly vscode.TextDocument[]) {}

    static admit(payload: unknown, documents: ReadonlyMap<string, vscode.TextDocument>, currentDocuments: () => readonly vscode.TextDocument[]): ClanResult {
        return new ClanResult(
            decodeStructuredWithSchema('clan/analyze', payload, ResultSchema),
            documents,
            currentDocuments,
        );
    }

    forPresentation(): Schema.JsonObject {
        const current = new Map(this.currentDocuments().map(document => [document.uri.toString(), document]));
        for (const source of this.result.sources) {
            if (source.version === null) { continue; }
            const document = current.get(source.uri);
            if (!document || document !== this.documents.get(source.uri) || document.version !== source.version) {
                throw new ClanRequestError({ details: 'Analysis input changed. Run the analysis again on the current revision.' });
            }
        }
        return this.result.data;
    }
}

export type AnalysisTarget =
    | { readonly kind: 'document'; readonly uri: string; readonly version: number }
    | { readonly kind: 'directory'; readonly uri: string };

export class ClanRequestError extends Data.TaggedError('ClanRequestError')<{
    readonly details: string;
}> {}

export class ClanClient {
    constructor(private readonly client: LanguageClient, private readonly currentDocuments: () => readonly vscode.TextDocument[]) {}

    commands(): Effect.Effect<readonly ClanCommand[], ClanRequestError | ClanAnalysisUnavailable> {
        return Effect.tryPromise({
            try: async () => decodeStructuredWithSchema(
                'clan/capabilities', await this.client.sendRequest<unknown>('clan/capabilities'),
                Schema.Array(CommandSchema),
            ),
            catch: cause => new ClanAnalysisUnavailable({
                details: `Select a composed chatter-clan-lsp server to run CLAN analysis. ${errorText(cause)}`,
            }),
        });
    }

    analyze(
        target: AnalysisTarget,
        analysis: AnalysisSelection,
        cancellation: vscode.CancellationToken,
    ): Effect.Effect<ClanResult, ClanRequestError> {
        return clanRequest(async () => {
                const documents = new Map(this.currentDocuments().map(document => [document.uri.toString(), document]));
                const payload = await this.client.sendRequest<unknown>('clan/analyze', { target, analysis: analysis.wire }, cancellation);
                return ClanResult.admit(payload, documents, this.currentDocuments);
        });
    }

    databases(directory: string): Effect.Effect<AvailableDatabase[], ClanRequestError> {
        return clanRequest(async () => decodeAvailableDatabaseList(
                await this.client.sendRequest<unknown>('clan/databases', { directory }),
            ));
    }
}

export function clanRequest<A>(evaluate: () => PromiseLike<A>): Effect.Effect<A, ClanRequestError> {
    return Effect.tryPromise({
        try: async () => evaluate(),
        catch: cause => cause instanceof ClanRequestError ? cause : new ClanRequestError({ details: errorText(cause) }),
    });
}

function errorText(cause: unknown): string {
    if (cause instanceof ClanRequestError || cause instanceof ClanAnalysisUnavailable || cause instanceof StructuredPayloadDecodeError) {
        return cause.details;
    }
    return cause instanceof Error ? cause.message : String(cause);
}

export class ClanClientService extends Context.Service<ClanClientService, ClanClient>()('talkbank/ClanAnalysisClient') {}
