# Changelog

All notable changes to the TalkBank CHAT VS Code extension are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

No releases have been cut yet. The release workflow
(`.github/workflows/vscode-release.yml`) publishes five per-platform VSIX files
as a GitHub Release when a `vX.Y.Z` tag is pushed; each VSIX bundles the matching
`chatter-clan-lsp` from the exact downstream composition revision.

## [Unreleased]

### Added

- Standalone repository scaffolding: CI (`ci.yml`: extension compile,
  test, production bundle, plus mdBook build and link-check) and a release
  workflow (`vscode-release.yml`) that builds the per-platform `chatter-clan-lsp`
  from the pinned composition and packages the five platform VSIX files.
- Reconstructed the standalone book (its `book.toml` and `SUMMARY.md` were not
  carried over by the 2026-06-15 extraction) and added this changelog.

### Changed

- Restore CLAN library analysis through the downstream composed editor server.
- Target VS Code 1.146 with TypeScript 7, Effect 4 and current dependencies.
- Own command effects in one managed runtime and enforce strict unused checks.
- Prepare nested report tables once and export complete CSV rows.
- Bundle the standalone Graphviz browser asset with platform-specific servers.

- Lifted the extension to the repository root; the `vscode/` subdirectory
  nesting was an extraction artifact.
- The bundled language server is built from the exact downstream composition pin.
- Use current CLI JSONL validation and tagged cache statistics, and keep cache mutation in the CLI.
- Preserve literal webview script data and native process arguments.
- Restore assessment retry controls and optional demographic filters.

[Unreleased]: https://github.com/TalkBank/chatter-vscode/commits/main
