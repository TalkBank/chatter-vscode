# Batch Processing

**Status:** Current
**Last updated:** 2026-11-13

This chapter covers workflows that operate on multiple files at once -- directory-level analysis, corpus-scale validation, and integration with the `chatter` CLI and batchalign3 for bulk operations.

## Directory-Level CLAN Analysis

Choose **Run CLAN Analysis on Directory**, select a command and folder, and
inspect the aggregate result. The Rust library streams one admitted file at a
time. Discovery or input failures reject the request. Open buffers use their
unsaved revisions. Consult command coverage in the
[chatter-clan book](https://talkbank.github.io/chatter-clan/).

## Corpus-Scale Validation

The [Validation Explorer](corpus-validation.md) provides a tree view for validating entire directory trees. For even larger-scale validation, the `chatter` CLI can be used directly from the terminal:

```bash
# Validate an entire corpus directory
chatter validate path/to/corpus/ --refresh-cache

# Validate with roundtrip checking (parse then re-serialize, compare)
chatter validate path/to/corpus/ --roundtrip --refresh-cache

# Faster validation (skip tier alignment checks)
chatter validate path/to/corpus/ --skip-alignment

# JSON output for programmatic consumption
chatter validate path/to/corpus/ --format json

# Limit error output
chatter validate path/to/corpus/ --max-errors 100

# Control parallelism
chatter validate path/to/corpus/ --jobs 4
```

The CLI runs validation in parallel using crossbeam workers. Results are cached in SQLite for instant re-display on subsequent runs.

## Integration with batchalign3

A common workflow for processing a corpus involves multiple stages:

### Align, Morphotag, Validate Cycle

```bash
# 1. Automatic transcription and alignment
batchalign3 transcribe audio_corpus/ -o transcribed/ --lang eng

# 2. Add morphological annotation (no --lang, language read per-file from @Languages)
batchalign3 morphotag transcribed/ -o annotated/

# 3. Validate the results
chatter validate annotated/ --refresh-cache

# 4. Open in VS Code for review and correction
code annotated/
```

### Bulk Alignment Repair

```bash
# Repair timing bullets on an existing corpus
batchalign3 align --bullet-repair corpus/ -o repaired/

# Validate the repaired files
chatter validate repaired/ --refresh-cache

# Open for post-alignment review
code repaired/
```

After opening the repaired corpus in VS Code, use [Review Mode](post-alignment-review.md) to step through and verify the alignment.

## Using chatter CLI for Bulk Operations

The `chatter` CLI supports several bulk operations that complement the VS Code extension:

| Command | Purpose |
|---------|---------|
| `chatter validate` | Validate files or directories |
| `chatter format` | Reformat CHAT files to canonical form |
| `chatter convert to-json` | Convert CHAT to JSON for programmatic processing |
| `chatter-clan freq` | Run standalone frequency analysis |
| `chatter-clan mlu` | Compute standalone mean length of utterance |

Input scope and output behavior vary by command. Use each command's `--help`
and its owning manual to select files, directories and output destinations.

## Tips for Batch Workflows

- **Use `--refresh-cache` for fresh validation.** This clears and updates cached results for the specified paths.

- **Start with validation.** Before running analysis commands, validate the corpus first. Analysis on malformed CHAT files can produce misleading results.

- **Monitor memory on large corpora.** The CLI processes files in parallel. For very large corpora (tens of thousands of files), use `--jobs N` to limit parallelism if memory is a concern.

- **Use JSON output for automation.** `chatter validate --format json` produces machine-readable output that can be piped to other tools for automated quality checks in CI pipelines.

## Related Chapters

- [Corpus Validation](corpus-validation.md) -- the Validation Explorer tree view
- [Post-Alignment Review](post-alignment-review.md) -- reviewing batchalign3 output in VS Code
- [Cache Management](../configuration/cache.md) -- cache location and clearing
