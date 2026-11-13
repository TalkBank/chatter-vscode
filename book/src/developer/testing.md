# Testing the LSP Consumer

**Status:** Current
**Last modified:** 2026-11-13

The extension is maintained as a concrete client of Chatter's language server.
Its TypeScript checks, real editor journeys and packaged-server checks establish
different boundaries.

## Compile and focused unit feedback

Run from this repository root.

```bash
npm ci
npm run compile
npm exec vitest run src/test/activationLsp.test.ts src/test/executeCommandClient.test.ts src/test/executeCommandContract.test.ts
```

Use the relevant feature tests for changed behavior. Before a publishing
candidate, compile the affected sources and verify the production bundle.
TypeScript 7 enforces strict typing, unused locals and unused parameters.
The local command manifest checks the facade's closed list. Runtime response
schemas admit external payloads before presentation.

## Qualify a selected server through VS Code

Build the native `chatter-clan-lsp` executable from the reviewed downstream
composition and its exact Chatter dependency pin. The host runner takes its absolute path.

```bash
bash scripts/run-integration-tests.sh /absolute/path/to/chatter-clan-lsp
```

The runner stages that executable, compiles and bundles the extension, then
launches an isolated VS Code Extension Development Host. It downloads the
pinned VS Code 1.146.0 editor on first use. `@vscode/test-electron` 3.1 or later reads
the macOS bundle executable metadata, including current bundles named `Code`.

The journey uses Chatter's public `tiers/mor-gra.cha` reference, with an added
Unicode comment and CRLF line endings. It opens a disposable copy, removes a
terminator and its separator in the unsaved buffer, observes E305, applies the
server's period repair and observes E305 clear. It then checks graph and
alignment-sidecar RPCs through the real LanguageClient and typed decoders.
Editor events drive waits, with bounded timeouts and per-run file cleanup.

The host journey checks the nine active server-command registrations. A second journey runs FREQ on an unsaved revision, refuses a stale result and
old-version request, and verifies explicit failure for a missing EVAL database. All 34 advertised library commands run through typed selections, including
secondary-file, template and search inputs. Webview rendering, actual media
playback, multiple open buffers and responsiveness require their own observable
qualification. Record those outcomes separately from this protocol journey.

Retain the exact server hash and source identity, editor version, selected
command and result. A local 0.35 candidate run qualifies that server/client
pairing. A packaged VSIX needs a run against the executable it bundles.
The packaging pin is documented in [Releasing](releasing.md).

## Type-driven changes and test discipline

Start with the type change that makes an invalid state unrepresentable.
The client facade's command set and decoded response unions constrain feature
code. Await startup before returning an active client. Model unavailable
features as explicit failures with an unavailable success type.

Every test created, changed or deliberately reviewed carries a doc comment with Guards, Kind, Not a type,
State and Concurrency. Explain the external boundary the compiler cannot see.
Reuse existing reference inputs and remove checks rendered redundant by types.

Rust parser, model and server tests belong in the Chatter repository. Its
[LSP testing guide](https://github.com/TalkBank/chatter/blob/main/book/src/contributing/lsp-testing.md)
owns server-side protocol and process qualification.

### Provenance and phase design

Trace source selection, request admission, execution and presentation as one
graph. Private constructors and discriminated unions carry established facts
and retained artifacts to the next phase. In Rust, phantom state parameters can
share implementations while exposing checked operations only on validated
states. The [Chatter testing guide](https://github.com/TalkBank/chatter/blob/main/book/src/contributing/testing.md#design-the-dependency-graph-before-retaining-a-test)
contains the full graph and phantom-state examples.

For editor analysis, `DocumentSnapshot` retains validation and session
provenance. `ParsedFile` accepts shared model admission. `ClanResult` retains
source identities and dispatch-time document objects until presentation.
A real editor event can change the current session, so response and
presentation admission still observe that dynamic boundary. They reuse model
validation, parsing and alignment already owned by the earlier phases.

Report checks, branches, panics, tests, traversals and fixture setup removed.
Count rubric annotations separately. A retained test explains the precise
external bytes, real effect or semantic choice left outside the type graph.

### Pure observations and real adapters

Design admitted observations or a shared typed effect double before a stateful
test. An editor-language decision uses a pure observed value. The RPC facade
accepts `ExecuteCommandTransport`, whose shared double supplies exact unknown
payloads and Promise rejections. Its fixtures implement the full narrow port.
Real editor journeys cover actual activation, transport and document events.
Each retained test's State field names the claim requiring a real resource.

For packaged webview qualification, materialize the VSIX and set
`TALKBANK_TEST_EXTENSION_PATH` to its extracted `extension` directory before
running `npm run test:integration`. The reference fixture stays with the test
runner. The development host must load actual assets under the extension root.
An out-of-tree bundle symlink can lose extension attribution and cause webview
resource requests to return HTTP 401. Packaging with `--follow-symlinks`
materializes those files without expanding webview resource permissions.

The Effect 4 migration removed two runtime-wiring tests, their aggregate fake
service setup, 12 outbound literal-shape assertions and three execution wrappers.
Distinct service identifiers constrain injection. A managed runtime owns the
shared layer. Pure editor observations replace the two broad VS Code facade
doubles. Twenty-two retained focused tests exercise external values or Promise
rejections. Rubric annotations are tracked separately from these removals.

The native packaged check covers FREQ word/count tables, EVAL without a database,
real CSV saves, and Graphviz SVG rendering and export. The nested-result
projection regression remains a pure value test. A scalar-only row type rules
out object coercion. The retained test checks that preparation preserves the
original words, counts, speaker paths and computed column metadata.

The discovery review removed the unused CLI-locator wrapper. Tests now consume
the shared executable service directly. Fifteen utility tests became three
reviewed tests covering twelve explicit discovery observations and an awaited
50-case ancestor property. Two removed properties only asserted output shapes
already constrained by types. The remaining reduction consolidates the policy
matrix. `ProjectSearchResult` is a closed found/path union. Its consumers lost
one redundant path check and one result-selection branch. Native path operations
replace string slicing introduced to satisfy mock keys.

## Review of native boundaries

The full candidate review replaced command-string process mocks with shared
exact-argv observations and closed stdout/failure outcomes. One native Node
child verifies delivery of shell syntax, empty strings, quotes and Unicode.
The filesystem observation fixture and narrow client lifecycle ports replace
cast-based editor and process fixtures. Startup contracts retain the real
possibility of asynchronous start rejection and resource cleanup.

The cache fixture admits only current tagged CLI records. Its tests retain raw
malformed bytes and storage-state policy. Validation fixtures produce a
completed single-file JSONL run, while refusal cases deliberately corrupt wire
completion, source association or record shape. These properties remain at
external admission edges after decoded unions constrain downstream consumers.
The diagnostic policy matrix uses pure severity observations. Real editor
journeys retain responsibility for the native middleware and RPC adapters.

This review reduced the unit inventory from 140 to 103 tests, including one new
inline-script parser contract. Consolidation and deletion are separate from
rubric documentation. It removed eight obsolete cache-field fallback selections,
four fabricated display counters, two shell-quoting helpers, the unused hit-rate
helper, direct database deletion the public repeated-initialization path, and unused assessment metadata-autodetection branches.
The script contract uses a real JavaScript parser to preserve literal dollar
tokens and escaped HTML script delimiters.

The same cleanup removed the unused home-directory cache-path API and its
fixture overrides. Runtime settings policy now uses one pure normalization
matrix and two native-configuration observation contracts. The installed-CLAN
handoff uses narrow discovery and launch capabilities, consolidating its two
contracts into one observation matrix.
