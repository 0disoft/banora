# Browser Performance Evidence

Status: actual desktop Chromium Studio measurement; not a universal timing,
physical-device, paint-latency or memory-durability guarantee.

## Reproduce

Run `bun run perf:browser`. It rebuilds production SDK/adapters/examples, serves
only ephemeral loopback artifacts and uses the existing Playwright CLI runner.
The measurement creates/disposes independent browser contexts; it does not touch
the user's running Studio server/profile. The successfully verified report replaces
`output/playwright/browser-performance.json`; copy it before another comparison.
No timing threshold runs in normal functional smoke. CI routes an explicit
measurement-scenario change to this focused route within the existing job.

Two original synthetic records use the legal opening/pass generator already checked
by the SDK benchmark: 300 moves and a pass-heavy 5,000-move stress case. They are
not downloaded KataGo games. Each workload/profile has one excluded warmup and five
fresh measured contexts. Autosave is explicitly off, language English, viewport
1280 by 900. CPU rate 4 is Chromium emulation, not a physical low-spec machine.

Import timing starts at the actual native file-change event, before the Studio
handler. It ends after the expected record heading appears plus two animation
frames. Navigation timing starts at a DOM click on the real Last/Previous/Next
control and similarly includes two frames; driver polling is excluded. These
measure UI/render-turn availability, not pixels reaching a physical display.
Actual move/clean state, bounded tree rows and visible opening stones must pass;
page errors fail the measurement. Heap values are CDP JSHeapUsedSize snapshots
before import, after import and after navigation; DOM count is a post-navigation
snapshot. These are neither peak allocation nor retention/leak after disposal.
Garbage collection, power/background work and compositor timing are uncontrolled.

## October 12 Baseline

`bun run perf:browser` completed on Windows x64 Headless Chrome 154.0.8037.97.
Source was 05129ed plus measurement tooling (dirty worktree). The JSON includes
actual source commit, dirty state, controller/Studio SHA-256 and raw samples.
The retained local before-report is `output/playwright/browser-performance-before.json`.
All values below are five-sample medians, milliseconds for the named UI action.

| Moves | CPU rate | Open + frames | Last + frames | Previous + frames | Next + frames |
| ----: | -------: | ------------: | ------------: | ----------------: | ------------: |
|   300 |        1 |          42.5 |          30.6 |              25.5 |          26.7 |
|   300 |        4 |         270.8 |         179.4 |             134.5 |         113.4 |
|  5000 |        1 |         175.8 |          49.4 |              28.0 |          26.0 |
|  5000 |        4 |        1069.7 |         305.7 |             193.2 |         156.8 |

The 300-move tree had 301 rows; 5,000 moves retained the first 500 plus the selected
tail row. DOM snapshots were 8,976 and 9,991 nodes respectively. The larger
post-import median heap snapshots were about 16.1 MiB/native and 26.1 MiB/4x;
after navigation about 7.4 MiB. Different GC scheduling explains why these values
must not be interpreted as peak memory or a monotonic per-move allocation trend.

Current Studio source rebuilds every displayed variation row on each selected-node
change even when the immutable record and selected game are unchanged. Reusing
those rows is the next measured improvement candidate. It must retain correct
selection, the extra tail row, comments/numbering, language changes and edits;
these timings alone do not prove a performance improvement or justify new caches.

## Validation Scope

The measurement executed all four workload/profile pairs and 20 measured samples,
requiring actual rendered move/clean/tree/stone state. Typecheck/lint and examples
build passed. CI planner tests verify focused routing. Root check passed 197
tests/2,745 assertions, types/builds/quality/boundaries, packed public SDK/classic
and 297 installed CLI checks. Docs checked 121 documents/457 links; file/permission
signals checked 352 files. The normal production locale route also passed after
this runner change. No SDK API, schema/DB,
dependency or hygiene changed; root command/browser and existing CI routing grew.
Feature and Playwright procedures apply. Physical/other-engine, abrupt failure,
screen-reader, memory peak/retention and hosted measurements remain unverified.
