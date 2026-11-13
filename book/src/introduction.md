# TalkBank CHAT Editor

**Status:** Current
**Last modified:** 2026-11-13

The TalkBank CHAT Editor is a VS Code extension for working with
[CHAT format](https://talkbank.org/0info/manuals/CHAT.html) transcripts.
It is maintained as an editor and a concrete consumer of Chatter's language
server. Its client workflows constrain the server's protocol and document-state
contracts as Chatter evolves. Full feature parity with the macOS CLAN
application is paused. Current coverage and outstanding options, scoring,
annotation, export and platform work are recorded in the
[parity inventory](developer/clan-parity.md).

## What it does

- **Real-time validation**: errors appear as you type, with quick fixes
- **Media playback**: click a bullet to play audio, waveform visualization
- **Transcription mode**: F4 bullet stamping with live audio
- **Review mode**: rate and correct alignment quality with keyboard shortcuts
- **Dependency graphs**: visualize grammatical relations
- **Cross-tier alignment**: click a word, see its morphology and timing
- **Coder mode**: structured annotation with `.cut` code files

CLAN analysis runs in `chatter-clan-lsp`, a composed Rust server linking
Chatter's editor library and the `talkbank-clan` analysis library. Select its
binary with `talkbank.lsp.binaryPath`, or use a VSIX that bundles it. The server
advertises the available commands and required prompts. The core editor RPCs
remain owned by Chatter. Library differences and historical audit snapshots are tracked in the
[chatter-clan parity record](https://talkbank.github.io/chatter-clan/parity-status.html).

## Who this book is for

- **Researchers** using CHAT files for language sample analysis
- **Transcribers** creating and editing CHAT transcripts
- **Students** learning the CHAT format
- **Developers** extending the extension or language server

## How to read this book

- **New to the extension?** Start with [Installation](getting-started/installation.md)
  and [Your First CHAT File](getting-started/first-file.md).
- **Reviewing aligned files?** Go directly to the
  [Review Mode Tutorial](review/tutorial.md).
- **Looking for a specific feature?** Use the sidebar or the
  [Quick Reference](getting-started/quick-reference.md).
- **Building on the extension?** See the [Developer](developer/architecture.md)
  section.

## Requirements

- VS Code 1.146 or later on macOS, Windows or Linux.
- A locally packaged VSIX or Extension Development Host.
- The composed server for CLAN analysis. Select its path in settings when
  developing from source. See [Releasing](developer/releasing.md).
