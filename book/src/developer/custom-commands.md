# Custom Commands

**Status:** Current
**Last modified:** 2026-05-29 22:30 EDT

The TalkBank language server defines twelve custom LSP commands
invoked via `workspace/executeCommand`. They provide functionality
that doesn't fit standard LSP capabilities (hover, completion, rename)
things like "run a CLAN analysis," "produce an alignment sidecar,"
"filter a document by speaker."

**The per-command reference lives at
[`reference/rpc-contracts.md`](../reference/rpc-contracts.md).**
That page is the single source of truth for request/response shapes,
TS callers, Rust handlers, and example payloads. This chapter covers
the shared architecture behind all twelve endpoints.

## Why custom commands?

Standard LSP capabilities have fixed request/response shapes defined
by the LSP specification. Custom commands allow arbitrary JSON
parameters and typed return values, the escape hatch protocols use
for extension-specific functionality. Alternatives considered and
rejected: ad-hoc HTTP sidecars, embedded WASM parsers, shared-memory
bridges. See [ADR-001](../design/adr-001-lsp-over-embedded-parser.md).

## Round-trip sequence

```mermaid
%% Verified against: src/lsp/executeCommandClient.ts,
%% crates/talkbank-lsp/src/backend/requests/execute_command.rs,
%% crates/talkbank-lsp/src/backend/execute_commands.rs,
%% crates/talkbank-lsp/src/backend/analysis.rs.
sequenceDiagram
    participant C as Caller<br/>(command / panel)
    participant E as TalkbankExecuteCommandClient<br/>(src/lsp/executeCommandClient.ts)
    participant LC as LanguageClient<br/>(vscode-languageclient)
    participant S as talkbank-lsp dispatcher<br/>(backend/requests/execute_command.rs)
    participant D as Request decoder<br/>(backend/execute_commands.rs)
    participant H as Handler<br/>(e.g. backend/analysis.rs)
    participant M as talkbank-model<br/>(ChatFile, alignment, CLAN runner)

    C->>E: invoke(talkbank/analyze, typed args)
    E->>E: Effect.Schema encode args
    E->>LC: workspace/executeCommand(name, [json])
    LC->>S: JSON-RPC over stdio
    S->>D: ExecuteCommandRequest::parse(name, args)
    D-->>S: typed ExecuteCommandRequest variant
    S->>H: dispatch to family handler
    H->>M: ChatFile lookup, alignment use, CLAN runner
    M-->>H: typed result
    H-->>S: Result<serde_json::Value, LspBackendError>
    S-->>LC: JSON-RPC response (or string-valued error)
    LC-->>E: Promise<unknown>
    E->>E: Effect.Schema decode result
    E-->>C: typed TS value
```

## Typed boundary rules

- **Every command name** is a variant of `ExecuteCommandName` in
  `execute_commands.rs`. Adding a command means adding a variant,
  the compiler forces you to handle it in dispatch and the unit test
  pins the advertised-list against the enum.
- **Every request payload** decodes through
  `ExecuteCommandRequest::parse`. On malformed input the dispatcher
  returns a typed `LspBackendError`, never panics.
- **Every response** is `serde_json::Value` at the LSP wire boundary;
  handlers build typed structs and `serde_json::to_value` at the
  edge. The `?` operator lifts serialization failures via
  `LspBackendError::JsonSerializeFailed`.
- **On the TypeScript side**, `TalkbankExecuteCommandClient` wraps
  `client.sendRequest('workspace/executeCommand', …)` and runs the
  JSON through an Effect `Schema` decoder. Callers receive typed
  values, never `unknown`. Three tagged error classes classify
  failure modes, see
  [`executeCommandErrors.ts`][errors].

[errors]: https://github.com/TalkBank/chatter-vscode/blob/main/src/lsp/executeCommandErrors.ts

## Usage from TypeScript

```ts
// Example: getting speakers for the filter picker
import type { ExecuteCommandStructuredError } from './lsp/executeCommandErrors';

const speakersEffect: Effect.Effect<SpeakerInfo[], ExecuteCommandStructuredError> =
    client.getSpeakers({ uri: document.uri.toString() });
```

Never call `client.sendRequest('workspace/executeCommand', ...)` directly
every custom command flows through the
`TalkbankExecuteCommandClient` facade so the payload decode stays
typed. If a new command is needed, add a method to the facade (see
[Adding Features](adding-features.md) for the full checklist).

## Extension-side command runtime

The VS Code extension-side handlers that *call* these custom commands
register through `registerEffectCommand(context, id, effect)` in
`src/effectCommandRuntime.ts`, not through ad-hoc
`vscode.commands.registerCommand(..., async () => ...)` callbacks.

That pattern is documented here rather than as a separate ADR because
it is an implementation convention for this subsystem, not a repo-wide
architectural fork. The reasons are practical:

- LSP RPC calls and webview message decoders are both fallible typed
  boundaries; the effect runtime composes those error families without
  scattering local `try/catch` boilerplate across command handlers.
- The runtime centralizes logging and user-visible failure reporting, so
  command failures do not degrade into unhandled promise rejections or
  silently returned `undefined`.
- Command handlers stay as reusable effect values that can be composed
  and asserted in tests without duplicating registration-time logic.

The current exception is the Validation Explorer registration path in
`src/activation/validation.ts`, which still uses direct
`vscode.commands.registerCommand(...)` because its tree-view/menu state
does not fit the effect runtime shape cleanly.

## Adding a new custom command

See the detailed checklist in
[Adding Features → Adding a custom LSP RPC command](adding-features.md#adding-a-custom-lsp-rpc-command).
The short version: variant in `ExecuteCommandName`, handler in the
appropriate family module, dispatch in
`backend/requests/execute_command.rs`, typed method on
`TalkbankExecuteCommandClient`, and a new row in
[`reference/rpc-contracts.md`](../reference/rpc-contracts.md).

## Related chapters

- [RPC Contracts](../reference/rpc-contracts.md): per-endpoint reference
- [Architecture](architecture.md): system design
- [LSP Protocol](lsp-protocol.md): standard LSP capabilities
- [Adding Features](adding-features.md): general feature-addition checklist
