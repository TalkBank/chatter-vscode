# Assessment Tools


**Status:** Current
**Last updated:** 2026-11-13

KidEval, EVAL and EVAL-D have dedicated commands and panels. They run the
Rust library's implemented measures and can request comparisons with locally
installed normative databases.

## Current limits

The editor currently uses default scoring configurations. Custom DSS/IPSyn
rules and CLAN language-bundle selection need additional controls. KidEval's
combined VOCD measure uses a simplified estimate. Real reference-database
comparison and numerical agreement with macOS CLAN remain qualification work.
The completed native UI journey covers EVAL without a database and CSV export.
The [parity inventory](../developer/clan-parity.md) tracks these gaps and the
paused full-parity goal.

Set `talkbank.clan.libraryDirectory` to your CLAN `lib` directory. The panel
uses its `kideval` or `eval` subdirectory. Without that setting, choose **Run
without Database**. A selected database that cannot be loaded causes an error.
Database availability depends on the files actually installed on your machine.

## KidEval, Child Language Assessment

KidEval computes a battery of language measures (MLU, MLT, VOCD, DSS,
IPSyn, and others) and compares each against normative data from
age-matched, typically developing children.

### How to run KidEval

1. Open a `.cha` file containing child language data.
2. Right-click in the editor and choose **Run KidEval**, or use the
   Command Palette: **TalkBank: Run KidEval**.
3. The KidEval panel opens with characteristic selection controls.

### Step 1: Select language and activity

The panel presents two cascading dropdowns:

- **Language**: choose the child's language (English NA, English UK,
  French, Japanese, Spanish, Chinese, Dutch, Cantonese)
- **Activity Type**: choose the data collection context (Narrative
  or Toyplay). The activity dropdown filters automatically to show
  only the activities available for the selected language.

Select language and activity from the installed database metadata. Automatic
selection from CHAT headers remains unfinished in the current editor integration.

Below the dropdowns, an **availability grid** shows all language ×
activity combinations at a glance. Click any cell to select it:

```text
              Narrative    Toyplay
English (NA)   ●            ●
English (UK)   ●            ●
French         ●            ●
Japanese, ●
Spanish        ●            ●
Chinese        ●            ●

● = available
= not available
```

When a language + activity is selected, a **matching database card**
shows the selected database filename and available metadata.

The activity type matters: narrative tasks (story retelling, picture
description) and toy play sessions elicit different language patterns.
Use the database that matches your data collection protocol.

### Step 2: Filter by age and gender

After selecting language and activity, you can optionally narrow the
comparison group:

- **Gender**: filter to Male, Female, or All
- **Age range**: enter minimum and maximum age in months to compare
  against children within a specific developmental window

Leave these fields blank to compare against the full normative sample.

### Available KidEval databases

KidEval discovers `_db.cut` databases by suffix
(`crates/talkbank-clan/src/database/discovery.rs`); the live list is
whatever exists under `clan-info/lib/kideval/` at runtime. The
authoritative sample count for a database is the number of `^=` header
lines it contains (each sample is a 4-line record). To check a count
locally:

```bash
grep -c '^=' clan-info/lib/kideval/<database>.cut
```

| Language | Activity | Database |
|----------|----------|----------|
| English (NA) | Narrative | `eng_narrative_db.cut` |
| English (NA) | Toyplay | `eng_toyplay_db.cut` |
| English (UK) | Narrative | `engu_narrative_db.cut` |
| English (UK) | Toyplay | `engu_toyplay_db.cut` |
| French | Narrative | `fra_narrative_db.cut` |
| French | Toyplay | `fra_toyplay_db.cut` |
| Japanese | Toyplay | `jpn_toyplay_db.cut` |
| Spanish | Narrative | `spa_narrative_db.cut` |
| Spanish | Toyplay | `spa_toyplay_db.cut` |
| Chinese | Narrative | `zho_narrative_db.cut` |
| Chinese | Toyplay | `zho_toyplay_db.cut` |

`clan-info/lib/kideval/` also contains `nld.cut` and `yue.cut`, but
those are DSS / IPSyn rule files, not sample databases; they are not
enumerated by the `_db.cut` discovery and don't participate in KidEval
norms.

### Step 3: View results

Click **Run** to compute the analysis. Results appear in three sections:

**Stat cards** at the top of the panel show the key measures with
color-coded z-score indicators:

- Green: within 1 standard deviation of the mean (typical range)
- Yellow: between 1 and 2 standard deviations (borderline)
- Red: more than 2 standard deviations from the mean (atypical)

> **(SCREENSHOT: KidEval results showing stat cards with z-scores and comparison table)**
> *Capture this: KidEval results after clicking "Compare with Database" for an English narrative file, showing colored stat cards (green/red z-scores) and the detailed comparison table with Measure, Child, Norm Mean, Norm SD, z-score, N columns.*

**Comparison table** showing side-by-side values:

| Measure | Child | Norm Mean | Norm SD | z-score |
|---------|-------|-----------|---------|---------|
| MLU | 3.21 | 3.85 | 0.62 | -1.03 |
| MLT | 1.45 | 1.80 | 0.35 | -1.00 |
| VOCD | 42.3 | 55.1 | 12.4 | -1.03 |
| ... | ... | ... | ... | ... |

**Per-measure breakdown** with additional detail for each metric.

### What each measure means

| Measure | What it captures |
|---------|-----------------|
| MLU | Utterance length in morphemes (grammatical complexity) |
| MLT | Utterances per turn (conversational participation) |
| VOCD | Vocabulary diversity (D statistic) |
| DSS | Developmental Sentence Score (grammatical maturity) |
| IPSyn | Index of Productive Syntax (structural range) |
| Total words | Overall productivity |
| Total utterances | Sample size |
| TTR | Type-token ratio (raw vocabulary breadth) |

For detailed explanations of each measure, see
[Profiling Commands](profiling.md).

## Eval -- General Language Assessment

Eval uses the same panel interface as KidEval but with databases
designed for adult or general language assessment rather than child
development norms.

### How to run Eval

1. Open a `.cha` file in the editor.
2. Right-click and choose **Run Eval**, or use the Command Palette:
   **TalkBank: Run Eval**.
3. Select a database, optionally filter, and click **Run**.

### Available Eval databases

| Database file | Language | Description |
|--------------|----------|-------------|
| `eng_eval_db.cut` | American English | General adult language norms |
| `fra_eval_db.cut` | French | General adult language norms |

Eval databases contain normative data from healthy adult speakers,
useful as a baseline for comparing clinical populations.

## Eval-D -- Dementia Assessment

Eval-D is a specialized assessment mode for evaluating language in
dementia contexts. It uses normative databases from DementiaBank.

### How to run Eval-D

1. Open a `.cha` file in the editor.
2. Right-click and choose **Run Eval-D (Dementia)**, or use the Command
   Palette: **TalkBank: Run Eval-D (Dementia)**.
3. Select a database and click **Run**.

### Available Eval-D databases

| Database file | Language | Description |
|--------------|----------|-------------|
| `eng_eval-d_db.cut` | American English | DementiaBank norms (MCI, Possible AD, Probable AD, Vascular, Control) |
| `engu_eval-d_db.cut` | British English | DementiaBank norms (UK) |

Eval-D results use the same panel layout as KidEval and Eval:
stat cards with z-scores, comparison table, and per-measure breakdown.
The normative groups include control participants and multiple dementia
subtypes, allowing clinicians to see where a patient falls relative to
each group.

## Exporting assessment results

All three assessment tools support CSV export:

1. After results are displayed, click **Export CSV** in the panel toolbar.
2. Choose a save location.
3. The CSV contains the rendered table cells, including comparison columns
   when present. Stat-card-only values still need export support.

This is useful for:
- Importing results into a clinical report template
- Longitudinal tracking (export at each visit, combine in a spreadsheet)
- Research data collection across multiple participants

## Choosing the right assessment tool

| Population | Tool | Database to use |
|-----------|------|----------------|
| Children (English, narrative task) | KidEval | `eng_narrative_db.cut` |
| Children (English, toy play) | KidEval | `eng_toyplay_db.cut` |
| Children (other languages) | KidEval | Language-specific database |
| Healthy adults (baseline) | Eval | `eng_eval_db.cut` or `fra_eval_db.cut` |
| Adults with suspected dementia | Eval-D | `eng_eval-d_db.cut` |
| Adults with aphasia | Eval | `eng_eval_db.cut` (compare against healthy norms) |

## Next steps

- [Profiling Commands](profiling.md) -- understand what MLU, DSS, and
  IPSyn measure in detail
- [Running CLAN Commands](running-commands.md) -- how to run analysis
  commands in general
- [Command Reference](command-reference.md) -- the analysis commands

## Recovering from a failed operation

An analysis error restores both run controls so you can correct the selected
input and retry. Database discovery failure replaces the loading indicators.
Correct `talkbank.clan.libraryDirectory` and reopen the assessment panel to
retry discovery. Running without a database remains available.
Age bounds are whole months, including zero and adult ages. The boundary
admits values through the server's unsigned 32-bit month representation.
