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

Start with TypeScript and SVG. Profile first; evaluate batching, caching and a
smaller update scope before changing technology. A measured rendering problem may
justify Canvas; main-thread computation may justify a worker. Rust/WASM requires
evidence of a specific computational limitation and an evaluated integration cost.

Keep existing state/coordinate contracts when adding a backend. Faster rendering
does not justify stale analysis, divergent rules, data loss or unbounded work.
Performance checks should target changed workloads rather than run by default on
every documentation or unrelated code change.
