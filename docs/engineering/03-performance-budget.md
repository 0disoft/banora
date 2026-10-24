# Performance Budget

- Status: Node/Studio timing and retained lifecycle resources measured in their
  declared profiles; universal byte/time and physical-device budgets unclaimed
- Technical owner: `0disoft` (solo maintainer)
- Decision: [ADR 0001](../adr/0001-initial-architecture-boundaries.md)

## Workloads and Measurements

| Workload                | Measure                                                      |
| ----------------------- | ------------------------------------------------------------ |
| Interactive 19x19 board | Input-to-visible-update latency, redraw time and allocations |
| Viewer navigation       | Move/branch navigation latency and state/history memory      |
| Large SGF imports       | Parse time, memory, tree depth and defined input limits      |
| Many thumbnail boards   | Mount/render cost and scrolling responsiveness               |
| Analysis overlays       | Update latency with candidates/ownership data                |
| Minimal consumers       | Compressed bundle size and excluded optional dependencies    |
| Mount/unmount cycles    | Remaining listeners, subscriptions, objects and pending work |

`bun run perf --output .tmp/performance-report.json` rebuilds public SDK artifacts,
bundles a Node runner and measures synchronous parse/open/export/navigation/search/
batch/recovery. A report uses one warm-up and five fresh samples per case, with
min/median/max and raw samples. Setup and post-run verification/disposal are outside
timing; navigation success checks run inside timing. Existing output/input aliases
are never overwritten. No benchmark or flaky timing threshold runs in default CI.
Tests verify workloads, measurement lifecycle and correctness, not time limits.

The opt-in [memory lifecycle route](../../VALIDATION.md) uses public production
pages and classic SDK exports to measure repeated import/reset and mount/dispose
after forced garbage collection. It records baseline and active/released JS heap,
DOM and listener counters for fifteen cycles after three warmups. These are retained
snapshots, not peaks or browser-process memory. Byte/leak budgets remain UNDECIDED;
functional cleanup assertions are enforced without unstable byte/time thresholds.
The [executed nine-case record](22-browser-memory-lifecycle-evidence.md) includes
135 measured cycles and public controller collection counts, while preserving
unattributed heap growth as a remaining limit.

The committed original study and authored 300/5,000-move 19x19 workloads provide
small/reference, review-sized and pass-heavy stress coverage. Synthetic workloads
have a legal opening followed by passes and periodic comments; they are not engine/
tournament games. Reports project workload dimensions/counts/bytes, exact Node
version/platform/architecture, commit/dirty flag, controller source digest and a
process memory snapshot without authored record content or paths. Root invocation
builds current source; a directly run stale artifact cannot establish a current baseline.

See the [Node baseline](14-sdk-performance-evidence.md) and
[Studio measurements](17-browser-performance-evidence.md). Native and 4x emulated
CPU profiles measured import/navigation through two animation frames and guided
row-reuse optimization. Physical input-to-paint, thumbnails/overlays and actual
low-spec-device budgets remain unmeasured. Timings, memory snapshots and lifecycle
collection checks do not prove frame rate, peak allocation, an SLO or a device guarantee.

Measured desktop long-record navigation led to one-path state construction and lazy
initial-position creation after checking the bounded replay cache. Cached ancestors
preserve exact history; cache size/freshness/invalidation and public APIs are unchanged.
The 5,000-move synthetic sequential case's median fell from 1,032.73 to 484.49ms;
small-study variation is recorded instead of claiming universal latency improvements.

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

## Mouse Hover Projection

Ordinary hover owns one transient SVG group, at the previous preview's paint
order and inside the existing visibility clip. Pointer movement updates that
group without rebuilding the grid, stones, annotations, variation hints or
placement animation. Read-only/pinned boards skip ordinary hover entirely;
their explicit point callbacks and keyboard controls remain active. Ink and
touch keep their existing lifecycle, rather than sharing mouse-only throttling.
Record and option changes still rebuild the full authoritative presentation.

Chrome 155 on Windows, with a 19x19 board/four stones and 200 synchronous
synthetic pointer movements, measured 200 root child-list mutations before
and zero after in both modes. Board surface and stone identities survive all
after movements. One local sample was 580.8ms to 7.0ms read-only and 490.2ms to
15.1ms editable, including synthetic coordinate/event overhead. These are
single-run main-thread observations, not end-to-end paint percentiles, physical
pointer latency, mobile claims or a general speedup ratio. The repeatable
`--hover-only` browser scope verifies structural reuse, occupied/outside/leave
behavior, eight transforms with crops, read-only point activation, no semantic
mutation and actual diagram preview exclusion. Measurements are retained under
ignored `output/playwright/hover-*.json`.

## Common Viewer Outline Reuse

Viewer navigation within the same immutable record/game and focused fork path
reuses the rendered outline. Its bounded node-to-button map updates the old/new
selection directly, replacing at most one out-of-outline tail row. For edits,
the same scalar model drives both row creation and exact presentation comparison;
nonblank comment text changes do not replace rows when the presence icon stays
the same. Changed captions, numbering, assessment/comment indicators and focused
forks rebuild as needed. Generation/game/option changes invalidate the cache;
disposal clears its record and element references. Limits remain 500 outline
rows plus one selected tail; usable navigation beyond that window is separate
follow-up work, not delivered by this cache.

In Chrome 155 on Windows, 100 synchronous public-controller moves through a
702-node pass/annotation game caused 100 complete outline replacements before
and zero after. All 500 initial row elements survive after navigation, and an
out-of-outline nonblank comment edit retains its 501 rows. One local sample
was 675.9ms before and 119.9ms after, including controller/board/other Viewer
presentation work. This is a single-run main-thread observation, not a physical
input or paint-percentile guarantee. `--tree-only` now includes this Viewer
scenario alongside existing Studio keyboard/export/reopen coverage. Raw reports
are retained under ignored `output/playwright/viewer-tree-*.json`.

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

Analysis display holds one private visible record, one selected PV and a separate
bounded SVG prediction layer. PV steps reuse core transitions and do not retain a
position for every candidate or write source branches. Ownership/ranks are bounded
by board area and hidden on future PV positions. Completion leases detach their
display callbacks on disposal. Cropped layers render visible points only; table
rows remain bounded by the common candidate cap. No per-device render latency or
screen-reader/browser floor has been measured by these structural limits.
