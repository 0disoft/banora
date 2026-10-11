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

| ID  | Requested outcome                                | Current evidence / work to verify                                                                               |
| --- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| 1   | Reproducible tools and initial setup             | Bun/Node majors and lockfile exist; add bootstrap and executable environment checks.                            |
| 2   | Common run/build/check/cleanup commands          | Root package scripts exist; add discovery, setup and bounded cleanup.                                           |
| 3   | Module responsibility and dependency enforcement | Architecture and packed headless checks exist; add a source import gate.                                        |
| 4   | Design decisions and rejected alternatives       | ADRs 0001-0013 exist; record new readiness decisions and link their owners.                                     |
| 5   | Interface types, documents and compatibility     | Public declarations, automation schema and packed consumers exist; audit export/document synchronization.       |
| 6   | Validated configuration and safe secrets         | SDK options validate locally; ops templates need actual defaults and host secret boundaries.                    |
| 7   | Normal/error/boundary development fixtures       | Authored SGF, puzzles and analysis fixtures exist; index reproducible cases and reset paths.                    |
| 8   | Fast regression checks with repro cases          | Bun tests and focused browser scenarios exist; add readiness regression coverage.                               |
| 9   | Change-aware CI and caching                      | No hosted workflow exists; implement bounded routing and cache policy.                                          |
| 10  | Stable updates within supported majors           | Manifest ranges/lockfile exist; automate reviewed update candidates and major promotion gates.                  |
| 11  | Format/static/forbidden-pattern/size rules       | Oxlint/Oxfmt exist; enforce dependency, quality and review-size policies.                                       |
| 12  | Error classes, messages, causes and retryability | Controller/SGF/analysis/CLI failures exist; audit consistency and safe recovery guidance.                       |
| 13  | Structured operation identifiers/logs            | Analysis and automation IDs exist; add redacted diagnostic records without implicit logging.                    |
| 14  | Latency/failure/resource visibility and alerts   | Hosted monitoring is host-owned; provide local diagnostics/measurements and real ops guidance.                  |
| 15  | Timeout/retry/rate limits/failure containment    | Analysis cancellation/capacity and host process deadlines exist; audit disconnect/retry boundaries.             |
| 16  | Versioned data, migration and recovery           | SGF and automation versions exist; version new local drafts/preferences and test invalid/future versions.       |
| 17  | Rebuildable infrastructure and permissions       | SDK needs no server infrastructure; CI/static artifacts must be declarative and least-privilege.                |
| 18  | Pre-release verification environment             | Production examples and isolated installed consumers exist; provide a repeatable release-preparation path.      |
| 19  | Release verification and rollback automation     | Packed checks exist; operational release/rollback documents are empty scaffolds.                                |
| 20  | Feature activation and emergency disable         | Explicit optional modules/providers and read-only options exist; audit capability control without remote flags. |
| 21  | Automatic backups and verified restore           | SGF export exists; add local draft backup/restore and document portable backup limits.                          |
| 22  | Executable operational procedures                | Existing ops documents are placeholders; replace with actual tools and recovery steps.                          |
| 23  | Secret/dependency/permission security gates      | Input-boundary tests exist; add repository/CI security checks and documented vulnerability reporting.           |
| 24  | Code/document synchronization                    | Relative-link/docs and packed declarations checks exist; add command/export policy evidence.                    |

## Product Workflows

| ID  | Requested outcome                        | Current evidence / work to verify                                                                                          |
| --- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 25  | First-run guidance to a first result     | Standalone guide and Studio exist; audit clean setup and add concise contextual help.                                      |
| 26  | Trial space and samples                  | Static Studio/viewer/puzzle/analysis consumers exist; verify built artifacts and sample reset.                             |
| 27  | Templates for recurring work             | New record/example record and standalone app exist; index templates and portable automation recipes.                       |
| 28  | One-place search and navigation          | Variation tree is bounded to 500 rows; add whole-record search with node/metadata/comment navigation.                      |
| 29  | Bounded batch edit/export                | Automation supports operation arrays; add useful transaction/preview integration and user-facing batch workflow.           |
| 30  | Autosave and resume                      | Studio remembers locale/size only; add recoverable local draft and selected-location persistence.                          |
| 31  | Compare changes and Undo                 | Controller Undo/Redo and position comparison exist; verify new batch/recovery interactions.                                |
| 32  | Preview before destructive/bulk changes  | Dirty replacement guards exist; add inspectable batch preview with atomic commit.                                          |
| 33  | Import/export across tools               | SGF/UTF-8 and diagrams/CLI exist; verify new persistence and batch paths preserve unknown properties.                      |
| 34  | Share and collaborative review           | Embedded links/comments exist; collaborative authority remains host-owned, with explicit privacy/permission contracts.     |
| 35  | Personal workspace/preferences           | Locale/display size exist; add versioned useful preferences and reset without changing record semantics.                   |
| 36  | Completion/action-required feedback      | Live statuses/dirty dialog exist; audit actionable feedback and pending-work visibility.                                   |
| 37  | Saved recurring multi-step automation    | JSON automation/CLI exists; provide validated reusable recipes; scheduling remains host-owned.                             |
| 38  | Roles and access control                 | Local SDK has no users; controlled intentions/read-only are presentation only, hosts enforce authorization.                |
| 39  | Review/approve/apply important changes   | Host-controlled board accepts intentions; local bulk preview should require explicit apply, preserve Undo.                 |
| 40  | Operator management                      | No hosted accounts/jobs exist; local diagnostics/recovery tools must avoid a fictitious admin service.                     |
| 41  | Redacted support bundle                  | Add environment/operation diagnostics that exclude SGF, names, comments, file paths and secrets by default.                |
| 42  | In-product examples/help                 | Tooltips exist; provide concise opt-in help near relevant actions, not permanent explanatory prose.                        |
| 43  | Bug/feature feedback and status          | GitHub templates exist; connect help to the real repository issue/feedback channel.                                        |
| 44  | Usage/failure dashboard                  | No implicit analytics by invariant; provide opt-in local inspection and host instrumentation guidance.                     |
| 45  | Progress/cancel/retry for long work      | Analysis session and file cancellation gates exist; audit bounded import/batch/backup work and status.                     |
| 46  | User-selectable backup/restore           | Add local draft restore and portable backup controls with validation and replacement guards.                               |
| 47  | External API/webhook/service integration | Host snapshots/intentions and provider/transport interfaces exist; document authorization/deadline/event bridge ownership. |
| 48  | Extension architecture                   | Selective modules, framework adapters, overlays and providers exist; verify no extension requires private imports.         |

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
