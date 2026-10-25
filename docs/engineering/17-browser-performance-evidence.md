# Browser Performance Evidence

Status: actual desktop Chromium Studio measurement; not a universal timing,
physical-device, paint-latency or memory-durability guarantee.

## Studio Parent Lookup: Isolated Source Comparison (October 25, 2026)

This subsection is a Windows/Bun 1.4.3 source microbenchmark, not a browser frame or
end-to-end navigation measurement. Baseline `d888a81` called `findNode` on every
Studio state notification to enable the branch-promotion button. Its LIFO DFS
could scan a large unrelated subtree before finding a shallow selected parent.
The replacement follows only the snapshot's selected game/path, without board
replay, record mutation or an additional whole-record index/cache.

The valid 50,000-node fixture is:

```js
'(;SZ[9]' + '(;N[parent];B[aa])' + '(;N[unrelated]' + ';W[];B[]'.repeat(24998) + '))';
```

The selected node is the first branch's leaf (path length 3). The original lookup
visits 49,999 nodes; the replacement compares the root ID and its first child's ID
(2 comparisons). The original function was extracted from the baseline's exact
Studio source and compared with the new helper using the same controller snapshot.
After 15 excluded warmups per function, seven batches used 100 old or 10,000 new
queries each; reported time is median batch duration divided by query count.
The repeated run measured 9.99969 ms before and 0.00012839 ms after per lookup
(report the very short new duration as less than 0.001 ms). Fixture construction,
controller replay and UI rendering are excluded. This does not establish a whole
Studio speedup, mobile-device latency or a universal timing threshold.

DFS costs O(N) node visits in the worst case. The new lookup costs O(D + sum F),
where D is selected ancestry depth and F the sibling IDs examined at each ancestor;
unrelated descendants are excluded. Very wide selected ancestry can still require
O(N) comparisons. Its traversal workspace is O(1), with no retained index.
Unit coverage protects game/root boundaries, unrelated-subtree exclusion, immutable
edits/undo/reordering and a 10,001-node linear path. Existing Chromium tree smoke
also checks promotion disabled at the root/main continuation/primary branch and
enabled on the secondary branch. No timing threshold or new runner/CI job was added.

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

At baseline, Studio rebuilt every displayed variation row on each selected-node
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

## October 12: Reuse Stable Variation Rows

Studio now reuses its first 500 variation rows when record identity and game index
are unchanged. It updates the previous/current selection and replaces at most one
selected row outside that prefix. It rebuilds on record/game/language changes,
including comment edits/Undo, and releases its bounded map on final page disposal.
An unchanged retained row keeps keyboard focus; replacing a focused tail row moves
focus to the new selected row. No SGF, rules, public SDK state or controller cache
contract changes. The specification records these example-consumer semantics.

The same rebuilt-browser measurement completed after the final code change at
5648c12 plus the Studio optimization (dirty worktree). The final retained report is
`output/playwright/browser-performance-after.json`. Controller hashes match before/
after, and the final report's Studio hash matches the current source:
`2c3db4cc9ab0cc1331fb16c8cfac7772b4c623091ea6c91f6fda2a4b777b5e3b`.
The runner now refuses controller/Studio source changes during its measurement
window; the final run did not observe such a change. An earlier exploratory run
overlapped source editing and is not the authoritative after-report.

| Moves | CPU rate | Open + frames | Last + frames | Previous + frames | Next + frames |
| ----: | -------: | ------------: | ------------: | ----------------: | ------------: |
|   300 |        1 |          44.3 |          29.9 |              25.7 |          27.2 |
|   300 |        4 |         285.4 |         100.2 |              65.0 |          53.2 |
|  5000 |        1 |         179.3 |          32.5 |              15.7 |          26.8 |
|  5000 |        4 |        1029.1 |         215.1 |              77.7 |          62.3 |

At 4x CPU, 5,000-move Previous/Next medians fell 59.8%/60.3%; Last fell 29.6%.
The 300-move 4x Previous/Next cases fell 51.7%/53.1%. Native-clock measurements
include frame cadence/noise: 300-move Previous/Next were slightly slower and
5,000-move Next increased 0.8ms. Opening did not consistently improve and is not
the target of this reuse. Do not claim every operation/environment improved.

Post-navigation DOM snapshots fell from 8,976 to 4,281 for 300 moves and from 9,991
to 4,790/native or 4,765/4x for 5,000 moves. Counts include detached nodes awaiting
GC, not just visible DOM. Post-navigation median heap was about 5.6/5.5 MiB for
300 moves (higher than the baseline snapshots), and 6.9/6.8 MiB for 5,000 moves.
These inconsistent GC snapshots do not prove lower memory use, absence of leaks
or a peak/retention budget. No forced collection or timing pass/fail gate was added.

The new production tree route passed real keyboard-focus continuity, one selected
row, 500/501 bounds, MN/annotation semantics, collection/language/import changes,
comment indicator Undo and actual unknown-property SGF download/reopen. Its
screenshot was inspected. The normal full functional route includes it and does
not include performance measurements. Existing CI routing adds its focused
`--tree-only` scope without another job. Refactor, test-hardening and Playwright
procedures apply. Current root check passed 197 tests/2,746 assertions,
lint/format/boundaries, SDK/adapter/CLI builds, root/Svelte types, docs and packed
SDK/classic/297 CLI checks. The full production suite passed on Chrome 154,
including the new tree route, accessibility/support/search/preferences/recovery,
locales/playback/controlled/framework/classic/editor/rules, diagrams/ink/touch,
comparison/sharing/textures/motion/scoring/puzzles/analysis. This is observed
execution on the final changed Studio source, not a result inferred from the cache
implementation. Other engines/physical devices, peak/leak measurements and hosted
execution were not run. No public API, DB/schema, dependency or hygiene changed;
example UI and browser/CI focused routing changed. Private reporting/policy
approval and publication remain separate outstanding readiness work.
