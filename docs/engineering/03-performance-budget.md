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

The following measurements record the initial cache increment, before selected
neighborhoods were implemented. Viewer navigation within the same immutable record/game and focused fork path
reuses the rendered outline. Its bounded node-to-button map updates the old/new
selection directly, replacing at most one out-of-outline tail row. For edits,
the same scalar model drives both row creation and exact presentation comparison;
nonblank comment text changes do not replace rows when the presence icon stays
the same. Changed captions, numbering, assessment/comment indicators and focused
forks rebuild as needed. Generation/game/option changes invalidate the cache;
disposal clears its record and element references. That increment retained 500
outline rows plus one selected tail. Selected-neighborhood windowing is now
implemented with at most 500 total rows; current measurements and the prefix-scan
tradeoff are recorded in VALIDATION.md.

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

## SGF Byte Decode Probe Reuse

The encoding probe previously built/validated a complete immutable record, then
strict decoding built/validated the same record again for ASCII and direct Latin-1
inputs. Reuse now requires a real supported root declaration, matching decoded
text, compatible BOM and both decoded-input and normalized-export byte budgets.
The original parser passes its measured normalized size through a private local
collector. There is no global record cache or second serialization for this check.
Other input keeps the original strict decoder/recovery path.

Paired Bun 1.4.3 / Windows measurements used source at `cd4bf29` and working
source in one process, three warmups each, twenty samples each and alternating
before/after order. Each fixture has two alternating pass nodes per repeated pair
with a fixed comment, SZ[19] and an explicit root encoding. Values are local
observations, not browser or device-independent latency guarantees.

| Fixture                                    | Before median / p95 ms | After median / p95 ms |
| ------------------------------------------ | ---------------------: | --------------------: |
| ASCII UTF-8, 5,000 moves, 65,018 bytes     |        76.460 / 82.235 |       37.802 / 53.049 |
| ASCII UTF-8, 20,000 moves, 260,018 bytes   |      317.072 / 390.212 |     157.114 / 176.045 |
| Latin-1, 5,000 moves, 55,023 bytes         |        81.794 / 88.671 |       38.934 / 50.128 |
| Multibyte UTF-8, 5,000 moves, 65,018 bytes |        76.833 / 81.837 |       77.655 / 87.106 |

At 20,000 moves the eligible median fell 50.4%. Instrumented node finalizations
on a 20,001-node fixture fell from 40,002 to 20,001, confirming one complete tree
instead of two; this is not a process-RSS measurement. Asymptotic work remains
O(B + N + P) for bytes, nodes and expanded points, with one full parse/validation
plus a linear text proof on eligible input. Multibyte UTF-8 is intentionally not
optimized; its control measurement varied about 1.1%.

The paired script and raw results are ignored local artifacts under `.tmp/`
(`decode-paired.ts`, `sgf-before.ts`, `decode-paired.json`). It also compares 770
encoding/BOM/high-byte/limit combinations with the original source, requiring
identical success records or failure diagnostics. Committed tests cover every
ASCII code point for all nine supported codec labels, exact normalized-size
boundaries, BOM conflicts, raw properties and decoded value/point limits.

## Owned Immutable Core Board Arrays

`core.ts` previously spread/froze current and previous board arrays on every
snapshot seal, even when they were already immutable SDK arrays. Recorded moves
seal multiple intermediate snapshots, multiplying this work. A private weak set
now proves SDK ownership: new internal working arrays are frozen after their last
mutation, while known sealed arrays are shared. Foreign arrays still receive a
defensive copy, including frozen accessor arrays; `Object.isFrozen` alone is not
treated as a content-stability proof. Weak ownership does not retain dead boards.

For A board intersections, sealing an SDK-owned board is now O(1) instead of O(A).
Simple/no-ko passes remove that board scan altogether. Ordinary moves and recorded
placements retain their necessary O(A) working copies/group work; superko passes
retain board-key/history work. Position metadata is still independently frozen.
No public signature or rule/error-order change is involved.

Paired Bun 1.4.3 / Windows measurements compare source at `a6b9a9d` with the working
source in one process. Three warmups and twenty samples per version alternate
execution order, without simultaneous builds/browser jobs. Direct transition
cases include initial position creation; controller-jump setup parses the same
record and finds the target outside timing. Timed navigation includes its success
and final move-number check. Synthetic sequential placements wrap across a 19x19
board through the actual recorded-move semantics, not ordinary legal-play claims.

| Workload                                | Before median / p95 ms | After median / p95 ms |
| --------------------------------------- | ---------------------: | --------------------: |
| 20,000 passes, 19x19                    |    2956.283 / 3175.356 |       20.480 / 24.297 |
| 5,000 recorded placements, 19x19        |    3833.016 / 4304.594 |   1307.489 / 1473.465 |
| 5,000 passes, 52x52                     |    6802.246 / 8889.463 |        4.635 / 10.790 |
| Controller jump to 20,000th pass, 19x19 |    5058.583 / 6823.055 |       60.815 / 96.347 |

The recorded-placement median fell 65.9%; the pass-only controller jump fell 98.8%.
Separate post-timing instrumentation counted frozen 361-cell board arrays,
including initial creation: 2,000 passes fell from 2,001 arrays to 1, and 2,000
recorded placements from 12,000 to 4,001. These counts do not measure process RSS
or metadata objects. Full result comparisons matched the original implementation
for 2,560 seeded transitions: four ko modes, two suicide modes, both pass-prisoner
settings, four rectangular/small/standard/maximum board sizes, mixed play/pass/
setup/replay/rejection paths and periodic externally copied inputs.

These local observations are not device-independent or browser latency promises.
The comparison script, copied before sources and measurements are ignored local
artifacts under `.tmp/` (`board-paired.ts`, `core-before.ts`, `controller-before.ts`,
`record-runtime-before.ts`, `board-paired.json`). Timing precedes freeze-counter
instrumentation. No time threshold or new hosted job is added to default CI.

## Closed Controller Record Ownership

Before `dispose()` at `edaafb3`, clearing position/export caches did not remove
the current record, saved baseline, Undo/Redo entries or node index. A reachable
closed controller could therefore retain its entire authored graph and historical
edits. Disposal now replaces current/baseline roots with a frozen empty sentinel,
drops both history arrays and clears all three private index maps. Live-only API
guards prevent the sentinel from escaping. Existing immutable host-held snapshots
are not mutated, and no production GC call, WeakRef or observer is introduced.

Node 24.14.0 / Windows evidence uses the exact before controller and working
controller bundled together with identical dependencies. The authored 5,000-pass
fixture receives three comment edits and one Undo, exercising the current record,
saved baseline, Undo, Redo, current index, export ticket and cached snapshot. A
global holder deliberately keeps the disposed controller reachable. WeakRefs track
four distinct record wrappers and all 5,004 distinct nodes. Six forced GC turns,
each separated by `setImmediate`, precede counts; no intermediate deref can keep
objects alive through those collection turns.

| Forced-GC phase                                  | Before records / nodes alive | After records / nodes alive |
| ------------------------------------------------ | ---------------------------: | --------------------------: |
| Disposed controller handle deliberately retained |                    4 / 5,004 |                       0 / 0 |
| Controller and host-held snapshots released      |                        0 / 0 |                       0 / 0 |

An after-version positive control retains one public snapshot alongside the closed
handle: exactly one record and 5,001 nodes survive, and its authored comment is
unchanged. Releasing that snapshot and handle reduces both counts to zero. This
distinguishes SDK ownership cleanup from caller-owned data destruction and verifies
that the oracle actually observes reachable objects.

Retained authored node count through a closed handle changes from O(N + H*D) in
the path-copying worst case (initial nodes, history entries and rebuilt path depth)
to zero; only fixed empty controller bookkeeping remains. This is object reachability
evidence under forced Node GC, not browser/RSS/peak-memory evidence or an immediate
physical-memory-return guarantee. The ignored `.tmp/dispose-evidence.ts`,
`dispose-before.ts`, `dispose-evidence.json` and logs preserve the local procedure.
GC survival/time thresholds are not added to default CI.
