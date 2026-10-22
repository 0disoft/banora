# Browser Review Fix Comparison

- Measured: 2026-10-22 17:51 KST
- Before: `6ecd86c06ab04c8114a7f683c901d7d1db6bf0b9`
- After: `165ce03a1c6656cf397f9526778f40a9206257c6`
- Harness: `0719caebe5ad65f1436957bed70217ccc5176d49`
- Status: local measured evidence; no remote operation or deployment

## Reproduce and Scope

Run `bun scripts/review-browser-benchmark.ts` from the prepared checkout. Optional
`--quick` runs the smaller pilot. The runner exports the two fixed commits into
ignored temporary directories; it never checks out, resets or creates Git
branches/worktrees. Both snapshots use identical isolated production Vite builds
with aliases to their own SDK sources and shared installed dependencies. These
are local comparison bundles, not published release artifacts. Source archives,
harness files, fixtures and the dependency lock have SHA-256 provenance in the raw
report. The application source is not instrumented for timing.

Environment: headless Chrome 155.0.8059.40, Windows 10.0.26200,
11th Gen Intel(R) Core(TM) i5-11400F @ 2.60GHz, 12 logical CPUs,
31.9 GiB RAM, Bun 1.4.3, Vite 8.3.4.
Viewport is 1280 × 900, native CPU rate (1×), English UI, local-only resources,
fonts ready and autosave disabled. Memory and timing use separate fresh browser
contexts. Each timing condition has two warmups and eight measured samples per
version, alternating before/after order. Memory has three independent contexts
per version. Medians below summarize this machine, not device-wide budgets.

## Inputs

All inputs are authored legal-opening/pass synthetic studies, not tournament
datasets. Each SGF passes the existing parser limits. Comments make large
records meaningful byte workloads rather than only long pass lists.

| Input            | Moves / nodes                               |     Bytes |
| ---------------- | ------------------------------------------- | --------: |
| `normal.sgf`     | 300 / 301                                   |     8,406 |
| `large.sgf`      | 5,000 / 5,001                               | 2,535,306 |
| `collection.sgf` | 300 + 4,700 / 5,002                         | 2,391,612 |
| `memory.sgf`     | 5,000 / 5,001                               | 1,035,306 |
| `normal.json`    | 300 / same working and baseline SGF         |    17,705 |
| `large.json`     | 5,000 / different working and baseline SGFs | 5,080,904 |

## Closing the Initial Tab

The actual Studio initially loads the memory fixture, navigates to the end, then
loads a small record to warm the same initial controller without closing it.
This avoids hiding the initial-target defect in a discarded warmup tab. After a
baseline GC sample, it imports the large record, visits the end and makes eight
independent comment edits (blur ends each edit group). It closes the dirty first
tab through the normal discard approval, then repeats a later-tab close control.

A memory-only module wraps `StudioWorkspace.close` and stores only WeakRefs to
closed controllers and records. It uses the same workspace class as the UI.
Before every heap observation, two CDP collections are separated by animation
frames. Debugger handles never retain the measured objects. The probe is absent
from timing contexts; the runner explicitly checks that before setup.

| Observation                                          |     Before |      After |
| ---------------------------------------------------- | ---------: | ---------: |
| Active JS heap above warm baseline, median           |  6.854 MiB |  6.852 MiB |
| JS heap above baseline after first-tab close, median |  6.439 MiB |  0.179 MiB |
| First controller / record still alive after GC       | 3 / 3 runs | 0 / 3 runs |
| Later controller / record still alive after GC       | 0 / 3 runs | 0 / 3 runs |

The first closed controller and current record are collectible after the fix.
The residual heap includes normal page/UI bookkeeping; it is not evidence of a
remaining record leak. These are V8 used-heap deltas, not total process, DOM, GPU
or peak memory. Forced GC proves eligibility for collection, not when ordinary
background GC will run during a user session.

## Move Numbers

Each sample dispatches twenty alternating navigation button clicks and measures
the synchronous burst divided by twenty. Early navigation alternates moves
32/33; end navigation alternates the selected game's final two positions.
The collection selects its 300-move game while the other 4,700 moves remain
unselected. `large-off` is the same 5,000-move input with numbers disabled.
Rendered number/coordinate signatures match between versions in every condition;
selection and clean state remain unchanged.

| Condition        | Before ms/action median | After ms/action median |  Before range |   After range |
| ---------------- | ----------------------: | ---------------------: | ------------: | ------------: |
| normal/early     |                   5.625 |                  5.228 |   4.640–6.625 |   4.535–6.155 |
| normal/end       |                   6.858 |                  6.860 |   6.425–7.885 |   6.715–7.725 |
| large/early      |                   6.172 |                  5.665 |   5.725–6.675 |   5.075–6.110 |
| large/end        |                  11.820 |                 11.743 | 11.555–18.325 | 11.430–13.530 |
| collection/early |                   5.645 |                  5.253 |   5.000–6.365 |   4.925–6.960 |
| collection/end   |                   6.935 |                  6.475 |   6.660–8.585 |   6.250–7.065 |
| large-off/early  |                   5.428 |                  4.822 |   4.555–6.100 |   4.605–5.595 |
| large-off/end    |                   6.925 |                  6.875 |   6.600–8.160 |   6.780–7.840 |

A separate single click is measured through two requestAnimationFrame callbacks
after the burst, then reversed outside its timer to restore the endpoint. This
is a browser-frame proxy, not physical display latency.

| Condition        | Before single-click → 2 RAF median ms | After median ms |
| ---------------- | ------------------------------------: | --------------: |
| normal/early     |                                 26.55 |           25.35 |
| normal/end       |                                 25.60 |           26.30 |
| large/early      |                                 25.25 |           28.05 |
| large/end        |                                 26.95 |           31.55 |
| collection/early |                                 29.25 |           23.50 |
| collection/end   |                                 24.60 |           29.80 |
| large-off/early  |                                 23.70 |           29.95 |
| large-off/end    |                                 25.85 |           22.80 |

The 5,000-move end burst is effectively unchanged (11.820 → 11.743 ms/action).
Early/collection burst medians improve roughly 7–8%, but the numbers-off early
control also improves 11%; ranges overlap. The data therefore do not isolate a
move-number speedup from runtime/layout/host variation. Single-click frame
medians change in both directions, including a slower large/end result
(26.95 → 31.55 ms; ranges 23.9–64.9 and 27.0–40.9 ms). No user-visible navigation
latency improvement is established by this run. The earlier operation-count
proof of removed indexing remains valid; it is not a latency guarantee.

## Backup Restore

Fixtures are prepared as in-memory native File objects outside the timer. Timing
starts at the actual backup input change event and includes File.text, JSON
parsing, checkpoint validation/replay, controller replacement and DOM updates.
`ready` ends when the restored status is observed; `2 RAF` also waits two browser
frames. Native file selection, disk/network latency and IndexedDB reads are not
included. Each trial restores into a new clean tab, leaving the original small
tab untouched so the pre-fix first-tab retention cannot accumulate large records
across timing trials. The guarded case first creates unsaved work and clicks the
actual discard approval. Time waiting for that click is measured and subtracted.

| Condition     | Before ready ms | After ready ms | Before 2 RAF ms | After 2 RAF ms | 2 RAF reduction |
| ------------- | --------------: | -------------: | --------------: | -------------: | --------------: |
| normal        |           35.70 |          34.90 |           52.20 |          51.75 |            0.9% |
| large         |          377.55 |         278.05 |          412.05 |         310.20 |           24.7% |
| large-guarded |          425.70 |         330.55 |          452.25 |         355.75 |           21.3% |

Large clean-start restore ranges (2 RAF) are 399.1–427.2 ms before and
298.6–331.6 ms after. Guarded restore ranges are 434.7–584.3 ms before and
320.8–422.2 ms after, excluding approval wait.

For the guarded large backup, pre-approval time is 245.90 → 138.80 ms (43.6% less).
After-approval medians are 180.60 → 190.00 ms, with overlapping ranges; final SDK
validation was intentionally retained. Independently computed phase medians do
not sum to the overall median. The large restore gain is concentrated before
approval, consistent with removing the redundant consumer validation. Small
backup restore is nearly unchanged. Selection, authored comment, dirty/baseline
state and cleared Undo history are checked after every restore.

## Evidence and Limits

- Raw local artifact: `output/playwright/review-browser-comparison.json`
- Raw artifact SHA-256: `ed092f99c8505c05dc1f89f370f9a0d7b6ad34885587ffe24e724813317d5d51`
- Complete observations: 6 memory lifecycles, 128 navigation samples (plus separate
  single-click frame probes), 48 restore samples; warmups excluded.
- Raw data retains individual samples, min/max/p95 summaries, rendered signatures,
  source/harness/fixture/lock hashes, environment and excluded approval waits.
- p95 is nearest-rank over only eight samples (therefore the maximum); it is not a
  production tail-latency estimate. No formal significance test or device budget
  is claimed. Refresh phase affects short two-frame timings.
- This compares all five reviewed fixes, not a one-change ablation. Framework
  adapters are not mounted and byte SGF import is outside navigation/restore
  timers, but small timing differences cannot be attributed to one fix.
- No CPU throttling, headed-browser/manual workflows, other browsers/devices,
  real tournament records, OS file picker/disk cost or natural-GC scheduling were
  measured. No automatic performance threshold or extra CI job was added.
- Pilot/full real-browser runs, harness lint/type checks and documentation checks
  cover this measurement-only change. Product runtime code is unchanged; the
  complete 351-test product suite was not repeated.

Next performance work should profile the remaining navigation/paint path with
numbers on/off before selecting another optimization. These results support the
closed-tab reference fix and large-backup duplicate-validation reduction, while
placing a clear limit on the demonstrated navigation benefit.
