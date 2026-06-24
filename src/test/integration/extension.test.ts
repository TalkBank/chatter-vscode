/// <reference types="mocha" />
//! Host-integration smoke test, runs inside a real VS Code Extension
//! Development Host via @vscode/test-cli (NOT vitest; this exercises the real
//! `vscode` API and the real extension activation path, which the mocked unit
//! tests deliberately do not).
//!
//! Why this exists: the unit tests mock `vscode-languageclient`, so a major
//! bump of that library (e.g. 9 -> 10) can pass the entire unit suite while
//! silently breaking the real `new LanguageClient(...)` / `client.start()` API
//! the extension depends on. This test activates the extension for real, so
//! that API surface is exercised end to end. The talkbank-lsp binary is staged
//! into server/ before the run (see scripts/run-integration-tests.sh), so
//! activation proceeds past the "no LSP binary" early-return and actually
//! constructs and starts the language client.

import * as assert from 'node:assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'talkbank.talkbank-chat';

// A command contributed by the extension. Commands are registered only AFTER a
// language client is successfully constructed and started (activate() returns
// early when no LSP binary is found), so the presence of this command is the
// observable proof that the full activate -> new LanguageClient -> start path
// ran without throwing.
const SENTINEL_COMMAND = 'talkbank.validateFile';

describe('extension activation (real VS Code host)', () => {
    it('activates without error', async function () {
        this.timeout(60000);
        const ext = vscode.extensions.getExtension(EXTENSION_ID);
        assert.ok(ext, `extension ${EXTENSION_ID} not present in the host`);
        await ext.activate();
        assert.strictEqual(ext.isActive, true, 'extension failed to activate');
    });

    it('registers its commands, proving the language client started', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(
            commands.includes(SENTINEL_COMMAND),
            `${SENTINEL_COMMAND} not registered; the LanguageClient likely failed `
                + 'to construct or start (this is the vscode-languageclient API '
                + 'surface a major bump can break)',
        );
    });
});
