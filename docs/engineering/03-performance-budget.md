# Performance Budget

- Status: Measurement plan; no measurements or numerical guarantees yet
- Technical owner: UNASSIGNED
- Decision: [ADR 0001](../adr/0001-initial-architecture-boundaries.md)

## Workloads and Measurements

| Workload | Measure |
| --- | --- |
| Interactive 19x19 board | Input-to-visible-update latency, redraw time and allocations |
| Viewer navigation | Move/branch navigation latency and state/history memory |
| Large SGF imports | Parse time, memory, tree depth and defined input limits |
| Many thumbnail boards | Mount/render cost and scrolling responsiveness |
| Analysis overlays | Update latency with candidates/ownership data |
| Minimal consumers | Compressed bundle size and excluded optional dependencies |
| Mount/unmount cycles | Remaining listeners, subscriptions, objects and pending work |

Numerical budgets, fixtures and representative device/browser versions are
UNDECIDED. Record these with the initial implementation baseline before advertising
performance. Report workload, tool/runtime versions and measurement limitations.

## Optimization Gates

Placement motion has a structural resource bound: at most one effect per mounted
board, configured duration 1 through 1000 ms (default 160), no SDK frame/timer loop,
and cancellation on superseding context/disposal. Chrome 154 browser fixtures check
bounded effects and cleanup. These limits are not measured input-latency/frame-rate
guarantees; the representative-device performance baseline remains pending.

Superko uses a persistent exact-key situation set rather than copying all previous
positions per move or scanning an ever-growing chronological history. The hash
trie shares unchanged branches; equal hashes still require exact equality and a
collision bucket may require a linear scan. Repeated passes reuse existing entries.
Default simple/no-ko positions allocate no full-history index. Unique situations
remain part of the required superko context and must not be truncated for speed.
Record limits bound controller imports/edits; measured long-record memory/latency
budgets, especially for superko, remain pending.

Manual scoring visits the bounded board and selected groups/empty regions. Selection
lists are limited to board area; duplicate seeds do not repeatedly traverse a group.
The derived board, ownership and component report are immutable and do not retain
a record tree or run background work. No device latency guarantee is claimed.

Puzzle authoring is bounded by the existing SGF limits plus 1,000 answer nodes,
depth 128 and 262,144 metadata characters. Compilation rejects a discovered tree
count above the cap before applying those branches, validates all legal paths and
retains normalized definitions plus only the initial position, not a position for
every answer node. Sessions calculate only played transitions; unlisted answers
discard the hypothetical position. No timers/workers or device latency promises.

Start with TypeScript and SVG. Profile first; evaluate batching, caching and a
smaller update scope before changing technology. A measured rendering problem may
justify Canvas; main-thread computation may justify a worker. Rust/WASM requires
evidence of a specific computational limitation and an evaluated integration cost.

Keep existing state/coordinate contracts when adding a backend. Faster rendering
does not justify stale analysis, divergent rules, data loss or unbounded work.
Performance checks should target changed workloads rather than run by default on
every documentation or unrelated code change.

Analysis context extraction traverses the bounded selected SGF path and validates
its active epoch. It retains current/initial immutable positions and ordered moves,
not every intermediate position or the full record in its provider DTO. Exact
signature strings are SDK-owned weak context metadata; no hash-only matching.
Normalized results are bounded by board area, requested PV length, 8,192 aggregate
PV moves and exact-size ownership. At most one request lease is active per session.
Cancelling detaches the session/source from late provider callbacks and settles the
caller without waiting for a provider deadline. Cold-path latency/memory profiling
remains pending; these structural bounds are not device performance guarantees.

KataGo JSON lines are capped at 1,048,576 UTF-16 code units before parsing/sending.
At most eight queries are pending by default (explicitly 1..64). Finals/cancellation/
disconnect/disposal remove leases and cancellation subscriptions; action replies
and unrelated IDs retain no state. The host owns writer backpressure, deadlines,
stdout framing and actual engine resources. No transport latency benchmark or
model-memory guarantee is implied by local protocol fixtures.
