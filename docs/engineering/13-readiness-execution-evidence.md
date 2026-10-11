# Readiness Execution Evidence

Status: historical scoped increments; not a completion or release claim.

The [active readiness review](12-readiness-review.md) owns the 72-question worklist
and completion rule. All prior increment records are preserved here. Counts,
coverage limits and next-step notes refer to their specific execution time; inspect
current source/commands for a final completion audit.

## Executed Increments

### Development foundation

Implemented `mise.toml`, `setup`, `doctor`, machine-readable `commands`, preview-first
artifact `clean`, classified `boundaries`, explicit forbidden-code lint rules and
root command references checked from actual package scripts. Contributor/setup
guides and [ADR 0014](../adr/0014-development-bootstrap-and-boundary-gates.md) own
these choices. The SDK public API and runtime dependency graph are unchanged.

On Windows with Bun 1.4.2 and Node 24.14.0:

- `bun run setup` passed with the reviewed lockfile unchanged.
- A separate empty dependency workspace containing the actual manifests/lockfile
  installed 89 packages through the same setup command, passed all 17 declared
  dependency/tool checks and retained an identical lockfile.
- `bun run check` passed 143 tests / 1,851 assertions, declarations/headless packed
  SDK consumers and 90 installed CLI checks before the final diagnostic refinements.
- Focused policy fixtures cover unsafe dependency directions, literal dynamic/
  CommonJS imports, framework/private-import violations, comments/shebangs, stable
  version acceptance and preview/linked-target cleanup behavior.

The mise installer itself has not been run on a fresh OS; automatic tool installation
is configured from its documented installer contract. No browser, hosted CI or
publication evidence is implied by this development-tool increment. Remaining
rows and delivery increments are still active.

### Standalone consumer regression

The complete local CI route exposed a stale starter browser selector: `#viewer svg`
matched the board plus the newer comment-indicator icons. The starter fixture now
selects `svg[data-board-width]` consistently for desktop keyboard and mobile touch.
The already independently installed/built consumer passed the focused production
browser rerun: file open, old/new variations, comments/Undo, replacement guards,
real SGF download/reopen, invalid input and keyboard/emulated touch. The SDK and
standalone application implementation did not change.

### Change-aware CI and security/update gates

Implemented the one-job GitHub workflow, local `ci:plan`/`ci:run` parity, grouped
monthly supported-major update candidates and a monthly security-only audit.
The file gate redacts credential content and rejects private-file/high-signal key
patterns, write permissions, persisted checkout credentials, secret injection and
privileged PR triggers. This limited gate does not replace a complete security
review. [ADR 0015](../adr/0015-change-aware-ci-and-supported-major-updates.md) and
[CI policy](../ops/ci.md) own the behavior and costs.

Executed on the current Windows/Bun/Node environment:

- The docs-only local CI route completed without builds/browser work.
- The complete selected route passed `check` (145 tests / 1,888 assertions at that
  snapshot, installed SDK and 90 installed CLI checks), file security signals,
  registry audit (165 packages, no reported vulnerabilities), independently
  installed React/Vue/Svelte declarations/SSR and the entire production browser
  suite. It stopped on the starter-selector defect above; the corrected starter
  subsequently passed its own complete browser flow without reinstalling.
- Final planner/security fixtures passed 39 assertions, including starter/adapter
  test routing, combined optional scopes, missing/invalid diff fallback, real root
  commands and dangerous workflow/secret-injection refusal. Typecheck also passed.

The complete route has not been rerun from its first step after the fixture-only
fix; unchanged passed components were retained and the failed component was rerun.
No successful hosted GitHub run, enabled Dependabot/branch protection or Linux
compatibility is claimed. Those require external-state evidence after a reviewed
push; the overall readiness goal remains active.

### Portable SDK and terminal recovery

Implemented the headless checkpoint parser/schema, `createCheckpoint()` and
guarded `loadCheckpoint()` with both working SGF and acknowledged export baseline,
collection/branch selection and explicit legal-play rules. Recovery preserves
semantic dirty state, creates a new generation, clears session-local Undo/Redo and
invalidates pending export tickets. Invalid/future/oversized data and guarded
replacement retain the active record, edit group and tickets. Creating a checkpoint
does not acknowledge an SGF download. A two-record serialization cache avoids
repeated SGF serialization during navigation without retaining all edit versions.

Automation/installed Node CLI can emit checkpoints explicitly and resume them
through the same checked request schema. Conflicting input fields fail; response
payloads do not include a second document unless requested. The SDK owns no storage
or implicit network access. [ADR 0016](../adr/0016-portable-record-recovery.md),
[recovery](../sdk/recovery.md), public API, automation and product specification
own the additive format and its privacy/limits/history boundaries.

Executed on Windows/Bun/Node:

- `check` passed 151 tests / 2,118 assertions, Oxlint/Oxfmt, module boundaries,
  SDK/adapter/CLI builds, root/Svelte types, docs and isolated packed SDK consumers.
- Installed Node CLI passed 103 checks, including persisted checkpoint request,
  restored content/baseline, real SGF output and rejection of future versions.
- Production example build and the entire Chrome 154 browser suite passed existing
  editing/export/Undo/import/sharing, framework/classic, keyboard/touch and optional
  feature flows after the shared controller/export changes.

Studio autosave, quota/failure feedback, persistent preferences, multi-tab storage,
backup/restore/deletion UI and browser interruption recovery remain pending; this
primitive does not close those rows. No database, public runner command, deployment
or hosted-CI change is implied. Physical-device/other-browser coverage and hosted
CI execution remain unverified. The next increment is the Studio host integration;
the complete 72-question objective remains active.

### Studio local drafts, backups and guarded recovery

Implemented origin-local IndexedDB drafts and the Studio consumer UI above the
board and in its menu. Interacted-with records/selection save after 500ms; untouched
samples stay ephemeral. Payload/metadata commit atomically, and distinct page/record
owners plus transaction revision checks prevent competing tabs from taking over
each other's work. Restore preserves the original draft and creates a session copy.
The cap is 20 without silent eviction. Delete requires confirm/cancel; stale
revisions require refresh. Current/selected drafts can be backed up explicitly;
corrupt/future versions can be downloaded raw and deleted without replacing work.

Storage error callbacks now preserve quota classification and abort both stores;
ordinary record editing, Undo, SGF export and portable backup stay available on
failure. Feedback is gated by the current owner/operation, and save requests are
serialized. Routine status avoids live-region chatter. Nested modal replacement
exports append their download action within the active modal. English, Korean,
Chinese and Japanese controls share the same operations and responsive layout.

Executed on Windows/Bun/Node/Chrome 154:

- `check` passed 156 tests / 2,157 assertions, all quality/boundary/build/type/docs
  gates, packed headless/root/global SDK consumers and 103 installed CLI checks.
- Focused recovery passed actual IndexedDB, close/reopen/selected dirty branch,
  new-session Undo, two simultaneous pages, injected quota denial/atomic rollback,
  capacity/deletion/retry, stale deletion, invalid/future entries and real downloaded
  backups/SGFs. Cancel and Export & continue protected the outgoing record.
- Focused menu passed borrowed recovery-modal controls, restoration, keyboard,
  existing Undo/scoring and emulated mobile zoom. Recovery screenshots at 320px
  and 1440px were inspected and fit the available viewport.
- The entire production browser suite also passed after integration, including
  recovery, existing imports/encoding, all consumers and optional features.

No SDK API, hosted database, repository hygiene or package release changed in this
increment. The new database is Studio-owned/local version 1. Browser runner and
affected CI routing now include `--recovery-only`. Owning product/API/runtime-flow,
compatibility/recovery and ADR 0016/0017 documents were synchronized.

Abrupt process-kill/OS durability, physical devices, other browser engines and hosted
CI remain unverified; browser-local drafts are not a cloud/file backup guarantee.
Consolidated versioned preferences/reset, whole-record search/batch preview,
redacted diagnostics/help/operational tools, measured performance and the remaining
release/audit rows still need work. The full objective remains active.

## Execution: Studio Preferences Integration

Twelve validated scalar preferences now restore before Studio's board/playback
mount. Language, board display size/theme, numbering, rotation/reflection, touch,
animation, playback interval and autosave share one consumer-owned model.
Per-field versioned writes preserve independent choices from another tab;
valid legacy values migrate only after a successful new write. Unknown/corrupt
values remain intact until explicit reset. Unreadable autosave starts off, while
unavailable storage still permits session changes and ordinary record editing.
The envelope limit measures UTF-8 bytes, including multibyte input.

Settings in the board menu exposes explicit reset. Reset applies browser-language/
presentation defaults and pauses playback without changing SGF, selection, Undo,
dirty/export baseline, local drafts or unrelated storage. All four translations
fit the 320px menu; the screenshot was inspected. SDK APIs and IndexedDB draft
version/schema remain unchanged; no repository hygiene or dependency changes.
Runner/affected CI routing now includes `--preferences-only`.

Local evidence:

- `check` passed 160 tests / 2,204 assertions, quality/boundary/build/type/docs,
  packed SDK consumers and 103 installed Node CLI checks. The subsequent UTF-8
  bound refinement passed five focused preference tests / 56 assertions and
  root typecheck/lint.
- Focused preferences and the full production browser suite passed migration,
  actual presentation, two tabs, reset/Undo/draft retention, denied storage,
  invalid/future preservation and exact downloaded checkpoint comparison.
- Focused animation passed after removing its obsolete fixed-initial-rotation
  assumption; the full browser suite also verifies a real changed transform.
- Documentation links, whitespace and local file/permission security signals passed.

Product specification, recovery guidance, ADR 0017/0018 and validation contract
are synchronized. Physical devices, non-Chromium policies, hosted CI and separate
unconfigured `contract`/`migration-check` commands remain unverified. Actual local
migration behavior is exercised by unit and production browser fixtures.
Whole-record search/batch preview, redacted diagnostics/help/operational tools,
measured performance and the final release/all-72 audit remain active work.

## Execution: Record Search and Comment Batch SDK

Implemented headless literal property search across all games/branches with
accurate full counts, bounded pagination/portable locators and iterative traversal
independent of the visible tree. Added controller-owned immutable comment previews,
expected-text checks and atomic cross-game application preserving current selection,
rules, generation, export baseline and one-step Undo. Invalid, stale or foreign
inputs return no partial edits; no-op batches retain groups/Redo. Unchanged
subtrees are shared and limits are validated before issuing a preview.

`check` passed 167 tests / 2,296 assertions, existing quality/boundary/build/types,
108-document checks, installed root/headless/classic SDK consumers and existing
103 Node CLI checks. Deep paths, limits, raw unknown-property escaping, issued
preview identity/freshness, tickets/groups and atomic notification/Undo are covered.
The selective `@banora/sdk/record-search` API and controller methods are additive;
no DB, persistence/hygiene or dependency change. The module boundary classification
and packed-consumer runner include new headless functionality.

Product/API/compatibility, package README, ADR 0019 and validation are synchronized.
Terminal schema/commands and Studio search/select/preview/apply controls are the
next integration steps; no shipped UI or hosted evidence is claimed here. The
full 72-question objective remains active, including later measured performance,
diagnostics/help, release operations and requirement-by-requirement final audit.

## Execution: Record Tools Terminal Integration

Automation discovery now exposes whole-record `search` and portable `comment-batch`
operations. Preview-only diffs leave working SGF/history unchanged; application
keeps selection and supports one-step Undo within the request. Optional exact
canonical `expectedSgf` conditions guard cross-request review against unrelated
intervening content changes, while per-comment `expectedText` guards selected text.
Missing/duplicate/stale or over-limit changes fail without partial output. Whole-
record operations share eight calls per request. The synchronous schema matcher
now enforces the added property-pattern/minimum-count/primitive-uniqueness constraints.

The `banora search` convenience command accepts file/stdin, literal or omitted/
explicit-empty queries, field/game filters, case sensitivity and pagination. Installed
Node checks exercise branch targets, previews, guarded edits, Undo, saved/reopened
SGF, unchanged input files, failed output protection and a returned path past move
360 used in an actual later request. Issued SDK preview objects and live application
authority do not cross process boundaries; canonical source comparison is explicit.

`check` passed 170 tests / 2,322 assertions and packed public/headless/classic SDK
consumers. Final CLI smoke passed 169 installed Node checks; the full production
Chrome browser suite passed existing Studio/framework/controller workflows after
the shared implementation change. Docs, types, lint/format, boundaries and local
file/permission signals passed. SDK JSON/CLI discovery is additive within existing
v1; no DB, persistence/hygiene or dependency changes. Packed CLI runner coverage
increased; product/API automation/compatibility, ADR 0019, READMEs and validation
were synchronized. Broader devices/engines/hosted CI and separate unconfigured
contract/migration-check commands are not claimed.

Studio search/select/preview/apply is recorded in the next execution entry.
Diagnostics/help/ops, measured performance, release/migration/rollback and the
final all-72 audit remain active; this is concrete progress, not goal completion.

## Execution: Studio Record Search and Comment Preview

Added a native search dialog above the board and in its quick menu, consuming only
public SDK search/controller exports. Whole-record or comment search spans all
games/branches; paged results navigate independently of visible tree limits. Users
select up to 256 positions across pages, preview a common comment replacement or
clear, then apply it as one Undo unit without moving the current position.
Closing/cancelling/source changes invalidate approval while preserving typed input.
Import resets old selection and makes retained old result buttons inert.

Selection retains only node identity and small display metadata, rather than every
long portable path. Closed dialogs do not rescan every ordinary comment edit;
deleted selections are pruned when needed. Result and diff regions scroll separately
so large result pages do not bury the editing controls. Empty/reduced result sets
reset or clamp pagination. All four supported languages translate interface labels
while keeping authored before/after text literal.

The production scenario covers collections/branches, move 700, page selection,
preview/cancel/apply/clear/Undo/Redo, actual downloaded SGF, freshness/import guards,
aggregate limits, four languages, keyboard focus, 320px display and menu restoration.
Source documents updated: product specification, ADR 0019, SDK README/compatibility,
validation and this review. No SDK API, DB, storage/hygiene or dependency changes;
the browser runner adds a focused route and shared download inspection, and the CI
planner routes search-only source changes to it.

`check` passed 170 tests / 2,323 assertions, quality/boundaries/builds/root/Svelte
types, 108-document checks, packed SDK consumers and 169 installed CLI checks.
The full production browser suite passed on Windows Headless Chrome 154,
including the new search scenario and existing SDK/Studio/framework consumers.
Final focused search smoke passed after the selection-caption update and synchronous
Close/navigation/Escape approval revocation. The focused route caught delayed native
close cleanup briefly retaining Apply; immediate cancellation fixes that gap without
discarding typed input. The runtime refinement also passed root typecheck.

Record-data search and comment batching now have SDK, terminal and Studio consumers.
Function/settings discovery is still separate work under question 28. Diagnostics/
help/ops, measured performance, release/rollback and the final all-72 audit remain
active. Physical devices, other browser engines and hosted CI are not claimed.

## Execution: Explicit Redacted Diagnostic SDK

Added optional headless `@banora/sdk/diagnostics`, root/classic exports and readonly
typed contracts for bounded local operation evidence. Hosts explicitly submit fixed
operation/status/domain/code values and optional rounded durations; no automatic
record observation, timer, global error interception, console, persistence or
network is installed. Unknown codes are discarded to `unknown`. Typed SDK reason
maps exhaust controller/SGF/analysis failures and reconstruct manual recovery advice.
Unsupported non-Go/FF4 input requires correction, not an assumed package upgrade.

Generated local IDs, 1–256 recent-event retention, eviction counts, immutable
snapshots and retained-window outcome/timing summaries support issue correlation
and local inspection. Clear drops current history without changing caller-held
snapshots or reusing already displayed IDs. Environment accepts only explicit
family/major/locale values, excluding raw UA/URL/path/version text and authored
content. Invalid extra fields/accessors/proxy exceptions fail atomically with fixed
messages; unknown text and forged retry advice cannot enter a report.

`check` passed 174 tests / 2,432 assertions, builds, root/Svelte types, quality,
boundaries, 110-document checks, packed root/selective/no-DOM/classic SDK consumers
and 169 installed CLI checks. Final recovery-policy refinement passed 4 focused
cases / 110 assertions, typecheck/lint and rebuilt packed SDK smoke. Browser checks
were not repeated: no Studio code imports the new module yet. Broader devices,
hosted telemetry/CI and standalone contract/migration runners are not claimed.

Updated product/API/package/compatibility/validation sources and ADR 0020; added
the diagnostic consumer guide and replaced the observability placeholder with actual
commands, privacy/retention and host/maintainer responsibilities. No DB, dependency,
storage/hygiene or existing result-contract changes. The packed SDK runner and
headless module classification cover the new public export.

Next milestone-5 increments: Studio opt-in/inspect/clear/download and concise help/
feature discovery, terminal diagnostic workflows, actual incident/release/recovery
procedures and a verified private vulnerability-report channel. Measured performance,
release/rollback and all-72 final audit remain active; this SDK capability does not
close a consumer workflow or prove hosted monitoring.

## Execution: Studio Help and Opt-In Diagnostics

Studio Help now finds record actions, theme/size settings and board-menu sections,
launching their actual existing controls. Localized concise guidance and a repository
Issues link are shown only when requested. Diagnostics starts off, lives in memory
and resets on reload. Explicitly instrumented main edits/navigation, import/export,
checkpoint restore, autosave, backup and search/batch attempts feed safe SDK events.
Users inspect fixed codes/recovery, recent-window summaries and JSON, clear/disable
or explicitly download. No authored data or raw exception is passed to the journal.
Diagnostic download does not acknowledge SGF export or change record/draft/preferences.

Consent generations suppress completions from work begun off or before clear/
disable/re-enable/disposal. File import captures consent before reading. Optional
timing and inspection failures cannot block the underlying operation; instant
command reports omit timing. Closed Help does not rebuild report summaries on
every event. Temporary download URLs are bounded and disposed/revoked. Other demo
pages and uninstrumented scoring/sharing/texture/playback actions are not claimed
as usage collection; no background analytics, provider service or global error hook.

Production fixtures check actual SGF failure projection and downloaded JSON privacy,
dirty/source retention, successful/failed downloads, eviction, clear/disable/reload,
delayed-file consent transitions, all indexed menu/settings routes, four locales,
320px display, focus/Escape/restoration and zero remote requests. The full browser
suite passed shared main/recovery/search/controller and framework consumers; the
expanded helper registry/gutters have final focused coverage. `check` passed 176
tests / 2,448 assertions, builds/types, quality/boundaries, docs and packed SDK/CLI
(169 installed CLI checks). Final source-document checks follow the UI evidence.

Changed sources: product spec, SDK/API/compatibility/diagnostic guide, ADR 0020,
observability, issue templates, validation and this review. No public SDK API, DB,
storage schema, dependency or hygiene change. Browser/CI runners route isolated
support changes and inspect actual files. Hosted CI, physical/other-browser and
terminal diagnostic workflows remain unverified or incomplete; contract/migration
runners are unconfigured. GitHub API confirms Issues enabled but repository private:
public feedback access and publishing local template changes remain release work.
Private security reporting, concrete remaining ops/release procedures, measured
performance and the all-72 completion audit remain active; no completion claim.

Final support-focused and existing localization browser routes passed after fixing
authored game-name options that matched UI catalog keys. `GN[Success]` now stays
literal in the heading and game selection across all four languages. No authored
record data was changed. Final root typecheck/lint, 111-document/353-link checks,
file/permission signals and whitespace checks passed after synchronized documentation.

## Execution: Terminal Diagnostic Reproduction

Added root/selective/classic `diagnoseAutomation` and typed safe response, plus
`banora diagnose --request FILE|- --output FILE --force` discovery. The same checked
engine executes once on isolated state; its internal optional journal records actual
completed import/restore/navigation/operation/output/checkpoint stages. SDK failures
retain earlier isolated successes and zero-based failure position, never authored
output or raw exceptions. Normal automation/checkpoint response contents remain
compatible. Schema exceptions now return a structured failure; diagnostic execution
never reads arbitrary exception messages, including accessors. Typed automation and
scoring diagnostic policies preserve known codes/recovery.

Reports retain 256 recent events with explicit eviction, immutable snapshots and
retained-window summaries. SDK environment is explicit and validated before actions;
no SDK clock/I/O is installed. The CLI projects actual Node major/platform family
and rounded SDK execution duration, with no path/identity/raw version text. Its
distinct diagnostic envelope exposes only fixed transport codes. Explicit report
publication saves successful or SDK-failed evidence atomically, protects input aliases,
requires force for an existing output and retains SDK evidence on publication failure.
Usage/read/JSON failures publish no file. No authored file or remote endpoint is changed.

`check` passed 182 tests / 2,491 assertions, quality/boundaries, builds, root/Svelte
types, 111 documents / 358 links, packed root/subpath/no-DOM/classic SDK and 222
installed Windows Node CLI checks. New fixtures prove single execution, environment
prevalidation, actual successes/failure location, scoring/restore/checkpoint/snapshot,
bounds, private-data/error-accessor exclusion and transport/publication behavior.
Browser suites were not repeated: no Studio/renderer/framework source or automation
consumer changed; previous production coverage remains distinct from these terminal
fixtures. macOS/Linux executable, physical-device and hosted execution remain unverified;
standalone contract/migration runners are unconfigured.

Updated owning product/API/automation/diagnostic/compatibility contracts, ADR 0020,
package/agent guidance, observability and validation. SDK/CLI additions are explicit;
no DB, storage schema, dependency, hygiene or CI runner changes. Packed evidence
runners were extended. Remaining milestone work is concrete incident/release/recovery
procedures and a verified private reporting channel, measured performance and the
all-72 final audit. Local diagnostic consumers do not establish hosted monitoring,
publication or goal completion.

## Execution: Operational Recovery Checks and Runbooks

Added repository `ops --help`, `recovery-check --input FILE|-` and `drill-recovery`,
using built public SDK exports and shared Studio metadata/64 MiB backup limits.
File/stdin input is bounded UTF-8 JSON; raw checkpoints and Studio backups restore
into a disposable controller. Canonical working/export-baseline documents, saved
location/rules, dirty state and cleared prior history are compared. Only fixed
checks, format, dirty and outcome are returned, never authored data, filenames/paths
or raw errors. No input, browser storage, live app, provider or network is changed.

The committed study drill exercises serialized restore, corrupt/future checkpoint
preservation, dirty replacement guards, explicit replacement and post-restore Undo.
Actual Bun processes verify discovery, files/stdin/BOM/invalid UTF-8, misuse, safe
failure codes and unchanged input bytes. Existing actual production-download
artifacts `recovery.banora.json` and `recovery-denied.banora.json` pass the new
command as Studio backups; a file hash confirms the original stays unchanged.
`recovery-future.banora.json` is rejected with expected exit 3. These are fixture
artifacts, not private user backups or physical-device/disk durability evidence.

Replaced empty operational, configuration, secrets, incident and backup documents
with concrete roles/defaults/actions, storage/consent/retention boundaries and actual
commands. No fictional credentials/contact, hosted team/SLA, numerical RTO/RPO or
cloud backup is introduced. Private reporting, named release handoff and actual
release/rollback preparation remain unresolved explicit gates. ADR 0021 owns the
tooling decision; product/recovery/development/agent/validation references are aligned.

`check` passed 185 tests / 2,573 assertions, quality/boundaries, builds, root/Svelte
types, 112 documents / 379 links and packed SDK/CLI consumers (222 installed CLI
checks). Read-only doctor and real help/drill commands also pass. CI routes isolated
operations-script edits through existing root checks without browser extras; package
manifest changes still conservatively select the broader route. Browser, physical
disk/kill, other engines and remote rollback were not repeated/proven by this scope;
UI/storage contracts are unchanged. Contract/migration runners remain unconfigured.

No public SDK/CLI API, DB/storage schema, dependency or hygiene change. Root command,
test runner coverage and CI planner routing were added. Remaining work includes
release/rollback tooling, private-report access, measured performance and the full
72-question current-state audit; the goal remains active.

## Execution: Measured SDK Performance and Navigation Optimization

Added `bun run perf --output FILE` and Node public-artifact measurements for the
committed study and authored 300-/5,000-move 19x19 records. Eight cases per workload
measure parse/open/serialize, main-line/tail navigation, comment search/batching and
checkpoint restore. One warm-up/five fresh samples retain raw timings and descriptive
min/median/max, workload counts/bytes, actual runtime/source digest and a process
memory snapshot. Setup/verification/disposal are excluded; navigation success checks
are included. Reports contain no authored record content/path. Existing output and
input aliases cannot be overwritten. No timing threshold or repeated benchmark job
was added to default CI; focused tests verify correctness and lifecycle.

Tooling was committed as `a51f255` after `check` passed 187 tests / 2,594 assertions,
types/builds/quality/docs and packed SDK/CLI (222 installed CLI checks). Baseline
source was `2406f2b` plus tooling-only edits. The dominant long navigation case led
to one complete path per state and lazy initial-position construction after a
cached ancestor lookup. The same 128-position cache/eviction and edit/Undo/import/
checkpoint invalidation remain; complete immutable paths and superko history are
retained. No public state/API, DB/storage schema, dependency or hygiene change.

Same-host Node 24.14.0 Windows x64 medians: 5,000 sequential commands 1,032.73→484.49ms
(53.1% observed reduction); 40 tail commands 13.99→7.34ms (47.5%). The 300-move
sequential case fell 8.60→6.57ms. The tiny study sequential median rose ~0.03ms;
no every-operation/device/frame/peak-memory improvement is claimed. Before/after
workload metadata matches and the optimized controller digest matches the report.
The owning [performance evidence](14-sdk-performance-evidence.md) preserves exact
values, method/ranges, source hashes, control-case variation and unmeasured boundaries.

New replay tests compare warm/evicted state to fresh serialized replay and cover
captures, pass prisoners, setup, MN, branches/collections, read-only inspection,
immutable paths and cache invalidation. Final `check` passed 189 tests / 2,681
assertions, builds/types/quality/boundaries/docs and packed SDK/CLI. The complete
production browser suite passed Chrome 154 Studio/reference/framework flows,
recovery/search/support, editing/Undo/export/reopen, rule and lifecycle paths.
Functional browser checks are not paint/frame performance evidence.

Updated performance budget/evidence, public API implementation notes, development/
validation guidance and this record. Root opt-in performance command and its tests/
CI planner routing were added; browser runner/workflow permissions are unchanged.
Standalone contract/migration runners are unconfigured. Physical/low-spec/other
engines, paint latency and memory peak remain unmeasured. Release/rollback tooling,
private reporting access and the 72-question final audit remain active.

## October 12: Notification Failure Privacy

Source review found three inconsistent SDK notification catch paths: the record
controller and puzzle state/event publication forwarded arbitrary thrown host
values to `console.error`. Such values can contain private comments, filenames or
provider messages. Other SDK console failure paths already used fixed labels.
These three paths now match that policy without inspecting the exception. Immediate
subscription failures retain their existing caller-owned throw/unregistration
semantics. This is a bug fix, not a new global error collector or diagnostic API.

Focused tests passed 25 cases/245 assertions across controller and puzzle tests.
New cases verify exact one-argument fixed console labels, zero reads of private
error accessors, continued later notification delivery, edit Undo/dirty baseline and
puzzle hint/restart state. Latest root `check` passed 195 tests/2,720 assertions,
lint/format/boundaries, SDK/adapter/CLI builds, root/Svelte types, 116 documents/411
relative links, public SDK/classic declarations and installed Node CLI's 222 checks.
The owning public API and observability contracts now describe fixed notification
labels and immediate subscription behavior.

The full retained-artifact browser/adapter/starter run immediately before this
three-path logging fix belongs to source `2b8b67e`, as recorded in
[release evidence](15-release-preparation-evidence.md). It is not a prepared bundle
of this later source. Browser repetition was skipped for the logging-only change:
no DOM/UI/event types or committed-state behavior changed, and the actual callback
failure paths are covered headlessly. Physical devices, other browser engines and
hosted publication remain unverified. No public API signature, DB, saved-data
schema, dependency, repository hygiene or runner changed in this increment.
The bugfix/SDK/test-hardening procedures were applied. Private reporting and the
current-source all-72 audit remain active work.
