# Releasing

**Status:** Current
**Last modified:** 2026-06-24 08:10 EDT

This repository ships the extension as five platform-specific VSIX files,
published as a GitHub Release by `.github/workflows/vscode-release.yml`. Each
VSIX bundles a prebuilt `talkbank-lsp` for its target platform at
`server/talkbank-lsp[.exe]`, so the installed extension needs no PATH binary and
no Rust toolchain on the user's machine.

> **Repo status.** `TalkBank/chatter-vscode` is currently a dormant,
> resumable repository (the extension was paused on 2026-06-15). The release
> machinery below is complete and ready, but no public VSIX channel is being
> actively promoted yet. Treat this chapter as the packaging runbook; cutting an
> actual public release is a maintainer decision.

## Where the language server comes from

The extension no longer builds `talkbank-lsp` itself. The server is a
first-class, code-signed release artifact of the **chatter** project, and the
release workflow downloads the matching per-platform binary from a pinned
chatter release:

- The pinned version lives in `vscode-release.yml` as `CHATTER_LSP_VERSION`
  (currently `v0.18.0`).
- Each VSIX target maps to a chatter Rust target, for example
  `darwin-arm64` to `talkbank-lsp-aarch64-apple-darwin.tar.xz`.
- To adopt a newer language server, bump `CHATTER_LSP_VERSION` and re-release.

## Cutting a release

1. Bump the `version` in `package.json` (the single source of truth for the
   extension version).
2. Commit and push to `main`.
3. Tag the release and push the tag:
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
4. The `package` matrix builds all five VSIX files:
   - `darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64`, `win32-x64`
5. The `release` job publishes a GitHub Release at tag `vX.Y.Z` with the five
   VSIX assets attached.

You can also run the workflow manually from the Actions tab
(`workflow_dispatch`), optionally overriding which chatter release supplies
`talkbank-lsp` via the `lsp_version` input.

## Local packaging (single platform)

For a manual build targeting your current host, run from the repo root:

```bash
npm ci
# Obtain a talkbank-lsp binary: download talkbank-lsp-<target> from
#   https://github.com/TalkBank/chatter/releases/latest
# or build it from a chatter checkout (cargo build --release -p talkbank-lsp).
node scripts/prepare-server.mjs --source /path/to/talkbank-lsp   # add --windows for .exe
npm run package:darwin-arm64   # or darwin-x64, linux-x64, linux-arm64, win32-x64
```

`prepare-server.mjs` stages the binary into `server/` with the correct name
(`talkbank-lsp` on Unix, `talkbank-lsp.exe` on Windows) so `vsce package`
bundles it at `server/` inside the VSIX.

## Users installing a VSIX

1. Obtain the VSIX matching the user's platform (OS and architecture).
2. Install from the command line:
   ```bash
   code --install-extension talkbank-chat-<platform>.vsix
   ```

No Rust toolchain, no PATH setup, no extra dependencies.

## Version number discipline

`package.json` is the single source of truth for the extension version. Do not
hand-edit the staged `server/talkbank-lsp` binary name or the tag format; the
release workflow derives the VSIX names from the matrix and the version from
`package.json`. For a release candidate, append a pre-release identifier
(`0.X.Y-rc.1`) per semver.

## Related chapters

- [Installation](../getting-started/installation.md): user-facing install
- [Troubleshooting: LSP Connection](../troubleshooting/lsp.md): binary discovery order
- [Testing](testing.md): the test gates a release must pass
- [ADR-004: Bundled LSP binary in the VSIX](../design/adr-004-bundled-lsp-binary.md)
