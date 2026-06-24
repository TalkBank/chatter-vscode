# Installation

**Status:** Current
**Last modified:** 2026-05-30 20:24 EDT

This chapter walks you through installing VS Code and the TalkBank CHAT
extension from this repository. `TalkBank/chatter` already contains the VSIX
packaging scripts and the `talkbank-lsp` server, but it is not yet the public
release source of truth for prebuilt VSIX downloads. By the end, you will have
either a locally packaged VSIX or a working Extension Development Host, plus a
`talkbank-lsp` build that powers syntax highlighting, validation, and the rest
of the editor features described in this book.

---

## Prerequisites

You need:

1. **Visual Studio Code Insiders** version 1.110 or later
2. **Rust 2024 edition tooling** (`rustc 1.85+`) so you can build
   `talkbank-lsp`
3. **Node.js 18+ and npm** for the extension build and packaging scripts
4. **A cloned `TalkBank/chatter` checkout**

The extension can run in two ways from this repo:

1. **Local VSIX package**: build `talkbank-lsp`, bundle it into a
   platform-specific `.vsix`, and install that file into VS Code Insiders
2. **Extension Development Host**: run the extension directly from `vscode/`
   while it resolves `talkbank-lsp` from the repo's `target/` tree

---

## Step 1: Install VS Code Insiders

### macOS

Install via Homebrew:

```bash
brew install --cask visual-studio-code@insiders
```

This gives you the `code-insiders` command in your terminal.

### Windows

Download from <https://code.visualstudio.com/insiders/>. Run the installer and
ensure "Add to PATH" is checked so the `code-insiders` command is available from
the terminal.

### Linux

Download the `.deb` or `.rpm` package from
<https://code.visualstudio.com/insiders/>, or use snap:

```bash
sudo snap install code-insiders --classic
```

---

## Step 2: Build and install the extension

### Option A: Local VSIX package (recommended for regular use)

Obtain a `talkbank-lsp` binary, package the extension for your current host,
then install the resulting `.vsix`:

```bash
# 1. Get a talkbank-lsp binary for your platform. Simplest: download the
#    prebuilt, signed binary from the chatter release (talkbank-lsp-<target>):
#    https://github.com/TalkBank/chatter/releases/latest
#    Or build it from a chatter checkout:
#      git clone https://github.com/TalkBank/chatter.git && cd chatter
#      cargo build --release -p talkbank-lsp --locked   # -> target/release/talkbank-lsp

# 2. Package and install this extension (run from the repo root):
git clone https://github.com/TalkBank/chatter-vscode.git
cd chatter-vscode
npm ci
node scripts/prepare-server.mjs --source /path/to/talkbank-lsp
npm run package:darwin-arm64
code-insiders --install-extension talkbank-chat-darwin-arm64.vsix
```

Choose the packaging script that matches your host:

- `npm run package:darwin-arm64`
- `npm run package:darwin-x64`
- `npm run package:linux-x64`
- `npm run package:linux-arm64`
- `npm run package:win32-x64`

On Windows, pass the path to `talkbank-lsp.exe` to `prepare-server.mjs` and add
`--windows`.

Each packaged VSIX bundles the matching `talkbank-lsp` binary in
`<extension>/server/`, so the installed extension does not need PATH setup.

You can also install the `.vsix` from inside VS Code Insiders: open the Command
Palette (`Cmd+Shift+P`), run **"Extensions: Install from VSIX..."**, and select
the file you just built.

### Option B: Extension Development Host (fastest for contributors)

Contributors can run the extension directly from source:

```bash
git clone https://github.com/TalkBank/chatter-vscode.git
cd chatter-vscode
npm ci
npm run compile

# Open the extension workspace in VS Code Insiders:
code-insiders .
```

Then press **F5** in VS Code Insiders to launch the Extension Development Host.
In this mode the extension finds `talkbank-lsp` from the `talkbank-lsp.serverPath`
setting or your `PATH`; point it at a binary you downloaded from the chatter
release or built from a chatter checkout. Producing a full set of locally
packaged VSIX files is covered in the [Releasing chapter](../developer/releasing.md).

---

## Step 3: Verify the Installation

1. Open VS Code Insiders
2. Open any `.cha` file (if you have this repository cloned, try one from
   `corpus/reference/`)
3. You should see:
   - **Syntax highlighting** -- headers, speaker codes, dependent tiers, and
     annotations are colored by category
   - **Validation diagnostics** -- any errors or warnings appear as squiggly
     underlines and in the Problems panel (`Cmd+Shift+M`)
   - **"CHAT Validation" tree view** in the Explorer sidebar

> **(SCREENSHOT: VS Code Insiders with a CHAT file open)**
> *Capture this: a `.cha` file from `corpus/reference/` open in the editor,
> showing syntax highlighting, the Problems panel with diagnostics, and the
> CHAT Validation tree view in the Explorer sidebar.*

If you see plain, uncolored text, the extension did not activate. Check:

- The file has a `.cha` extension
- The language mode in the bottom status bar says "CHAT" (not "Plain Text")
- The Output panel (`Cmd+Shift+U`) shows a "TalkBank Language Server"
  channel with server startup messages

---

## How the LSP Binary Is Found

When the extension starts, it searches for the `talkbank-lsp` binary in this order:

1. **`talkbank.lsp.binaryPath` setting** -- if set and the file exists, that
   path is used directly (explicit override)
2. **Bundled binary** -- `<extension>/server/talkbank-lsp[.exe]`, shipped with
   each platform-specific VSIX
3. **System PATH** -- `which talkbank-lsp`, for developers who install via
   `cargo install`
4. **Dev-tree builds** -- `<extension>/../target/debug/talkbank-lsp` or
   `.../target/release/talkbank-lsp`, for contributors running from a cloned
   workspace
5. If none of these find a binary, an error notification appears with a link
   to the `talkbank.lsp.binaryPath` setting

The binary is spawned with no arguments. It speaks the Language Server Protocol
over stdio as soon as it starts.

See [Settings Reference](../configuration/settings.md) for the
`talkbank.lsp.binaryPath` setting, and [LSP Connection](../troubleshooting/lsp.md)
for troubleshooting a missing binary.

---

## Next Steps

With the extension installed, open a CHAT file and follow along with
[Your First CHAT File](first-file.md) to explore the core features.
