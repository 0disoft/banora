# Browser Memory Lifecycle Evidence

Status: nine production lifecycle cases / 135 measured cycles executed on Windows
x64 Headless Chrome 154.0.8037.97 on October 12, 2026. This is retained-resource
measurement under forced collection, not a universal leak-free or peak-memory claim.

## Reproduce and Source Identity

```sh
bun run build:examples
bun scripts/browser-smoke.ts --memory-only
```

The opt-in route runs the existing Playwright CLI against its own ephemeral
loopback server and independent contexts. Each case has three warmup cycles and
fifteen measured cycles. It does not use owner browser/login tabs or the existing
Studio development server. Only loopback requests are allowed. Studio autosave is
off; no real user record or downloaded game is involved. The 300/5,000-move records
are the existing authored legal opening/pass benchmark generator.

The measured source was `6bff168` with the private measurement tooling, later
committed unchanged as `d396362`. No SDK, adapter or example source changed between
those commits. The report truthfully records `dirty: true`. A separate post-commit
read-only check reproduced both fingerprints from the committed runtime/scenario
sources and the actual production files; it did not rerun or relabel the measurement.

- Runtime/example/scenario source SHA256: `f1f95d4e1141c868f8bd23345c9bce68e5ee0d47f6a0f9c5cec202bba173a003`.
- Production-example artifact SHA256: `f6bbbbefb628325706a6ce8e9b9f251f0da1b6f301803c26970008356bf44e13`.
- Complete report SHA256: `2a5f7ed92a95ab9987e492952cfde8bbc261fc6bd855eee0a482d963f6413b30`.

The fixed result is `output/playwright/browser-memory.json`; the preserved local
copy is `output/playwright/browser-memory-2026-10-12-with-controller-counts.json`.
These ignored artifacts contain raw samples and actual environment/source identity.
Source and production fingerprints must remain unchanged during measurement. A
partial run, missing case, invalid counter, unordered sample or incorrect controller
count cannot replace the final report. They are measurement artifacts, not SDK inputs.

## Method and Behavioral Checks

After two animation frames, each baseline, active and released checkpoint calls
`HeapProfiler.collectGarbage` twice, then records `Performance` JSHeapUsedSize and
`Memory.getDOMCounters` documents, nodes and JS event listeners. These aggregate
counters include browser/driver and host state; they are not just visible elements.
Forced collection changes normal GC scheduling. Active values are observations
while a record/view is alive, rather than transient allocation peaks.

Native React, Vue and Svelte examples repeatedly mount their shared Board/Viewer
and owned Board, navigate, and place on the fresh owned record. Each cycle verifies
shared stones, exactly one state callback, released view handles, no remaining
board surfaces and no view callback after unmount. The external host controller
continues navigating. React uses the actual Strict Mode example.

Classic Viewer cases use public `Banora.mountViewer` and `RecordController`
exports. Each cycle selects the final position, checks exact move count, clean
state and checkpoint SGF preservation, and exports a diagram with opening stones.
Disposal is called twice, the view reference is dropped, and the container must be
empty. Borrowed controllers must remain navigable and are retained by the host.

The classic example intentionally retains its original small host controller.
`Runtime.queryObjects` on the public constructor prototype checks the actual
remaining controller instances after collection. Owned cases have two while
active and one after disposal; borrowed cases retain two in both phases. Every
baseline and measured cycle enforces these counts. Debugger object groups are
released in `finally`, so the inspector does not keep queried controllers alive.
No private controller fields or record contents are extracted. See the primary
[CDP Runtime/HeapProfiler definitions](https://github.com/ChromeDevTools/devtools-protocol/blob/master/json/js_protocol.json)
and [Memory definitions](https://github.com/ChromeDevTools/devtools-protocol/blob/master/json/browser_protocol.json).

Studio cases repeatedly import their authored record, select Last, check move
count, visible opening stones and the 500/501 variation-row bound, then replace it
with a fresh one-node record. Each reset must be clean, have one tree row and zero
stones. A unique reset title makes async import completion observable; file-input
assignment alone is not counted as completion.

## Observed Results

Baseline is the released state after three warmups. Final is the released state
after fifteen additional cycles. Values are MiB; final-baseline differences are
KiB. The active maximum is the largest observed checkpoint, not a peak estimate.

| Case                         | Baseline heap | Final heap | Difference KiB | Active maximum | Released nodes | Released listeners |
| ---------------------------- | ------------: | ---------: | -------------: | -------------: | -------------: | -----------------: |
| React                        |         4.050 |      4.379 |          337.5 |          4.443 |      132 → 132 |          192 → 192 |
| Vue                          |         3.686 |      4.039 |          361.4 |          4.121 |      136 → 136 |            47 → 47 |
| Svelte                       |         3.397 |      3.737 |          349.0 |          3.802 |      292 → 292 |            32 → 32 |
| Owned Viewer, 300 moves      |         2.158 |      2.284 |          129.1 |          2.749 |        42 → 42 |            17 → 17 |
| Borrowed Viewer, 300 moves   |         2.519 |      2.635 |          119.0 |          2.683 |        42 → 42 |            17 → 17 |
| Studio, 300 moves            |         3.174 |      3.298 |          127.4 |          3.704 |    1392 → 1392 |          187 → 187 |
| Owned Viewer, 5,000 moves    |         2.178 |      2.306 |          131.7 |          5.291 |        42 → 42 |            17 → 17 |
| Borrowed Viewer, 5,000 moves |         5.009 |      5.127 |          120.6 |          5.200 |        42 → 42 |            17 → 17 |
| Studio, 5,000 moves          |         3.172 |      3.313 |          144.3 |          6.226 |    1392 → 1392 |          187 → 187 |

Released document counts also ended unchanged: three for Svelte and two for every
other case. All four classic Viewer cases passed their controller-count invariants
at every checkpoint. The borrowed 5,000-move host intentionally retains its larger
record/cache; its released heap is not expected to equal the owned/disposed case.

Heap snapshots increased in every case. Some classic series flattened in later
cycles, but these measurements do not attribute remaining growth to SDK objects,
framework/JIT caches or browser/driver instrumentation. Stable DOM/listener counts
and collected owned controllers establish those specific lifecycle properties;
they do not prove that every JS object, pending task or native resource is released.
No SDK optimization or new memory/time pass/fail budget is inferred from this run.

An initial exploratory run incorrectly clicked First while it was disabled at the
start position. The fixture now skips that click when disabled and still requires
Move 0 before navigation. A subsequent exploratory pass used aggregate counters
without controller queries. Neither is the authoritative report above; adding CDP
queries changes the measurement method and is not a memory-use optimization.

## Validation, Limits and Ownership

Local root `check` passed 235 tests / 3,298 assertions, SDK/adapter/CLI builds,
root/Svelte types, lint/format/boundaries, packed SDK/classic and 297 installed CLI
checks before the final controller-count assertions were added. The final focused
memory/options/CI tests passed six tests / 168 assertions, with lint/typecheck and
the complete nine-case browser measurement. Documentation, whitespace and file/
permission signal checks also passed. The combined diff selects the full default
Chrome route for the shared harness; no hosted memory execution is claimed by
the local report.

Memory measurement is opt-in and excluded from default functional smoke. Changes
to the memory tool select this focused route in the existing change-aware CI job;
shared runner or SDK changes still select the full functional browser route.
There is no new workflow/job, schedule, browser matrix, dependency or download.
The scenario/report tooling and CI planner are private; no public SDK API, version,
DB/storage schema or repository hygiene change.

Peak allocation, browser RSS/GPU/native memory, attribution of residual heap
growth and physical paint latency remain unverified. The owner declined physical
device and screen-reader checks; they are not release gates. Firefox/WebKit CDP
measurement is rejected before browser startup, rather than substituted with
different metrics. Existing multi-engine functional evidence remains separate.

Owning contracts: [performance budget](03-performance-budget.md),
[VALIDATION](../../VALIDATION.md), [compatibility](../sdk/compatibility.md) and
[readiness review](12-readiness-review.md). Feature, test-hardening, SDK and
Playwright procedures apply. Attribute retained heap and measure allocation peaks
before deciding whether runtime code needs a further memory optimization.
