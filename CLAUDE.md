# VS Code Extension, TalkBank CHAT Editor

**Status:** Maintained LSP consumer reference.
**Last updated:** 2026-11-13

## Repo status and provenance

This is `TalkBank/chatter-vscode`: the standalone home of the CHAT VS Code
extension and its book. It was extracted from `TalkBank/chatter` on 2026-06-15
when active extension development paused. Its core editor integration is kept
current with Chatter as a concrete consumer of the LSP contract. The canonical recovery point, with the full git
history (including the LSP `talkbank/analyze` analysis bridge the extension once
consumed), is the `pre-clan-vscode-extraction` tag in `TalkBank/chatter`.

CLAN analysis runs in `chatter-clan-lsp`, a composed Rust server linking
Chatter's editor library and the `talkbank-clan` analysis library. Select its
binary with `talkbank.lsp.binaryPath`, or use a VSIX that bundles it. The server
advertises the available commands and required prompts. The core editor RPCs
remain owned by Chatter. Command coverage and numerical parity follow the
[chatter-clan parity record](https://talkbank.github.io/chatter-clan/parity-status.html).

The extension lives at the repository root. Its release workflow builds the
composed server from an exact chatter-clan commit for each platform and stages
it at `server/talkbank-lsp[.exe]`. See the releasing chapter for publication order
and exact-artifact qualification.

All user, developer, and integrator documentation lives in **`book/`**
(mdBook). The book is the single source of truth for this extension:
installation, every mode (transcription, walker, coder, review), every feature,
architecture, developer on-ramp, and custom LSP RPC contract reference.
`book/src/introduction.md` is the entry point; `book/src/SUMMARY.md` is the
table of contents.

`README.md` is the marketplace-facing summary (what a user sees on the
VS Code Marketplace listing); it is a short feature overview plus a
pointer into the book. Do not grow it into a second manual, every
non-trivial addition belongs in a book chapter. Keep this directory
free of loose `.md` docs; if the book doesn't yet cover a topic, add
a book chapter.

## Overview

VS Code extension providing real-time validation, media playback,
transcription mode, waveform visualization, dependency graphs, and speaker filtering
for CHAT format files. Backed by the `talkbank-lsp` Rust binary over stdio.

## The hard rule: no domain logic in this extension

This extension is a **presentation and workflow layer** over `talkbank-lsp`.
The Rust side owns parsing, validation, alignment, CHAT serialization, CLAN
command semantics, and every other piece of CHAT domain knowledge. The
TypeScript side owns webview layout, command wiring, keybindings, state
machines for coder/review/transcription/walker modes, and VS Code API
integration.

**Concretely, this extension must NOT:**

- Re-parse CHAT text (`bulletParser.ts` is a narrow stopgap for timing
  bullets only, documented as such, do not expand it).
- Re-implement any alignment between tiers. Main ↔ `%mor`, `%mor` ↔ `%gra`,
  `%pho`, `%sin`, `%wor` alignment all live in `talkbank-model`. The LSP
  exposes the computed alignment via hover, highlights, alignment sidecar
  JSON (`alignmentSidecar.ts` just decodes the sidecar into segment
  objects; it does not derive alignment). If a webview panel needs
  cross-tier information, request it from the LSP; never derive it from
  the document text on the client.
- Classify CHAT constructs by pattern-matching on serialized strings.
  Routinely, this is a bug: the CHAT grammar has subtle context (CA
  markers, retraces, overlap groups, compound words) that defeats regex.
  If a feature needs to know what kind of thing is under the cursor, the
  LSP can answer via semantic tokens, hover, or a custom RPC endpoint,
  add the endpoint rather than re-implement the classification in TS.
- Hold persistent domain state (open files, validation results, parsed
  ASTs) outside the LSP. Per-session VS Code state (panel positions,
  review ratings, coder progress) is fine; CHAT semantics is not.

The TypeScript side is one more layer away from the grammar and model
source of truth than the LSP itself. The cost of reconstructing domain
semantics here is higher still, always route through the LSP.

## Downstream composition

The extension connects to `chatter-clan-lsp`. That binary lives in
`chatter-clan` and links Chatter's `talkbank-lsp` library alongside
`talkbank-clan`. The CLAN library consumes Chatter's admitted CHAT model.
The [architecture chapter](book/src/developer/architecture.md) owns the
composition, document lifecycle and resource-ownership diagrams.

## Project Structure

```
vscode/
├── src/
│   ├── extension.ts           # Entry point: LSP client, command registrations
│   ├── analysisPanel.ts       # Webview: CLAN analysis JSON → styled tables
│   ├── graphPanel.ts          # Webview: Graphviz DOT → SVG
│   ├── mediaPanel.ts          # Webview: audio/video playback with segment tracking
│   ├── waveformPanel.ts       # Webview: Web Audio API waveform visualization
│   ├── validationExplorer.ts  # Tree view: bulk directory validation
│   ├── cacheManager.ts        # Status bar: cache stats (polls chatter CLI)
│   ├── clanIntegration.ts     # Open in CLAN via send2clan FFI
│   └── utils/                 # alignmentSidecar, bulletParser (fallback), mediaResolver, speakerFilter, cliLocator
├── syntaxes/chat.tmLanguage.json  # TextMate grammar (fallback highlighting)
├── package.json               # Extension manifest (commands, keybindings, menus)
├── book/                      # ← canonical documentation (mdBook)
├── README.md                  # Marketplace summary (keep short; book is the manual)
└── CLAUDE.md                  # This file, AI-assistant guidance for the extension
```

## Key Commands

```bash
npm ci
npm run compile
npm exec vitest run src/test/activationLsp.test.ts src/test/executeCommandClient.test.ts
bash scripts/run-integration-tests.sh /absolute/path/to/talkbank-lsp
```

## Features & Shortcuts

| Feature | Shortcut | Description |
|---------|----------|-------------|
| Dependency Graph | Cmd+Shift+G | DOT → SVG via Graphviz WASM |
| Play at Cursor | Cmd+Shift+Enter | Single segment playback |
| Continuous Play | Cmd+Shift+/ | Play all segments from cursor |
| Rewind | F8 | Rewind 2 seconds |
| Loop Segment | F5 | Toggle loop |
| Walker | Alt+Down/Up | Step through utterances with playback |
| Transcription | Command palette | F4 to stamp timing bullets |
| Speaker Filter | Context menu | Virtual document by speaker |
| Waveform | Cmd+Shift+W | Web Audio waveform visualization |

## LSP Binary Discovery

`findTalkbankLspBinary()` searches the configured path, bundled server, system PATH, then development debug/release builds. Native calls use literal argument vectors.

## Webview Pattern

All panels use singleton pattern (`createOrShow`). Communication via PostMessage JSON
protocol (rewind, setLoop, seekTo, segmentChanged).

## Analysis Commands

The five analysis commands use `ClanClient` and the custom methods
`clan/capabilities`, `clan/analyze` and `clan/databases`. Rust owns command
semantics. `AnalysisSelection` admits required UI input and `ClanResult`
retains dispatch-time document identity through presentation. General analysis
and normative panels own cancellation. Configure `talkbank.clan.libraryDirectory`
for local normative databases.

## Dependencies

(Versions live in `package.json`.)

- `vscode-languageclient`: LSP client
- `@hpcc-js/wasm`: Graphviz WASM
- TypeScript 7 with strict unused checks, Effect 4, Vitest 5

## Detailed Documentation

Design the whole provenance graph before retaining tests. Carry source identity,
computed artifacts and admission proofs through consuming transitions. Use
state-specific payloads and discriminated unions, with private constructors.
Rust phantom states can share implementations while restricting operations to
checked phases. Remove bypass fixture APIs, duplicate work and obsolete tests.
Use typestate and validated boundary types for state transitions. Review every
test and harness created, changed or deliberately reviewed. Retained tests
document Guards, Kind, Not a type, State and Concurrency in their
doc comment. Keep external editor and wire-boundary tests focused on observable
contracts. A current TypeScript build and real-client qualification are separate
evidence. Record the exact selected server and editor versions for host journeys.

All user and developer documentation lives in **`book/`** (mdBook). Read
`book/src/introduction.md` as the entry point; `book/src/SUMMARY.md`
lists every chapter.

High-traffic sections for newcomers:

- `book/src/getting-started/installation.md`: install a platform VSIX
- `book/src/developer/architecture.md`: three-layer design
- `book/src/developer/lsp-protocol.md`: LSP surface + custom RPC
- `book/src/navigation/alignment.md`: cross-tier alignment behavior
- `book/src/developer/clan-parity.md`: CLAN feature parity
