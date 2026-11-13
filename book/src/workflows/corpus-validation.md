# Corpus Validation

**Status:** Current
**Last updated:** 2026-11-13

The Validation Explorer provides corpus-scale validation of `.cha` files directly within VS Code. The extension checks directory trees and displays file outcomes in a navigable tree view.

## Validation Explorer

The **CHAT Validation** panel appears automatically in the Explorer sidebar when the extension is active. It mirrors your workspace folder structure, filtered to show only `.cha` files and the directories that contain them.

> **(SCREENSHOT: Validation Explorer panel in the Explorer sidebar showing a directory tree with mixed pass/fail results)**
> *Capture this: Open a workspace with multiple .cha files, validate all, and show the tree with green checkmarks on passing files, red X badges with error counts on failing files, and expanded error items under a failing file*

## Validating Files

### Single File

Click the checkmark icon next to any `.cha` file in the Validation Explorer tree. The file is validated and its status updates:

- **Not checked** -- no completed verdict is retained
- **Green checkmark** -- the file is valid CHAT
- **Red X with error count** (e.g., "3 errors") -- the file has validation errors

### Directory

Click the double-checkmark icon next to a folder to validate all `.cha` files in that directory and its subdirectories. This runs the `chatter validate` CLI with `--format json` under the hood, visiting files sequentially so cancellation can stop between files.

### Entire Workspace

Click the double-checkmark button in the Validation Explorer toolbar to validate every `.cha` file in the workspace.

## Navigating Errors

When a file fails validation, expand it in the tree to see individual error items. Each error shows:

- The error code (e.g., E301, E501)
- A description of the problem

Click an error item to open its file. The current CLI JSONL diagnostic records carry codes, severity and messages. Use the editor Problems panel for source-located LSP diagnostics.

## Toolbar

The Validation Explorer toolbar provides two actions:

| Button | Icon | Action |
|--------|------|--------|
| Validate All | Double-checkmark | Validate all `.cha` files in the workspace |
| Refresh | Refresh | Update the tree view to reflect filesystem changes |

## Context Menu

Right-click on files or directories in the Validation Explorer for additional options:

| Action | Description |
|--------|-------------|
| **Validate File** | Validate a single `.cha` file |
| **Validate Directory** | Validate all `.cha` files in a folder |
| **Clear Cache** | Remove cached validation results, forcing revalidation |

## How It Works

The Validation Explorer does **not** use the LSP for bulk validation. It invokes `chatter validate --format json` through a literal executable and argument vector. Each single-file JSONL run must contain one result for the requested path and a terminal complete summary. Exit-one output retains invalid-file verdicts. Failed or incomplete attempts invalidate the earlier verdict and leave the file unchecked. Directory cancellation is observed between files.

Results are cached in a SQLite database for reuse under the CLI's validation policy. See [Cache Management](../configuration/cache.md) for details on the cache location and how to clear it.

## Real-Time vs. Bulk Validation

The extension provides two complementary validation paths:

| Path | Trigger | Scope | Speed |
|------|---------|-------|-------|
| **Real-time (LSP)** | Typing in the editor | Single open file | Instant (250ms debounce) |
| **Bulk (CLI)** | Validation Explorer | Entire directories | Sequential file visits, CLI cache |

Real-time validation shows errors as inline squiggles and in the Problems panel as you edit. Bulk validation via the Validation Explorer gives you a corpus-wide overview. Both use the same underlying validation logic.

## Related Chapters

- [Cache Management](../configuration/cache.md) -- cache location, statistics, and clearing
- [Settings Reference](../configuration/settings.md) -- `talkbank.validation.severity` controls which diagnostics are shown
- [Batch Processing](batch-processing.md) -- combining validation with analysis and other bulk operations
