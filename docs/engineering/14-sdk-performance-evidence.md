# SDK Performance Evidence

## 2026-10-25: KataGo Query History Proof Reuse

Baseline `04addb1` replayed the complete analysis epoch with core `play`/`pass`
while encoding every KataGo query. `validRequest` already required an exact
SDK-issued context, and context creation had legally replayed and deeply frozen
that same epoch. Repeated query construction therefore rebuilt boards, groups and
ko history without discovering additional valid-input failures.

Encoding now scans only consecutive-pass counts for the engine-specific phase
restriction. Request fields and limit scalars are copied once before validation,
so an accessor cannot replace the proven context or limits between checking and
encoding/decoding. All capability, policy, setup-liberty, komi and limit checks
remain; common context creation still rejects wrong-turn, illegal-ko and other
unrepresentable archived epochs. There is no new cache or retained record owner.

Paired source measurements ran on Windows x64 Bun 1.4.3 against `04addb1`.
The 19-by-19 fixtures contain three independent ko shapes, one reversed, with
six alternating captures repeated under the SDK's simple-ko policy. For each
shape center x=1,7,13 (zero-based), the center is at y=1, the capture at y=2;
supporting stones are at (x-1,1),(x,0),(x+1,1) and opposing supports at
(x-1,2),(x+1,2),(x,3). The middle shape reverses colors. The repeated move cycle
is B(1,2), W(7,2), B(13,2), W(1,1), B(7,1), W(13,1). This synthetic legal-core
workload is not a tournament adjudication or live-engine compatibility claim.

Parsing, controller navigation and public context creation were outside the
timer. Each version had three warm-ups, then five alternating paired samples
of five query constructions with GC before each sample. Numbers are medians of
per-call sample averages; only query-object construction is timed, excluding JSON
serialization, I/O and engine inference. The final run was isolated from builds
and other validation commands. Serialized before/after queries matched for every
fixture.

| Epoch moves | Before (ms) | After (ms) |
| ----------: | ----------: | ---------: |
|          60 |    6.597360 |   0.221840 |
|         600 |   63.977320 |   0.855440 |
|       3,000 |  315.761180 |   4.003860 |

At 3,000 moves, query construction fell by 98.7% (78.9 times lower cost).

For M moves on an A-point board, redundant legal replay costs O(MA) in the worst
case; encoding now costs O(M + A), including initial-group checks and output
tuples. The 3,000-point-move fixture eliminates 3,000 additional 361-cell board
arrays (1,083,000 board-element copies), plus transition/group allocations.
The common context validator and engine result/PV validator are unchanged.

The committed spy regression observes zero core play/pass calls for repeated
encoding of a proven mixed move/pass context; baseline failed with nine play
calls for three encodings. Independent expected wire values, immutable context
checks, changing request accessors, copied contexts, invalid visits, single and
double passes, post-phase moves, setup epoch resets and SGF MN boundaries are
covered in `packages/sdk/test/katago.test.ts`. Timing is diagnostic, not a test
threshold. Reproduce semantic/resource checks with:

```sh
bun test packages/sdk/test/katago.test.ts packages/sdk/test/analysis.test.ts
```

## 2026-10-25: Bounded Variation Sibling Scheduling

Baseline `ae04dfc` limited returned variation rows but eagerly pushed every child
of an expanded node onto its pending stack before yielding the next row. A root
with 49,999 children therefore read and allocated 49,999 sibling work entries even
when the selected root needed only one or 500 displayed rows. This is a transient
allocation/cost issue, not a claim that the old generator leaked records.

The private iterator now stores a cursor over each active sibling array and reads
one child at a time, in the same depth-first order. It drops an exhausted cursor
before yielding/descending, so a linear game keeps one pending frame rather than
retaining every ancestor. No cache, input mutation or public signature changes.
The row payload, global depth/indent, inherited move numbers/MN, branch collapsing,
selected neighborhoods and exact truncation lookahead are unchanged.

Paired source measurements used Windows x64 Bun 1.4.3, baseline `ae04dfc` and
working source. Each parsed 9-by-9 fixture had a root with pass-only leaf variations,
with no limit overrides (50,000 nodes at the maximum width). Parsing, controller
construction and root selection were outside the timer. After three warm-up calls
per version, five alternating paired samples each timed 20 calls; GC ran before
each sample. Values below are medians of per-call sample averages. A separate,
untimed Proxy counted numeric child-array reads without modifying source nodes.

| Root children | Row limit | Before, ms/call | After, ms/call | Child reads before / after |
| ------------: | --------: | --------------: | -------------: | -------------------------: |
|         5,000 |         1 |        0.282190 |       0.005690 |                  5,000 / 1 |
|         5,000 |       500 |        0.300060 |       0.062395 |                5,000 / 500 |
|        49,999 |         1 |        3.059450 |       0.003285 |                 49,999 / 1 |
|        49,999 |       500 |        3.830770 |       0.068050 |               49,999 / 500 |

For a root-selected wide prefix of L rows, sibling scheduling changes from O(W)
work/storage for width W to O(L) reads and one pending sibling frame. Across a
general tree, pending cursors depend on unfinished branch depth, not unused sibling
width; the existing path set and output rows still use O(D + L) storage. Locating
a distant selected node can still scan the visible prefix in O(N), and returning
every row still costs O(N). This is helper-only evidence, not total UI latency.

Before/after public row metadata plus the existing runtime payload matched in 252
paired cases over 5,001-node linear/wide fixtures and a nested setup/comment/MN
fixture. Cases included root, row-window boundaries, middle/last selection, both
folding modes and row limits 1, 2, 7, 499, 500, 501 and 50,000.

The committed regression uses a valid maximum-size wide record, asserts exact
child-read budgets and independently derived order/row metadata for both folding
modes at limits 1, 2, 500, 501 and 50,000. No timing thresholds enter the unit suite.

```sh
bun test packages/sdk/test/variations.test.ts
bun run build:examples
bun scripts/browser-smoke.ts --tree-only
```

## 2026-10-25: Viewer Game Selector Navigation

Baseline `4582976` recreated every game `<option>` on every controller notification,
including an adjacent move in the same game. A 5,000-game collection therefore
allocated 5,000 option elements per move despite unchanged names and game index.
Viewer now keeps one collection-roots identity, one game-label template and one
selected index. It rebuilds only when roots or the label template change, updates
the native selection only when needed, and releases the cached roots on disposal.
Immutable roots include authored game names, so name edits and Undo/Redo invalidate
the cache. Locale/message changes are keyed by the actual `game` template, while
authored `GN` values keep their existing nullish-fallback semantics (including
intentionally empty names).

Paired Windows x64 Headless Chrome 155.0.0.0 measurements used source bundles from
`4582976` and working source in the same page, Bun 1.4.3, a 1280-by-900 viewport and
a 520-pixel host. Each collection contained one 9-by-9 game with two moves and
remaining 9-by-9 root-only games. Both viewers warmed up through two next/previous
pairs, then five alternating paired samples each executed eight next/previous
pairs (16 notifications). CDP forced GC before each timed sample. `createElement`
instrumentation counted only option creation and was restored in `finally`.

| Games | Before median, ms | After median, ms | Options before / after per sample |
| ----: | ----------------: | ---------------: | --------------------------------: |
|   100 |              22.9 |              9.9 |                         1,600 / 0 |
| 1,000 |             115.6 |              8.7 |                        16,000 / 0 |
| 5,000 |             622.2 |              9.5 |                        80,000 / 0 |

All 15 updated samples preserved the first option and ended at move zero; all
baseline samples replaced it. The 5,000-game median dropped 98.5% for this measured
boundary. Timing includes synchronous controller notifications and board/view DOM
updates; parsing, initial mount, asynchronous rendering, browser paint and CSS
loading are excluded. These are local measurements, not an end-to-end latency SLA.
For G games and M navigation events in one unchanged collection, selector option
construction falls from O(MG) to O(G) at mount plus O(M) scalar checks, with zero
new option nodes during navigation. The DOM still contains G options; edits that
change immutable roots still rebuild them in O(G). There is no multi-record cache.

Reproduce the committed semantic/allocation regression after `bun run build:examples`:

```sh
bun scripts/browser-smoke.ts --tree-only
bun scripts/browser-smoke.ts --viewer-disposal-only
```

`viewer-games-scenario.js` checks 5,000 options across 16 moves with zero option
replacements, native last/first game selection, unrelated theme/messages, language
and template replacement/clearing, rename/Undo/Redo, record replacement, an empty
authored name and single-game visibility. It uses identity/mutation assertions,
not timing thresholds. The disposal scope separately checks weak record roots
after forced GC. Existing Studio/viewer tree and export/reopen checks remain.

## 2026-10-25: Studio Assessment Target Lookup

Baseline `4fa2b20` found a clicked stone's recorded move by calling `inspectNode`
backward through the selected path. Only each returned node's move properties were
used, but inspection also constructed frozen paths and full board snapshots and
could replay history after missing the 128-position cache. This made a metadata
lookup pay quadratic path-copy/freeze work in long linear games.

Studio now uses a pure snapshot-only helper. It preserves immediate-child priority,
visible-stone color filtering and the most recent matching selected-path move by
walking forward and retaining the last match. It does not inspect board states,
allocate ancestor snapshots/path arrays, mutate input or add any cache. For depth D
and S sibling entries examined while following the chosen path, lookup takes
O(D+S) time and O(1) additional live storage; in a linear game S is O(D). Existing
assessment validation, edits, Undo, setup behavior and selected cursor are unchanged.

Paired local measurements used Bun 1.4.3 on Windows x64, baseline lookup copied
verbatim, unchanged SDK dependencies, one warm-up and five alternating samples per
version. Each 19x19 fixture has a first Black move at aa and subsequent alternating
passes, with the last node selected before timing. Lookup clicks the first stone.
One controller is reused per fixture; returned node identity, exact inspection count
and unchanged public state are checked outside timing. Parsing, initial selection,
editing/validation, DOM, driver events and disposal are excluded. No other
verification ran concurrently. This measures target lookup, not full click latency.

| Moves | Before median | After median | Ancestor inspections before → after |
| ----- | ------------- | ------------ | ----------------------------------- |
| 1,000 | 168.978 ms    | 0.168 ms     | 1,000 → 0                           |
| 5,000 | 5,572.191 ms  | 0.908 ms     | 5,000 → 0                           |

The 5,000-move lookup took 99.98% less time in these samples. Local ignored evidence
is `.tmp/recorded-move-paired.json`, `.tmp/recorded-move-paired.ts` and the verbatim
`.tmp/recorded-move-before.ts`. Default tests assert semantic cases and no live
inspection, not wall-clock thresholds. Chrome playback smoke also forbids ancestor
inspection during real Studio Good/Bad/Erase actions after 1,001 moves, verifies the
historical target and retained cursor, and restores the record with Undo. Existing
playback, keyboard/import/export guards and six consumer lifecycle checks remain.

## 2026-10-25: Bounded Comparison Selector Projection

Baseline `6f3d000` eagerly called `inspectNode` on every collection root to obtain
dimensions, then kept only the first 500 selector rows. It also copied all children
of visited nodes into a `shift`/`unshift` work queue. A pure metadata projection now
reads sizes only for reached games and uses an iterative ancestor cursor. It reads
at most 500 displayed nodes without copying hidden siblings; exhausting the cursor
distinguishes exactly 500 nodes from a truncated record. Existing chosen-node
appending, position validation/replay, rendering and all import limits are unchanged.
`sgfBoardSize` retains its existing dimension validation; this does not bypass SGF
validation or make pinned board inspection free.

For G games, L=500 rows and board area A, root inspection previously scaled with G
even when all rows came from one game. The new projection uses O(L + K·A) work for
K reached games (K ≤ L), independent of hidden roots/siblings. Ancestor cursor space
is O(min(depth,L)), replacing a queue that could contain the whole hidden frontier.
Actual strings still incur their normal formatting cost. No result cache or new
record-retention root is introduced.

Paired local source measurements used Bun 1.4.3 on Windows x64, two warm-ups and
seven alternating samples per version, with unchanged shared dependencies. Each
19x19 collection contains a first game with 500 alternating passes and the remaining
games as root-only records. Each projection returns the same 500 rows and truncation
flag, checked outside timing. Parsing/controller setup and disposal are excluded;
no DOM, canvas, selected-pane replay or browser rendering is timed. One controller
is reused per fixture; its immutable state remains identical. No other verification
job ran concurrently. Root-inspection counts are asserted separately from timing.

| Games | Before median | After median | Root inspections before → after |
| ----- | ------------- | ------------ | ------------------------------- |
| 1,000 | 202.657 ms    | 1.481 ms     | 1,000 → 0                       |
| 5,000 | 919.270 ms    | 1.384 ms     | 5,000 → 0                       |

The 5,000-game projection took 99.85% less time in these samples; this is not an
end-to-end browser latency claim. Raw paired results, harness and verbatim baseline
projection are local ignored `.tmp/comparison-rows-paired.json`,
`.tmp/comparison-rows-paired.ts`, `.tmp/comparison-rows-before.ts`.
Deterministic tests cover 499/500/501 boundaries, nested preorder, rectangular and
legacy-pass labels, twelve locales, a 49,999-child fork (499 child reads) and a
5,000-game collection whose full first game leaves every later game unread. Chrome
comparison smoke additionally forbids inspecting hidden unchosen roots while
preserving an explicitly chosen node outside the selector prefix.

## 2026-10-25: Adjacent Controller Paths

Baseline `bcbc55a` reconstructed the root-to-selected path on every state change.
For N forward moves from an already selected root this performs N(N+3)/2 parent
Map lookups. A single weak parent-index checkpoint now performs N such lookups;
5,000 moves reduce 12,507,500 lookups to 5,000 (99.96%). The working array is private;
published paths own frozen copies. A different index or nonadjacent branch falls
back to full reconstruction. The cache holds one path, not a history of frames,
and disposal clears it. The existing 128-position replay cache is unchanged.

This reduces ancestor lookup work from O(N²) to O(N) for adjacent forward traversal,
but **total traversal remains O(N²)** because immutable paths must still be copied
and frozen. Extra working storage is O(depth). This is not incremental SGF editing
or a new arbitrary-jump replay policy.

Paired local measurements used Bun 1.4.3 on Windows x64, before/current source in
one process with shared unchanged dependencies, two warm-ups and seven samples per
version, alternating version order. Each fresh 19x19 record alternates Black/White
passes. Timing covers all synchronous `next()` calls and their success assertions;
parsing/construction, final path/move-number assertions, disposal and file I/O are
excluded. No other validation job ran concurrently. Values are aggregate navigation
time, not individual frame latency, browser rendering or a p95 estimate.

| Forward moves | Before median | After median | Reduction |
| ------------- | ------------- | ------------ | --------- |
| 1,000         | 182.206 ms    | 168.116 ms   | 7.7%      |
| 5,000         | 6,351.971 ms  | 5,681.584 ms | 10.6%     |

Raw paired timings and the copied baseline/harness are local ignored artifacts
`.tmp/path-paired.json`, `.tmp/controller-path-before.ts`, `.tmp/path-paired.ts`.
The deterministic regression test checks exactly 1,000 parent reads for 1,000
forward steps and frozen held snapshots across backtracking/disposal. A second
test checks full path connectivity through branches, nonselected inspection,
comments, Undo/Redo, another game and import. Timing is not a CI assertion.

Status: desktop Node before/after navigation optimization measured; broader
browser/device performance measurements remain separate work.

[Browser performance evidence](17-browser-performance-evidence.md) now records
separate actual Studio/Chromium timings and heap snapshots. The historical Node
results below remain scoped to their own source/runtime/method.

## Method and Provenance

On 2026-10-11, `bun run perf --output .tmp/performance-before.json` rebuilt and
executed public SDK artifacts using Node 24.14.0, Windows x64, SDK 0.1.0-dev.0.
Source commit was `2406f2b`, dirty because the benchmark tooling was being added;
controller SHA-256 was
`06b7cb1719696d26b886aa3c970fa96dbe07c40478561cda9a82a98a111fee88`.
The report identifies actual source/runtime and preserves five raw samples.

Each case has one warm-up and five fresh harnesses. Setup/selection/preparation,
post-run correctness assertions and disposal are excluded. Navigation success checks
inside the loop are included. The timer covers synchronous SDK computation, not
file I/O, browser/DOM/paint or installation. Median and range are descriptive samples,
not a statistically established percentile or universal performance budget.
Hardware/power/background load and garbage collection are not controlled.

Workloads: committed original 9x9 study with branches; authored 300-move 19x19 review;
authored 5,000-move 19x19 pass-heavy stress. Generated records use legal placements
for their opening, then passes, with periodic comments. They are not KataGo games.
The stress case measures the long-path contract, not a typical game's move count.
Report memory is a process snapshot after all cases, not per-operation allocation
or peak memory. No source comments/names/SGF/path appear in the output.

## Baseline Medians

All values are milliseconds for the complete named case. Tail roundtrip is 20
next/previous pairs (40 commands); sequential-next traverses the complete main line
(7 / 300 / 5,000 commands respectively). Batch edits up to 25 early main-line comments
as one controller edit; restore includes the selected tail's replay.

| Case                         | Original study | 300-move review | 5,000-move stress |
| ---------------------------- | -------------: | --------------: | ----------------: |
| Parse                        |           0.25 |            2.32 |             36.78 |
| Controller open              |           0.45 |            3.17 |             51.93 |
| Serialize                    |           0.03 |            0.14 |              2.08 |
| Sequential next              |           0.15 |            8.60 |          1,032.73 |
| Tail roundtrip (40 commands) |           0.43 |            0.89 |             13.99 |
| Comment search               |           0.02 |            0.27 |              6.49 |
| Comment batch                |           0.45 |            3.77 |             58.53 |
| Checkpoint restore           |           0.47 |            7.00 |             89.36 |

## Measured Optimization and Boundaries

The long navigation loop was the dominant aggregate case. Each state constructed
its complete path twice and initialized an empty board before consulting the
128-position cache. The controller now builds one path for replay/state and creates
an initial position only without a cached ancestor. Cache budget/eviction, immutable
state, complete history and edit/import/Undo/checkpoint invalidation remain.
Full long-path state still exposes a complete path; no unbounded position cache
or altered public state is introduced.

`bun run perf --output .tmp/performance-after.json` used the same runtime/workloads/
method at source commit `a51f255` plus the controller change (dirty worktree).
Controller SHA-256:
`3eb175e7ef37420cb2bcc52e384cf91f29e944cbc0fe642436f6a7a8e2a53755`.

| Navigation case                | Before median ms | After median ms | Observed reduction |
| ------------------------------ | ---------------: | --------------: | -----------------: |
| Study sequential (7 commands)  |           0.1554 |          0.1860 |             -19.7% |
| Study tail roundtrip (40)      |           0.4264 |          0.3617 |              15.2% |
| 300-move sequential            |           8.6042 |          6.5698 |              23.6% |
| 300-move tail roundtrip (40)   |           0.8898 |          0.3742 |              57.9% |
| 5,000-move sequential          |       1,032.7275 |        484.4922 |              53.1% |
| 5,000-move tail roundtrip (40) |          13.9945 |          7.3433 |              47.5% |

Stress sequential ranges were 945.72–1,224.68ms before and 450.35–660.21ms after.
The small study's sequential median increased about 0.03ms: do not claim every
operation/device improves. Unaffected parse/search cases vary between processes
and are not attributed to this optimization. Process snapshots do not prove lower
allocation/peak memory. This is observed desktop SDK work, not a speed/paint guarantee.

SDK correctness and installed artifact tests guard semantics. Replay fixtures compare
warm/evicted states to fresh replay across captures, passes, setup, move overrides,
branches and collections. They verify read-only inspection, immutable paths and
cache invalidation after setup/Undo/import/checkpoint policy changes. Shared controller
changes also require production browser flows. Rendering/perceived latency,
superko-heavy unique histories, annotations/overlays, multi-board scrolling and
physical low-spec devices remain unmeasured; this baseline does not close those
performance questions or the [active readiness audit](12-readiness-review.md).

## Executed Validation

Benchmark tooling passed `check` with 187 tests / 2,594 assertions and 222 installed
CLI checks before the controller change. After optimization, `check` passed 189 tests /
2,681 assertions, quality/boundaries, builds, root/Svelte types, docs, packed root/
subpath/no-DOM/classic SDK and installed CLI artifacts. The production browser suite
passed in Chrome 154, including Studio recovery/search/support and all three
frameworks, editor/guards/reopen, controlled boards, rules, diagrams, transforms,
ink/touch, comparison/sharing/textures/animation, scoring/puzzles/analysis and lifecycle.
These are functional/browser correctness checks, not a browser performance measurement.

Report workload node/board/byte/comment/main-line counts match before and after;
the after-report digest matches current controller source. Source/privacy/whitespace
checks follow the synchronized docs. Other browser engines, physical/low-spec
devices, paint/frame latency and memory peak/retention remain unmeasured. No hosted
execution, automatic timing gate or universal numerical guarantee is inferred.
