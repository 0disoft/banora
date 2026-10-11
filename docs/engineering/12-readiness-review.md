# Project Readiness Review

Status: active work, not a completion or release claim.

This review tracks all 72 questions in the delegated project-readiness request.
The product remains a framework-independent Go SDK with a local Studio reference
consumer. A working SDK capability, an executable example, a host integration
contract and a hosted service are different deliverables. Each row requires current
source and appropriate execution evidence before it can be closed.

## Delivery Sequence

Complete cohesive increments and commit each after its relevant checks pass:

1. Development bootstrap, environment diagnostics, safe cleanup, command discovery
   and executable dependency/quality boundaries.
2. Change-aware CI, supported-major updates and security gates, with local parity
   and explicit permissions/cost limits.
3. Studio draft recovery, versioned local preferences and backup/restore, including
   storage failure, invalid data and concurrent-tab behavior.
4. Record search, bounded batch editing and preview, preserving export, selection,
   Undo and invalid-input atomicity.
5. Redacted diagnostics, structured failure/operation evidence and actionable local
   help; fill operational runbooks with actual commands and ownership.
6. Measure representative performance and audit first-use, interruption, keyboard,
   small-screen and cross-feature workflows; fix observed defects.
7. Verify package/release preparation, migration/rollback paths, documentation
   synchronization and every row below against the final worktree.

Do not introduce accounts, a database, an always-running worker, remote telemetry
or a cloud service into the SDK. Where the question belongs to a host application,
verify the SDK integration boundary and document the host's concrete obligation.
This is an ownership decision, not evidence that such a service exists.

## Engineering and Operations

| ID  | Requested outcome                                | Current evidence / work to verify                                                                                  |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Reproducible tools and initial setup             | Bun/Node majors and lockfile exist; add bootstrap and executable environment checks.                               |
| 2   | Common run/build/check/cleanup commands          | Root package scripts exist; add discovery, setup and bounded cleanup.                                              |
| 3   | Module responsibility and dependency enforcement | Architecture and packed headless checks exist; add a source import gate.                                           |
| 4   | Design decisions and rejected alternatives       | ADRs 0001-0013 exist; record new readiness decisions and link their owners.                                        |
| 5   | Interface types, documents and compatibility     | Public declarations, automation schema and packed consumers exist; audit export/document synchronization.          |
| 6   | Validated configuration and safe secrets         | SDK options validate locally; ops templates need actual defaults and host secret boundaries.                       |
| 7   | Normal/error/boundary development fixtures       | Authored SGF, puzzles and analysis fixtures exist; index reproducible cases and reset paths.                       |
| 8   | Fast regression checks with repro cases          | Bun tests and focused browser scenarios exist; add readiness regression coverage.                                  |
| 9   | Change-aware CI and caching                      | No hosted workflow exists; implement bounded routing and cache policy.                                             |
| 10  | Stable updates within supported majors           | Manifest ranges/lockfile exist; automate reviewed update candidates and major promotion gates.                     |
| 11  | Format/static/forbidden-pattern/size rules       | Oxlint/Oxfmt exist; enforce dependency, quality and review-size policies.                                          |
| 12  | Error classes, messages, causes and retryability | Typed SDK reason/recovery projection implemented; consumer messaging and retry safety need integration.            |
| 13  | Structured operation identifiers/logs            | Explicit SDK journal generates bounded safe local evidence/IDs; Studio/terminal integration follows.               |
| 14  | Latency/failure/resource visibility and alerts   | SDK retained-window outcome/timing summaries and real ops guide implemented; hosted monitoring remains host-owned. |
| 15  | Timeout/retry/rate limits/failure containment    | Analysis cancellation/capacity and host process deadlines exist; audit disconnect/retry boundaries.                |
| 16  | Versioned data, migration and recovery           | SGF and automation versions exist; version new local drafts/preferences and test invalid/future versions.          |
| 17  | Rebuildable infrastructure and permissions       | SDK needs no server infrastructure; CI/static artifacts must be declarative and least-privilege.                   |
| 18  | Pre-release verification environment             | Production examples and isolated installed consumers exist; provide a repeatable release-preparation path.         |
| 19  | Release verification and rollback automation     | Packed checks exist; operational release/rollback documents are empty scaffolds.                                   |
| 20  | Feature activation and emergency disable         | Explicit optional modules/providers and read-only options exist; audit capability control without remote flags.    |
| 21  | Automatic backups and verified restore           | SGF export exists; add local draft backup/restore and document portable backup limits.                             |
| 22  | Executable operational procedures                | Existing ops documents are placeholders; replace with actual tools and recovery steps.                             |
| 23  | Secret/dependency/permission security gates      | Input-boundary tests exist; add repository/CI security checks and documented vulnerability reporting.              |
| 24  | Code/document synchronization                    | Relative-link/docs and packed declarations checks exist; add command/export policy evidence.                       |

## Product Workflows

| ID  | Requested outcome                        | Current evidence / work to verify                                                                                                           |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 25  | First-run guidance to a first result     | Standalone guide and Studio exist; audit clean setup and add concise contextual help.                                                       |
| 26  | Trial space and samples                  | Static Studio/viewer/puzzle/analysis consumers exist; verify built artifacts and sample reset.                                              |
| 27  | Templates for recurring work             | New record/example record and standalone app exist; index templates and portable automation recipes.                                        |
| 28  | One-place search and navigation          | Whole-record SDK/CLI/Studio search navigates beyond tree limits; function/settings discovery remains separate work.                         |
| 29  | Bounded batch edit/export                | SDK/CLI/Studio support guarded comment batches with preview and one-step Undo; exported SGF preserves all selected edits.                   |
| 30  | Autosave and resume                      | SDK/terminal checkpoints and Studio local drafts/guarded restore preserve records, baselines and selected locations.                        |
| 31  | Compare changes and Undo                 | Controller Undo/Redo, position comparison and batch/recovery interactions have unit and production browser evidence.                        |
| 32  | Preview before destructive/bulk changes  | Inspectable comment previews require explicit atomic apply; source changes invalidate approval without losing typed input.                  |
| 33  | Import/export across tools               | SGF/UTF-8 and diagrams/CLI exist; verify new persistence and batch paths preserve unknown properties.                                       |
| 34  | Share and collaborative review           | Embedded links/comments exist; collaborative authority remains host-owned, with explicit privacy/permission contracts.                      |
| 35  | Personal workspace/preferences           | Twelve versioned scalar settings, safe legacy migration and explicit bounded reset preserve record semantics; browser evidence in ADR 0018. |
| 36  | Completion/action-required feedback      | Live statuses/dirty dialog exist; audit actionable feedback and pending-work visibility.                                                    |
| 37  | Saved recurring multi-step automation    | JSON automation/CLI exists; provide validated reusable recipes; scheduling remains host-owned.                                              |
| 38  | Roles and access control                 | Local SDK has no users; controlled intentions/read-only are presentation only, hosts enforce authorization.                                 |
| 39  | Review/approve/apply important changes   | Local bulk preview requires explicit apply and preserves Undo; multi-user approval authority remains host-owned.                            |
| 40  | Operator management                      | No hosted accounts/jobs exist; local diagnostics/recovery tools must avoid a fictitious admin service.                                      |
| 41  | Redacted support bundle                  | SDK reports exclude authored data/raw errors/fingerprints; add explicit Studio opt-in/inspect/clear/download.                               |
| 42  | In-product examples/help                 | Tooltips exist; provide concise opt-in help near relevant actions, not permanent explanatory prose.                                         |
| 43  | Bug/feature feedback and status          | GitHub templates exist; connect help to the real repository issue/feedback channel.                                                         |
| 44  | Usage/failure dashboard                  | Explicit bounded SDK summaries and host instrumentation guidance implemented; local inspection UI follows.                                  |
| 45  | Progress/cancel/retry for long work      | Analysis session and file cancellation gates exist; audit bounded import/batch/backup work and status.                                      |
| 46  | User-selectable backup/restore           | Add local draft restore and portable backup controls with validation and replacement guards.                                                |
| 47  | External API/webhook/service integration | Host snapshots/intentions and provider/transport interfaces exist; document authorization/deadline/event bridge ownership.                  |
| 48  | Extension architecture                   | Selective modules, framework adapters, overlays and providers exist; verify no extension requires private imports.                          |

## End-to-End Audit

| ID  | Requested outcome                               | Evidence to collect before closing                                                                                 |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 49  | Reach the user's actual desired result          | Browser open/search/edit/batch/save/reopen workflow and independent installed consumer.                            |
| 50  | Find placeholder or manual-only implementations | Inspect ops scaffolds, offline illustrative analysis, publication status and exact current claims.                 |
| 51  | Connect individually working features           | Search/selection/comments, recovery/Undo/export, batch/scoring/sharing and async cancellation combinations.        |
| 52  | First meaningful outcome without explanation    | Clean-start Studio/template and standalone setup followed by saved/reopened SGF.                                   |
| 53  | Empty/no-result/failure next actions            | Search miss, empty record, no draft, invalid storage, rejected batch and unavailable provider fixtures.            |
| 54  | Preserve invalid input for correction           | Invalid imports/options/batch text preserve active record and user input; corrective messages are concrete.        |
| 55  | Resume after reload or close                    | Reload/navigation selection, saved draft recovery and explicit restore/discard tests.                              |
| 56  | Cancel and Undo risky actions                   | Replacement guards, batch preview cancel, one-step batch Undo and cancelled restore/export.                        |
| 57  | Duplicate/concurrent operations                 | Repeated apply/save, late async completions and two-tab draft ownership/conflict fixtures.                         |
| 58  | Distinguish waiting/retry/failure               | Analysis/loading/cancel/error, interrupted transport and storage/import failure recovery.                          |
| 59  | Accurate displayed/stored calculations          | Board/SGF/locator round-trips, branch move counts, rules/score components and versioned settings.                  |
| 60  | Real permission boundaries                      | Host authority/read-only contracts, restricted CI tokens and untrusted input/external URL boundaries.              |
| 61  | Avoid sensitive data in logs/storage/output     | Default support bundle contains no record text/paths/secrets; local draft privacy/delete behavior explicit.        |
| 62  | Complete data lifecycle                         | Import, local draft, backup, portable export, draft/preferences deletion and host account-deletion obligations.    |
| 63  | Keyboard/zoom/assistive workflows               | Real keyboard controls, focus restoration, named search/batch/recovery actions, zoom and status announcements.     |
| 64  | Small screens/long text/languages               | English/Korean/Chinese/Japanese and narrow viewport fixtures for changed controls and menus.                       |
| 65  | Measure and improve real bottlenecks            | Representative parse/navigation/search/render benchmarks with runtime/workload data; optimize measured hot paths.  |
| 66  | Control operating cost growth                   | No SDK network/background loops; one bounded CI route per change, caches, cancellation and bounded storage/search. |
| 67  | Trace a reported failure                        | Reproduce from diagnostic operation IDs/reasons/environment without automatically sharing private content.         |
| 68  | Routine operator tasks without code edits       | Doctor, safe cleanup, backup/restore, validation and release-preparation commands with actionable output.          |
| 69  | Verified failure recovery                       | Corrupt/future draft, quota denial, cancelled replacement, transport EOF and release rollback rehearsals.          |
| 70  | Fresh install/update/release and rollback       | Frozen install, tool major checks, independent packed consumer, update gate and reproducible release artifacts.    |
| 71  | Match user-facing promises to reality           | README/spec/API/ops/help report only implemented behavior and exact verified boundaries.                           |
| 72  | Next three priorities and deferred work         | Re-evaluate after implementation; document ranked remaining work and reasoned ownership/defer decisions.           |

## Completion Rule

Documentation alone does not close a behavioral row. Record executed commands,
their result and their coverage limits. Hosted workflow configuration alone is not
a successful GitHub run or enabled branch protection. No publication, public demo,
real device, cloud collaboration or production-monitoring claim follows from a
local test. Keep this review active until every question has a verified answer and
required in-scope implementation is complete.

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
