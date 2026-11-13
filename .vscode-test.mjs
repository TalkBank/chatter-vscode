// Configuration for @vscode/test-cli: runs the host-integration tests inside a
// real VS Code Extension Development Host (downloaded by @vscode/test-electron),
// as opposed to the vitest unit tests in src/test/*.test.ts which run in plain
// Node with the vscode API mocked.
//
// Prerequisites before `vscode-test` runs (see scripts/run-integration-tests.sh
// and the book's testing page): the extension bundle (dist/extension.js) and the
// compiled tests (out/test/integration/) must be built, and the talkbank-lsp
// server binary must be staged into server/ so the extension's activation can
// construct and start the LanguageClient.
import { defineConfig } from '@vscode/test-cli';
import path from 'node:path';

export default defineConfig({
    files: 'out/test/integration/**/*.test.js',
    version: '1.146.0',
    extensionDevelopmentPath: process.env.TALKBANK_TEST_EXTENSION_PATH ?? import.meta.dirname,
    env: {
        TALKBANK_TEST_REFERENCE: path.join(import.meta.dirname, 'src/test/fixtures/mor-gra.cha'),
    },
    mocha: {
        ui: 'bdd',
        timeout: 60000,
    },
});
