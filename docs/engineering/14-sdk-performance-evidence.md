# SDK Performance Evidence

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
