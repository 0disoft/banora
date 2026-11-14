# Performance Budget

- Status: Node/Studio timing and retained lifecycle resources measured in their
  declared profiles; universal byte/time and physical-device budgets unclaimed
- Technical owner: `0disoft` (solo maintainer)
- Decision: [ADR 0001](../adr/0001-initial-architecture-boundaries.md)

## Incremental Backward Variation Fork Keys

Studio and focused Viewer outline reuse both call `variationPathKey`. Their
existing checkpoint handled repeated nodes and forward steps, but each backward
step still copied/traversed the entire root-to-cursor path. Returning N linear
moves to the root caused N(N-1) child-list reads, even though every key was empty.

The same single weak checkpoint now stores one parent ID, not a parent object or
path. A matching game, one-level depth decrease and parent ID prove an adjacent
backward step in the same immutable topology epoch. Only the parent's child count
is read; an exact departing-ID suffix is removed at a fork. No sibling membership
scan, ancestor array, extra history entry or second checkpoint is introduced.
Non-parent jumps and identity changes retain full traversal. C-only provenance
continues to preserve topology; structural edits/imports invalidate it.

Windows x64 / Node 24.14.0 / Bun 1.4.4 source bundles compare parent `9655a0a`
with this implementation. A legal 19x19 aa/bb opening is followed by alternating
passes, for 1000 or 5000 total moves. Both modules receive the same SDK-owned
immutable states. State/path/position preparation is outside timing. Four warmups
per side/mode precede nine order-alternated samples with two explicit GCs outside
each sample. The leaf checkpoint is primed outside reverse-walk timing. Each
reverse/forward sample is a complete walk; cold reads average 16 forced misses.
Getter instrumentation is separate from timing; timed trees use native nodes.

| Key projection workload     | Child reads before / after | Before      | After    | Time reduction |
| --------------------------- | -------------------------- | ----------- | -------- | -------------- |
| 1000-step reverse walk      | 999000 / 1000              | 92.633 ms   | 0.294 ms | 99.68%         |
| 5000-step reverse walk      | 24995000 / 5000            | 2776.733 ms | 2.934 ms | 99.89%         |
| 5000-step forward control   | Unchanged path             | 3.669 ms    | 3.638 ms | 0.84%          |
| Cold 5000-depth key control | Unchanged traversal        | 1.047 ms    | 1.012 ms | 3.35%          |

The 5000-step reverse samples span 2365.439-4554.949 ms before and 1.827-5.050 ms
after. Timing varies; no threshold or control-workload speedup is claimed.
Deterministic counts establish linear key work for sequential linear backtracking.
All timed/instrumented keys match. The expanded regression reproduces 999000
versus 1000 reads on a 1000-move reverse walk, plus zero extra reads on repeated
frames. Further oracle checks cover nested fork removal, C-only child replacement,
non-parent one-level jumps, forward recovery, games, old states, other controllers,
Undo/Redo, topology edits and reused IDs after import. A 1000-sibling parent step
reads no sibling indices. Key format and outline decisions are unchanged.

This measures only the DOM-free fork-key projection, not controller navigation,
path creation, position replay, outline recentering, SVG/DOM painting, UI latency,
p95 or heap/RSS. Forward sibling checks and fork-string operations retain their
existing width/output-size costs; interleaved views still evict the one checkpoint.
The local bundles, harness and raw samples are
`work/backward-fork-key/{entry.ts,before.mjs,after.mjs,bench.mjs,results.json}` under
the active Codex scratch workspace. No public API or CI job is added.

## Reuse KataGo response validation

KataGo decoding previously validated every candidate/PV through the core, then
returned a provider-neutral input that the session validated by replaying all
those moves again. The decoder now associates its deeply SDK-owned frozen input
with the prepared normalized result. The normalizer first checks request validity,
then reuses only an exact context/input identity pair with identical request ID,
provider ID and visit/PV/ownership limits. Other inputs use full validation.
The existing dense indexed array reader is shared with the decoder so host array
hooks cannot undermine ownership. Context/input keys are weak, and proof values
contain no Positions, host input or request wrappers. Retention scales with live
caller-owned keys; no strong list of past responses or replay Positions is kept.

Windows x64, Node 24.14.0, Bun 1.4.4 bundles compare parent `8102072` with the
new implementation. The 19x19 fixtures use distinct legal candidate starts and
generated legal non-pass PVs, Black-perspective metrics and 361 ownership values.
Four warmups per side/fixture precede nine order-alternated samples, with two
explicit GCs outside each timed batch. Batch sizes are 50, 5, 1 and 1 respectively;
the table gives per-completion medians. Each completion includes a real session
request, query encoding, in-memory JSON transport/final routing, decoding,
normalization, state publication and promise completion. Context/session creation
and fixture generation are excluded; no engine computation is simulated or timed.

| Provider                         | Candidates x PV length | Core transitions before / after | Before    | After     | Time change |
| -------------------------------- | ---------------------- | ------------------------------- | --------- | --------- | ----------- |
| KataGo                           | 1 x 1                  | 2 / 1                           | 0.194 ms  | 0.171 ms  | -11.93%     |
| KataGo                           | 8 x 16                 | 256 / 128                       | 1.359 ms  | 0.839 ms  | -38.27%     |
| KataGo                           | 32 x 256               | 16384 / 8192                    | 71.990 ms | 38.998 ms | -45.83%     |
| Foreign generic provider control | 32 x 256               | 8192 / 8192                     | 35.241 ms | 35.409 ms | +0.47%      |

Transition counts follow the nonempty fixture PV lengths; a provider-to-session
core spy independently checks one play/pass validation per step. Semantic parity
compares complete normalized payloads after accounting for each module's issued
request/context IDs. Core legality, bounds, ordering, derived loss, optional
ownership, source immutability and context/ID/limit fallback have regression
coverage. Generic provider data still gets the complete normalizer; its control
has no claimed speedup. No timing threshold is used. The largest KataGo samples
span 71.107-77.829 ms before and 38.378-43.192 ms after.

These are headless integration timings without an engine, process, network, DOM
or GPU. They do not establish engine speed, browser interaction, p95, RSS/heap or
GC timing improvements. Local source bundles, harness and raw samples live in
`work/katago-validation/{entry.ts,before.mjs,after.mjs,bench.mjs,results.json}` under
the active Codex scratch workspace. The normalizer and decoder signatures,
returned shapes, sorting and failure categories remain unchanged.

## Reuse SVG byte-accounting storage

Headless `renderDiagramSvg` previously allocated a UTF-8 byte array for each
emitted primitive solely to enforce its independent 8 MiB output limit. It now
uses `TextEncoder.encodeInto` with one local 8192-byte destination per render.
Primitives larger than the buffer are processed in chunks, checking the same
limit after every chunk. Neither output text nor the destination is cached.

Windows x64 / Node 24.14.0 / Bun 1.4.4 source bundles compare parent `382e8c7`
with this change. Every timed render includes snapshot validation, painting,
escaping, byte accounting and final string assembly. Six warmups per side and
fixture precede nine order-alternated samples; two explicit GCs run before each
batch outside timing. Rows show per-render medians; batch sizes are 100, 50 and
2 respectively. Instrumentation is separate from timing.

| Fixture                                      | Old byte arrays per render | New byte buffers | Before    | After     | Reduction |
| -------------------------------------------- | -------------------------- | ---------------- | --------- | --------- | --------- |
| Empty 19x19                                  | 126                        | 1                | 1.471 ms  | 1.366 ms  | 7.09%     |
| 19x19, 240 stones                            | 366                        | 1                | 4.654 ms  | 4.278 ms  | 8.06%     |
| 52x52, 2704 stones, 4096 labels, 8192 badges | 23499                      | 1                | 308.08 ms | 285.50 ms | 7.33%     |

The dense fixture's encoded destinations total 3,206,203 allocated bytes before
versus one 8192-byte buffer now (99.74% less destination storage allocated).
This excludes JavaScript strings, objects, snapshots and GC overhead; it is not
an RSS, peak-memory or total-allocation measurement. Small diagrams still incur
the fixed 8 KiB scratch allocation. Timing variation remains: dense samples span
293.23-365.51 ms before and 265.05-382.35 ms after; no timing threshold is used.

All timed SVGs match byte for byte. Additional parity checks cover Unicode,
unpaired surrogates, escaped long titles, long ink, masks, dimming, crops and
transforms, plus ASCII, U+AC00, U+1F600 and XML-escaped large-label outputs or
identical oversize errors. A regression accepts exactly 8,388,608 UTF-8 bytes
including a root primitive longer than the scratch buffer and deferred masked
labels, then rejects one extra byte. Existing deterministic/security/geometry
checks remain. This measures headless export, not live board paint, PNG encoding,
browser interaction, p95 or universal throughput. The local external harness
and raw samples are `work/svg-bytes/{entry.ts,before.mjs,after.mjs,bench.mjs,results.json}`
under the active Codex scratch workspace.

## Selected-path scoring reconstruction

Scoring now constructs its temporary controller from the selected root-to-cursor
prefix rather than the complete collection. The same validated prefix builder
serves puzzle authoring. Ancestor properties/raw escapes and the preset-specific
capture/pass ledger are retained; source validation and temporary SGF validation
remain in place. Only selected ancestors are cloned/serialized/reparsed. Finding
an ancestor still scans that parent's child IDs, so wide sibling lookup and long
selected histories remain costs; no constant-time reconstruction is claimed.

Windows x64, Node 24.14.0, 5x5 first game with two selected moves (three nodes),
AGA territory, plus a second game containing unrelated alternating passes:

| Unrelated moves | Parsed nodes before | Parsed nodes now | Median before | Median now |
| --------------- | ------------------- | ---------------- | ------------- | ---------- |
| 1,000           | 1,004               | 3                | 7.85 ms       | 0.230 ms   |
| 10,000          | 10,004              | 3                | 78.38 ms      | 0.221 ms   |
| 20,000          | 20,004              | 3                | 143.87 ms     | 0.226 ms   |

Two warmups, then seven interleaved samples of each reconstruction. Initial source
construction/navigation are excluded. Complete Positions were asserted equal
before timing. At 20,000 unrelated moves the temporary SGF shrinks from 80,067 to
40 UTF-8 bytes. This measures headless reconstruction only, not import latency,
browser paint, UI end-to-end latency, memory peaks or universal speedups. There is
no timing pass/fail threshold. The reference baseline and parity fixtures are in
`scripts/scoring-position.test.ts`; the ignored local timing report and harness
are `.tmp/scoring-prefix-measurement.json` and `.tmp/scoring-prefix-measure.ts`.

The focused Chrome scoring flow also loads a 20,000-move unrelated game while
scoring the short first game under every preset, retaining the original marks,
touch, non-mutating preview and confirmed-result regressions.

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

## Incremental Move-Number Projection

`board-record.ts` previously recalculated numbers from the root for each new
frame. Sequentially displaying an N-move linear record processes (N+1)(N+2)/2
nodes, including the root at each step: 12,507,501 visits for 5,000 moves. The
projection now proves same numbering identity, same game, one extra path node and
direct-child ID membership before reusing the previous counter/map. That sequence
applies node properties 5,001 times, with bounded map copying. Non-adjacent moves,
fork changes, non-comment edits, imports and cold reads retain the original path calculation.

For a linear record without expanded setup lists, projection work changes O(N^2)
to O(N*A) for A board points (constant board dimensions). General adjacent work
includes direct-child membership and the current node's setup expansion. This
does not change controller path construction or SVG painting complexity.
Only one weak numbering key is stored per binding, preventing a history cache or
record-retention root. A private map copy isolates future frames from mutation of
returned maps; old immutable-frame projections remain independently memoized.

### Comment-Only Numbering Reuse

Validated `C`-only commits inherit an opaque numbering key; tokens contain no
record, node or predecessor references and are registered in a WeakMap. All
candidate validation and comment-preview ownership/freshness checks precede key
inheritance. Non-comment edits/imports receive independent keys, including MN
changes that leave board contents, game, depth and node IDs unchanged.

On Bun 1.4.4 / Windows, a 19x19 fixture with two placements and 5,000 alternating
passes has a 5,003-node selected path and two numbered intersections. A `numberNode`
spy reproduced 5,003 calls on each comment edit before this change. Afterward,
cold numbering still calls it 5,003 times, each comment edit and comment Undo/Redo
calls it zero times, and a direct-child step calls it once. Same-position comment
projection changes from O(P + K) to O(K), where P is selected path length and
K is the checkpoint's numbered intersections (K <= board area); defensive map
copies remain. These are SDK projection counts, not end-to-end editor latency,
SVG repaint, parsing or memory-return measurements. Existing non-comment
invalidation, batch comments, delayed frames and map-mutation isolation have
deterministic regression coverage; no timing threshold or extra CI route is added.

Paired Bun 1.4.3 / Windows comparisons use the exact `baaefea` projection with the
working projection on the same controller/state. Two full warmups precede nine
samples per size, alternating before/after order on every frame. A sample sums
only `numbers()` time across every state from root to last move; parsing,
controller movement/state construction, frame creation, equality assertions and
disposal are outside the timer. Each frame's ordered map entries must match.
Synthetic 19x19 repeated recorded aa/bb placements stress long histories without
claiming ordinary legal-play sequences. Timing thresholds are not added to CI.

| Sequential workload                                         | Before projection median ms | After projection median ms |
| ----------------------------------------------------------- | --------------------------: | -------------------------: |
| 1,000 recorded aa/bb placements                             |                     194.102 |                      3.597 |
| 5,000 recorded aa/bb placements                             |                    5799.015 |                     45.711 |
| 5,000 moves: legal opening then passes, 128 numbered points |                    2872.521 |                     53.348 |

The fuller-map case uses one warmup and five measured samples, with the same
frame-by-frame alternation/equality checks. Each opening attempt uses actual
legal `play`, falling back to pass on rejection; remaining moves are passes.
Its projection median falls 98.1%. All three cases compare 96,028 frame maps
including warmups. These are local projection totals, not whole-UI, browser
latency or universal device claims.

Node 24.14.0 forced-GC checks retain the binding after closing its controller:
both tracked record and leaf are collected. A host-held frame positive control
keeps both alive until the frame/binding handles are dropped. Six separate GC
turns precede each observation. This checks weak-cache ownership without a heap
byte/RSS threshold; `.tmp/number-lifetime.ts` and its log hold the local procedure.

Ignored `.tmp/numbers-before.ts`, `number-paired.ts`, `number-paired.json` and logs
retain the source and raw measurements. `number-dense.ts` separately generates a
legal 128-attempt opening followed by passes to check a fuller map. The projection
tests bound observed property reads linearly and cover setup, MN including zero,
legacy pass, maximum-board tt, annotations, delayed frames, branches, backward
movement, edits/Undo/Redo, game/import changes and private checkpoint isolation.

## Comment-Only Live-Board Paint Retention

Previously an unpinned record board called `paintBoard` on every comment
notification, replacing the complete SVG subtree despite identical display data.
After a completed paint, the surface now reuses the existing weak C-only key to
prove the same game, node and import generation still have identical moves, MN,
markers, hints and comparison references. It retains existing SVG elements while
refreshing the current frame, announcements, placement animation and cancellation
of pending ink/touch input. No additional record/history cache is introduced.
Non-comment edits, navigation, imports, explicit `update` calls and cold/failed
paints retain normal rendering; pinned/controlled board behavior is unchanged.

The existing hover/full browser smoke routes now include `comment-paint-scenario.js`.
On Windows Chrome 156, against parent commit `03fde13` and this implementation,
a 19x19 fixture has two placements followed by 5,000 alternating passes, plus an
unselected second game. The selected path contains 5,003 nodes. Move numbers,
variation hints and a root comparison reference are enabled. Only the 20
synchronous comment edits are counted: `document.createElementNS` records SVG
creation, and a root-only MutationObserver records subtree replacement.

| Twenty comment edits            | Before | After |
| ------------------------------- | -----: | ----: |
| New SVG elements                |  2,740 |     0 |
| Root child replacements         |     20 |     0 |
| Original surface/stone retained |     No |   Yes |

Retained markup is compared with a forced fresh paint. Additional checks cover
comment Undo/Redo, cross-game batches, child comments with actual fork hints,
navigation, marker edits, transforms, changed-size and same-board MN imports, and
keyboard ink cancellation. Existing animation and touch scenarios verify motion
continuity and clearing of pending aim/magnifier state. These are deterministic
DOM work counts, not end-to-end latency, browser memory or general CPU speedups;
SGF validation and controller edit costs remain unchanged. Ignored
`.tmp/comment-paint-before.json`, logs and `output/playwright/comment-paint-samples.json`
retain the local evidence. No timing thresholds or extra CI jobs are added.

## Incremental Variation Fork-Path Keys

Both Studio and the focused Viewer call `variationPathKey` when deciding whether
to reuse their bounded outline. Previously every call copied/traversed the entire
selected path, even when moving one node forward through a linear game and
returning the same empty key. For N single-child moves, parent `children` reads
sum to N(N+1): two reads per visited edge, over depths zero through N.

The projection now keeps one weak C-only-context checkpoint. Same game/node/depth
reuses the key; a verified direct-child step reads the previous node's children
once and appends a child ID only at a fork. A fork count preserves the exact join
delimiter behavior. Other nonadjacent navigation, games, non-comment edits and imports use
the original traversal; interleaved records/controllers safely evict the single
checkpoint. Tokens and cache entries do not retain ancestor arrays or a record
history. Caller input, original key formatting and outline decisions are unchanged.

On Bun 1.4.4 / Windows, a 19x19 legal aa/bb opening followed by 4,998 alternating
passes gives 5,000 moves / 5,001 selected states. Getter-observed node wrappers
count only `children` reads made by the key projection; controllers still produce
the actual state/path/positions. The parent `b3219b1` implementation reports
25,005,000 reads; the changed implementation reports 5,000, with identical empty
keys for every state. Sequential linear key work changes from O(N^2) to O(N).
Same-node and C-only reuse need no path traversal. At that increment backward/branch
jumps remained full-path reads; the later [backward-step improvement](#incremental-backward-variation-fork-keys)
now handles adjacent parent steps. Direct-child membership in a wide fork costs O(S) for S siblings,
and constructing longer fork strings still depends on output length. This does
not change controller snapshots, position replay, outline recentering or SVG
painting complexity, and is not a whole-UI latency or CPU speedup measurement.

The regression uses a 1,000-move linear fixture and a deterministic read budget,
plus a cold-traversal oracle for nested forks, games, older frames, independent
controllers, comment edits, topology changes and imports. No timing threshold,
new browser route or CI job is introduced.

## Owned Immutable Repetition Board Keys

The earlier immutable-board sealing work left superko board-key generation in
place. `nextHistory` rebuilt `board.map(...).join('')` on every pass, although the
owned frozen board object remained identical. It now uses a private WeakMap only
after the existing SDK-owned WeakSet proves content stability. Merely being
frozen is insufficient: foreign arrays can have changing getters. Those inputs
are never cached. New play/setup boards get independent keys. No history lookup,
hash, exact collision check, rule validation, pass ledger or snapshot is skipped.

For P transitions sharing an owned A-point board, the content-key work changes
from O(P*A) to O(P+A), with one O(A) string per live cached board. The WeakMap
does not own boards or positions. Repetition-history hashing still scans keys;
this does not claim constant-time superko transitions or lower memory usage.

On Bun 1.4.4 / Windows, spying only after initial position creation measures
5,000 situational-superko passes on a 52x52 board: key constructions fall from
5,000 to one; final history size remains two and pass prisoners remain 2,500 for
each color. This removes 4,999 temporary map arrays, each holding 2,704 entries.
Regression tests additionally cover positional superko, post-play/setup boards,
recorded out-of-turn passes and foreign mutable/frozen accessor input changes.

Independent Node 24.14.0 processes run the same source benchmark, bundled before
(parent `86b8af4`) and after the change. Each size gets one warmup and five timed
5,000-pass samples, with position creation outside the timer and final counters/
history verified. At 52x52 the median is 354.75 ms before (352.11-359.21) and
52.77 ms after (52.59-53.51). These are direct core transitions with
situational superko and pass prisoners enabled, not browser/frame/import/RSS
measurements or a claim about ordinary match duration. Timing thresholds are not
added to CI. Ignored `.tmp/pass-key-bench.ts`, before/after bundles and
`.tmp/pass-key-before.json` / `pass-key-after.json` preserve the local procedure.

## Shared Hashes for Checked Superko Insertion

For every accepted normal placement, core previously queried `hasSituation` and
then called `rememberSituation` with the same candidate. Situational superko
hashed that exact turn key twice; positional superko hashed black and white for
lookup, then hashed the chosen next-player key again for insertion. The private
`tryRememberSituation` now reuses lookup hashes for insertion, without any new
cache or retained input. Asymptotic hashing remains O(A) for A board points; one
complete candidate hash pass is removed per accepted move. Null history still
hashes once; positional duplicate rejection retains black-first short-circuiting,
and hash matches still require exact key equality. Unconditional insertion for
pass/setup/replay is unchanged, as is rejection/validation order.

Bun 1.4.4 / Windows character-read instrumentation starts after creating an empty
19x19 superko position. One legal black placement yields 724 -> 362 hash character
reads for situational superko, and 1,086 -> 724 for positional superko. Oracle
tests compare with the separate lookup/insertion for turns, empty and 2,704-cell
keys, branched history and deliberate FNV collisions. A Node comparison of 200
legal moves under each policy yields 400 identical complete MoveResults against
parent `7700595` (boards, captures, counters and entire immutable history).

Paired Node 24.14.0 / Windows measurements compare separately bundled parent and
changed core modules within one process. Each timed sample creates 50 independent
19x19 games and plays 200 legal row-order placements in each, checking 201 history
entries per completed game. Four warmups per version/policy precede nine samples,
alternating before/after order. Position creation is included; parsing, rendering
and browser code are absent. Median time for 10,000 legal moves is:

| Policy              | Before ms | After ms |
| ------------------- | --------: | -------: |
| Situational superko |    127.01 |   111.49 |
| Positional superko  |    149.95 |   130.22 |

These are local core-workload measurements, not whole-game/browser latency or
p95 claims. Early independent-process samples were noisy, so the paired results
and deterministic hash counts are the evidence used here. Ignored
`.tmp/paired-superko.mjs`, `paired-superko.json`, old/new source bundles and
`superko-state-parity.mjs` retain the procedure. No timing threshold, new browser
route or extra CI job is added.

## Adjacent-Liberty Proof Before Own-Group Traversal

After capturing enemy groups, `play` used to traverse the complete own group and
collect all liberties even when an empty neighbor of the new stone already proved
it could survive. This affects legal play and `replayMove`, which delegates its
capture/self-capture work to `play`. The new check reuses the placement's neighbor
indices, inspects at most four cells after captures, and skips own-group traversal
when any is empty. No adjacent liberty retains the original complete traversal,
including remote liberties and full multi-stone self-capture. Enemy traversal and
the order/values of captures, errors, repetition and snapshots are unchanged.

For a board of width W, the measured connected fixture fills the upper-left
(W-1)x(W-1) square with black stones using `setup`, leaving its last row and column
empty; Black plays at (W-1,W-2). Both operations below start from this same input
independently each iteration. The 19x19 resulting chain has 325 stones and neighbor
enumeration/array creation drops from 326 to one; the 52x52 chain has 2,602 stones
and drops from 2,603 to one. Tests count `Math.floor` calls during only the action:
on these no-capture fixtures that operation occurs once per neighbor enumeration.
The own-group component falls from O(G) to O(1) for this adjacent-liberty case;
overall placement retains O(A) board copying, and the fallback remains O(G).

Paired Node 24.14.0 / Windows timings bundle parent/current core separately, run
both in one process with four warmups and nine samples per case, and alternate
before/after order. Input creation is excluded. Median milliseconds are:

| Fixture         | Independent actions/sample | Operation    | Before ms | After ms |
| --------------- | -------------------------: | ------------ | --------: | -------: |
| 19x19 connected |                      2,000 | `play`       |     74.11 |     3.30 |
| 19x19 connected |                      2,000 | `replayMove` |     77.90 |     7.70 |
| 52x52 connected |                        250 | `play`       |     97.82 |     0.88 |
| 52x52 connected |                        250 | `replayMove` |     98.89 |     1.68 |
| 19x19 empty     |                     10,000 | `play`       |     24.67 |    22.13 |
| 19x19 empty     |                     10,000 | `replayMove` |     48.89 |    42.47 |

These are core fixture timings, not whole SGF import, typical-game, rendering,
browser latency, p95 or memory measurements. No timing thresholds are added.
A separate old/new oracle compares 67,968 complete MoveResults: all 81 2x2
layouts and 200 seeded 3x3 layouts, both turns/suicide policies, all four ko
policies and both play/replay at every point. All are equal, including captures
and complete repetition histories. Committed tests also cover capture-created
and remote-only liberties, forbidden/allowed multi-stone suicide and old snapshots.
Ignored `.tmp/liberty-{probe.ts,bench.mjs,bench.json,parity.mjs,parity.json}` and
before/after source bundles retain the local procedure; no cache, browser route
or CI job is added.

## Reuse the Validated Checkpoint Replay Window

`loadCheckpoint` used to replay the selected path during checkpoint validation,
discard those positions, then replay it again when creating its first published
controller state. Restore now adopts the immutable replay results only after the
full validation and unsaved-change guard succeed. Internal preparation retains at
most 120 positions, matching the existing replay-cache tail, rather than every
ancestor; the eight requested-position slots remain unchanged. This temporary
window can coexist with the old controller's cache until the replacement guard.
Failure/refusal discards it without touching that cache. The standalone public
parser retains no such window and has the same result fields and exports.

For a selected path with N moves, root/node transitions drop from 2(N+1) to N+1;
SGF parsing, byte/shape/rule/locator checks and replay validation are not skipped.
Both remain O(N), with one complete replay removed. In a 5,000-pass checkpoint,
`applyRecordNode` calls fall from 10,002 to 5,001 and immediate Previous/Next stays
at zero replay calls. A committed 240-move fixture also verifies the exact tail:
119 Previous actions require no replay; the 120th falls back to replaying 121
nodes, preserving the former bounded-cache behavior.

Paired Node 24.14.0 / Windows measurements bundle parent/current controllers
separately and run both within one process. Each sample performs five complete
`loadCheckpoint` calls on a 5,000-pass SGF with a tail selection and situational
superko/pass-prisoner accounting; working and baseline SGFs are identical. SGF
parsing, full validation, dirty computation, cache adoption and first state
creation are timed. Input/controller creation and final state comparisons are
excluded. Four warmups precede nine samples per version/size, alternating order.
Median milliseconds for five restorations are:

| Board | Before ms | After ms | Reduction |
| ----- | --------: | -------: | --------: |
| 19x19 |    393.84 |   284.67 |     27.7% |
| 52x52 |    811.68 |   497.48 |     38.7% |

After each paired case the complete positions, paths, dirty/history flags,
generation and re-exported checkpoints agree. These are local controller-restore
measurements, not browser storage/rendering, typical-game, p95 or memory claims.
No timing threshold is added. Ignored `.tmp/checkpoint-{probe.ts,bench.mjs,bench.json}`
and parent/current bundles retain the local procedure. No new browser route, CI
job, global cache or public package export is introduced.

## Reuse Proven Immutable SGF Raw Values

The parser decodes raw property strings, then serializes the record to enforce
the normalized UTF-8 byte limit. Serialization used to decode the same raw strings
again to prove preservation, and every later export repeated that work. A private
WeakMap now proves the relation between parser-owned frozen properties and their
original raw maps. It is populated only for nodes where decoding changes a raw
value, avoiding per-node entries for plain-only input. Serialization still checks
the exact raw string at the current key/index. Edited properties, replacement raw
values and foreign frozen/accessor inputs retain decoded comparison. Root headers,
output bytes, diagnostics and all parser/annotation/expansion limits are unchanged.

For 5,000 escaped-comment nodes plus a plain SZ root, decodeValue calls fall from
10,002 to 5,002 during parsing and from 5,001 to one during later serialization.
Only the unregistered plain root is decoded again. The weak map has no reference
to record trees; changed-node references during parsing are call-local. Export
still produces O(T) text and parsing remains O(T); this removes repeated decoding
and intermediate strings in the proven cases, not all string traversal.

Paired Node 24.14.0 / Windows measurements bundle parent/current SGF modules
separately, run both in one process, and alternate version order. Each sample
performs three complete parses or three serializations of its own parsed record.
Three warmups precede seven samples per operation/input; the table reports median
milliseconds per three operations. Input preparation and exact output comparison
are outside the timer. Both fixtures contain 5,001 nodes / 5,000 comments: plain
text is 2,060,009 input bytes, escaped text is 2,180,009 bytes. Results are:

| Input            | Operation                        | Before ms | After ms |
| ---------------- | -------------------------------- | --------: | -------: |
| Escaped comments | Full parse, including validation |    375.04 |   293.22 |
| Escaped comments | Serialize                        |    115.70 |    10.87 |
| Plain comments   | Full parse, including validation |    131.96 |   138.01 |
| Plain comments   | Serialize                        |     11.43 |    12.21 |

The escaped fixture improves about 21.8% for parsing and 90.6% for serialization.
The plain control is about 4.6% / 6.8% slower here (roughly 2.02 / 0.26 ms per
operation); this is a measured tradeoff, not a universal speedup. An initial
all-node proof implementation regressed plain parsing more and was narrowed to
changed values. These local component timings do not establish browser latency,
typical-game, p95 or memory results. No timing threshold or new benchmark runner is
added. Committed tests bound decoding and verify plain nodes allocate no weak
entries. A separate 567-case oracle preserves complete parser results/diagnostics
and exact serialized strings across Unicode, Text/SimpleText/label/unknown escapes
and byte/value/node/expansion boundaries. Ignored `.tmp/raw-value-{probe.ts,
bench.mjs,bench.json,parity.mjs}` and parent/current bundles retain the procedure.

## Skip Raw-Proof Misses for Plain SGF Records

The raw-value optimization still performed one WeakMap lookup on every node,
including plain-only records with no matching proof entries. The parser now weakly
classifies its own fully frozen record when every decoded value equals its raw
value. Serialization checks that exact record once, skips node proof lookups, and
still performs all ordinary raw/decoded comparisons. Mixed, edited and external
records retain the previous proof/fallback path. The temporary changed-node Set
is allocated only after the first changed value. One weak classification entry
per plain record does not strongly retain records or trees.

On the 5,001-node plain fixture, WeakMap.get calls drop from 5,001 to zero both
inside normalized-size checking and on a later export, replaced by one WeakSet
membership check per serialization. The escaped fixture retains 5,002 decodeValue
calls during parse / one during export. Output construction and validation remain
O(T); only these metadata misses fall from O(N) to O(1).

Node 24.14.0 / Windows measurements compare three separately bundled versions
in one process: pre-proof `bd27019`, previous `e4cc653`, and the changed source.
The pre-proof source is verified against Git after only import-path rewriting.
Each sample performs three complete parses or three exports; four warmups precede
nine samples per input/operation, rotating all three execution orders. Input
preparation and exact output comparisons are excluded. Fixtures contain 5,001
nodes with 5,000 comments: plain input is 2,060,009 bytes, escaped input 2,180,009.
Median milliseconds per three operations are:

| Input   | Operation | Pre-proof | Previous | Changed |
| ------- | --------- | --------: | -------: | ------: |
| Plain   | Parse     |    125.35 |   127.87 |  125.20 |
| Plain   | Serialize |     11.16 |    11.60 |   11.30 |
| Escaped | Parse     |    389.31 |   288.67 |  284.36 |
| Escaped | Serialize |    102.51 |     8.64 |    8.72 |

Plain parse/export drops about 2.1% / 2.5% relative to the immediate parent in
this run. Plain parsing is close to the pre-proof baseline; export still has a
small residual difference. The large escaped-value gains remain, with unchanged
decode counts. These are local component medians; small timing differences are
not universal latency guarantees, browser/p95 claims or memory measurements.
No timing threshold is added. New tests enforce zero plain-node lookups, preserve
mixed collections/wrappers and reject stale classification after edits. All
567 paired parser/diagnostic/export boundary cases agree. Ignored
`.tmp/sgf-plain-{probe.ts,bench.mjs,bench.json,parity.mjs}` and before/after bundles
retain the procedure. No public API, dependency or benchmark/CI runner is added.

## Stop Group Traversal at the First Proven Liberty

Core capture checks previously enumerated every stone and accumulated every
liberty of each adjacent enemy group, even though the caller only needed to know
whether any liberty existed. The private traversal now returns at the first
liberty and reports a boolean instead of allocating a liberty Set. Every discovered
stone belongs to that surviving connected group and can safely enter the move's
visited Set. An unvisited adjacent stone may start another search; there are at
most four adjacent entries. No cross-move cache or retained state is added.
The own-group fallback uses the same survival proof. Groups without any liberty
still visit every stone in the same order, preserving enemy removal order and
complete self-capture accounting. Capture removal still precedes suicide/ko checks.

The surviving-chain fixture fills the upper-left (width-1) squared intersections
with white stones on a square board, then independently plays black at
`{x:width-1,y:width-2}`. The left enemy neighbor has an empty bottom neighbor.
On 19x19, neighbor enumeration falls from 325 to two; on 52x52, from 2,602 to two,
for both ordinary play and recorded replay. The action-only `Math.floor` counter
is exact on these no-capture fixtures because each neighbor enumeration calls it
once. Live traversal stops after its first stone here; total placement still
copies the board in O(A), and no-liberty traversal remains O(G) for G group stones.

Paired Windows / Node 24.14.0 timings bundle parent `e6851bf` and changed core
separately and run them in one process. Each case has four warmups and nine
samples, alternating version order; fixture construction and counters are excluded
from timing. Entries below are median milliseconds for independent actions:

| Fixture                    | Actions/sample | Operation    | Before ms | After ms |
| -------------------------- | -------------: | ------------ | --------: | -------: |
| 19x19 live enemy chain     |          2,000 | `play`       |    103.79 |     4.12 |
| 19x19 live enemy chain     |          2,000 | `replayMove` |    112.30 |     8.82 |
| 52x52 live enemy chain     |            250 | `play`       |    157.53 |     1.01 |
| 52x52 live enemy chain     |            250 | `replayMove` |    150.42 |     1.86 |
| 19x19 empty control        |         10,000 | `play`       |     23.12 |    24.79 |
| 19x19 empty control        |         10,000 | `replayMove` |     43.68 |    43.93 |
| 19x19 captured enemy chain |          2,000 | `play`       |    186.69 |   190.29 |
| 19x19 captured enemy chain |          2,000 | `replayMove` |    175.41 |   173.65 |

The captured-chain control adds black stones along the bottom/right edges except
the placement point; all 324 white stones must be captured. Its traversal work and
exact capture order are unchanged. The empty control invokes no group traversal.
These controls include increases of 7.2% for empty-board play and 1.9% for captured-
chain play in this run. The live-chain gain does not establish a universal speedup,
typical-game improvement, browser/p95 latency or measured memory reduction.
No timing threshold is added.

A separate before/after oracle retains all 67,968 complete MoveResults: every
2x2 layout and 200 seeded 3x3 layouts, both turns and suicide policies, four ko
policies, ordinary play and replay at every point, including capture order and
complete repetition histories. Committed regressions enforce bounded live-chain
work, a remote-only liberty in a group touching all four sides, complete capture
order, recorded suicide and unchanged original snapshots. Existing own-liberty,
ko/superko, controller replay and SDK tests retain their coverage. No public API,
DB, dependencies, repository hygiene, browser route or CI/runner changes.

## Reuse Completed Comparison Paths

Alternating `inspectNode` calls for two deep comparison endpoints previously hit
the eight-entry final-position cache but still reconstructed each ancestor path.
The single private adjacent-navigation checkpoint only remembered the other
endpoint. Every inspection therefore walked O(depth) parents, created a private
path and copied/froze a published path, even with zero board replay work.

Each existing requested-position entry now also retains its already published
frozen path. A hit reuses both, retaining the same eight-entry recency/eviction
order and combined 128-position limit (120 intermediate plus eight requested).
No additional cache or historical record/node references are introduced. This
does retain up to eight full path arrays, adding at most 8 * D ID references for
maximum resident path length D (up to 400,000 at the default 50,000-node bound).
The existing private navigation checkpoint remains separate. No measured RSS or
heap-size claim is made. Cold/evicted paths retain the previous construction and
replay. Ordinary edits, topology/rule replacement and disposal clear the entries;
validated C-only edits can reuse paths while state/node/dirty/history fields are
read afresh. Full inspection snapshots are not cached.

The local fixtures have a 19x19 root and one or two branches of alternating B/W
passes at the stated depth; the root stays selected. All endpoints are inspected
before measuring repeated independent inspections. Parent `9eb0b22` and changed
controller bundles run in the same Windows / Node 24.14.0 process, with four
warmups, nine samples and alternating before/after order. Construction, initial
replay and work counters are excluded from timing. Median milliseconds:

| Branch depth | Endpoints | Inspections/sample | Before ms | After ms |
| -----------: | --------: | -----------------: | --------: | -------: |
|        2,000 |         2 |              2,000 |    175.87 |     2.77 |
|        5,000 |         2 |              1,000 |    262.06 |     1.45 |
|            8 |         2 |             10,000 |     27.41 |    18.40 |
|        2,000 |         1 |              1,000 |      1.37 |     1.42 |

One pair of 5,000-deep endpoint reads drops from 10,004 parent-map reads and two
frozen path copies to zero of each. At depth 2,000 the corresponding reads drop
from 4,004 to zero. Both versions already avoid board replay in these warm cases.
The single-endpoint control was already fast and rose about 3.5% in this run.
These are headless repeated-inspection timings, not browser rendering, cold-import,
typical-game or p95 claims; the added path retention is the space tradeoff.
No timing threshold or CI benchmark job is added.

Committed regressions check no repeated parent reads, shared frozen paths,
unchanged positions/selection, eight-entry recency eviction, the total position
budget and disposal cleanup. They also cover comment freshness, rejected import,
Undo/Redo, same-ID imports with different parents, branch removal and old held
paths. Existing controller/replay/checkpoint coverage remains in the SDK suite.
No public signature/schema, DB, dependency, repository hygiene or runner changes.

## Reuse Decoded Ink in Warm Inspections

Warm non-selected `inspectNode` calls previously reused positions and paths but
parsed every BPN JSON value, checked/rounded every ink point and froze new
geometry each time. Comparison rendering repeatedly inspects its two endpoints,
so ink-heavy nodes still allocated the same geometry on every read.

The existing eight requested-position entries now optionally retain decoded ink
and its exact SDK-owned immutable BPN value-array identity. A matching read reuses
the frozen geometry; missing/replaced arrays decode through the same normalizer.
All current snapshot metadata is still read afresh. There is no whole-state cache,
new global cache, relaxed validation or ink retained by the 120 intermediate
replay entries. Empty-ink reads retain their old decode path. Existing eviction,
ordinary edit/import/rule invalidation and disposal release the added data; C-only
edits check the value-array identity even while retaining the position.

The space tradeoff is retaining at most eight nodes' decoded ink: 32,768 points,
512 stroke objects and their bounded arrays, plus references to the source BPN
arrays. These values reference no record/node objects. This is an object-count
bound, not a measured RSS/heap claim; explicitly retained public snapshots may
also retain their own geometry.

Parent 228cc0e and changed controller source bundles run in one Windows /
Node 24.14.0 process. Each fixture has a 19x19 root, two sibling B[] nodes and
the stated ink per sibling. Root remains selected, and both siblings are warmed.
Four 1,000-inspection warmups precede nine order-alternated samples of 1,000
alternating endpoint reads. Construction, first decode and parse counters are
excluded from timing; complete initial inspection values match between variants.
Median milliseconds:

| Ink per endpoint                                | Before ms | After ms | Time reduction |
| ----------------------------------------------- | --------: | -------: | -------------: |
| None (control)                                  |      1.41 |     1.44 |         -2.24% |
| Two 128-point strokes                           |     61.64 |     1.45 |         97.65% |
| Eight 512-point strokes (4096-point node limit) |    788.47 |     1.32 |         99.83% |

Across 100 separate warm inspections, JSON parses drop from 200 to zero for the
two-stroke fixture, and from 800 to zero at the node limit. The empty control
performs zero parses in both variants and rises about 0.03 ms per 1,000 reads in
this run. Results apply to repeated headless inspection, not browser rendering,
cold imports, typical-game latency or p95. No timing assertion or CI job is added.

Regressions retain frozen ownership, no inspection notifications, fresh dirty/
Undo/record metadata, eight-entry recency eviction, edit/Undo/Redo and same-ID
import freshness, and old held snapshots. Existing position/rule/disposal tests
also pass. Public signatures, DB, dependencies, hygiene and runners are unchanged.

## Parse UTF-8 BOM Records Once

UTF-8 BOM imports previously parsed a Latin-1 byte view to discover real root CA
properties before decoding/parsing UTF-8. Valid non-ASCII BOM input therefore
allocated, validated and serialized two complete record trees. It now first uses
the strict UTF-8 decoder and complete parser under the original limits. Only a
successful parse with uniform real UTF-8 root declarations can return immediately;
the BOM supplies the same existing UTF-8 default for roots without CA. Failed or
conflicting attempts follow the original byte probe and recovery policy. The
canonical UTF-8 attempt is held locally for reuse there. No global cache, retained
record, public option, relaxed limit or regex encoding detection is introduced.

Windows / Node 24.14.0 source bundles compare parent e7dfc03 with this change.
An exact-result oracle covers 3,208 combinations of BOMs, encoding labels, Unicode,
escapes, fake CA text, malformed structure, collections, byte/value/node/depth/
point bounds and legacy trail bytes. Values, raw properties and failure diagnostics
(including offsets) match. Deep benchmark records use iterative flattening for
comparison so the measurement harness does not recurse through 5,000 nodes.

Fixtures have one SZ[19] root and the stated number of B[] nodes, each with a
comment: CJK uses code points U+D55C U+AE00 U+B178 U+D2B8 U+1F642,
ASCII uses `plain note`, Latin-1 uses `café`.
Four warmups precede nine order-alternated before/after samples, one decode per
sample. Node's exposed GC runs twice before each measured decode; GC itself,
fixture construction, correctness checks and counters are excluded from timing.
Median milliseconds:

| Fixture                 |   Bytes | Before ms | After ms | Time reduction |
| ----------------------- | ------: | --------: | -------: | -------------: |
| BOM CJK, 500 moves      |  11,521 |     15.60 |     7.26 |         53.49% |
| BOM CJK, 5,000 moves    | 115,021 |    118.29 |    62.19 |         47.43% |
| No BOM CJK, 5,000 moves | 115,018 |    115.15 |   113.68 |          1.28% |
| BOM ASCII, 5,000 moves  |  85,021 |     60.10 |    58.58 |          2.52% |
| Latin-1, 5,000 moves    |  55,019 |     59.12 |    59.27 |         -0.25% |

Successful CJK BOM decoding drops from two complete parses/normalizations to one,
and from four TextEncoder calls to two. The controls keep their existing counts:
four without a CJK BOM, two for ASCII BOM and direct Latin-1. These work counts
are independent of timing. RSS/heap size, browser/file I/O and end-to-end import
latency are not measured; these are isolated decoding times with controlled GC.

The first run without explicit GC had substantial allocation/GC variation. Its
500/5,000-move BOM CJK medians were 19.22/130.69 ms before and 9.48/73.06 ms after;
no-BOM CJK was 131.61 to 128.17 ms, BOM ASCII 57.25 to 55.53 ms, and Latin-1
52.70 to 63.70 ms. That control regression prompted the common-GC comparison
above. Neither series establishes production p95 or a speedup for other encodings.
No timing assertion, CI benchmark or additional runner is introduced.

## Advance Analysis PV Previews from One Checkpoint

The analysis view previously replayed every move from the analyzed root for every
render. Walking forward through N PV moves therefore performed N*(N+1)/2 core
transitions; repainting the same step repeated them too. The view now owns one
checkpoint over immutable root/candidate identities. Same-step reads reuse its
frozen preview, and an adjacent forward read applies one normal play/pass from
that checkpoint. Backward reads, jumps and changed inputs use the original full
replay function, whose implementation is unchanged. Mount rollback/disposal clear
the entry. Provider validation, source records and request submission are unchanged.

Only one current preview is retained, plus its root/candidate identity. There is
no PV position-history array or global cache. Core positions still carry their
exact ko/superko and prisoner/pass state. Appending a played-list snapshot copies
O(step) references; this reduces core transitions to linear work for a forward
walk, not all array copying to linear work. Retained external snapshots remain
immutable. No RSS/heap-size claim is made.

Parent 9b96545 and changed source bundles run in Windows / Node 24.14.0. Each
bundle creates its own SDK-owned 19x19 positional-superko root. The line scans
row-major coordinates, retaining the first 16 or 128 legal plays, including
captures. Every forward/backward prefix's complete core position, played metadata
and display SGF match. Separate counters observe frozen Position creation outside
timing. A repeated-step batch includes its first full calculation plus 99 repeats.

Both variants first receive 256 equal direct 128-step replay warmups, followed by
four warmups per fixture and nine order-alternated samples. Exposed GC runs twice
before each timed batch, outside the timing. Median milliseconds:

| PV length | Read pattern                | Positions before / after | Before ms | After ms |
| --------: | --------------------------- | -----------------------: | --------: | -------: |
|        16 | Forward 1 through N         |                 136 / 16 |      2.62 |     0.40 |
|        16 | Same last step, 100 reads   |                1600 / 16 |     24.18 |     0.45 |
|        16 | One unprimed last-step read |                  16 / 16 |      0.38 |     0.55 |
|        16 | Backward N through 0        |                136 / 136 |      2.12 |     3.05 |
|       128 | Forward 1 through N         |               8256 / 128 |    144.72 |     4.64 |
|       128 | Same last step, 100 reads   |              12800 / 128 |    214.42 |     3.38 |
|       128 | One unprimed last-step read |                128 / 128 |      2.39 |     2.78 |
|       128 | Backward N through 0        |              8256 / 8256 |    171.52 |   153.72 |

The 128-step forward batch falls 96.79% and repeated-step batch 98.42%. This is
isolated preview computation, excluding display-SGF serialization/parsing, DOM,
candidate-table rebuilding and painting. It does not establish UI latency or p95.
Unprimed reads and short backward batches increased in this run; there is no
blanket improvement claim for fallback paths. The 16-step backward increase is
about 0.93 ms per complete batch. No timing assertion or CI runner is added.

Regressions cover capture/pass and superko state parity, frozen held snapshots,
single-transition forward work, same-step identity, backward/jump/input changes,
explicit clearing, invalid steps/illegal continuations and empty-PV behavior.
Public APIs, DB, dependencies, hygiene and runner configuration are unchanged.
