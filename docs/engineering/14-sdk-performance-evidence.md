# SDK Performance Evidence

Status: desktop Node baseline measured; optimization and broader browser/device
measurements remain separate work.

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

## Next Optimization and Boundaries

The long navigation loop is the measured dominant aggregate case. Source inspection
shows each state constructs its complete path twice and initializes an empty board
before checking the existing 128-position cache. Reuse the path and avoid unnecessary
initialization on a cache hit, retaining immutable state, replay history, eviction and
all edit/import/Undo invalidation. Compare the same workload/method before claiming
improvement. Full long-path state still inherently exposes a complete path; no
unbounded whole-record position cache or altered public state is justified here.

SDK correctness and installed artifact tests guard semantics. Browser/user-flow
fixtures must also run after shared controller changes. Rendering/perceived latency,
superko-heavy unique histories, annotations/overlays, multi-board scrolling and
physical low-spec devices remain unmeasured; this baseline does not close those
performance questions or the [active readiness audit](12-readiness-review.md).
