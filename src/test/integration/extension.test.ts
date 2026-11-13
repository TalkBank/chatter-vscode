/// <reference types="mocha" />

import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { Effect, Schema } from 'effect';
import type { ClanClient } from '../../lsp/clanClient';
import { AnalysisSelection } from '../../lsp/clanSelection';

import { talkbankExecuteCommandList } from '../../lsp/executeCommandClient';
import {
    AnalysisDatabaseFilterSchema,
    decodeDependencyGraphResponse,
    parseAlignmentSidecarDocument,
} from '../../lsp/executeCommandPayloads';

const EXTENSION_ID = 'talkbank.talkbank-chat';

function referencePath(): string {
    const reference = process.env.TALKBANK_TEST_REFERENCE;
    assert.ok(reference, 'the integration runner must supply the public reference fixture');
    return reference;
}

function hasMissingTerminator(diagnostics: readonly vscode.Diagnostic[]): boolean {
    return diagnostics.some(diagnostic => {
        const code = typeof diagnostic.code === 'object' ? diagnostic.code.value : diagnostic.code;
        return code === 'E305';
    });
}

function diagnosticsAfter(
    uri: vscode.Uri,
    accepts: (diagnostics: readonly vscode.Diagnostic[]) => boolean,
    change: () => Promise<void>,
): Promise<readonly vscode.Diagnostic[]> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            subscription.dispose();
            reject(new Error('The selected server did not publish the expected diagnostics'));
        }, 30_000);
        const subscription = vscode.languages.onDidChangeDiagnostics(event => {
            if (!event.uris.some(changed => changed.toString() === uri.toString())) {
                return;
            }
            const diagnostics = vscode.languages.getDiagnostics(uri);
            if (accepts(diagnostics)) {
                clearTimeout(timer);
                subscription.dispose();
                resolve(diagnostics);
            }
        });
        void change().catch(error => {
            clearTimeout(timer);
            subscription.dispose();
            reject(error);
        });
    });
}

describe('the selected server in the real VS Code client', () => {
    /**
     * Guards: actual client/server diagnostics, versioned fixes and custom graph/sidecar consumption.
     * Kind: journey
     * Not a type: editor events and another executable's responses cross the compiler's boundary.
     * State: one disposable file copied from Chatter's public tiers/mor-gra.cha reference.
     * Concurrency: an isolated extension host and unique file, with event-driven diagnostic waits.
     */
    it('repairs an unsaved Unicode/CRLF buffer and consumes graph and alignment RPCs', async function () {
        this.timeout(120_000);
        const extension = vscode.extensions.getExtension(EXTENSION_ID);
        assert.ok(extension, 'the extension must be present in this isolated host');
        await extension.activate();
        const registered = await vscode.commands.getCommands(true);
        for (const command of talkbankExecuteCommandList) {
            assert.ok(registered.includes(command), `the server did not advertise ${command}`);
        }

        const reference = await fs.readFile(
            referencePath(),
            'utf8',
        );
        const source = reference
            .replace('@Begin\n', '@Begin\n@Comment:\tUnicode 🧪 control\n')
            .replace(/\n/g, '\r\n');
        const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'talkbank-editor-'));
        const uri = vscode.Uri.file(path.join(directory, 'reference.cha'));
        await fs.writeFile(uri.fsPath, source);
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            assert.strictEqual(document.languageId, 'chat');
            const terminatorOffset = source.indexOf(' .\r\n');
            assert.ok(terminatorOffset > 0, 'the reference must contain a period terminator');
            const position = document.positionAt(terminatorOffset);
            const terminatorRange = new vscode.Range(position, position.translate(0, 2));
            await diagnosticsAfter(uri, hasMissingTerminator, async () => {
                const edit = new vscode.WorkspaceEdit();
                edit.delete(uri, terminatorRange);
                assert.ok(await vscode.workspace.applyEdit(edit));
            });
            assert.ok(document.isDirty, 'the server must observe unsaved editor changes');
            const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
                'vscode.executeCodeActionProvider', uri, new vscode.Range(position, position),
            );
            const repair = actions?.find(action => action.edit && action.title === "Add '.' (declarative/default)");
            assert.ok(repair?.edit, `the current E305 must offer a versioned repair: ${JSON.stringify(actions)}`);
            await diagnosticsAfter(uri, diagnostics => !hasMissingTerminator(diagnostics), async () => {
                assert.ok(await vscode.workspace.applyEdit(repair.edit!));
            });
            assert.strictEqual(document.getText(), source, 'the repair must preserve the reference bytes');

            const wordOffset = source.indexOf('*CHI:\t') + '*CHI:\t'.length;
            assert.ok(wordOffset >= '*CHI:\t'.length);
            const graph = decodeDependencyGraphResponse(await vscode.commands.executeCommand<unknown>(
                'talkbank/showDependencyGraph', uri.toString(), document.positionAt(wordOffset),
            ));
            assert.strictEqual(graph.kind, 'dot', JSON.stringify(graph));
            if (graph.kind === 'dot') {
                assert.ok(graph.source.includes('digraph'));
            }
            const sidecar = parseAlignmentSidecarDocument(await vscode.commands.executeCommand<unknown>(
                'talkbank/getAlignmentSidecar', uri.toString(),
            ));
            assert.ok(sidecar, 'the extension must decode the current server sidecar');
            assert.strictEqual(sidecar.uri, uri.toString());
            assert.ok(sidecar.utterances.length > 0);
        } finally {
            await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
            await fs.rm(directory, { recursive: true, force: true });
        }
    });
    /**
     * Guards: the advertised library analyses execute on admitted unsaved input and reject stale revisions, partial populations and failed databases.
     * Kind: journey
     * Not a type: real editor synchronization, Rust RPC execution and filesystem failures cross process boundaries.
     * State: the public MOR/GRA reference in a unique disposable directory and one missing database path.
     * Concurrency: an isolated editor host, awaited edits and per-request cancellation ownership.
     */
    it('analyzes the unsaved revision through the composed CLAN library', async function () {
        this.timeout(120_000);
        const extension = vscode.extensions.getExtension<{ clan: ClanClient }>(EXTENSION_ID);
        assert.ok(extension);
        const api = await extension.activate();
        const commands = await Effect.runPromise(api.clan.commands());
        const freq = commands.find(command => command.command === 'freq');
        assert.ok(freq);
        const selection = await AnalysisSelection.prepare(freq, vscode.window);
        assert.ok(selection);
        const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'talkbank-analysis-'));
        const uri = vscode.Uri.file(path.join(directory, 'reference.cha'));
        const source = await fs.readFile(referencePath(), 'utf8');
        await fs.writeFile(uri.fsPath, source);
        const cancellation = new vscode.CancellationTokenSource();
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            const start = document.getText().indexOf("*CHI:\tit's") + '*CHI:\t'.length;
            assert.ok(start > '*CHI:\t'.length);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(uri, new vscode.Range(document.positionAt(start), document.positionAt(start + 4)), 'novel');
            assert.ok(await vscode.workspace.applyEdit(edit));
            assert.ok(document.isDirty);
            const selectedVersion = document.version;
            const result = await Effect.runPromise(api.clan.analyze({
                kind: 'document', uri: uri.toString(), version: selectedVersion,
            }, selection, cancellation.token));
            const frequency = Schema.decodeUnknownSync(Schema.Struct({
                speakers: Schema.Array(Schema.Struct({
                    speaker: Schema.String,
                    entries: Schema.Array(Schema.Struct({ word: Schema.String, count: Schema.Number })),
                })),
            }))(result.forPresentation());
            const child = frequency.speakers.find(speaker => speaker.speaker === 'CHI');
            assert.strictEqual(child?.entries.find(entry => entry.word === 'novel')?.count, 1);
            assert.ok(!(await fs.readFile(uri.fsPath, 'utf8')).includes('novel'));

            const next = new vscode.WorkspaceEdit();
            next.insert(uri, new vscode.Position(2, 0), '@Comment:\tNext revision\n');
            assert.ok(await vscode.workspace.applyEdit(next));
            assert.throws(() => result.forPresentation());
            const stale = await Effect.runPromise(Effect.result(api.clan.analyze({
                kind: 'document', uri: uri.toString(), version: selectedVersion,
            }, selection, cancellation.token)));
            assert.strictEqual(stale._tag, 'Failure');
            if (stale._tag === 'Failure') { assert.match(stale.failure.details, /revision changed/); }

            const scriptPath = path.join(directory, 'categories.cut');
            await fs.writeFile(scriptPath, 'OR\n"Nouns" +noun +propn\n');
            for (const choice of commands) {
                const admitted = await AnalysisSelection.prepare(choice, {
                    showInputBox: async () => 'want',
                    showOpenDialog: async () => [choice.prompt === 'scriptPath'
                        ? vscode.Uri.file(scriptPath) : uri],
                });
                assert.ok(admitted, `required input must be admitted for ${choice.command}`);
                const analysis = await Effect.runPromise(Effect.result(api.clan.analyze({
                    kind: 'document', uri: uri.toString(), version: document.version,
                }, admitted, cancellation.token)));
                assert.strictEqual(analysis._tag, 'Success', `${choice.command}: ${JSON.stringify(analysis)}`);
                if (analysis._tag === 'Success') { assert.ok(analysis.success.forPresentation()); }
            }
            assert.deepStrictEqual(await Effect.runPromise(api.clan.databases(directory)), []);
            const aggregate = await Effect.runPromise(api.clan.analyze({
                kind: 'directory', uri: vscode.Uri.file(directory).toString(),
            }, selection, cancellation.token));
            assert.ok(aggregate.forPresentation());
            const invalidUri = vscode.Uri.file(path.join(directory, 'invalid.cha'));
            await fs.writeFile(invalidUri.fsPath, '@Begin\n@End\n');
            const partial = await Effect.runPromise(Effect.result(api.clan.analyze({
                kind: 'directory', uri: vscode.Uri.file(directory).toString(),
            }, selection, cancellation.token)));
            assert.strictEqual(partial._tag, 'Failure', 'invalid directory member must reject the aggregate');
            await fs.rm(invalidUri.fsPath);

            const missingDatabase = AnalysisSelection.normative('eval', path.join(directory, 'missing_db.cut'),
                Schema.decodeUnknownSync(AnalysisDatabaseFilterSchema)({ gender: 'Female', age_from_months: 24 }));
            const missing = await Effect.runPromise(Effect.result(api.clan.analyze({
                kind: 'document', uri: uri.toString(), version: document.version,
            }, missingDatabase, cancellation.token)));
            assert.strictEqual(missing._tag, 'Failure');
            if (missing._tag === 'Failure') { assert.match(missing.failure.details, /missing_db\.cut/); }
        } finally {
            cancellation.dispose();
            await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
            await fs.rm(directory, { recursive: true, force: true });
        }
    });

});
