# CLAN Parity and Remaining Work

**Status:** Extension maintenance active. Full macOS CLAN parity paused.
**Last updated:** 2026-11-13

Full feature parity with the macOS CLAN application remains the long-term goal.
The present update maintains the VS Code client, restores library-backed analysis
and records its current limits. Broader parity development resumes when that
work is explicitly reactivated. The current priority is Phon-aware Chatter.

## Current extension coverage

| Workflow | Current implementation |
| --- | --- |
| CHAT editing | Diagnostics, versioned repairs, navigation, alignment, formatting and participant editing through Chatter's LSP |
| Analysis | The composed server advertises 34 library commands, available for a document or directory |
| Required command inputs | Keyword/search prompts, RELY second input, SCRIPT template and MORTABLE script |
| Assessment | KidEval, EVAL and EVAL-D panels with installed-database discovery, selection and demographic filters |
| Results | Prepared nested analysis tables and complete general-analysis CSV export |
| Media and annotation | Playback, waveform, transcription, Walker, coding, alignment review and character composition |
| Existing CLAN application | Open in CLAN integration for an installed application |

A command's presence establishes an available route through the library. Its
options, calculations, output formats and complete editor workflow each need
corresponding qualification.

## Concrete parity gaps

| Area | Remaining work |
| --- | --- |
| Command options | Most editor RPC selections use library defaults. General speaker/tier filters, gem/postcode selection, display modes and the broader CLAN flag surface need typed RPC fields and UI controls. |
| Scoring-rule selection | DSS, IPSyn, SUGAR and KidEval use the rules available through their default library configurations. The editor has no custom DSS/IPSyn rule-file controls. KidEval's built-in VOCD component uses a simplified TTR-based estimate. |
| Algorithm and option parity | CHIP's newer options still need command-specific C CLAN comparison evidence. FLUCALC's word/syllable semantics and other per-command differences remain in the CLAN library audit. |
| Morphological annotation | MOR, POST, MEGRASP and POST database utilities require a separate annotation workflow. The Rust CLAN project currently reports those commands as unavailable stubs. The extension supplies no replacement annotation pipeline. |
| Converters and transforms | The CLAN library/CLI includes additional conversion and transcript-transform commands. Those commands need editor workflows and versioned document-edit integration before they join the extension's analysis surface. |
| Normative comparison | Installed database discovery and comparison requests are wired. Real reference-database comparisons, demographic population selection and numerical agreement still require qualification. |
| Assessment metadata | Automatic language/activity selection from CHAT headers remains unfinished. The current extension sends the selected filename to the panel. Users select installed database metadata themselves. |
| Assessment CSV | The assessment exporter reads rendered table cells. Stat-card-only values still need export support. General-analysis CSV uses all prepared rows, including rows outside its preview. |
| Application workflows | A complete comparison of macOS CLAN menus, commands, shortcuts, media behavior and annotation journeys remains outstanding. Existing similarly named features need task-by-task comparison. |
| Platforms | Local packaged qualification covers macOS arm64 with VS Code 1.146. The other four configured package targets require hosted builds and platform-specific journeys. |

The library's [parity status](https://talkbank.github.io/chatter-clan/parity-status.html)
labels its aggregate figures as historical snapshots awaiting re-baselining.
Its command pages retain specific differences and some older broad completion
claims. A current parity claim requires evidence bound to the selected command,
options, input and C CLAN reference. The extension carries those library limits
into its own results.

## Qualification completed for this update

- All 103 extension unit tests pass on TypeScript 7 and Vitest 5.
- Packaged VS Code 1.146 journeys exercise unsaved Unicode/CRLF repair,
  graph/sidecar RPCs, all 34 advertised analysis commands and required inputs.
- The journeys cover stale editor results and versions, invalid directory
  members, empty database discovery and a missing EVAL database.
- Native UI checks cover FREQ word/count tables and CSV, EVAL without a
  database and CSV, and Graphviz rendering and SVG export. The reviewed
  candidate also qualifies Command Palette visibility, discovery failure,
  invalid-input refusal and successful retry after correction.

Remaining qualification includes real normative database comparisons,
command-specific numerical and output parity, the complete media/annotation
journeys, responsiveness with large files and the other native package targets.
The [testing chapter](testing.md) records the boundaries and retained evidence.

## Resuming the full parity goal

Start with a current macOS CLAN version and an explicit workflow inventory.
For each workflow, record the extension entry point, supported inputs/options,
known semantic differences and an observable completion condition. Extend the
typed request and provenance graph before adding controls. Retain C CLAN
comparison evidence for calculations and output formats, plus focused real-editor
journeys for UI and media effects. Update this inventory as each gap closes.

## Related chapters

- [Architecture](architecture.md)
- [Command reference](../analysis/command-reference.md)
- [Assessment tools](../analysis/assessment.md)
- [RPC contracts](../reference/rpc-contracts.md)
- [Release qualification](releasing.md)
