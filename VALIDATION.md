# Validation

- Status: Active local validation; hosted Linux root/consumer CI passed at `380c7a7`,
  full affected production browser CI passed at `7ecddf1`; executed scope below

## Indexed Common Rollback Versions

Channel preflight builds per-package membership sets only after both observations
and final byte verification. Filtering the first semantically sorted array keeps
the original exact-string intersection and order. Duplicate/oversized metadata
still fails, including the first observation; no registry read is skipped/cached.

Focused channel tests passed 20 cases / 173 assertions, including mixed/shuffled
inventories, semantic prerelease ordering, unchanged input, exactly 10,000 versions,
10,001 refusal, duplicates and all existing drift/integrity/target/health checks.
Root types and lint passed. An isolated source-expression comparison against
`2d199fb`, two warmups/five timed runs, measured median 1,315.77 to 23.31 ms for
five identical 10,000-version lists, including set construction; all outputs match.
This removes quadratic membership work, not sorting/I/O, and does not establish
an end-to-end release speedup. Browser/remote publication/hosted CI were skipped
for this local operational change. Skills: bugfix, ops-change and test-hardening.
Source contracts changed: release operations and this record. No SDK/receipt
schema, DB/storage, dependency/version, hygiene or CI/runner policy changes.

## Single-Attempt Publication Transport

Publication handoff argv and the npm adapter explicitly disable npm HTTP retries
for uploads, in addition to the existing single command attempt. The adapter's
last CLI value overrides earlier retry arguments; isolated upload configuration
also sets zero retries. Read-only metadata commands retain their existing timeout
and propagation-poll policy. Uncertain uploads still stop subsequent packages and
require registry identity/integrity/channel reconciliation before approved resume.

Focused final release/check tests passed 28 cases / 264 assertions. A mocked npm
transport verifies the forced argv/environment and one failed upload call; actual
local `npm config get` verifies last-value precedence without network access.
Existing uncertain-upload, fixed receipt, metadata polling, authority and integrity
tests remain. Root types, lint, format, boundaries and docs passed. Full `check`
for the preceding shutdown increment is recorded below; it was not repeated for
this narrow transport-policy increment. Browser, hosted CI, other operating
systems and actual registry publication were skipped; no live upload behavior is
claimed. Skills: bugfix, ops-change and test-hardening. Source contracts changed:
release operations and this record. No public SDK/receipt schema, DB/storage,
dependency/version, hygiene or CI/runner policy changes.

## Release Check Stop Confirmation

Release checks have an independent one-second exit-confirmation budget after a
timeout, cancellation or process/pipe error. A missing close event or failed kill
cannot leave the runner waiting indefinitely. Owned pipes and listeners are
released; an unconfirmed process is unreferenced, without claiming it stopped.
Optional caller cancellation uses the same path and pre-abort starts no process.
Original causes remain private/non-enumerable and the public fixed error is kept.
Browser-session cleanup cannot replace the primary failure.

Focused release/check tests passed 27 cases / 247 assertions, including failed
termination, inherited pipes, exit without close, cancellation, spawn/pipe errors,
late events, cleanup failure and a real successful process. Full `bun run check`
passed 384 tests / 9,043 assertions in 64 files, quality/boundaries, builds,
root/Svelte types, 146 documents / 742 links, packed SDK/classic/declarations and
298 installed CLI checks. Browser UI, other operating systems, hosted CI and actual
publication were skipped for this local operational change. OS refusal can still
leave an unconfirmed descendant alive; failure is reported instead of hidden.
Skills: bugfix, ops-change and test-hardening. Source contracts changed: release
operations and this record. No public SDK/JSON schema, DB/storage, dependency,
version, hygiene or CI/runner policy changes.

## KataGo Host Cancellation and Failure Ownership

The example host replaces its unbounded promise write chain with a FIFO limited
to 64 entries and 8 MiB of UTF-8 data including LF and in-flight work. Scoped
termination removes queued unsent queries, while an active query still receives
its termination and other callers retain FIFO order. Cancellation of 100 queries
behind a blocked writer now transmits two lines after resumption instead of the
previously reproduced 200. Entry/byte capacity is released on removal/completion;
closure settles remaining writers and idle waiters with fixed errors.

EOF, spawn/write/pipe errors and framing overflow enter one shared shutdown
promise. Failure closes admission, clears framing/writes, fails provider requests
and reuses graceful EOF plus the existing forced-stop/exit-confirmation deadline.
Explicit stop blocks new provider work synchronously; stream errors and other
stop callers cannot start duplicate shutdowns. If a necessary termination cannot
fit in the full queue, the host fails closed and shuts down the process. A fixed failure
log excludes engine details; explicit `stop()` still exposes failed confirmation.
Optional host spawn/deadline dependencies permit isolated failure tests without
global module mocks or public SDK changes.

Focused host/process and existing shutdown tests passed 18 cases / 155 assertions:
100 cancellations, another caller's FIFO progress, exact UTF-8/entry capacity,
termination admission failure, write errors, EOF/pipe/spawn failure, one shutdown
lease, immediate stop rejection and the original forced-stop failure boundaries.
Actual CPU KataGo smoke on Bun passed all 35 existing context/perspective and
cancel/stale/dispose/stop/spawn/model checks using the retained local engine/model.
The final host implementation also passed the same 35 actual engine checks on
Node. Local evidence is in `.tmp/live-katago-D0Xe7x` (Bun) and
`.tmp/live-katago-zo05hf` (Node); these ignored reports are execution evidence only.

The final runtime `bun run check` passed: 378 tests / 9,019 assertions across 63
files, lint/format/boundaries, SDK/adapter/CLI builds, root/Svelte types, 146
documents / 742 links, packed SDK/classic/declarations and 298 installed CLI
checks. The final documentation-only record update was checked with `format`
and `docs`. Browser checks, other operating systems, hosted CI and publication
were skipped because this increment changes the local host process bridge;
no arbitrary remote transport, engine build/model or GPU support is claimed.
Skills: bugfix, SDK, test-hardening and ops-change. Source contracts changed:
KataGo host README, SDK KataGo guide and this validation record. No published API,
DB/storage format, dependency/version, hygiene rule or CI/runner policy changes.

## Automation Execution Ownership and Flow

The automation coordinator delegates bounded search, comment batching, scoring
and legal-point scans to private command handlers and projects its final record
response separately. Its body decreased from 307 to 122 lines. Budgets are
readonly values replaced by the coordinator; local result/point buffers retain
linear push-based accumulation. A private policy groups only automation request
limits (256 operations, eight record tools, 8,192 scanned cells); diagnostic
retention and record-tool result limits remain separate policies. New modules are
classified as headless in the existing boundary manifest.

Focused automation/diagnostic tests passed 22 cases / 162 assertions. Added cases
cover full schema validation before editing, tool-limit precedence over stale or
missing targets, expected-SGF precedence, first-failure short circuit, checkpoint
exceptions without a stale operation index, privacy and disposal. An independent
local comparison against `d486ff7` matched the complete schema and responses plus
diagnostics for 59 fixtures, including commands, branches, checkpoint output and
budget boundaries. Temporary comparison modules were removed after the run.

Combined `bun run check` passed without retries: 365 tests / 8,871 assertions
across 62 files, lint/format/boundaries, SDK/adapter/CLI builds, root/Svelte types,
146 documents / 741 links, packed SDK/classic/declarations and 298 installed CLI
checks. The final documentation-only update was checked with `format` and `docs`.
Browser checks, other operating systems, hosted CI and publication were skipped:
this increment changes headless automation and does not establish new browser or
cross-platform coverage. No performance speedup is claimed from this refactoring.

Skills: bugfix, refactor and SDK. Source contracts changed: automation and this
validation record. No public API signature/JSON schema, DB/storage schema,
dependency/version, repository hygiene rule or CI/runner changes.

## Automation Comment Location Ownership

Comment preview/apply responses copy the portable target and its path before
returning. Response fields, mutability, validation order and errors are unchanged;
responses no longer expose aliases into caller request data. Focused tests cover
both preview/apply, mutation in both directions, unchanged input and frozen input
with independently mutable returned paths. Skills: bugfix and SDK. Source contracts
changed: automation and this validation record. No public signature, storage
schema, version/dependency, repository hygiene or CI/runner changes.

## CLI Temporary File Ownership

Combined `bun run check` passed without retries: 360 tests / 8,834 assertions
across 62 files, lint/format/boundaries, SDK/adapter/CLI builds, root/Svelte types,
146 documents / 741 links, packed SDK/classic/declarations and 298 installed CLI
checks. The prepared production example build and Chrome 155 `--playback-only`
and `--recovery-only` smoke checks passed on the final runtime code. Playback
covered six consumer lifecycles with real timers; recovery covered real IndexedDB,
reload/two tabs, capacity/quota, backups, approval guards and deletion. Other browser
engines, physical devices, hosted CI and publication were not run. Skills also
include Playwright. Only documentation evidence changed after these checks.

CLI output now exclusively opens a temporary file and records ownership before
writing, closes it before publication and only cleans up an owned path. A refused
creation no longer deletes a colliding existing file. Required save arguments,
fixed output errors, input-alias protection and exclusive/force publication remain.
Private optional filesystem/ID dependencies allow isolated failure injection.

Six focused tests / 28 assertions passed using fresh real temporary directories:
collision with and without force, partial write, close failure, exclusive-output
refusal, normal/forced publication, cleanup and input preservation. Failed write
and close cases still perform real file creation/write/close before injecting the
error. Skills: bugfix, test-hardening, ops-change. Source contracts changed:
automation and this validation record. No CLI flags/response schema, DB/storage
schema, dependency/version, CI jobs or runner policy changes.

## Deterministic Playback and Autosave Failure Isolation

Playback options add an optional asynchronous scheduler and AbortSignal without
changing required arguments or returned state. Initial subscription failures
remove the listener and rethrow; later observer failures cannot prevent scheduling
or remaining notifications. Abort pauses and prevents restart without disposing
the borrowed controller. Studio autosave accepts optional clock/ID/scheduler
dependencies; status-rendering failures cannot suppress debounce or relabel a
successful write. Its close-flush and serial revision/owner semantics remain.

Focused playback/autosave tests passed 13 cases / 99 assertions, including exact
499/500ms debounce, interval reset at 4999/5000ms, pre-abort and running abort,
observer exceptions, private-error exclusion, leaf termination, reentrant host
navigation, revision ownership and final close flush. Playback unit tests now use
an explicit scheduler instead of three real 600/650ms sleeps. Existing production
browser checks retain real timer integration. Skills: bugfix, SDK, test-hardening.
Source contracts changed: playback, recovery and this validation record. Storage
schemas, versions, dependencies, CI jobs and runner policy are unchanged.

## Measured Browser Review Results

The full Chrome 155 comparison completed on 2026-10-22 with two warmups/eight
samples per timing condition and three independent memory contexts per version.
All 6 memory lifecycles, 128 navigation samples and 48 restore samples passed
correctness checks. Source/harness/fixture provenance and complete raw samples
are in `output/playwright/review-browser-comparison.json`.

- After first-tab close and forced GC, median extra JS heap fell from 6.439 MiB
  to 0.179 MiB. The closed first controller/record stayed alive in all three old
  runs and were collected in all three fixed runs. Later-tab controls were
  collected in both versions. This is not natural-GC scheduling/total-process RAM.
- For the 5,000-move, 5,080,904-byte backup, clean-start restore through two browser
  frames fell from median 412.05 to 310.20 ms (24.7%). Guarded restore excluding
  approval wait fell from 452.25 to 355.75 ms (21.3%). Final SDK validation remains.
- Move-number large/end handler burst averages were essentially unchanged:
  11.820 to 11.743 ms/action. Early/collection changes overlap noise/control gains;
  single-click two-frame timing also changes in both directions. This run does
  not demonstrate improved user-visible move-number navigation latency.

The [complete comparison](docs/engineering/34-browser-review-comparison.md)
records inputs, all conditions, ranges, counter-results, method and limits.
Harness lint/types/format, actual pilot/full browser runs and docs checks passed.
The product's 351-test/full package suite was not repeated for measurement-only
scripts/docs. Product APIs, persistence schemas, dependencies/version and CI jobs
are unchanged; no push or release was performed. Skills: refactor, ops-change and
Playwright.

## Browser Review Comparison Runner

`bun scripts/review-browser-benchmark.ts` compares committed `6ecd86c` and
`165ce03` Studio/SDK source snapshots without changing main or creating Git
worktrees. Both use the same production Vite configuration, installed dependencies
and isolated SDK-source aliases. `--quick` runs a reduced pilot. The local runner
is deliberately not added to CI; device budgets remain UNDECIDED.

The pilot passed on Chrome 155: actual first/later-tab close with GC/WeakRefs,
eight move-number conditions (including numbers off), and three backup conditions.
It checks rendered numbers, selected move, baseline/dirty, comments, reset history,
no page errors and no external requests. Timing and GC diagnostics use separate
browser contexts; the memory-only weak close probe is absent from timing contexts.
Root/Svelte runtime code and public APIs are unchanged. Harness lint and root
types passed. Full repeat counts, source/fixture hashes and results are recorded
by the runner in `output/playwright/review-browser-comparison.json`; the pilot
uses a separate output. Skills: refactor, ops-change and Playwright.

## Review Fixes: Restore Handoff and Combined Verification

Studio's restore input boundary validates before approval and passes the owned
immutable checkpoint to the typed replacement callback. The approval handler no
longer discards/repeats that result. The SDK still independently validates its own
limits: two checkpoint validations per restore instead of three (four SGF parses
instead of six when working/baseline SGFs differ). No trusted public bypass or
checkpoint schema change was added. Focused restore-input/draft-session/checkpoint
tests passed 17 cases / 384 assertions, including one preparation parse, one final
SDK validation, input ownership, strict limits, dirty guards and Undo.

The combined `bun run check` passed: 351 tests / 8,769 assertions across 61 files;
lint/format/boundaries; SDK, adapter and CLI builds; root/Svelte types; 145 documents
/ 739 links; packed SDK/classic/declarations and 298 installed CLI checks.
The existing build artifacts were reused for `build:examples:prepared`. Chrome 155
focused `--recovery-only`, `--workspace-only` and `--framework-only` scenarios all
passed on the final source. Recovery coverage includes real IndexedDB/reload/two
tabs, cancel/export approval, malformed input, a valid JSON draft with invalid SGF
rejected before dirty approval, stale/late operations and revision-checked deletion.
Workspace coverage includes initial-tab close and independent histories. Framework
coverage includes variation updates, remount and controller replacement.

Full cross-browser smoke and browser heap/latency profiling were not rerun. The
reference-release diagnostic and indexing counts above/below do not claim browser
memory amounts or latency percentages. Public API, storage schema, dependencies,
versions and CI workflow/job topology are unchanged. A local `--framework-only` runner flag
was added for the existing framework scenario. Skills: bugfix, SDK, refactor and
Playwright. Source contracts changed: public API explanation, encoding compatibility,
recovery and product specification.

## Move-Number Selected-Path Projection

Board frames calculate numbers by walking the selected game/path instead of
building a temporary whole-collection node map. Per-frame lazy reuse remains;
no persistent index/cache was added. Focused board-record/replay/variation suites
passed 8 tests / 168 assertions, covering root/intermediate setup, annotations,
passes, MN overrides, branches, multiple games, pinned inspection, edit/Undo/Redo,
held frames and no reads of unrelated subtree children.
An old/new operation-count diagnostic over five fresh navigation states matched
number results: string-keyed index insertions fell from 1,505 to zero at 301 nodes
and from 25,005 to zero at 5,001 nodes. This verifies removed indexing work, not a
browser latency percentage. Skills: SDK and refactor. Public API is unchanged.

## Successful Legacy Byte-Probe Recovery

The bounded strict-decoder recovery also handles a syntactically successful byte
probe that mistakes Shift_JIS/GB18030 comment trail bytes for delimiters and root
CA declarations. Recovery still requires every real root to agree with the fatal
decoder and preserves configured limits. SGF/import/comment-validation suites
passed 29 tests / 606 assertions. New cases cover the two reported byte fixtures,
comment preservation, UTF-8 reopening, exact value limits, byte limits, actual
mixed collections and failed controller imports retaining snapshots/export tickets.
Existing fake-CA, malformed bytes and escape-trail cases remain covered. No API,
dependency or encoding-support expansion was introduced. Skills: bugfix and SDK.

## Framework Variation Option Forwarding

React, Vue and Svelte forward `Board.variationHints` and `Viewer.variationMode`
on mount and reactive updates. Vue's nested viewer-board watch also includes
`variationHints`. All three examples expose the focused-mode toggle. The existing
framework scenario now verifies hints and collapsed continuations after option
updates, remount and controller replacement, plus restored all-variation rows and
unchanged clean state. `bun scripts/browser-smoke.ts --framework-only` passed on
Chrome 155, retaining the prior lifecycle, editing/Undo and callback checks.
`build:examples`, root/Svelte type checks and focused lint passed. The new narrow
runner flag reuses the existing scenario and cleanup; full smoke still runs it.
Public options are unchanged; this fixes their adapter behavior. Skills: bugfix,
SDK and Playwright. Combined full local checks are recorded above.

## Closed Initial Studio Tab Ownership

The workspace facade now targets a state-free object with the SDK prototype,
rather than its initial tab controller. Captured methods, `instanceof` dispatch,
generation changes, independent histories and detached snapshots remain intact.
The focused workspace suite passed 5 tests / 36 assertions. An isolated Node GC
comparison against the prior implementation retained the old first controller
and record, while collecting the old second tab and both fixed closed tabs.
This confirms reference release in that diagnostic, not a browser heap-size or
latency measurement. No SDK disposal semantics or public API changed.
Skills: bugfix and SDK. Combined browser workspace checks are recorded above.

## Parser Subphase Profile and Plain Value Boundaries

A private instrumented parser copy separated value decoding, semantic validation,
normalized UTF-8 export, freezing and the remaining syntax/input work. It used a
4,032,050-character ASCII / 8,001-node record, two warmups and twelve samples.
Normalization includes its raw-value decoding so it is not counted twice.

| Instrumented phase median | Milliseconds |
| ------------------------- | ------------ |
| Value decoding            | 6.153        |
| Semantic validation       | 26.438       |
| Normalized UTF-8 export   | 11.877       |
| Freezing                  | 31.207       |
| Remaining syntax/input    | 82.668       |
| Total                     | 160.320      |

The requested three phases did not cover the dominant remaining work, so syntax/
input and freezing are reported separately. Per-value timers and copied code affect
JIT/GC behavior; these are diagnostic-copy timings, not production latency. Phase
medians are not additive. The largest remaining syntax/input category motivated
removing the per-character boundary loop for plain values. A combined global
backslash/closing-bracket search resets for every value; escaped or unterminated
values retain the existing scanner. Plain over-limit input reports the same first
excess UTF-16 offset. All existing decoding, semantic, normalized-export and
byte/node/depth/value/expanded-area checks still run.

A separate comparison with no internal timers alternated old/new parsers in one
process, two warmups and twelve measured parses each per fixture (8,001 nodes).
Local Bun 1.4.3 medians in the completed run were:

| Fixture      | ASCII bytes | Before ms | After ms |
| ------------ | ----------- | --------- | -------- |
| Long plain   | 4,032,020   | 151.137   | 90.695   |
| Short plain  | 40,020      | 63.673    | 62.225   |
| Escaped text | 3,232,020   | 340.065   | 317.285  |

Runtime/load variance was substantial; these local measurements do not establish
browser/device latency or a fixed improvement for every input. Private diagnostics
do not add production timers, exported API or retained global caches.

Focused SGF/comment-limit/checkpoint tests passed 33 cases / 865 assertions. New
checks cover boundary-search reset across values/games and exact Unicode UTF-16
limit offsets; existing escaped/truncated diagnostics and all limit guards remain.
An isolated differential check against the unchanged `fe92996` parser matched
complete results/diagnostics for 18,724 generated escape/delimiter/newline/Unicode/
value-limit combinations.

The complete local `bun run check` passed: 344 tests / 8,691 assertions across
59 files, lint/format/boundaries, SDK/adapter/CLI builds, root/Svelte types,
145 documents / 739 links, packed SDK/classic/declarations and 298 installed CLI
checks. No public API, storage schema, dependency/version, runner or repository
hygiene change was needed. Browser scenarios were not rerun for this parser
boundary-search change; browser/device performance remains unverified.
Skills: SDK and refactor.

## Large-Record Edit Phase Profile and Raw Value Slices

A local Bun 1.4.3 phase diagnostic used the same 4,032,020-character ASCII /
8,001-node record, fourteen changing root-label edits, two warmup cycles and twelve
timed edit/checkpoint cycles. Parser timing includes normalized export validation;
the separate serialization timing excludes serializer calls nested inside parsing,
so phases do not double count. Instrumentation is private diagnostic code, not a
new public profiling API or production timer.

| Median milliseconds | Before  | After  |
| ------------------- | ------- | ------ |
| Parsing             | 194.263 | 71.619 |
| Index rebuild       | 7.670   | 4.001  |
| Dirty comparison    | 0.409   | 0.364  |
| Outer serialization | 7.319   | 5.651  |
| Other work          | 1.876   | 1.725  |
| Whole workflow      | 211.271 | 85.133 |

Parsing was the dominant measured phase. The parser now scans exactly as before
but retains the raw input slice instead of concatenating one character at a time.
Value length is still checked after consuming the same code units/escape pairs;
all syntax, decoding, semantics, byte/node/depth/expanded-area limits, freezing and
normalized-export checks remain. No index or dirty-comparison implementation was
changed; their timing differences include ordinary runtime/GC variation. Per-phase
medians need not sum to the total median. These synchronous local measurements do
not establish browser/device latency or performance for all record/edit shapes.

Focused SGF/comment-limit/checkpoint tests passed 32 cases / 861 assertions. The
new regression checks long Unicode raw values, repeated values, escaped closing
delimiters/backslashes, exact limit boundaries and exact truncated/over-limit error
offsets. An isolated differential diagnostic compared the committed previous parser
with this parser for 18,724 generated combinations of escape/delimiter/newline/
Unicode text and value limits; all complete results and diagnostics matched.

The complete local `bun run check` passed: 343 tests / 8,687 assertions across
59 files, lint/format/boundaries, SDK/adapter/CLI builds, root/Svelte types,
145 documents / 739 links, packed SDK/classic/declarations and 298 installed CLI
checks. No public API, storage schema, dependency/version, runner or repository
hygiene change was needed. Browser scenarios were not rerun for this parser
allocation change; browser/device timing remains unverified. Skills: SDK and refactor.

## Reusing Fully Validated Edit SGF

Full edit validation previously serialized a candidate and discarded that text
after parsing it. Successful validation now places that exact string in the
existing two-entry serialization cache for checkpoint/export reuse. Parsing and
UTF-8 accounting remain before insertion; failed candidates cannot evict either
active checkpoint entry. Comment delta validation still serializes lazily because
its probes are not whole-record exports. Import/recovery/disposal clearing and
checkpoint schema/restore validation are unchanged.

Focused checkpoint/comment-limit/controller tests passed 32 cases / 819 assertions.
New regressions require one full candidate serialization per edit, a fresh full
parser call per marker edit, exact validated/export/checkpoint text equality across
Unicode/escaped labels and collections, unchanged dirty/state snapshots and no
cache eviction after expanded-point-limit refusals. Existing canonical-header,
UTF-8/value/node/depth, raw-escape, Undo/Redo and recovery checks remain.

A local Bun 1.4.3 before/after diagnostic used the same 4,032,020-character ASCII /
8,001-node record, fourteen changing label edits, two warmup cycles and twelve
timed edit/checkpoint cycles. Working-record serializations fell from 28 to 14.
Checkpoint median fell from 7.120ms to 0.0685ms (sample totals 92.634ms to 0.882ms).
Full edit-plus-checkpoint median was 202.530ms before and 189.692ms after; the
edit path remains the dominant cost. These synchronous local timings do not
establish browser/device latency, every edit path's cost or storage/exit durability.

The complete local `bun run check` passed: 342 tests / 8,677 assertions across
59 files, lint/format/boundaries, SDK/adapter/CLI builds, root/Svelte types,
145 documents / 739 links, packed SDK/classic/declarations and 298 installed CLI
checks. No public API, storage schema, dependency/version, runner or repository
hygiene change was needed. Browser scenarios were not rerun for this private
cache change; browser/device latency and abrupt-exit durability remain outside
this run's evidence. Skills: SDK and refactor.

## Large-Record Checkpoint Serialization

Checkpoint creation already reused serialized SGF without reparsing. The two-entry
cache previously evicted by insertion order, however, so repeated edit/checkpoint
cycles serialized the unchanged export baseline again on alternate edits. Reads
now refresh recency while retaining the same two-record/string bound. Import,
checkpoint replacement and disposal still clear the cache; schema and restore
validation are unchanged.

A new regression first failed with four baseline serializations instead of one.
After the fix, focused checkpoint/controller/import tests passed 25 cases / 421
assertions, including navigation reuse, acknowledged older export baselines,
Undo/Redo, import, checkpoint replacement, disposal and the oversized-envelope guard.

A local Bun 1.4.3 diagnostic used the same 4,032,020-character ASCII / 8,001-node
record before and after: initial checkpoint, two edit/checkpoint warmups and twelve
timed checkpoints, excluding edit time. Baseline serializations across initialization
and all fourteen edits fell from eight to one. Checkpoint median was 10.726ms before
and 7.156ms after; the twelve samples totaled 132.240ms and 88.726ms respectively.
These synchronous local measurements do not establish browser/device end-to-end
latency or storage/exit durability.

The complete local `bun run check` passed: 340 tests / 8,626 assertions across
59 files, lint/format/boundaries, SDK/adapter/CLI builds, root/Svelte types,
145 documents / 739 links, packed SDK/classic/declarations and 298 installed CLI
checks. No public API, storage schema, dependency/version, runner or repository
hygiene change was needed. Browser scenarios were not rerun for this private
serialization-cache change; browser/device latency and abrupt-exit durability remain
outside this run's evidence. Skills: SDK and refactor.

## Autosave Completion Handoff

Two deterministic regressions reproduced a queued checkpoint being stranded between
the write loop's completion and its promise cleanup: saving new work while closing,
and explicitly retrying a quota failure. The drain now continues queued checkpoints
and keeps existing flush/close promises pending until those writes finish. Revisions,
separate session owners, serial writes and explicit-only retries are unchanged.

Focused draft session/storage tests passed 8 cases / 58 assertions. The regressions
hold the second write open to verify completion waiters, checkpoint contents and
the correct successful/failed predecessor revision. The complete local `bun run check`
also passed: 339 tests / 8,583 assertions across 59 files, lint/format/boundaries,
SDK/adapter/CLI builds, root/Svelte types, 145 documents / 739 links, installed
SDK/classic/declarations and 298 installed CLI checks. No version, dependency,
public API, storage schema, runner or repository hygiene change was needed.
Browser tests were not rerun for this promise-queue-only change; actual IndexedDB
and abrupt process-exit durability are not established by the storage doubles.

## SGF Expanded Point Budget

Compressed point lists now validate with row bitsets, retaining duplicate/setup
conflict detection across both 32-bit words of a 52-line board. The optional
`maxExpandedPoints` limit defaults to 1,000,000 points, shared across all nodes,
properties and games; permitted empty lists cost zero. Text/byte imports and
controller full validation use the same guard. C-only validation retains its
existing proof because comments do not change point-list area.

Focused SGF/controller/comment-limit tests passed 37 cases, and strict typecheck
passed. Tests cover exact budget boundaries, collections, compressed overlap,
setup conflicts and default refusal. A local Bun 1.4.3 diagnostic compared the
previous parser with this parser on the same accepted 200-node 52-line compressed
marker record: one warmup/five samples, median 267.953ms versus 8.702ms. This is
synchronous local parsing evidence, not a browser/device latency guarantee.
Complete repository/browser/consumer validation passed in the combined run below.

## Analysis Session Replay Proofs

Session-local SDK-controller proofs avoid replay for comment/export-only state
notifications, and extend already verified paths by one recorded/legal transition.
Cold/public extraction still validates the full history. Proofs retain at most 128
entries and 100,000 combined path/move steps and clear on record/game/generation/
settings changes. Setup resets legal epochs; disposal drops the reader and cache.

Focused analysis/KataGo/rules tests passed 32 cases / 406 assertions, and strict
typecheck passed. A 100-move session regression observes zero recorded replay calls
for comment/export updates, then two for each next step (controller plus context),
and compares the resulting context with independent full extraction. Additional
checks compare setup/MN, markers, Undo/Redo, illegal archived history, recovery by
setup and imports against full extraction. Existing cancellation/reentrancy/late
result checks remain. The combined production browser and actual local engine
checks below also passed.

## Prepared Studio Imports

Studio now prepares an immutable controller-owned import before host approval
and applies that exact parsed record without decoding the original input again.
The public prepare/apply methods retain fixed custom limits, locator validation,
dirty guards, generation/owner identity and atomic replacement semantics. Unused
previews are weakly retained; imports/checkpoint replacement invalidate older ones.

Focused import/controller/checkpoint tests passed 24 cases / 378 assertions; SDK
build and strict root typecheck passed. New regressions check one byte-decoder
invocation, exact parsed-record identity after application, independently owned
input bytes, dirty/foreign/forged/reused/superseded refusal, locator and custom
point/node limits, checkpoint invalidation and disposed access. Existing tests
retain baseline, Undo and export-ticket behavior. The combined production browser
run passed actual import/edit/export/reopen and Export/Discard/Cancel guards.

## Bounded Local Engine Shutdown

The example host retains graceful EOF after queued writes and a five-second
grace deadline, then sends SIGKILL, destroys inherited output pipes and bounds exit
confirmation to one additional second. Missing confirmation and kill failure
reject with a fixed diagnostic and release the child reference; stop remains
idempotent in the host. A late write completion cannot reopen a completed stop.

Five focused shutdown tests passed, covering normal exit, queued-write EOF,
blocked writes, forced exit, inherited pipe cleanup, missing confirmation and
redacted kill failure. Strict root typecheck passed. The tests use short internal
helper deadlines and deterministic process doubles. The actual retained local
KataGo binary/model passed all 35 Node 24 host integration cases: three reporting
perspectives, contexts, cancellation/stale/dispose/host stop and process failures.
No new model/binary download or external provider was used. Unix signal-resistant
process behavior is covered by the helper doubles, not claimed as a real Unix run.

## Single-Build CI and Combined Improvement Validation

The complete code plan now builds SDK/adapter/CLI artifacts once in `check`, then
reuses them for installed adapters, production examples/browser and the standalone
installed starter. Ordinary standalone commands still rebuild prerequisites. The
CI regression expands command composition, counts exactly one SDK build and
retains every installed/browser/security gate. No cross-job artifact cache, fewer
scenarios, retries or higher workflow timeout were introduced.

The actual local complete plan passed without retries:
`bun run ci:run --base 0000000000000000000000000000000000000000 --head HEAD`.
Its log contains one SDK build pipeline, 337 tests / 8,567 assertions across 59
files, root/Svelte types, lint/format/boundaries, docs (145 documents / 739 links),
packed SDK/classic/declarations, 298 installed CLI checks, React/Vue/Svelte installed
types/SSR consumers, complete Chrome 155 production browser scenarios and the
independently installed starter production browser workflow. File/permission
signals passed and the live dependency audit reported no vulnerabilities among
174 packages. No dependency declaration/lockfile change was needed.

The separate retained KataGo/Node host run passed all 35 real integration cases.
This validates the local Windows tools/artifacts and selected engine/model only;
hosted Linux CI, other browsers/physical devices and a real Unix signal-resistant
process were not executed. No hosted CI, publication, push or deployment occurred.
Source-of-truth changes are the product spec, SDK/API/compatibility/analysis docs,
example engine lifecycle docs, CI operations doc and this validation record.
Public additions are the optional expanded-area limit and controller import
preparation types/methods. DB/storage schemas, dependencies, selected release
version and repository hygiene rules are unchanged. Skills: SDK, bugfix, refactor,
ops-change and Playwright. The package-specific release contract retains explicit
version selection without automatic bumps.

## Validation Source of Truth

This document owns stable validation names for this scaffold.

Feature evidence sections retain earlier scoped implementation results and counts.
Their prior command availability or remaining-work notes are historical; current
commands and coverage limits belong to Runner Policy and the active readiness review.
In particular, migration-check is now configured as documented below.

## Source Failure Diagnostic Preparation Budget Evidence

The three recovery-failure diagnostics prepared a fresh real backup inside the
same default five-second body as the failure execution and preservation checks.
A local Windows Bun 1.4.3 profile measured clone/object/checkout preparation at
990.02/1048.17/1035.50ms, operation execution at 313.93/541.89/980.40ms and assertions
at 116.02/98.69/90.78ms. The backup-failure case required no prepared backup;
its operation/assertions measured 616.78/92.47ms. All four passed 23 assertions
in 9.71s. Earlier complete runs reported checkout-failure totals near the default
budget; no external OS/process-startup cause is claimed as captured.

Each table row now registers its own scope and `beforeEach`. Recovery rows create
a fresh backup and retain reviewed request/original bytes there; the backup row
still prepares no backup. Fixture, preparation and diagnostic retain their separate
default five-second deadlines. The same three successful backups and four fresh
repositories remain, with no added Git calls, shared backup, `beforeAll`, caching,
retry, concurrency or increased timeout. Aggregate work is unchanged; this isolates
preparation cost rather than promising faster Git execution.

All four tuples, the entire actual-Git/failure/assertion body and unrelated tests
are byte-identical to the previous revision. The intercept still executes the real
command before injecting failed status/stdout/stderr/error; real preceding recovery
work is retained. Fixed code/stage/reason, raw-message/path/cause exclusion, source
cleanliness and original bundle preservation checks remain. Spies are installed
after preparation and restored in `finally`; no production test hook is introduced.

Ignored original/new diagnostic copies inserted the same 3300ms delay before
recovery backup preparation. The original checkout-failure case exceeded its body
deadline (5883.19ms reported, five assertions completed, a pending child killed).
The scoped version passed all six assertions (7396.36ms reported). Totals include
hooks; each individual deadline is unchanged. No delay or timing assertion is
committed. This controlled budget test does not identify a historical external
stall; any individual hook or operation can still exceed its deadline.

Strict root typecheck passed. The normal focused file passed the same 24 tests /
142 assertions in 40.52s. All four diagnostic cases retain their 23 assertions.

The full `bun run check` passed without retries: unchanged 324 tests / 8,465
assertions across 57 files (52.20s tests), lint/format/boundaries, SDK/adapter builds,
root/Svelte types, docs (145 documents / 739 links), packed SDK/classic/declarations
and installed CLI 298 checks. No test/source changed after that pass; only final
documentation evidence received format/docs/whitespace checks afterward.

Only `scripts/source-backup.test.ts` and this validation source of truth change.
Applied skills: `test-hardening` and `ops-change`. Production backup/recovery guards,
command counts, process limits and isolation remain unchanged, as does the contract
in `docs/ops/maintainer-recovery.md`. No API, DB/storage schema, dependency/version,
repository hygiene or CI/runner policy changes. Browser/device/provider/account
and remote publication checks are outside this test-only change.

## Source Backup Refusal Test Budget Evidence

One refusal test accumulated two successful backups, three input rejections,
a corrupt-bundle rejection/preservation check, a dirty-source rejection/content
check and invalid-workspace rejection under one default five-second body. A local
Bun 1.4.3 Windows profile measured backups at 805.84/787.07ms, reviewed-input checks
at 4.94ms, corruption checks at 3.45ms, dirty-source work at 105.44ms and workspace
work at 1.32ms (2431.05ms reported including fixture setup). Earlier runs reported
3192.52 and 4759.84ms; no external OS/startup stall is claimed as captured.

Three scoped tests now cover reviewed-input/workspace precedence, corrupt-bundle
preservation and dirty-source preservation. All eight original assertions retain
their tokens and string contents, ignoring whitespace and optional trailing commas.
Workspace refusal still sees the extra input file and dirty README, preserving its
precedence over invalid reviewed input. Other tests are byte-identical. The same
two successful backups and one refused backup attempt remain: body Git-call counts
change from 15 together to 7/7/1. Metadata-only checks stay grouped to avoid extra
backups. Each case gets a fresh repository from the existing `beforeEach`; this
adds two repository fixtures (12 fixture Git calls), trading some aggregate setup
cost for independent deadlines and isolation. It does not claim faster Git or
lower total runtime. No shared fixture, retry, concurrency or timeout increase.

Ignored original/new diagnostic copies inserted identical 2000ms delays before
each backup attempt. The original exceeded five seconds during its second backup,
killed its pending Git child and emitted follow-on `check` at `backup-source`
(5801.14ms reported). All three split cases passed the same delays and all eight
assertions (3556.47/3594.11/2978.59ms reported). Reported times include hooks. No delay
or timing threshold is committed. This proves resilience to cumulative work,
not the source of an actual external stall; any individual case can still time out.

Strict root typecheck passed. The normal focused file passed 24 tests / 142
assertions in 40.06s (previously 22 tests / 142 assertions); the three refusal cases
reported 1454.53/1601.57/826.86ms. These local samples are not a cross-machine
latency guarantee or a controlled aggregate-runtime comparison.

The full `bun run check` passed without retries: 324 tests / unchanged 8,465
assertions across 57 files (69.79s tests), lint/format/boundaries, SDK/adapter builds,
root/Svelte types, docs (145 documents / 739 links), packed SDK/classic/declarations
and installed CLI 298 checks. No test/source changed after that pass; final
documentation evidence received format/docs/whitespace checks.

Changed files are `scripts/source-backup.test.ts` and this validation source of
truth, using `test-hardening` and `ops-change`. Production backup/recovery validation,
seven/eight success-call budgets and isolation remain unchanged. No API, DB/storage
schema, dependency/version, repository hygiene or CI/runner policy changes.
The contract in `docs/ops/maintainer-recovery.md` remains in force; browser/device,
provider/account and remote publication checks are outside this test-only change.

## Source Recovery Success Test Budget Evidence

The fixture already had a separate default deadline, but the success test still
charged two remote/config Git calls, seven backup calls, eight recovery calls and
final preservation assertions to one default five-second body. A local Windows
Bun 1.4.3 profile measured remote/config preparation at 335.30ms, backup at
1207.10ms, input preparation at 0.54ms, actual recovery at 2090.59ms and assertions
at 170.15ms. The complete reported test took 5003.99ms, including its fixture hook.
Previous uninstrumented runs both exceeded the body deadline and passed; no exact
external OS/process-startup cause for that intermittent variation is established.

The success case now has a nested scoped `beforeEach` that configures its fresh
source and creates the reviewed backup before the actual recovery test starts.
The outer repository fixture, inner backup preparation and test body retain their
separate default five-second deadlines. Preparation remains real, local and fresh;
there is no `beforeAll`, shared backup across tests, retry, concurrency, increased
timeout or mocked successful recovery. Other tests' preparation is unchanged.

Every recovery statement and all 17 original assertions are retained verbatim
apart from indentation. The test still observes exactly eight actual Git calls,
full strict object checking, bundle verification, refs/tree/content restoration,
clean source/checkout, original config/bundle bytes, environment/config/hooks and
file-only isolation, output/deadline bounds, and all six receipt completion stages.
Spies still start after backup preparation and restore in `finally`. All other
backup mutation, recovery rejection, diagnostic and argument cases remain intact.
Production operations, their seven/eight command budgets and validation are unchanged.

Ignored diagnostic copies inserted identical preparation delays before remote
configuration. At 2500ms the original passed; at 3300ms it exceeded the body budget,
killed a pending Git child and emitted a follow-on `check` at `recovery-identity`
(5767.13ms reported). With the same 3300ms delay, the scoped-hook version passed
all 17 assertions (6500.25ms reported). Reported total elapsed time includes hooks;
passing above five seconds does not increase any individual deadline. This
controlled reproduction demonstrates budget coupling, not the external source
of the historical stall or faster Git execution. No delay or timing assertion
is committed. An initial diagnostic path needed explicit `./.tmp/` for Bun to
select the ignored copy; it did not run a test until corrected.

The normal focused file passed all 22 tests / 142 assertions in 39.54s; the
success case reported 3274.99ms. Strict root typecheck passed after matching the
prepared filesystem buffers to their non-shared `Buffer<ArrayBuffer>` type.

The complete `bun run check` passed without retries: unchanged 322 tests / 8,465
assertions across 57 files (58.63s for tests), lint/format/boundaries, SDK/adapter
builds, root/Svelte types, docs (145 documents / 739 links), packed SDK/classic/
declarations and installed CLI 298 checks. The target source/test changes were
final before that pass. Only documentation evidence was updated afterward and
received final format/docs/whitespace checks. A source comparison also confirmed
all tests outside this scoped success case were byte-identical to the previous
revision. The adjacent combined rejection case has previously approached the
same budget; it remains a separate assessment rather than expanding this change.

Changed files are `scripts/source-backup.test.ts` and this validation source of
truth. Applied skills are `test-hardening` and `ops-change`. No public/private
API, DB/storage schema, production code, dependency/version, repository hygiene or
CI/runner policy change is introduced. The operational recovery contract in
`docs/ops/maintainer-recovery.md` remains unchanged. Browser/device/provider-account
and remote publication checks are outside this test-only change. A single recovery
operation or hook can still time out under a sufficiently long external stall.

## Source Git Failure Reason Evidence

Source operation failures previously identified the active phase but reported all
Git launch errors, timeouts and nonzero exits as `check`. The private release CLI
now optionally adds a fixed `reason` alongside that unchanged code and stage.
`ENOENT` maps to `unavailable`, `ETIMEDOUT` to `timeout`, positive exit status without
a spawn error to `exit`, and other errors/signals/missing status to `failed`.
Error classification uses only exact allowlisted codes and process status; no raw
message, path, arguments, stdout/stderr, signal name or exit number is retained.
Unknown errno text is never reflected. Non-Git errors omit `reason`.

A local Bun subprocess probe observed `ENOENT` with missing Git in PATH,
`ETIMEDOUT` with a bounded authored child process, and status 3 without a spawn
error for an explicit child exit. These are observed categories, not guaranteed
root causes; `ENOENT` can also indicate a missing working directory.
Six focused result cases cover these categories, output-buffer failure, an unknown
private errno and signal termination. Each asserts exact safe error fields, no
cause, unchanged source and no backup publication. Existing real-Git recovery
failure/preservation tests remain. An actual private release CLI subprocess checks
unavailable Git JSON, empty stderr and absence of supplied paths; missing-input and
argument errors still omit the reason. No 60-second timeout is added to tests.

Success validation and isolation are unchanged: seven backup and eight recovery
Git calls, independent final source/input checks, strict object/bundle/ref/tree and
clean-checkout validation, file-only protocols, isolated config/hooks, disabled
lazy fetch/replacements, shell avoidance, 60-second deadline and 8MiB output bound.
SDK/public CLI, DB/storage schema, dependencies, versions, hygiene and CI/runner
policy are unchanged. Source-of-truth documents are this file and the maintainer
recovery guide. Browser/device/provider and remote publication checks are outside
this local private-process diagnostic change.

Validation: `bun run typecheck` passed after narrowing the runtime error's
optional `code` field. The first focused run passed 21 cases but the existing
combined backup/recovery success case exceeded its unchanged five-second budget
(6010ms; the runner killed its pending child). Its isolated rerun passed in 3346ms.
The final complete `bun run check` passed without retries: 322 tests / 8,465
assertions across 57 files, installed CLI 298 checks, lint/format/boundaries,
SDK/adapter builds, root/Svelte types, docs (145 documents / 739 links) and packed
SDK/classic/declarations. Existing test deadlines and CI policy were not changed;
the intermittent success-test budget remains a follow-up. Both operation bodies
before their catch clauses were byte-identical to the previous revision, confirming
that success work and validation statements were retained. No source changed after
that full pass; final documentation evidence received format/docs/whitespace checks.

## Source Backup and Recovery Failure Diagnostics

All source Git subprocess failures previously became the same `check` error;
private release CLI JSON contained no operation phase. A source-operation error
now extends the existing release error with a fixed stage label. Workspace,
setup, initial/final source checks, bundle/manifest work and each recovery phase
are labeled as documented in
[maintainer recovery](docs/ops/maintainer-recovery.md#privacy-safe-failure-stages).
The private `banora.release-command/v1` error object adds optional `stage` only
for failures caught after source operations start. Existing error codes, exit
status 1 and stage-free argument rejection remain; unknown runtime/filesystem
exceptions still map to `io`. SDK and installed public CLI APIs are unchanged.

Stage values are implementation literals, never interpolated input. Wrappers
discard underlying exceptions rather than retaining messages, causes, paths,
command arguments or Git stdout/stderr. The CLI serializes code and stage, plus
the optional fixed Git reason documented above.
No partial-success claim or new failure receipt/log is introduced; abrupt process
termination cannot guarantee a JSON response. Success manifests/receipts and all
validation, byte-preservation, Git-call budgets and isolation settings are unchanged.
A lexical comparison of both operation bodies retained the original operation
tokens and string contents, excluding stage assignments, catch wrappers, whitespace
and optional trailing commas introduced by formatting.

Four regressions run real fixture Git work and inject failed results carrying an
authored private detail in stdout, stderr and an underlying error with a path.
Bundle, clone, object-check and checkout failures retain `check`, expose the correct
fixed stage, omit raw details/causes and preserve the clean source and original
bundle. Existing shallow, final-source-race and changed-checkout cases additionally
assert their distinct stages. Actual release CLI subprocesses with Git unavailable
or a missing reviewed input return exact safe JSON, exit 1 and empty stderr, with
no supplied path reflected. Invalid-argument JSON remains exactly stage-free.
Focused coverage passed 16 tests / 106 assertions, previously 11 / 73.
The full `bun run check` passed on its first attempt: 316 tests / 8,429 assertions,
installed CLI 298 checks, lint/format/boundaries, SDK/adapter builds, root/Svelte
types, docs and packed SDK/classic/declarations. Final documentation-only evidence
updates were checked separately with formatting, documentation and whitespace checks.

Changed source-of-truth documents are this validation contract and
`docs/ops/maintainer-recovery.md`; implementation changes are confined to private
source operations and release-command serialization plus their tests. No SDK/storage
schema, dependency, repository hygiene or runner/CI policy changes are introduced.
Browser/device, provider/account and remote publication checks are outside this
local diagnostic change. No actual credentials or private provider data are used.

## Source Recovery Checkout Query Evidence

A real-Git stage profile found nine recovery commands, with separate checkout
`rev-parse HEAD` and `status --porcelain` calls taking 253.85 and 204.43ms in one
1878.01ms recovery. The checkout check now uses one
[`status --porcelain=v2 --branch`](https://git-scm.com/docs/git-status#_porcelain_format_version_2)
observation. Exactly one `branch.oid` header must match the independently reviewed
commit, and any non-header line rejects the checkout as dirty. Other headers are
ignored as specified by Git; LF and CRLF are accepted. This preserves current
checkout identity and staged/worktree/untracked-change checks without deriving
checkout state from earlier mirror metadata. Recovery now uses eight Git commands.

Strict full object checking, bundle verification, exact mirror refs/tree, detached
checkout creation, tracked-file counting and final original-byte/schema verification
remain separate and unchanged. Config/hook isolation, file-only protocols, disabled
lazy-fetch/replacements, bounded output, subprocess deadlines and shell avoidance
are unchanged. No cache, retry, parallel Git work or test injection API is added.

Four alternating before/after pairs recovered the same authored two-commit/tag
bundle using real Git 2.55.0.windows.5 and Bun 1.4.3. Complete recovery medians were
1388.94 -> 1242.15ms (about 11% lower); raw before samples were
[1196.82, 1731.02, 1456.00, 1321.88] and after
[1246.79, 1341.07, 1237.51, 1168.89]ms. Checkout-query medians were
229.49 -> 110.19ms. All eight receipts agreed on source/tree, refs, bundle identity,
manifest hash, tracked count and all six completed stages; recovered README bytes
and original bundle bytes also matched. One complete pair was slower after the
change. These instrumented local fixture samples exclude runner startup and do
not establish large-history, other-OS or CI timing guarantees. No timing threshold
or instrumentation is committed.

Regressions mutate the actual recovered checkout immediately after real worktree
creation: tracked content, an untracked file, or a different commit with the same
tree. Every case rejects with `integrity`, preserves the change and original bundle,
and writes no success receipt. The existing successful restore additionally observes
eight actual commands, strict object/bundle checks and all calls' environment,
protocol, shell, time and output bounds. Spies are restored in `finally`; original
restore/config/content/corruption/argument checks remain. Focused coverage passed
11 tests / 73 assertions, previously 8 / 53.
The full `bun run check` passed on its first attempt: 311 tests / 8,396 assertions,
installed CLI 298 checks, lint/format/boundaries, SDK/adapter builds, root/Svelte
types, docs (145 documents / 738 links) and packed SDK/classic/declarations.

Changed files are the private recovery implementation, its tests and this validation
source of truth. The operational contract in `docs/ops/maintainer-recovery.md`
remains in force. Public API/CLI/schema, DB, dependencies, repository hygiene and
runner/CI policy are unchanged. Browser/device/provider-account and off-device
recovery checks are outside this local Git optimization.

## Source Backup Metadata Query Evidence

The initial source observation formerly launched three separate Git processes for
shallow status, HEAD and its tree. It now uses one `rev-parse` call for those three
values, rejects any unexpected field count, shallow result or invalid 40/64-digit
object IDs, and preserves the initial dirty-worktree and exact ref checks.
Successful capture launches seven Git processes instead of nine. The final dirty
worktree, HEAD and exact refs observations remain separate fresh commands after
bundle creation; no initial result is cached across that boundary. Bundle hashing,
exclusive manifest creation, isolated config/hooks, file-only protocols, process
bounds and all recovery checks are unchanged.

Four alternating before/after pairs on the same authored two-commit/tag repository
used real Git with Bun 1.4.3 on Windows. Instrumented complete-backup medians were
1268.62 -> 902.55ms (about 29% lower); raw before samples were
[1375.72, 1372.41, 1064.97, 1164.83] and after
[1001.39, 970.36, 785.88, 834.75]ms. Combined revision-query medians, including the
unchanged final HEAD query, were 507.84 -> 230.10ms. All eight captures retained
identical source/tree, refs and bundle byte hashes. These local fixture samples
exclude runner startup and do not establish large-history or CI latency guarantees;
no timing threshold, benchmark instrumentation or retry is committed.

Regressions observe actual Git calls and independently resolve the expected source,
verify shallow rejection before output creation, and mutate each of worktree, HEAD
and refs immediately after successful real bundle creation. A same-tree commit
isolates the HEAD check from dirty-worktree rejection. Every mutation is rejected
without reverting the concurrent change or writing a success manifest. Spies are
restored in `finally`; production code receives no test callback or injection API.
The original restore and corruption/argument tests remain intact. Focused coverage
is now 8 tests / 53 assertions, previously 3 / 34.
The full `bun run check` passed on its first attempt: 308 tests / 8,376 assertions,
installed CLI 298 checks, lint/format/boundaries, SDK/adapter builds, root/Svelte
types, docs (145 documents / 738 links) and packed SDK/classic/declarations.

Only the private operations implementation, its tests and this validation source
of truth change. Public API/CLI/schema, database, dependencies, repository hygiene
and runner/CI policy are unchanged. The operational recovery contract in
`docs/ops/maintainer-recovery.md` remains in force. Browser/device/provider-account
and off-device durability checks are outside this local Git optimization.

## Git Source Recovery Test Budget Evidence

The real-Git backup/recovery test previously charged six fixture Git processes,
remote/config setup, nine backup commands, nine recovery commands and final
assertions against one default 5-second deadline. A local instrumented Windows
Bun 1.4.3 sample measured fixture preparation at 795.84ms, backup at 972.26ms and
recovery at 1275.62ms (3343.54ms for the complete test). Individual Git commands
in that successful restore took about 90-299ms. The original intermittent OS or
process-startup stall was not captured; no specific external cause is asserted.

The two real-Git tests now prepare fresh authored repositories in a scoped
`beforeEach`. Setup and each test retain their separate default 5-second deadlines;
no repository is shared between tests, and the argument/CLI test remains outside
the hook. All original 3 tests / 34 assertions remain. Production backup/recovery,
strict object/bundle checks, exact refs/tree/history, clean checkout, remote/config
isolation, original-byte preservation and every rejection case are unchanged.
This isolates the preparation budget; it does not claim faster Git execution.

Ignored diagnostic copies added only a 2500ms preparation delay. The original
restore test timed out at 5002.87ms, killed a dangling Git process and emitted a
follow-on `Release: check` rejection at the recovery worktree command, matching
the previously observed failure shape. With identical delay, the scoped-hook
version passed all 12 restore assertions (6156.70ms including preparation). This
reproduces cumulative deadline exhaustion without proving the historical external
stall. No delay, retry, concurrent execution or timeout increase is committed.
The normal focused file passed all 3 tests / 34 assertions in 6.05s.
The full `bun run check` passed 303 tests / 8,357 assertions, installed CLI 298
checks, lint/format/boundaries, SDK/adapter builds, root/Svelte types, docs (145
documents / 738 links) and packed SDK/classic/declarations. No retry was needed.

Only `scripts/source-backup.test.ts` and this validation source of truth change.
Public API, database/schema, production Git commands, dependencies, repository
hygiene and runner/CI policy remain unchanged. Browser/device and provider/account
recovery checks are outside this test-only change; all Git fixtures are authored,
local and isolated, with no actual remote access.

## Channel Plan Test Budget Evidence

The previously timed-out rejection test put 12 independent filesystem fixtures and
plan validations under one default 5-second test deadline. That loop performs no
provider subprocesses or cleanup: registry reads are injected callbacks and fixture
directories are retained under ignored `.tmp`. Stage profiling identified repeated
fixture preflight, in addition to the actual plan's validation. The exact external
stall during the historical timeout was not captured and remains unproven.

Each rejection is now a separately named, sequential test with a fresh bundle and
the unchanged default timeout. Fixture registry SHA512 values are calculated from
actual authored archive bytes, independently of the function under test, instead
of calling `publishRelease` merely to obtain expected metadata. Production planning
is unchanged: two complete registry observations and final local-byte verification
remain required. Every former rejection case remains, with added exact diagnostic
and read-count assertions so fixture failures cannot masquerade as registry checks.

Four alternating local before/after profiles of all 12 cases measured aggregate
fixture medians of 563.67 -> 314.68ms (about 44% lower); fixture plus rejection work
medians were 829.39 -> 571.17ms (about 31% lower). Raw combined samples were
before [1026.11, 652.94, 843.09, 815.69] and after [588.48, 538.08, 642.77, 553.85]ms.
These instrumented Bun 1.4.3 Windows samples exclude runner startup and are not
production registry/network latency or a CI timing guarantee.

A separate ignored diagnostic copy injected 450ms preparation delay per fixture:
the original aggregate timed out at 5001ms, whereas all 12 separated cases passed
with the same delay and default limits (6.09s total, 36 assertions). This reproduces
the cumulative-budget problem without asserting an OS/provider cause. No artificial
delay, timing threshold, retry loop or timeout increase was committed. The normal
focused file passed 17 tests / 163 assertions; former coverage was 6 / 151.

The final full `bun run check` passed 303 tests / 8,357 assertions, installed CLI
298 checks, lint/format/boundaries, SDK/adapter builds, root/Svelte types, docs and
packed SDK/classic/declarations. Its first run passed all channel-plan cases but
hit a separate default-timeout failure in the unchanged real-Git source-backup
recovery test, including a killed child and follow-on rejection. That file passed
in isolation (3 tests / 34 assertions), and the full retry passed. Its timing cause
is a separate follow-up; no backup test or global timeout was modified. Final
formatting, docs (145 documents / 738 links) and whitespace checks passed.

Only the test and this validation contract change; public API, database/schema,
production release logic, dependencies, repository hygiene and runner/CI policy are
unchanged. Browser/device and remote publication checks are outside this local test
change; no npm reads/writes or CI dispatch are used by these authored fixtures.

## Draft Refresh Confirmation Evidence

The production recovery fixture reproduced a selected-entry/confirmation mismatch:
while a refresh waited behind another IndexedDB writer, the user armed deletion
again for A. That writer removed A; the refreshed list then selected B but kept the
confirmation pinned to A. The original build failed with B selected and "Confirm
delete" still displayed. A later click could report deletion of already-missing A
while leaving the visibly selected B intact.

Recovery now resets the pending deletion and its prompt when selection changes,
when refresh starts and when the latest accepted listing is applied. Controls update
immediately at refresh start. A newly selected entry/revision requires confirmation
again; actions need not wait for a new loading mode. Existing latest-list sequencing,
revision checks and atomic metadata/payload removal are retained.

The isolated Chrome 155 regression writes A/B to real IndexedDB, holds a bounded
write transaction that removes A, starts refresh, arms confirmation during the wait
and releases storage. The corrected build clears the confirmation/prompt, preserves
B after the first click, and removes B only after its new confirmation. It also
checks immediate prompt/button reset on refresh start and explicit selection change.
The full focused recovery scenario passed its earlier lifecycle, backup cancellation,
quota/cap, revision conflict, file downloads, locale/mobile and restore checks.

The initial `bun run check` hit a 5-second timeout in the unrelated mixed-channel
release-plan test (291 passed). Its unchanged file then passed in isolation (6 tests /
151 assertions), and the full check retry passed 292 tests / 8,345 assertions,
installed CLI 298 checks, quality/boundary gates, builds/types, packed consumers and
docs. No timeout setting or release code was changed; the transient cause remains
unproven. `bun run build:examples`, focused production Chrome recovery smoke, final
docs (145 documents / 738 links), formatting and whitespace checks passed. Other
browser scenarios/engines, physical devices and hosted CI were skipped for this
bounded Studio-only fix. No public API, DB/schema, dependency, repository hygiene
or runner policy changed; no cross-browser or abrupt-exit durability claim is made.

## Pending Draft Deletion Cancellation Evidence

A production-browser regression reproduced a confirmed current-draft deletion
continuing after Local drafts closed: an in-flight autosave failed with quota,
leaving the stored revision unchanged, and the waiting operation then removed the
previously saved checkpoint. Recovery now checks its operation sequence/disposal
again after awaiting autosave and before submitting removal. Turning autosave off
is retained; users explicitly re-enable it. Closing does not roll back an already-
submitted storage transaction.

The isolated Chrome 155 fixture holds a real IndexedDB read/write transaction with
bounded keepalive requests, queues autosave, injects a quota failure on payload put,
confirms deletion and closes recovery before releasing storage. The original code
failed because the saved entry/payload disappeared. The corrected build retained
both exact saved SGF and current dirty edits, kept a reopened dialog's feedback
clear, and still completed a subsequent active confirmed deletion. The same fixture
also queues stored-draft restoration before closing recovery and changing the
working state; its late result cannot replace the newer edits. Context teardown
owns fixture cleanup; no existing browser profile or remote storage is touched.

`bun run check` passed 292 tests / 8,345 assertions, installed CLI 298 checks,
quality/boundary gates, SDK/adapter builds, root/Svelte types and packed SDK/classic
consumers. `bun run build:examples` and the focused production recovery smoke passed,
including earlier backup cancellation, real IndexedDB, reload/two tabs, quota/cap,
backup/SGF downloads, dirty guards, revision conflicts and locale/mobile controls.
Final docs (145 documents / 738 relative links), formatting and whitespace checks
passed. Other browser scenarios/engines, physical devices and hosted CI were not
rerun for this bounded Studio recovery fix. No public API, database/schema,
dependency, repository hygiene or runner policy changed; no abrupt-exit durability
or rollback of submitted transactions is claimed.

## Recovery Cancellation Evidence

A delayed backup file read reproduced an old operation publishing "Record changed.
Try again." after closing/reopening Local drafts. Recovery now rejects cancelled
operation sequences before publishing restore feedback and before parsing a late
backup JSON payload. Active operations still validate their wrapper/checkpoint,
working-state freshness and replacement approval; input bounds are unchanged.
Underlying File reads are not aborted by the browser API.

The production recovery scenario delays real File reads, closes/reopens the dialog,
and checks late success and rejection. An exact-payload JSON parser probe records
zero parses for cancelled input. The checks retain newer invalid-backup feedback,
editable comment content and enabled controls without opening replacement approval.
The original build failed the new scenario with the stale message; the corrected
build passed the focused Chrome 155 recovery suite, including actual IndexedDB,
reload/two tabs, quota/cap rollback/retry, backup downloads/reopen, dirty guards,
revision-checked deletion and locale/mobile controls.

`bun run check` passed 292 tests / 8,345 assertions, installed CLI 298 checks,
quality/boundary gates, SDK/adapter builds, root/Svelte types, packed SDK/classic
consumers and docs (145 documents / 738 relative links). `bun run build:examples`,
`bun scripts/browser-smoke.ts --recovery-only`, final docs and whitespace checks
passed. Only Studio recovery code, its existing browser scenario and owning docs
changed; no public API, database/schema, dependencies or runner policy changed.
Other browser scenarios/engines, physical-device and hosted CI runs were skipped
because this bounded fix affects only recovery cancellation and feedback. No
browser file-I/O cancellation, frame-time or abrupt-exit durability claim is made.

## Repeated Batch Comment Probe Evidence

Within one C-only validation call, the controller now retains only the previous
serialized one-node probe, its parser result and UTF-8 byte count. Consecutive
exactly identical exports reuse that result. The key includes original raw
escaping, not only decoded text. This temporary entry never survives the call.
Old-value byte deltas, final aggregate size checks, diagnostic precedence and
successful-candidate proof issuance remain unchanged. Initial/unproven sources
and non-comment candidates still receive full validation.

The added regression in `packages/sdk/test/comment-validation.test.ts` compares
repeated comments with whole-candidate parsing at exact byte/value boundaries,
including adjacent identical probes and the same decoded text with different
raw exports. It checks invalid escaped values, Unicode byte overflow, exact raw
restoration, clean/dirty transitions and one-step Undo/Redo after rejected probes.

Local Node 24 profiling separated multi-target candidate construction from whole
preview cost at 2/25/256 targets. Ten 5,000-move 256-target previews measured
118.66 ms versus 37.02 ms for candidate construction in separate diagnostic runs,
identifying repeated value parsing as a larger target than traversal in this case.
A final same-process alternating HEAD/current comparison used one warm-up and
five samples of ten previews on an already export-validated source. At 5,000 moves,
25-target medians were 38.82 -> 32.62 ms and 256-target medians 127.74 -> 64.40 ms
(about 50% lower). At 300 moves, 256-target medians were 98.99 -> 35.89 ms.
The 5,000-move two-target case was 29.56 -> 29.91 ms, with no established gain.
A distinct-text 256-target control measured 124.76 -> 128.29 ms; no speedup is
claimed for that workload, which cannot reuse identical probes.
Each preview session retained the exact live snapshot. These authored Node stress
measurements exclude initial validation and do not establish browser frame-time
or peak memory. No public API, DB/schema, dependency, repository hygiene or runner
changes are introduced.

The final public built-artifact performance runner passed all 27 correctness-checked
cases. Final `check` passed 292 tests / 8,345 assertions, quality/boundary gates,
builds, root/Svelte types, documentation, packed SDK consumers and 298 installed
CLI checks. After rebuilding examples from the final source, the full production
Chrome 155 suite passed, including search/comment preview/apply, actual SGF
download/reopen, branches/history, dirty guards, playback/recovery and framework
lifecycles. Other engines, physical devices and hosted CI were not executed in
this bounded local run.

## Indexed Single Comment Preview Evidence

Empty/single-target previews can now use the controller-private exact-source
index to preserve a no-op record or rebuild only the changed node's parent path.
The shortcut requires at most 50,000 indexed nodes. Oversized records and
multi-target batches retain the original bounded full traversal and refusal
ordering. All change-input limits, fixed SGF validation, raw escaping, immutable
snapshot/preview ownership, history and export behavior remain unchanged.

`packages/sdk/test/comment-preview.test.ts` compares indexed and complete traversal
results for every root/branch in a multi-game fixture: normalization, deletion,
no-ops, expected text, missing/stale targets, exact exports and shared references.
A controller imported with a larger custom node allowance still refuses empty,
single and missing-target previews over the 50,000-node work limit, while retaining
early stale-target precedence and the original clean snapshot/history.

Local Node 24 diagnostics alternated initial HEAD/current controllers with one
warm-up and five samples of ten single-target previews after establishing canonical
source validation. At 5,000 moves, root medians were 12.76 -> 0.60 ms and tail
medians 30.42 -> 23.47 ms (about 23% lower). At 300 moves the tail medians were
2.15 -> 1.79 ms. Previewing retained the exact live snapshot. These authored local
stress measurements exclude first-export validation and do not establish browser
frame latency, general multi-target speedups or peak memory. No public API,
DB/schema, dependency, repository hygiene or runner changes are introduced.

The public built-artifact performance runner passed all 27 correctness-checked
cases. Final `check` passed 291 tests / 8,315 assertions, quality/boundary gates,
builds, root/Svelte types, documentation, packed SDK consumers and 298 installed
CLI checks. After `build:examples`, the full production Chrome 155 suite passed,
including search/comment previews and application, actual SGF download/reopen,
branches/history, dirty guards, playback/recovery and framework lifecycles. Other
engines, physical devices and hosted CI were not executed in this bounded run.

## Comment Index Refresh Evidence

Validated internal C-only commits now update changed node/ancestor references in
the controller-private index, skip identical immutable subtrees and retain the
unchanged parent/game maps. They preserve immutable published snapshots and the
existing position cache. Other edits, Undo/Redo and record/checkpoint replacement
retain complete indexing and position invalidation. Candidate validation, byte
and value limits, preview authority and notification/history behavior are unchanged.

`packages/sdk/test/comment-index.test.ts` compares every indexed node reference,
parent and game with complete indexing after repeated cross-game/nested-branch
comment changes. Controller coverage checks unchanged selected nodes, updated
ancestors/siblings, immutable previews/snapshots, previous/variation navigation,
game membership, single comments, Undo/Redo and subsequent structural edits.

Local Node 24 diagnostics measured ten complete 5,000-move index rebuilds at a
16.43 ms median. Alternating initial HEAD/current controllers in one process, with
one warm-up and five samples of ten grouped tail-comment edits, measured medians
72.85 -> 61.18 ms at 5,000 moves (about 16% lower). The 300-move medians were
5.17 -> 5.21 ms, with no established small-record gain. Dirty checkpoint restoration
followed by the same session measured 150.13 -> 135.75 ms at 5,000 moves.
Undo/initial dirty state was checked. These are authored local stress measurements,
not browser frame latency
or peak-memory claims. No public API, DB/schema, dependency, repository hygiene
or runner changes are introduced.

The public built-artifact performance runner passed all 27 correctness-checked
cases. Final `check` passed 289 tests / 8,060 assertions, quality/boundary gates,
builds, root/Svelte types, documentation, packed SDK consumers and 298 installed
CLI checks. After `build:examples`, the full production Chrome 155 suite passed,
including SGF download/reopen, single/batch comment editing, branches/history,
dirty guards, playback/recovery and framework lifecycles. Other engines, physical
devices and hosted CI were not executed in this bounded local run.

## Incremental Comment Export Byte Evidence

Controller-owned C-only validation now keeps the exact canonical UTF-8 byte count
in a weak record proof. Old/new one-node C exports have identical canonical root
headers, so their exact byte deltas account for the whole candidate without full
record serialization. Original raw escapes and missing/empty C values are retained.
Every changed value still passes the existing parser with fixed limits; final
batch bytes are checked before returning value diagnostics. Unproven sources and
all other edits retain full export validation. Only successful candidates receive
proofs, and preview freshness/ownership and edit/history authority are unchanged.

`packages/sdk/test/comment-validation.test.ts` compares these decisions with full
candidate serialization/parsing. Added coverage repeatedly adds/removes comments
across games and branches, restores original continued-line escaping, exercises
Unicode/combining characters/unpaired surrogates, and checks Undo/Redo and refusal
atomicity. It specifically verifies an addition that exceeds the byte limit on
its own succeeds when combined with a deletion elsewhere.

Local Node 24 diagnostics alternated the HEAD and changed controllers in one
process, with one warm-up and five samples of ten tail-comment edits. Medians:
300 moves 7.73 -> 5.94 ms; pass-heavy 5,000 moves 101.37 -> 82.41 ms (about 19%
lower). Dirty checkpoint restoration followed by the same session measured
179.80 -> 140.75 ms at 5,000 moves. Grouped Undo and the initial dirty state were
checked. Samples vary with local load; these are authored stress results, not
browser frame latency or peak-memory measurements. No public API, DB/schema,
dependency, repository hygiene or runner changes are introduced.

The public built-artifact performance runner completed all 27 correctness-checked
cases. Final `check` passed 287 tests / 7,964 assertions, quality/boundary gates,
builds, root/Svelte types, documentation, packed SDK consumers and 298 installed
CLI checks. After `build:examples`, the full production Chrome 155 suite passed,
including comment/search batch editing, SGF download/reopen, dirty guards,
playback, recovery and framework lifecycles. Other engines, physical devices and
hosted CI were not executed in this bounded local run.

## Immutable Dirty-State Comparison Evidence

`packages/sdk/test/record-content.test.ts` compares the new exact tree comparison
with normalized full-record signatures across collections/branches, changed IDs,
compressed point lists, reversed lines/directed arrows, label ordering, unknown
value ordering, root headers, empty values and rectangular sizes. It covers ink
normalization/content changes, 5,000-move copied paths returning clean, recreated
branches and export acknowledgment/Undo/Redo/checkpoint baselines. The controller
skips shared immutable subtrees/property maps, normalizes changed properties with
the existing rules and no longer retains duplicate full signature strings for its
baseline and export tickets. A weak baseline-only token cache, cleared on baseline
replacement/disposal, avoids doubling normalization work for dirty restored records.
SGF validation/serialization is unchanged.

Local Node 24 diagnostics alternated old/new controllers and their respective
record runtimes, with one warm-up and five samples of ten tail-comment edits.
Final median 300-move time was 24.52 -> 13.72 ms; pass-heavy 5,000-move time was
241.50 -> 102.75 ms (about 57% lower), with grouped Undo/clean-state checks.
A first tree-only prototype regressed editing after dirty checkpoint restoration;
the baseline-side cache corrected this. The final dirty-restored 5,000-move case
was 220.80 -> 171.91 ms (about 22% lower), with Undo retaining the initial dirty
state. Samples vary with local load; these are authored Node stress results,
not browser frame latency or peak-memory claims.

Public built-artifact performance completed all 27 correctness-checked cases
before/after the initial tree-comparison implementation, before the baseline-cache
refinement; its 5,000-move comment-session medians were 284.45 -> 113.58 ms.
Final `check` passed 286 tests / 7,865 assertions, quality/boundary gates, builds,
root/Svelte types, documentation, packed SDK consumers and 298 installed CLI
checks. No public API, DB/schema, dependency, hygiene or runner changes are added.
After `build:examples`, the full production Chrome 155 suite passed, including
SGF editing/export/reopen, dirty guards, playback, recovery, search batches and
framework lifecycle flows. Other engines, physical devices and hosted CI were
not executed in this bounded local run.

## Comment-Only Validation Reuse Evidence

`packages/sdk/test/comment-validation.test.ts` compares single/cross-game batch
comment decisions and resulting semantics with full serialize/parse validation
under tight UTF-8 byte, node, depth and escaped-value limits. It covers canonical
headers exceeding raw-input value limits, exact multibyte byte boundaries, retained
raw C escaping, immutable previews, grouped Undo/Redo, export-ticket retention,
failed-edit notifications, structural edits and import/checkpoint replacement.
The first unproven candidate export still fully parses. Only controller-owned
C-only builders can inherit unchanged constraints from an exact immutable source;
every changed C value still uses the existing serializer/parser with fixed limits.

An alternating same-process Node 24 diagnostic used one warm-up and five samples
of ten tail-comment edits, including first-edit full validation and grouped Undo
correctness checks. Median 300-move time was 45.06 -> 13.63 ms; pass-heavy 5,000-move
time was 551.46 -> 275.80 ms (about 50% lower). Public built-artifact performance
runs also completed 27 correctness-checked cases before/after; their 5,000-move
comment-session medians were 648.66 -> 220.47 ms. Timing is local authored stress
work, not browser frame latency or peak memory. No isolated first-batch speedup
is claimed because an unproven source still needs full validation.
No public API, DB/schema, dependency, hygiene or runner change is introduced.

`check` passed 282 tests / 6,514 assertions, quality/boundary gates, builds,
root/Svelte types, documentation, packed SDK consumers and 298 installed CLI
checks. After `build:examples`, the full production Chrome 155 suite passed,
including comment/search batch edits, playback, SGF export/reopen, dirty guards,
structural Undo and framework lifecycles. Other engines, physical devices and
hosted CI were not executed in this bounded local run.

## SGF Parser Allocation Evidence

`packages/sdk/test/sgf.test.ts` checks parser-owned maps, value arrays, children
and multi-game branches remain deeply frozen, while `createSgfNode` still copies
unfrozen caller input. Plain Unicode, empty values, text/simple-text whitespace,
escaped delimiters and continued lines retain decoded semantics and raw unknown
values through export/reopen. Existing malformed-input, encoding and byte/node/
depth/value-limit checks remain active. At that parser-only stage, controller edits
still fully reparsed their serialized candidate before committing it.

Local Node 24 diagnostics alternated old/new parsers in the same process, with
one warm-up and five samples of ten parses per authored workload. Median 300-move
parse time was 31.06 -> 27.69 ms; pass-heavy 5,000-move time was 361.85 -> 313.18 ms
(about 13% lower). The public artifact performance runner also completed all 27
correctness-checked cases before/after. Separate whole-edit measurements were
variable and do not establish a corresponding user-visible latency reduction.
These are local synthetic stress results, not browser/device or peak-memory claims.
No public API, DB/schema, dependency, hygiene or runner change is introduced.

`check` passed 276 tests / 6,266 assertions, quality/boundary gates, builds,
root/Svelte types, documentation, packed SDK consumers and 298 installed CLI
checks. After `build:examples`, the full production Chrome 155 suite passed,
including SGF editing/export/reopen, branches/Undo, search, playback, dirty guards,
encoding failures and framework lifecycles. Other engines, physical devices and
hosted CI were not executed in this bounded local run.

## Standard Validation Names

After `bun run build:examples`, `bun scripts/browser-smoke.ts --tree-only` checks
the bounded Studio outline and selected tail, keyboard focus, nested fork alignment,
comment indicators and grouped Undo, game/record/language changes and actual SGF
download/reopen. The comment-edit regression observes 501 displayed rows while
editing an existing nonblank tail comment twice: row removals fall from 1,002 in
the original implementation to zero, with all 501 elements retained. Raw input-handler
timings are diagnostic only; no cross-device latency target is asserted.

The [consolidated menu deployment](docs/engineering/33-studio-menu-deployment.md)
records local root checks (272 tests), final focused Chrome menu/preferences/share
checks, the corrected sharing-fixture assumption, successful affected hosted CI,
457-file public byte health and actual public menu/mobile/SGF round-trip checks.
The final hosted rerun selected sharing only; completion of the full browser
matrix and other-engine/device execution is not claimed for this increment.

After `bun run build:examples`, `bun scripts/browser-smoke.ts --locale-only`
checks all twelve Studio language selections, header controls at desktop/mobile
widths, localized search dialogs, saved selection on reload, Hindi/Thai browser
detection and Viewer/comparison locale updates without changing authored state.
The twelve-language modal checks begin with a Korean browser locale and assert
exact search/help/draft headings and close labels after each switch, covering
the moved-modal binding regression rather than only rejecting English text.
They also check three-second transient feedback, replacement of the previous
timer and language changes without reviving expired notices. The persistent
unsaved-record indicator is separate from these notices.
The same focused scenario now exercises occupied intersections and invalid SGF
imports in all twelve languages, preserving stones and dirty state. Live texture,
sharing and scoring failures follow each language switch without reverting to raw
codes or English exception text. Unit coverage exhausts controller/SGF/score/share
failure unions in every locale, including unknown-code fallback and invalid locales.
For this notice/failure follow-up, `build:examples` and `check` passed (271 tests,
53 test files, packed SDK/classic/CLI consumers), along with Chrome `--locale-only`,
`--scoring-only`, `--share-only`, `--texture-only` and `--drop-only` browser checks.
The static Studio/menu/dialog catalog audit found no missing owned labels outside
intentional language names, format identifiers, brands and authored/default record
content. The full browser matrix and other engines were not rerun; focused scenarios
cover the changed feedback and file/control paths. Native-speaker proofreading is
not part of these automated checks.
The locale, Studio catalog and preference tests enforce full key/placeholder
coverage, literal authored substitutions and all supported browser language tags.
Focused Chrome font inspection verified locally served custom font glyphs for all
twelve languages: Noto Sans for English/Spanish/French/Indonesian/Malay,
Be Vietnam Pro for Vietnamese, PT Sans for Russian, and the matching Noto families
for Korean/Chinese/Japanese/Hindi/Thai. This includes Latin text in localized
controls and Russian's real bold face. Header controls remain unclipped at 320px,
fonts load from the page origin, and Russian/Vietnamese desktop screenshots were
inspected after changing the font stacks. Hindi/Thai screenshots were inspected
during the preceding language expansion. Build, lint, format, typecheck and docs
passed for the font change; the full test suite and other browser engines were
not rerun because this increment changes Studio CSS and font assets only.

After `bun run build:examples`, `bun scripts/browser-smoke.ts --fullscreen-only`
checks native whole-page fullscreen entry/button exit/external exit, keyboard button activation,
four-language labels, retained custom size/record selection, exact exported SGF
and narrow-layout discovery in Chrome. Other engines, physical devices and browser
F11/Escape UI keys themselves are outside this focused consumer check. Synthetic
renderer key injection does not reproduce the browser's native Escape action.

`bun scripts/browser-smoke.ts --sizing-only` checks the right-side vertical rail,
visible size dropdown/custom selection, invisible edge/corner resize targets,
keyboard/cancellation, menu heading
and always-visible grouped SVG/PNG exports with actual downloads, responsive widths
and exact exported SGF preservation.
This is consumer display behavior; it does not alter SDK geometry or rule contracts.

After `bun run build:examples`, `bun scripts/browser-smoke.ts --workspace-only`
checks the default 19-line Studio board, 9/13/19 creation, internal tabs, independent
comments/Undo/selection/export, dirty close and inactive-exit guards, playback
cancellation, localized authored titles and narrow layouts. It also verifies the
actual downloaded SGFs. The focused browser scenario also imports an empty `GN[]`
title and checks its filename fallback, and verifies tab-element retention through
comment edits and move navigation. These checks establish avoided tab replacement,
not measured end-to-end latency gains. `scripts/studio-workspace.test.ts` and the
draft-session tests cover controller ownership, monotonic freshness, bounded sessions and
serialized draft revisions across rapid switches. This scope changes the Studio
consumer, not the SDK session API or portable checkpoint schema.

`bun scripts/browser-smoke.ts --sound-only` checks actual nonzero native Web Audio
buffers starting in a running context after a gesture, manual/recorded placements,
muting without stopping playback, silent history/passes/imports/tabs, localized
toggle names, saved preferences and reset. It does not certify physical speaker
output or subjective audio quality. `scripts/placement-sound.test.ts` checks
placement classification against actual SDK controllers and workspace generations,
plus finite, unclipped impact samples and rapid decay at 44.1/48 kHz.

- format
- lint
- typecheck
- test
- contract
- migration-check
- smoke
- docs
- check

Private `release source-backup` and `release source-recovery-check` preserve tracked
Git history/refs and restore reviewed source in an exclusive local mirror/checkout.
Positive tests use real authored Git repositories. Source/ref/tree equality,
independent hash/schema review, original/config preservation and negative dirty/
tampered/ambiguous-command cases run in existing `test`/`check`. Actual repository
capture/recovery is opt-in and must execute before claiming source restoration.
It installs/builds nothing and changes no provider account, package channel or
active checkout. Its private-tool CI route adds no browser or privileged job.
See [maintainer recovery](docs/ops/maintainer-recovery.md).

After `bun run build:examples`, `bun scripts/browser-smoke.ts --zoom-only`
executes native desktop Chrome page zoom at 100%, 200% and 400% in exclusively
owned temporary profiles. It preserves the outer window and checks the actual
CSS viewport/pixel ratio with `viewport:null`; it does not emulate a smaller
viewport or use CSS/pinch zoom. Studio covers four-language menus and replacement
guards, keyboard editing/Undo/focus, and actual SGF download/reopen preservation;
React/Vue/Svelte cover their English viewer comment editing and page reflow.
Source and served-build fingerprints must stay unchanged. Complete execution
writes `output/playwright/browser-zoom.json`; screenshots capture the native
compositor viewport without Playwright's CSS-sized clipping. Invalid non-Chrome
selections fail before starting a server/browser. Isolated zoom-tool changes select
this focused scope within the existing CI job; mixed runtime changes retain the
existing functional browser route. Native zoom is opt-in, not an additional
default browser matrix. Physical devices and screen readers remain owner-waived;
other zoom levels, engines, real assistive speech and exhaustive feature coverage
are unclaimed.

Initial `0.1.0` candidate preparation changes the five package versions, installed
onboarding instructions and SDK peer ceiling intentionally; runtime/data schemas
stay unchanged. `scripts/package-compatibility.test.ts` checks family version and
lockfile workspace metadata agreement, acceptance of the tested 0.1 prerelease/
patch line and rejection of stage/future incompatible minors. A package/lockfile
change selects existing full affected CI; isolated policy tests select root check
and file signals. The actual nine-gate candidate and fresh registry consumers,
not source selection alone, establish release evidence. See
[ADR 0025](docs/adr/0025-initial-default-channel-release.md).
The [actual 0.1 release](docs/engineering/27-initial-default-channel-release-evidence.md)
passed all nine hosted preparation gates, protected five-package publication and
fresh registry SDK/CLI/framework health. Separate unqualified npm installation and
default README checks passed; the actual public release assets were downloaded,
hash checked and their complete extracted inventory verified. These checks do not
upgrade the live demo or certify a host/channel rollback or broader environment.

The opt-in `release consumer-recovery-check` binds two reviewed prepared manifests
and independently installed SDK/CLI tarballs, then executes current → previous →
current portable-checkpoint/SGF recovery in actual Node processes on authored data.
Its default tests cover strict argument discovery, source/hash mismatches, changed
archives and equal/forward targets before installation. Successful cross-version
behavior requires executing the opt-in drill with actual reviewed packages; authored
nonexecutable archive fixtures prove only rejection paths. Its private tooling/CI
route adds no privileged job, browser run, SDK export or package-version change.
See the [recovery procedure](docs/ops/rollback.md#rehearse-portable-data-across-an-installed-downgrade).
The [actual installed recovery](docs/engineering/26-installed-consumer-recovery-evidence.md)
passed dev.1 → dev.0 → dev.1 with exact authored checkpoint/SGF preservation,
unchanged originals and future-schema rejection. It did not replace host storage
or mutate an npm tag.

`scripts/channel-plan.test.ts` checks complete-family target/current observations,
reviewed local/registry integrity, read-only/no-change arguments, mixed or changed
channels, changed target inventory, tampered bundles, provider failures and early
rejection of forward/stage/invalid/execute requests. The private
`release channel-plan` command performs public metadata reads only; no tag mutation
or prior-version rollback follows from a successful plan. Release and CI tests
cover its existing command/error envelope and narrow tooling route. No additional
browser job or privileged workflow is selected for isolated plan changes.
The [actual channel observation](docs/engineering/23-channel-preflight-execution-evidence.md)
confirmed five unchanged development tags, reviewed integrity and no older common
version beyond excluded placeholders. It did not mutate a tag or rehearse rollback.

`registry-target-check` combines channel preflight with fresh previous-version
registry downloads and independent installed SDK/CLI/framework checks while
keeping the current family selected. Channel tests cover exact reviewed bytes,
unchanged tags, exclusive copies, pre-download/final drift or deprecation, execute
rejection and preservation of ordinary post-publication health's tag requirement.
Authored hash fixtures and mock check callbacks prove control flow, not a live
consumer result. The [target-health record](docs/engineering/25-registry-target-health-evidence.md)
keeps actual execution separate. Its private tooling route adds no browser job.
The original five `dev.0` packages have now passed fresh registry SDK/CLI/framework
health while `dev` stayed `dev.1`; this did not switch a tag or roll back host data.

Publication propagation tests cover metadata missing beyond the old five-read
limit, eventual success without repeated uploads, the eighteen-read cap and the
three-minute elapsed budget through an injected private clock. Failed uploads,
provider errors, integrity/channel conflicts and unconfirmed resumes still stop.
The [actual documentation prerelease](docs/engineering/24-package-readme-correction.md)
passed nine preparation gates and independent fresh-registry installed-consumer
health. Physical-device and screen-reader execution remains waived/unperformed.

Terminal diagnostic coverage uses `packages/sdk/test/automation-diagnostics.test.ts`
for actual completed-step/failure traces, one execution, environment prevalidation,
private text/error-accessor exclusion, scoring/restore/checkpoint/snapshot and
request/retention bounds. `scripts/packed-consumer.ts` checks root/subpath/no-DOM/
classic public artifacts. `scripts/packed-cli.ts` exercises installed Node discovery,
file/stdin requests, fixed transport envelopes, safe environment/timing, actual
successful/failed report publication, existing-output/force and input protection.
Normal automation/checkpoint fixtures continue to verify authored result compatibility.

The installed Node CLI check discovers and executes every embedded `recipe`, checks
read-only branch/search and agreed scoring outcomes, resumes an actual returned
checkpoint across processes, and explicitly applies/Undo/rejects stale preview
requests. Discovery misuse/traversal/repeated flags return fixed usage errors;
no source checkout, browser or extra template interpreter is required.

`scripts/performance.test.ts` checks legal authored workloads and fresh warm/sample
measurement/verification/disposal behavior without time thresholds. The opt-in `perf`
runner rebuilds public Node SDK artifacts and records 27 original/authored workload
cases, including ten grouped comment edits at the final node. `packages/sdk/test/controller-replay.test.ts` compares warm/evicted states
with fresh replay across captures/passes/setup/MN/collections/branches and guards
cache invalidation through edits/Undo/import/checkpoint rules. Shared controller
changes also run the production browser suite; desktop SDK timing does not prove paint latency.
The comment-cache regression retains warm positions across single/grouped and
cross-game batch edits, compares their rule histories with cold replay and checks
Undo/Redo plus setup/import/checkpoint invalidation. Local Node 24 samples (one
warmup, five measured sessions) reduced median ten-edit session time from 66.03
to 42.71 ms for 300 moves and from 870.15 to 721.21 ms for the authored 5,000-move
stress fixture. These are local SDK samples, without a timing threshold or device/
browser latency claim; full-record validation and dirty comparison still run.
A separate path-sharing regression checks single and batch edits, frozen ancestor
property/raw-value reuse, unchanged branches, held snapshot serialization, cold
replay and Undo restoration. Before/after Node samples (one warmup/five sessions)
reduced ten tail-comment edits from 40.19 to 34.14 ms at 300 moves and 633.83 to
524.64 ms at 5,000 moves. Ancestor construction shares immutable property objects
instead of cloning them; full candidate validation and semantic dirty comparison
remain. These local measurements do not establish browser or device latency.

## Required Final Report

The opt-in `bun run perf:browser` rebuilds production examples and measures real
Studio imports/navigation in fresh Chromium contexts. It records one warmup and
five samples for 300/5,000-move authored workloads at native/4x-emulated CPU rates,
two-animation-frame latency and JS heap/DOM snapshots. The fixed ignored report
is replaced on each successful run at `output/playwright/browser-performance.json`.
No physical paint/device, memory peak/leak or timing threshold claim follows.
Full functional smoke does not automatically run this measurement; changing its
scenario selects the focused measurement route in the existing single CI job.

After `bun run build:examples`, opt-in
`bun scripts/browser-smoke.ts --memory-only` measures nine production lifecycle
cases: native React/Vue/Svelte mount/unmount, owned/borrowed classic Viewer disposal
and Studio import/reset at 300 and 5,000 moves. Each fresh case context has three
warmups and fifteen measured cycles. Active/released checkpoints collect garbage
explicitly and record JS heap bytes plus DOM document/node/listener counters.
Actual state, bounded rows, fresh owned records, callback cleanup and borrowed
controller survival must pass. Source and built-artifact fingerprints must remain
unchanged. Classic Viewer measurements query public controller instance counts
and release debugger references; disposed owned controllers must be collected,
while the host's borrowed controller remains. Complete ordered metrics are required
before replacing `output/playwright/browser-memory.json`. Chromium is required; no threshold runs
in default functional smoke. This is retained-heap evidence under forced GC, not
peak allocation, RSS/GPU usage, physical-device or universal leak-free support.
Memory-tool changes select this focused route in the existing CI job; mixed SDK
changes continue to select the full functional browser route.
The [executed lifecycle record](docs/engineering/22-browser-memory-lifecycle-evidence.md)
reports actual retained-resource and controller-count results with their limits.

`scripts/accessibility-scenario.js` runs against actual built production pages.
It checks Studio replacement/removal dialog names in four languages, keyboard
activation plus native modal focus/Escape, preserved authored state and selection, and three framework
sharing guards at desktop/320px widths. `--accessibility-only` selects this focused
browser route; full browser and sharing routes include it. This does not prove
physical screen-reader or untested engine support.

The production `tree-navigation` scenario covers Studio keyboard focus across
navigation and bounded tail-row replacement, exact selection/MN/annotation labels,
collection/language/import changes, comment indicator Undo and actual SGF export/
reopen. It also checks actual horizontal positions across nested sibling forks
and their linear continuations in Studio and the common focused Viewer, including
row reuse, folding, assessment/comment icons and unchanged exported content.
`--tree-only` selects it; full functional browser smoke includes it. The
browser benchmark additionally verifies move/clean/row/stone state and rejects
controller/Studio source changes during its measurement window.

`scripts/setup-editing.test.ts` checks Studio point-tool no-ops without Undo
entries, reuse of identical plain setup children without merging authored
alternatives, consecutive changes on one setup node, SGF round-trip and per-edit
Undo. Focused manual Chrome checks additionally covered targeted right-click
subtree deletion/cancellation, sibling/cursor preservation, Undo/Redo, keyboard
menu activation/Escape, root protection, four-language captions and 320px menu
placement. A stale confirmation was rejected after importing a record with
colliding node IDs. These checks do not claim other-engine or physical-device
coverage.

`packages/sdk/test/variations.test.ts` checks focused/nested outlines, pass and
annotation reachability, bounded rows and distinct candidate coordinates without
record edits. `packages/sdk/test/move-assessment.test.ts` checks targeted assessment
edits, selection/property preservation, invalid/non-move targets, Undo/Redo and
schema-validated automation. Focused local Chrome inspection additionally checked
desktop/320px candidate activation, selective expansion, four-language assessment
icons/accessible descriptions, erase/Undo and actual SGF export/reopen. This does
not establish other browser-engine or physical-device coverage.

Production file-import scenarios must await an observable newly loaded record,
not merely `setInputFiles`: Studio reads file bytes asynchronously. Search uses
distinct authored titles, then exercises detached navigation/selection controls
to verify imports reject old results and clear selections without changing the
new record. No fixed sleep or relaxed stale-result assertion substitutes for
import completion.

The browser smoke runner accepts one optional
`--browser=chrome|msedge|firefox|webkit` and verifies the launched engine before
running a scenario; Chrome remains the default. Install the selected browser
explicitly with `bun run browser:install firefox`, for example.
After `bun run build:examples`, focused routes can run as
`bun scripts/browser-smoke.ts --search-only --browser=firefox` (also `--tree-only`
and `--accessibility-only`). Invalid/duplicate options fail before server/browser
startup. CDP performance measurements reject Firefox/WebKit; selecting a browser
does not assert that every scenario or device-emulation feature supports it.
Current executed engine/scenario coverage belongs to
[compatibility](docs/sdk/compatibility.md#executed-browser-scope).

After building examples, `bun scripts/browser-smoke.ts --desktop-only --browser=webkit`
runs 22 public-page scopes serially: accessibility, variation tree, support,
search, preferences, recovery, locale, playback, common controlled board, file drop,
rules, frameworks, editing, classic script, presentation, diagrams, scoring, puzzle,
analysis, sharing, texture consumers and animation consumers. Each scope retains its completion and downloaded
artifact assertions and begins on the English Studio page. Texture preparation
status can precede a framework's committed board update; its fixture waits for the
actual main/viewer/owned surfaces before checking forwarding and record preservation.
The scoring/puzzle/analysis scopes retain their real browser touchscreen taps in
390 by 844 emulated contexts. The profile excludes Chromium CDP touch/zoom and
performance and native controlled-consumer input. It does not replace full Chrome smoke
or certify physical devices; browser selection remains explicit and CI is unchanged.

All 22 desktop scopes passed at clean source `ee57052` on Windows Firefox 156
and Playwright WebKit 26.6. Analysis now activates its focused candidate button
with Enter before asserting focus retention; pointer-triggered focus varies by
engine/OS. The corrected focused route passed on Chrome 154 as well. Original
source, SGF and touch assertions remain intact. See the
[current execution record](docs/engineering/21-expanded-browser-execution-evidence.md)
and [earlier Chrome/history](docs/engineering/16-product-flow-audit.md). This profile
is not the complete Chrome suite or a physical-device/assistive certification.

On October 12, 2026, the owner declined physical-device and screen-reader
validation. These checks are outside the required completion scope; their omission
does not establish device or assistive-technology support.

`scripts/release.test.ts` covers manifest bounds/state, traversal/duplicates,
modified/extra files, directory links, source-preserving isolated restaging, actual
Git source guards and failed/timed-out check processes. `bun run release prepare`
requires committed clean source and runs all nine gates against retained artifacts;
see [release](docs/ops/release.md). Prepared reuse verifies integrity without rerunning
gates. `verify` and `restore --bundle DIR` do not prove publication or live rollback.

`publication-plan --bundle DIR --workflow FILE` verifies prepared current-family
bytes and emits an offline SDK-first registry/OIDC handoff. Release regressions
exercise the actual command with an empty executable search path, preserve bundle
bytes and reject unprepared/legacy/damaged artifacts, unsafe options and prerelease
promotion to `latest`. A workflow file's presence is not publication authority.

`publish --bundle DIR --manifest-sha256 HASH --source-commit SHA --tag TAG` is
offline preview unless explicitly passed `--execute` in the guarded public
GitHub OIDC context. Release tests execute the actual preview process and exercise
simulated registry preflight, matching-version resume, isolated byte preservation,
late-package conflicts, registry failure and uncertain partial-upload stop/receipts.
Simulation does not establish live npm publication or permission. The separate
actual SDK tarball npm `--dry-run` checked its name/version/SHA-512 without upload.

`registry-check --bundle DIR --manifest-sha256 HASH --source-commit SHA --tag TAG`
queries only public npm metadata, fetches fresh bounded canonical HTTPS tarballs,
verifies the exact reviewed bytes and executes existing independent SDK/CLI/native
framework consumers against downloaded files. It never rebuilds or publishes.
Release regressions distinguish metadata/channel/byte/transport/consumer failures,
preserve originals, stop before executing corrupt bytes and recheck final channels.
Stream fixtures cover bounds, headers, redirect/foreign-host refusal and exclusive
destinations. Simulated metadata/transport cannot prove live npm publication;
actual public-package transport and retained-byte consumer integration are separate
evidence, with their precise scope recorded in readiness.

The manual `.github/workflows/publish.yml` defaults to read-only preview of a
successful matching preparation run's immutable artifact ID. Candidate regressions
reject stale/foreign/failed runs, expired/wrong/extra artifacts and missing real
reviewer protection for explicit execution. Workflow mutations reject altered
inputs, conditions, environment, checkout, steps or authority under the exact
reviewed parsed-workflow policy binding. Only the named publishing job's OIDC
permission is exempted; other write permissions and secret injection remain denied.
Static/local evidence does not prove hosted download, environment approval or npm
authority. Executed hosted results belong to the release preparation evidence.
The subsequent `health` job is read-only and selected only after a successful
explicit publish; it executes fresh registry-download/installed-consumer checks
without rebuilding and retains a bounded success/failure receipt. Workflow
regressions guard its dependencies/conditions and refusal of OIDC permission.
No live publication/registry health is inferred from static or simulated checks.

The manual-only `.github/workflows/prepare-release.yml` runs the full nine-gate
preparation on the dispatched main commit and retains its verified directory for
14 days. CI planner regressions preserve read-only authority and narrow ordinary
verification for release-only orchestration while retaining all mixed SDK gates.
Actual hosted artifact retention and downloaded-byte verification require separate
execution evidence; workflow/static checks alone do not prove those outcomes.

The latest executed preparation is hosted clean source `41e0e89`: all nine named
gates passed against its retained 149-file bundle. Actual publication/health run
`38212158941` verified all five public `0.1.0-dev.0` versions and their `dev` tags,
downloaded fresh tarballs matching reviewed SHA256/SHA512, and passed independent
installed SDK/CLI/React/Vue/Svelte consumers. Its final verification reused already
confirmed versions without reupload. Earlier bundles remain preserved; stable
support, physical devices and previous-version live rollback remain separate.
See [release evidence](docs/engineering/18-release-tooling-execution-evidence.md) for the
source/tree, manifest hash, tools and exact preservation/publication boundary.

Final responses must list executed validations, passed validations, skipped validations, skip reasons, and remaining risk.

## Runner Policy

`scripts/demo-health.test.ts` uses an actual system tar and checks exact file
hashes, unsupported/link/path/checksum/truncation refusal, credential-free fixed-
origin HTTP, bounded propagation retries, progress, real request deadlines and
exclusive receipts. Current live artifact bytes passed the read-only tool.
The separate read-only Pages health job passed actual normal deployment (47 files)
and recovery (46 files plus absent build receipt), with downloaded success records.
An intentionally mismatched read-only live check retained a fixed failure code
and completed-file progress; see [demo evidence](docs/engineering/19-demo-recovery-execution-evidence.md).
File-byte checks do not certify browser/device workflows.

The manually dispatched Pages workflow branches between a fresh static build and
an exact retained-tar recovery. Workflow regressions bind all inputs/conditions/
downloads and retain deployment-only write authority. Fresh builds retain public
source receipts and original artifacts for 14 days. Actual recovered deployment,
46 matching live files and a Studio import/edit/export/reopen passed in the
[demo recovery evidence](docs/engineering/19-demo-recovery-execution-evidence.md).
These checks do not certify npm-channel or consuming-host/data rollback.

`scripts/demo-recovery.test.ts` checks original public main Pages run/artifact/
digest/retention bindings, successful build/deploy jobs, malformed input and Actions
output authority, and corrupt/extra/linked archive refusal without extraction.
The private read-only candidate/archive commands are documented in
[rollback](docs/ops/rollback.md). Local fixtures and metadata inspection alone do
not prove live deployment recovery.

Use the root Bun package scripts. Run state-changing build/check commands serially.

Operations require setup and `bun run build` first because they import public built
SDK artifacts. `scripts/operations.test.ts` verifies actual controller restoration
and command processes, preserving sources and excluding authored data. Direct
`bun scripts/operations.ts` emits one JSON result; package-runner banners are not
response content. Existing downloaded Studio backup fixtures are separately checked
by the operations command, without substituting a schema-only result for restoration.

| Name                  | Command                                      | Evidence                                                                                                                                                                               |
| --------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| lint                  | `bun run lint`                               | Oxlint correctness rules, React hooks/compiler and Vue rules; warnings and unused suppressions fail                                                                                    |
| doctor                | `bun run doctor`                             | Read-only stable Bun/Node major, lockfile and installed-tool diagnostics                                                                                                               |
| operations (recovery) | `bun run ops recovery-check --input FILE`    | Bounded UTF-8 checkpoint/Studio backup restored and compared in an isolated controller; source bytes/content are not emitted or changed                                                |
| operations (drill)    | `bun run ops drill-recovery`                 | Authored study checkpoint round-trip, corrupt/future preservation, dirty guard, explicit replacement and post-restore Undo; no physical/browser/remote durability claim                |
| performance (SDK)     | `bun run perf --output FILE`                 | Rebuild/public Node artifacts; original/authored workloads, raw warm/sample timings and correctness checks; no default CI timing threshold or browser/device claim                     |
| boundaries            | `bun run boundaries`                         | Classified SDK runtime imports, public consumer imports, framework isolation and file-size review candidates                                                                           |
| format                | `bun run format`                             | Read-only Oxfmt check for supported source, styles, components and documentation                                                                                                       |
| security (files)      | `bun run security:files`                     | Signal-only private-file/credential and workflow permission/trigger checks; no credential content in output                                                                            |
| security (deps)       | `bun run security:deps`                      | Registry high/critical dependency audit; requires network and fails on audit-service errors                                                                                            |
| typecheck             | `bun run typecheck`                          | Strict TypeScript checks for implementation, tests and scripts                                                                                                                         |
| typecheck (Svelte)    | `bun run typecheck:svelte`                   | Native components and example checked with Svelte's supported isolated TypeScript toolchain                                                                                            |
| test                  | `bun run test`                               | Focused SDK behavior and CLI completion-result tests using Bun's test runner                                                                                                           |
| docs                  | `bun run docs`                               | English documentation, LF endings and relative links                                                                                                                                   |
| smoke                 | `bun run smoke`                              | SDK build, isolated tarball install, strict ESM/headless/global declarations and Node public-export/classic VM execution                                                               |
| smoke (adapters)      | `bun run smoke:adapters`                     | Separate npm tarball installs, framework dependency isolation, strict declarations and real React/Vue/Svelte SSR                                                                       |
| smoke (starter)       | `bun run smoke:starter`                      | Copyable standalone app, isolated npm SDK/tools installation, independent strict types/build, actual browser editing/download/reopen, guards and keyboard/emulated touch               |
| smoke (KataGo)        | `bun run smoke:katago <binary> <model>`      | 35 actual local-engine/process checks across all reporting perspectives; explicitly supplied assets required                                                                           |
| smoke (KataGo, Node)  | `bun run smoke:katago:node <binary> <model>` | Same checks on the actual Node runtime with external public SDK imports                                                                                                                |
| smoke (browser)       | `bun run smoke:browser`                      | Studio/viewer and framework consumers; editing/ink round-trips, touch, comparisons, embedded sharing/guards/clipboard, transforms/input, diagrams, encoding/cancellation and lifecycle |
| check                 | `bun run check`                              | Lint, format, SDK/adapter builds, root/Svelte typechecks, tests, docs and SDK packed-consumer smoke                                                                                    |

`bun run build` builds the common SDK; `bun run build:adapters` also builds the
three adapters. SDK build emits selective ESM/declarations plus a standalone IIFE
and its global declaration; example build copies that exact script into its output.
`bun run example:katago <binary> <model>` builds the SDK and runs a bounded local
CPU analysis example, requiring explicitly supplied engine/model files. It owns
stdin/stdout/stderr, cancellation/deadline and process shutdown; it is not part of
the default `check` or a hosted-service/browser check.
The two optional KataGo smoke routes record version/hashes, protocol transcripts
and case results under `.tmp`; they assert actual metrics/coordinates/PVs/ownership,
source preservation and termination/failure/exit behavior. They neither download
assets nor substitute protocol fixtures for engine output. See the
[live evidence](docs/engineering/11-live-katago-evidence.md) for the exact tested matrix.
`bun run migration-check` rebuilds public SDK artifacts and runs checkpoint,
preference, draft metadata and isolated operations regressions. It checks supported
legacy-field migration, interrupted write/cleanup reopening, idempotence, future-data
preservation and actual serialized restoration. It does not modify a user profile,
upgrade a future browser database or claim power-loss durability; see the
[migration procedure](docs/ops/data-migrations.md).
Standalone `contract` is not configured; interface gates run inside `check`. Manual
`git diff --check` is whitespace evidence, not an invented lint result.

## Code Quality Tooling

`bun run build:cli` builds the SDK and optional Node executable; `bun run cli`
runs its local artifact. `bun run smoke:cli` builds and independently installs
SDK/CLI tarballs with npm, then checks the actual installed bin and Node JSON,
stdin/files, editing/reopen, snapshots, schema/errors/limits and output protection.
Long-record checks resume an actual returned location beyond move 128 through
the installed Node CLI and save its edited SGF; SDK tests also cover a late
variation, portable reopen and the total-node locator bound.
Installed CLI checks also inspect Shift_JIS multibyte comments/player names/labels,
edit the record and reopen its UTF-8 output. SGF tests cover escaped-looking trail
bytes, decoded character limits and rejection of fake/mixed encoding declarations.
The default `check` also builds the CLI and runs that installed consumer after SDK
smoke. Runtime CLI operations require no browser, framework or remote service.
Each request is isolated; live app/engine bridges and headless diagram rendering
are not implied. `llms.txt` points agents to discovery and owning contracts.

Oxlint 1.x and Oxfmt 0.x are root development dependencies, with resolved versions
in `bun.lock`. Use `bun install --frozen-lockfile` to reproduce a reviewed graph.
Review formatter changes when updating its lock entry: a pre-1.0 minor release
can change formatting or configuration behavior.

Oxlint enables correctness rules from the ESLint, TypeScript, Oxc, React and Vue
plugins. Vue/Svelte script linting does not establish full template or framework
compatibility; root/Svelte typechecks and framework browser/packed consumers remain
required for relevant changes. Type-aware linting is not enabled in this baseline.
Intentional Playwright callback expressions, control-character sanitizers and
`createElement` object-ref false positives have narrow, explained suppressions.
Unused suppression comments fail the lint check.

Oxfmt uses two spaces, LF, semicolons, single quotes and a 100-column print width.
Playwright runners remove only the callback file's final statement semicolon before
passing it to the CLI's parenthesized expression boundary. A regression test checks
real expression evaluation, comments, internal semicolons and rejection of extra
statements; the callback files follow the same formatting rules as other scripts.
It preserves import/package-key order, Svelte section order, significant HTML
whitespace, Markdown prose wrapping and fenced examples. Build output, dependency
trees, caches, local evidence, scaffold state and generated lockfiles are excluded.
`bun run lint:fix` and `bun run format:write` explicitly modify source files; review
their diff before committing. Validation commands never apply automatic fixes.
The formatting baseline is committed separately from the tooling/lint changes.
Both read-only checks run first in `bun run check`.
The runtime dependency boundary gate follows them before building. Environment
setup uses `bun run setup` with a frozen lockfile; `commands` reads actual scripts,
while `clean` previews artifacts and requires explicit `--apply` to remove them.
Cleanup tests verify previews, preserved source/dependencies and refusal of linked
targets before any deletion. Module tests reject static/dynamic/CommonJS renderer
imports and private/unrelated-framework consumer imports; type-only/computed
imports remain covered only to the extent of strict declarations/packed checks.

`bun run ci:plan --base <commit> --head <commit>` reports changed files and actual
check commands. `bun run ci:run` executes them serially; `--dry-run` prints only.
Missing/empty/invalid diffs select full evidence, never success without checks.
Documentation-only changes run format/docs/security signals; known optional SDK
changes select focused browser scenarios. Unknown shared changes select the full
browser suite. Lockfile/manifests also require installed adapters/starter and the
dependency audit. See [CI policy](docs/ops/ci.md) for routing, cache and permissions.
Planner tests verify fallback, multi-feature routing, root command existence and
permission/credential signals. These do not establish an actual GitHub run.

The manual Pages workflow has a separate reviewed Pages/OIDC permission binding;
planner regressions reject authority drift and preserve broad checks for mixed SDK changes.
Its successful deployment and live nested consumer verification are separate evidence.

Browser and packed-adapter smoke are explicit oneshot checks separate from `check`.
Framework lifecycle and transform checks count SVG board applications, excluding
comment indicator icons from renderer counts.
Standalone smoke is also separate: it copies `examples/standalone`, installs the
SDK tarball and independent tools with npm lifecycle scripts disabled, then serves
that consumer's production build through its own temporary localhost server.
It requires `banora-standalone-complete` in the actual CLI Result, downloaded SGF
preservation and outgoing Save & open content. For a focused rerun of an already
built copy, `bun scripts/starter-browser-smoke.ts .tmp/standalone-consumer-<id>`
uses the same server/session cleanup; it accepts only consumers under `.tmp`.
After building examples, `bun scripts/browser-smoke.ts --controlled-only` checks
plain host snapshots, immutable intentions, eight rectangular transforms,
nonrectangular masks/keyboard input, data overlays, combined-update rollback,
read-only/ink/navigation/context menus, actual SVG/PNG and view-owned cleanup.
It also runs the four production controlled consumers (Vanilla/React/Vue/Svelte),
host approval/rejection/stale keys, latest callbacks, read-only updates, remount,
actual diagram downloads and mobile touch confirmation/replacement/cleanup.
Both fixtures require their exact completion value in the CLI Result; consumer
downloads additionally require PNG signatures and standalone noninteractive SVG
with the host-approved stones. It is also part of the complete browser suite.

`bun scripts/browser-smoke.ts --playback-only` checks recorded playback in Studio,
common Viewer, React/Vue/Svelte and classic script: 0.5–5 second speed selection,
pause/end, scoped arrows/board Alt arrows, editable/select/dialog guards,
keyboard-opened modal pauses and host modals outside the Viewer scope, long SGF
preservation, record replacement, public updates and disposal/remount. The
scenario also checks Studio/Viewer variation numbers across branches, passes,
annotation/setup nodes, SGF `MN`, accessible labels and a selected node beyond the
500-node tree display limit. A native dialog-close race focuses/selects the next
comment editor before delivery of the queued close event, then uses Backspace to
clear the comment and verifies clean state. It reproduced focus returning to the
menu with 21 comment characters retained before the fix. Named playback waits
report bounded UI state (move/dirty codes, focus/modal IDs, comment length and
visibility), without comment text or longer timeouts. The original historical
30-second timeout had no predicate/state evidence, so its exact cause remains
unconfirmed; the matching focus/deletion failure is independently reproduced.
The exact
completion Result and downloaded 162-move SGF are required. This fixture is also
part of the complete production-browser suite. Browser scenarios restore the
expected Studio route before the legacy editor scenario; native wrapper coverage
does not accidentally run editor checks on another consumer page.

After building, `bun scripts/browser-smoke.ts --rules-only` selects the mounted
simple/none/positional/situational repetition fixture, actual keyboard play,
rejection announcements, immutable state/events, setup epochs, recorded navigation
and borrowed-controller disposal. It also runs in the complete browser suite.
Every browser scenario must return its exact completion string in the CLI's actual
JSON `Result` section. Echoed code, console messages, missing/partial output and a
successful command exit alone cannot establish completion. Both full and focused
routes enforce this; result-parser regressions run with the behavior tests.
After building examples/SDK, `bun scripts/browser-smoke.ts --touch-only` runs the
focused real-touch scenario using the same oneshot server/session cleanup.
`--scoring-only` selects Studio's manual group controls, all four counting presets,
seki, negative komi/adjustments, AGA pass/handicap components and final-pass warning,
invalid-input recovery, keyboard focus, navigation/setup/import reset, preservation
across comment/annotation edits and their Undo, and auxiliary
view disposal. Emulated mobile touch/layout and identical before/after downloaded
SGF are required. It runs in the full suite with the same strict completion Result.
`--puzzle-only` selects the production curated puzzle consumer and public puzzle-view
fixture. It checks authored capture/response/correct/incorrect/pass, illegal and
unlisted retention, hints/restart, keyboard focus, safe author text, presentation/
callback updates, downloaded SVG, failed mounting and owned/borrowed disposal/remount.
Emulated mobile touch/layout also complete the same authored solution. Its explicit
Result and actual diagram are required; it is included in the complete suite.
`--analysis-only` selects the production analysis consumer and public analysis-view
fixture. It verifies candidate/root Black metrics and current-player loss, pass/
capture PV steps, ownership/point values, rectangular transforms/crop, callback/
presentation updates, explicit manual JSON submission, errors/cancel/stale/destroyed
replies and owned/borrowed lifetime.
Unavailable-context fixtures also verify source navigation/edit/Undo/import drawing,
crop reset on smaller boards, recovery and disposal without automatic submission.
Keyboard/emulated touch/layout, identical source SGF downloads and an actual
six-stone PV SVG excluding predictions/cursor are
required with the exact completion Result. It is included in the complete suite;
illustrative protocol data does not establish actual engine/model compatibility.
`--drop-only` exercises Studio's production DOM file drag/drop boundary, metadata,
Shift_JIS comments/names/labels and their edited UTF-8 export/reopen,
deferred read completion/error races against newer valid/invalid selections and
new/example record replacement,
handicap/setup and branch rendering, Cancel/Export & continue, actual export/reopen
and retention after malformed bytes. It requires a completed Result and downloaded
SGF content. This uses browser-created File/DataTransfer/DragEvent objects; it does
not claim native operating-system file-drag automation.
The comparison scenario also checks Korean/Chinese/Japanese pane labels and
summaries, preserved pins/controller state/authored comments, literal defensively
copied message overrides and atomic rejection of invalid locale/message updates.

`--comparison-only` similarly selects the comparison scenario without rerunning
unrelated browser flows during implementation.
`--share-only` selects production link opening/creation, clipboard fallback,
deferred copy completion/failure races against newer links, copies and import errors,
position privacy, Export/Discard/Cancel and framework cleanup. Clipboard writes
are stubbed in this check to avoid modifying the machine's clipboard.
`--texture-only` selects public SDK texture preparation/rendering/diagram pixels,
bounded inputs, object-URL cleanup and presentation isolation, then Studio and
React/Vue/Svelte file selection/reset, native props, diagrams and cancelled late
preparation. It verifies explicit completion markers and actual download assets
instead of assuming a returned CLI command finished the complete scenarios.
All texture fixtures are locally authored raster data.
`--animation-only` checks public SDK placement eligibility, real Web Animations,
redraw continuation, cancellation, live reduced-motion changes and final SVG/PNG
geometry. Its explicit completion marker is required before reporting success.
It then exercises Studio and all three native consumers' opt-in/duration controls,
Board/Viewer/owned propagation, pinned/static behavior, diagrams and lifecycle;
completion markers and actual download assets are checked for these consumers too.
Use them for adapter/common-renderer changes; documentation-only edits need docs
and whitespace review. Adapter packed checks require npm (supplied by Node 24),
install with lifecycle scripts disabled and do not use workspace source aliases.
`check` builds packages first because consumers resolve public built declarations;
it works from a fresh checkout after installing dependencies. Headless packed subpaths
are checked without DOM type libraries; the root/renderer/viewer exports are also
verified to import without runtime browser globals.
It uses a temporary localhost server and its own Playwright CLI session, both closed
on completion/failure. Screenshots/downloads are ignored under `output/playwright/`;
packed-consumer installations are ignored under `.tmp/`. Install Chrome or use
Playwright CLI's browser installation command when no compatible browser is available.

## Record Editing Evidence

`bun run test` verifies that rejected moves, node/value-limit failures and empty
Undo/Redo requests preserve comment-group cleanup and one-step Undo/Redo. No-op
annotations retain the session; committed non-comment edits remain separate Undo
units. Snapshot identity and dirty-state recovery are checked through public APIs.

## Hygiene Validation

After building examples, `bun scripts/browser-smoke.ts --recovery-only` verifies
real IndexedDB saves, page close/reopen and selected dirty branch recovery,
session-local Undo, independent two-tab edits, injected quota denial with atomic
metadata rollback, cap/retry, stale deletion, corrupt/future records, confirm/cancel,
guarded backup restore, actual portable backup/SGF files and disabled-storage export.
English/Korean/Chinese/Japanese controls and 320px/1440px screenshots are checked.
The full browser suite includes this scenario. The board-menu scope additionally
opens/closes the recovery modal from borrowed controls and restores their handlers.
These checks do not establish abrupt process-kill or physical-device durability.

Checkpoint tests cover collection/branch selection, long paths, annotations and
unknown values, semantic export baselines, rules/superko replay, clean/dirty recovery,
future/malformed/oversized input, lower host limits, retained groups/history/tickets
after refusal and terminal conflicts. Packed SDK consumers check the headless
subpath/declarations; installed Node CLI checks resume a persisted JSON request and
save/reopen its SGF. Studio storage has the separate browser evidence above.

Repository hygiene file changes must check line-ending churn, binary diff pollution,
tracked secret files, ignored build/cache artifacts, and generated-output drift.

## Scope

general validation routes must stay stack-neutral unless a runner file explicitly defines a command.

## Repository Shape

sdk validation must stay repository-shape focused and must not imply generated application source code.

## Board Menu Evidence

After building examples, `bun scripts/browser-smoke.ts --menu-only` verifies Studio
menu bounds at 320px/1440px, direct search/draft/help dialogs from both launchers,
dialog Escape/close/focus, immediate comparison/scoring controls, control restoration,
shared editing/Undo and retained scoring sessions. An emulated mobile Chromium context also verifies
that 2x pinch zoom keeps the menu inside the visual viewport and leaves it operable.
This scenario runs in the full browser suite; physical keyboard/zoom behavior on
devices and other browsers remains unverified.

## UI Localization Evidence

After building examples, `bun scripts/browser-smoke.ts --locale-only` checks
English/Korean/Chinese/Japanese Viewer updates, custom literal messages, rejection rollback,
crop retention/reset across differently sized games and imports, later partial
Viewer updates and explicit invalid-crop rollback,
localized board accessibility, authored content/selection/dirty-state preservation,
Studio labels, sharing, manual scoring, SGF export, saved language preference,
Chinese/Japanese browser-language detection and saved-selection precedence, and
comment indicators (blank/whitespace, add/clear, Undo/Redo and localized accessible descriptions), plus
390px/1440px layouts. Language changes inside the board menu also preserve both
texture file inputs, their actual PNG upload handlers and clean record history.
It runs in the full browser suite. Existing role-based
fixtures explicitly select English; they do not rely on the runner machine's
browser language. Headless locale helpers are tested through an isolated packed
SDK install without DOM types. Physical devices are not implied by viewport checks.

## Studio Preferences Evidence

After building examples, `bun scripts/browser-smoke.ts --preferences-only` checks
actual localStorage legacy migration, new-format precedence, twelve restored
settings, applied board theme/transform/numbers/size, independent simultaneous tabs, explicit
reset and retained dirty selection/Undo/Redo/drafts. The runner compares downloaded
before/after checkpoint payloads, including SGF, baseline, selection and rules.
Future/corrupt preferences survive ordinary edits until reset; unreadable autosave
starts off, and denied storage leaves editing/session controls usable. All four
reset translations fit the 320px board menu; its screenshot was inspected.
The scenario also runs in the full production browser suite. Headless model tests
cover failed migration writes and bounded per-field reset. Other browser engines,
physical devices and hosted CI are unverified. No SDK API or draft database schema
changes are required; affected CI routing includes `--preferences-only`.

## Record Tools SDK Evidence

`packages/sdk/test/record-tools.test.ts` covers whole-collection/branch search,
literal/case/field filtering, metadata/labels, passes/`MN`, pagination, work/output
bounds and deep 4,000-move traversal without replay. Comment batch checks cover
immutable previews, shared unchanged subtrees, cross-game targets, one notification/
Undo unit, selection/export/rule preservation, malformed/missing/duplicate/over-limit
refusal, no-op/group/Redo/ticket retention and stale/foreign/forged ownership.
`check` executes these tests and packed root/controller/selective-search consumers
under Node with strict declarations, including an ES2022-only no-DOM consumer.
SDK integration passed 167 tests / 2,296 assertions and existing 103 installed CLI
checks. New terminal/Studio interaction follows separately; no new UI evidence is
claimed from these headless checks. Independent contract/migration-check intents
remain unconfigured; public API and ADR 0019 own the additive contract.

## Record Tools Terminal Evidence

Automation schema discovery includes `search` and `comment-batch`; installed
`banora search` checks file/stdin, literal/explicit-empty/case queries, field/game
filters, pagination and structured argument/limit errors. Packed Node CLI checks
portable multi-node preview/apply, unchanged source, exact `expectedSgf` and
per-comment guards, one-step Undo/selected location, saved SGF reopen and rejected
output publication. A returned search path past move 360 resumes and edits through
an actual subsequent installed request. Repeated whole-record operations share
eight calls per request; malformed/stale requests expose no partial record.

Terminal integration passed `check` (170 tests / 2,322 assertions, root/Svelte types,
builds, quality/boundaries/docs and packed SDK/CLI). Final installed CLI smoke passed
169 checks after adding explicit-empty query handling. The full production browser
suite passed on Chrome 154 after the shared controller/schema changes, covering
existing SDK/Studio/framework workflows. Studio search/select/batch UI remains a
subsequent integration, not evidence inferred from terminal or existing UI checks.
Other browser engines, physical devices and hosted CI were not executed. Separate
`contract`/`migration-check` intents are unconfigured; no DB migration is added.

## Record Tools Studio Evidence

After `build:examples`, `bun scripts/browser-smoke.ts --search-only` uses the same
production Playwright CLI consumer as the full browser suite. Both routes inspect
the actual downloaded SGF for four edited comments, unknown-property preservation
and `MN[700]`. The scenario searches multiple games/branches, navigates a late
position, selects across pages, previews/cancels/applies/clears comments, and checks
one-step Undo/Redo and export-baseline retention. It verifies source-change preview
invalidation, retained typed input, import selection reset, inert retained old result
buttons, empty-result page ranges, the 256-selection cap and aggregate-input refusal.

English/Korean/Chinese/Japanese labels retain literal authored before/after text.
The dialog is checked at 1440px and 320px, with keyboard focus/Escape, quick-menu
borrowing/restoration and separate result/diff scrolling. `search-controls.ts`
imports only public SDK exports. Focused CI routing covers that consumer and its
scenario; shared Studio/language/menu changes retain broader routing. No SDK public
API, DB, storage schema, dependency or hygiene change is introduced by this UI.
Independent `contract`/`migration-check` runners remain unconfigured; physical
devices, other browser engines and hosted CI execution remain unverified.

Studio integration passed `check`: 170 tests / 2,323 assertions, lint/format,
boundaries, builds, root/Svelte types, 108 documents / 340 links, packed SDK and
169 installed CLI checks. The full production browser suite passed on Windows
Headless Chrome 154, including this search scenario and existing consumer flows.
The final focused route also passed after giving search selection its own translated
caption and revoking preview approval synchronously on Close/navigation/Escape.
An earlier focused run caught delayed native-close cleanup retaining Apply briefly;
the cancellation fix preserves typed input and passes the same regression scenario.

## Explicit Diagnostic Journal Evidence

`packages/sdk/test/diagnostics.test.ts` projects actual controller and SGF failures
without changing controller state, maps unsupported game input to correction rather
than an assumed upgrade, and tests unknown/prototype-like codes without coercion.
It covers bounded eviction/retained summaries, immutable historical snapshots,
clear/nonreused IDs, cross-realm plain data, capacity shadowing, forged advice,
malformed-input atomicity, raw-text/fingerprint exclusion and accessor/proxy failures.

`check` passed 174 tests / 2,432 assertions, quality/boundaries/builds/root/Svelte
types, 110 documents / 351 links, packed SDK and 169 installed CLI checks. After
the unsupported-input recovery refinement, focused tests passed 4 cases / 110
assertions and final typecheck/lint/build/packed SDK smoke passed. Independent
Node consumers execute root/selective/no-DOM declarations and classic VM reports.
`@0disoft/banora/diagnostics` is additive; no controller/automation return contract,
DB, storage schema, dependency or hygiene change. Packed consumer runner and source
boundary classification include the new headless entrypoint.

Browser suites were not repeated for this isolated headless module; Studio does
not import it yet and the prior production suite covers the existing UI. No Studio
opt-in/download/help or CLI diagnostic-command evidence is inferred. Physical
devices, other engines and hosted CI/monitoring remain unverified. Separate
`contract`/`migration-check` intents are unconfigured. The operational guide now
uses real local commands and identifies the missing private security-report channel
instead of inventing a contact or a hosted collector.

## Studio Support and Diagnostic Evidence

`scripts/studio-diagnostics.test.ts` verifies default-off, no off-start timing,
one completion per attempt, epoch invalidation after clear/disable/re-enable/dispose,
optional clock failure, listener isolation and raw-text exclusion. The Studio model
is session-only and uses public SDK exports; no localStorage/IndexedDB consent or
diagnostic record is created.

After `build:examples`, `bun scripts/browser-smoke.ts --support-only` checks the
production consumer through Playwright CLI. The full suite calls the same scenario
and inspects the actual downloaded `banora.diagnostics/v1` JSON for a real SGF
failure and absence of authored/query/file content. The scenario checks navigation/
edit/search/batch evidence, report inspection/download/failure, unchanged record
dirty state, 64-event eviction, clear/disable/reload and consent changes during
delayed public File reads. Delaying File/URL APIs is fixture environment control;
no private SDK/controller or production test hooks are used.

Help discovery launches record dialogs, opens all indexed board-menu sections and
focuses theme/display size settings. Four locales, 320px layout, Escape/focus,
menu restoration and no remote requests are checked. The GitHub feedback link has
no prefill/referrer; read-only API inspection found Issues enabled on a private
repository, so public feedback access is not claimed. Current local template changes
have not been pushed. Separate `contract`/`migration-check` runners are unconfigured;
physical devices, other browser engines, hosted CI/telemetry and public release
remain unverified. No SDK API, DB/storage schema, dependency or hygiene changes;
browser/CI runners add a support-focused route and actual artifact inspection.

Studio integration passed `check`: 176 tests / 2,448 assertions, root/Svelte types,
builds, quality/boundaries, packed SDK and 169 installed CLI checks. The full
production suite passed shared consumer flows on Windows Headless Chrome 154.
Final focused support and locale routes passed the expanded menu/settings registry,
gutter refinement and authored `GN[Success]` preservation across all four languages.
Game headings/options remain authored text even when their value is a UI key.
Final root typecheck/lint, docs (111 documents / 353 links), file/permission signals
and whitespace checks passed. No broader engine/device or hosted execution is inferred.
