# Changelog

All notable changes to the TalkBank CHAT VS Code extension are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

No releases have been cut yet. The release workflow
(`.github/workflows/vscode-release.yml`) publishes five per-platform VSIX files
as a GitHub Release when a `vX.Y.Z` tag is pushed; each VSIX bundles the matching
`talkbank-lsp` from the pinned chatter release.

## [Unreleased]

### Added

- Standalone repository scaffolding: CI (`ci.yml`: extension compile, lint,
  test, production bundle, plus mdBook build and link-check) and a release
  workflow (`vscode-release.yml`) that downloads the per-platform `talkbank-lsp`
  from the chatter release and packages the five platform VSIX files.
- Reconstructed the standalone book (its `book.toml` and `SUMMARY.md` were not
  carried over by the 2026-06-15 extraction) and added this changelog.

### Changed

- Lifted the extension to the repository root; the `vscode/` subdirectory
  nesting was an extraction artifact.
- The bundled language server is now sourced from the chatter release artifact
  rather than built from the monorepo.
- Bumped extension dependencies (including `vscode-languageclient` 10.0.1).

[Unreleased]: https://github.com/TalkBank/chatter-vscode/commits/main
