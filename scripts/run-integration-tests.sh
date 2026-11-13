#!/usr/bin/env bash
# run-integration-tests.sh
#
# Full local flow for the VS Code host-integration tests (@vscode/test-cli).
# These run the extension inside a real VS Code Extension Development Host, so
# they need three things built first: the talkbank-lsp server binary staged
# into server/ (so activation constructs and starts the LanguageClient), the
# esbuild bundle (dist/extension.js), and the compiled tests (out/test/...).
#
# pretest:integration handles compile + bundle. Supply the exact native
# composed server executable to qualify, built in its owning CLAN checkout or
# extracted from a local VSIX.
#
# Usage: bash scripts/run-integration-tests.sh /absolute/path/to/chatter-clan-lsp
set -euo pipefail

VSCODE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 /absolute/path/to/chatter-clan-lsp" >&2
    exit 2
fi
LSP_BIN="$1"
case "$LSP_BIN" in
    /*) ;;
    *) echo "error: the server path must be absolute" >&2; exit 2 ;;
esac
[ -x "$LSP_BIN" ] || { echo "error: executable not found at $LSP_BIN" >&2; exit 1; }

echo "==> Staging the selected server binary"
node "$VSCODE_DIR/scripts/prepare-server.mjs" --source "$LSP_BIN"

echo "==> Running host-integration tests (downloads VS Code on first run)"
cd "$VSCODE_DIR"
npm run test:integration
