# ADR 0020: Explicit Redacted Local Diagnostics

- Status: Accepted; headless SDK and Studio integration implemented

## Decision

Expose `DiagnosticJournal` and `describeDiagnosticFailure` through root and
selective `@banora/sdk/diagnostics` exports. Hosts explicitly record completed
operations; no controller observation, error interception, environment detection,
clock, timer, persistence, console output or telemetry occurs automatically.
Diagnostics must not change a record, selected position, export baseline or Undo.

Accept only closed operation/status/domain identifiers, normalized known failure
codes and optional finite 0–86,400,000ms durations rounded to whole milliseconds.
Reject extra fields, accessors, unsupported object shapes and malformed numeric
inputs before changing sequence/history. Unknown reasons become `unknown` without
stringification. Type-only controller, SGF and analysis maps are exhaustive, so
new SDK reasons require a compile-time policy decision. Storage/I/O are explicit
host projections. Reconstruct advice from domain/code, never caller-supplied policy.
`retryable` means a manual retry may help after checking state; never automatic replay.

Keep 1–256 recent events (default 64) with generated journal-local identifiers.
Enforce the budget privately. Summaries cover retained events only: outcome counts,
timed counts, total/max duration. Evicted count exposes missing older evidence.
Frozen `banora.diagnostics/v1` reports contain immutable snapshots. Environment
accepts only explicit runtime family/major, platform family and supported UI locale.
Never accept raw user agent, URL, hostname, filename/path, SGF, names/comments/queries,
coordinates, arbitrary version text, provider identifiers, messages/stacks or secrets.
Reports still reveal feature usage and approximate timing; share only on request.

`clear()` drops current events, summaries and evicted count. Previously returned
reports remain caller-owned; IDs do not rewind because a host may have displayed
one already. Hosts own opt-in, clear/on-disable, explicit download and retention.
No remote destination or account identity is added.

## Alternatives and Consequences

Global exception/console capture could collect unpredictable private text and
affect unrelated applications. Arbitrary metadata/tags bypass redaction and create
unbounded label cardinality. Persistent analytics and a hosted dashboard belong
to a host's consent, retention and authorization system. Instead provide inspectable
bounded local summaries with fixed codes mapped to translated recovery guidance.
Raw provider/SGF detail needed for reproduction must be supplied separately after
review. Distributed tracing, hosted alerts and retry execution remain host-owned.

## Evidence

Unit fixtures project actual controller/SGF failures without changing source state;
check eviction, retained summaries, immutable snapshots, clear, nonreused IDs,
capacity shadowing, malformed input atomicity, accessor/proxy errors and raw-text
exclusion. Independently installed root/subpath/no-DOM/classic consumers exercise
public declarations/runtime. Separate Studio production browser fixtures exercise
opt-in, inspect/clear, actual download and failed-download handling, no authored data
or remote requests, reload reset and consent changes during delayed public File reads.
Localized help finds record actions, settings and all board-menu sections and routes
to their actual controls. Hosted monitoring and terminal diagnostic commands remain
separate work, not inferred from these local consumers.
