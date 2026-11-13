# Releasing

**Status** Current candidate workflow, platform qualification pending

The release workflow builds `chatter-clan-lsp` from the exact
`CLAN_SERVER_REVISION` in `.github/workflows/vscode-release.yml`. That downstream
binary links both Rust libraries and consumes its Chatter dependency at the
full revision in the CLAN workspace lockfile. Each VSIX stages the executable at
`server/talkbank-lsp[.exe]` for the extension's existing binary locator.

## Publication order

1. Qualify and publish the selected Chatter commit.
2. Qualify and publish the CLAN commit consuming that exact revision.
3. Set the extension workflow's full CLAN commit and qualify the native VSIXes.
4. With publication approval, create the extension version tag. Its workflow
   publishes the five platform assets after every package job succeeds.

A local dependency in Cargo's Git cache can qualify local source integration.
A clean hosted build requires both public commits to be reachable. Record these
as separate outcomes. The candidate workflow is held until its pins are published
and platform runs have passed.

## Platform builds

| VSIX | Rust target | Runner |
| --- | --- | --- |
| darwin-arm64 | aarch64-apple-darwin | macos-15 |
| darwin-x64 | x86_64-apple-darwin | macos-15-intel |
| linux-x64 | x86_64-unknown-linux-musl | ubuntu-24.04 |
| linux-arm64 | aarch64-unknown-linux-musl | ubuntu-24.04-arm |
| win32-x64 | x86_64-pc-windows-msvc | windows-2025 |

The manifest's `files` allowlist owns the shipped runtime assets. Esbuild
bundles Node dependencies and copies the standalone Graphviz browser module to
`dist/vendor/graphviz.js`. Packaging uses `--no-dependencies`, and panel names
are a closed TypeScript union. Real package inspection owns asset presence.

Each job builds natively and stages only its server executable. Linux jobs
install musl tools. Manual workflow dispatch produces artifacts. A version-tag
push also publishes them. Hosted labels follow the
[GitHub runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).

## Local qualification and packaging

From a reviewed CLAN checkout, build the composed binary.

```bash
cargo build --release --locked -p chatter-clan-lsp
```

From this extension checkout, select and qualify that executable.

```bash
npm ci
bash scripts/run-integration-tests.sh /absolute/path/to/chatter-clan-lsp
node scripts/prepare-server.mjs --source /absolute/path/to/chatter-clan-lsp
npm run package:darwin-arm64
```

Use the matching package target for your platform. Add `--windows` to the
staging command for the Windows executable. Retain exact source and binary
identities, host journey results and the VSIX hash. Before release, qualify the
executable extracted from the package as well. Local native qualification does
not establish the other platform builds.

## Installation

Obtain the platform-specific VSIX and install it through VS Code's **Install
from VSIX** action or its CLI.

```bash
code --install-extension talkbank-chat-<platform>.vsix
```

The package contains the server. Local development can override it with
`talkbank.lsp.binaryPath`. `package.json` owns the extension version.

## Related chapters

- [Installation](../getting-started/installation.md)
- [Testing](testing.md)
- [LSP troubleshooting](../troubleshooting/lsp.md)
