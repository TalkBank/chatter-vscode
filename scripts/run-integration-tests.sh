#!/usr/bin/env bash
# run-integration-tests.sh
#
# Full local flow for the VS Code host-integration tests (@vscode/test-cli).
# These run the extension inside a real VS Code Extension Development Host, so
# they need three things built first: the talkbank-lsp server binary staged
# into server/ (so activation constructs and starts the LanguageClient), the
# esbuild bundle (dist/extension.js), and the compiled tests (out/test/...).
#
# pretest:integration handles compile + bundle; this script adds the cargo
# build and the server staging, then runs the suite. CI replicates these same
# steps (build LSP for the runner platform, stage, then `npm run
# test:integration`).
#
# Usage:  bash scripts/run-integration-tests.sh
set -euo pipefail

VSCODE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$VSCODE_DIR/.." && pwd)"

echo "==> Building talkbank-lsp (debug)"
cargo build -p talkbank-lsp --manifest-path "$REPO_ROOT/Cargo.toml"

LSP_BIN="$REPO_ROOT/target/debug/talkbank-lsp"
[ -x "$LSP_BIN" ] || { echo "error: talkbank-lsp not found at $LSP_BIN" >&2; exit 1; }

echo "==> Staging the server binary into vscode/server/"
node "$VSCODE_DIR/scripts/prepare-server.mjs" --source "$LSP_BIN"

echo "==> Running host-integration tests (downloads VS Code on first run)"
cd "$VSCODE_DIR"
npm run test:integration
