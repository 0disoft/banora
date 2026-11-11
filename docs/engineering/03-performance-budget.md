# Performance Budget

- Status: Node/Studio timing and retained lifecycle resources measured in their
  declared profiles; universal byte/time and physical-device budgets unclaimed
- Technical owner: `0disoft` (solo maintainer)
- Decision: [ADR 0001](../adr/0001-initial-architecture-boundaries.md)

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
delimiter behavior. Other navigation, games, non-comment edits and imports use
the original traversal; interleaved records/controllers safely evict the single
checkpoint. Tokens and cache entries do not retain ancestor arrays or a record
history. Caller input, original key formatting and outline decisions are unchanged.

On Bun 1.4.4 / Windows, a 19x19 legal aa/bb opening followed by 4,998 alternating
passes gives 5,000 moves / 5,001 selected states. Getter-observed node wrappers
count only `children` reads made by the key projection; controllers still produce
the actual state/path/positions. The parent `b3219b1` implementation reports
25,005,000 reads; the changed implementation reports 5,000, with identical empty
keys for every state. Sequential linear key work changes from O(N^2) to O(N).
Same-node and C-only reuse need no path traversal; backward/branch jumps remain
full-path reads. Direct-child membership in a wide fork costs O(S) for S siblings,
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
