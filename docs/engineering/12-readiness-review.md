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

| ID  | Requested outcome                                | Current evidence / work to verify                                                                                                           |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Reproducible tools and initial setup             | Bun/Node majors and lockfile exist; add bootstrap and executable environment checks.                                                        |
| 2   | Common run/build/check/cleanup commands          | Root package scripts exist; add discovery, setup and bounded cleanup.                                                                       |
| 3   | Module responsibility and dependency enforcement | Architecture and packed headless checks exist; add a source import gate.                                                                    |
| 4   | Design decisions and rejected alternatives       | ADRs 0001-0013 exist; record new readiness decisions and link their owners.                                                                 |
| 5   | Interface types, documents and compatibility     | Public declarations, automation schema and packed consumers exist; audit export/document synchronization.                                   |
| 6   | Validated configuration and safe secrets         | SDK options validate locally; ops templates need actual defaults and host secret boundaries.                                                |
| 7   | Normal/error/boundary development fixtures       | Authored SGF, puzzles and analysis fixtures exist; index reproducible cases and reset paths.                                                |
| 8   | Fast regression checks with repro cases          | Bun tests and focused browser scenarios exist; add readiness regression coverage.                                                           |
| 9   | Change-aware CI and caching                      | No hosted workflow exists; implement bounded routing and cache policy.                                                                      |
| 10  | Stable updates within supported majors           | Manifest ranges/lockfile exist; automate reviewed update candidates and major promotion gates.                                              |
| 11  | Format/static/forbidden-pattern/size rules       | Oxlint/Oxfmt exist; enforce dependency, quality and review-size policies.                                                                   |
| 12  | Error classes, messages, causes and retryability | Typed SDK reason/recovery projection implemented; consumer messaging and retry safety need integration.                                     |
| 13  | Structured operation identifiers/logs            | Explicit bounded SDK evidence/IDs have Studio opt-in and one-run terminal consumers; no hosted tracing implied.                             |
| 14  | Latency/failure/resource visibility and alerts   | SDK retained-window outcome/timing summaries and real ops guide implemented; hosted monitoring remains host-owned.                          |
| 15  | Timeout/retry/rate limits/failure containment    | Analysis cancellation/capacity and host process deadlines exist; audit disconnect/retry boundaries.                                         |
| 16  | Versioned data, migration and recovery           | SGF and automation versions exist; version new local drafts/preferences and test invalid/future versions.                                   |
| 17  | Rebuildable infrastructure and permissions       | SDK needs no server infrastructure; CI/static artifacts must be declarative and least-privilege.                                            |
| 18  | Pre-release verification environment             | Production examples and isolated installed consumers exist; provide a repeatable release-preparation path.                                  |
| 19  | Release verification and rollback automation     | Retained prepare/verify/isolated-restage tooling exists; clean-source exact-artifact execution and remote handoff remain separate evidence. |
| 20  | Feature activation and emergency disable         | Explicit optional modules/providers and read-only options exist; audit capability control without remote flags.                             |
| 21  | Automatic backups and verified restore           | SGF export exists; add local draft backup/restore and document portable backup limits.                                                      |
| 22  | Executable operational procedures                | Local config/secrets/incident/recovery runbooks and actual isolated backup checks/drills exist; release preparation remains active.         |
| 23  | Secret/dependency/permission security gates      | Input-boundary tests exist; add repository/CI security checks and documented vulnerability reporting.                                       |
| 24  | Code/document synchronization                    | Relative-link/docs and packed declarations checks exist; add command/export policy evidence.                                                |

## Product Workflows

| ID  | Requested outcome                        | Current evidence / work to verify                                                                                                              |
| --- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 25  | First-run guidance to a first result     | Standalone guide and Studio exist; audit clean setup and add concise contextual help.                                                          |
| 26  | Trial space and samples                  | Static Studio/viewer/puzzle/analysis consumers exist; verify built artifacts and sample reset.                                                 |
| 27  | Templates for recurring work             | New record/example record and standalone app exist; index templates and portable automation recipes.                                           |
| 28  | One-place search and navigation          | Whole-record search plus Studio Help action/settings discovery navigate to actual positions, dialogs and menu controls.                        |
| 29  | Bounded batch edit/export                | SDK/CLI/Studio support guarded comment batches with preview and one-step Undo; exported SGF preserves all selected edits.                      |
| 30  | Autosave and resume                      | SDK/terminal checkpoints and Studio local drafts/guarded restore preserve records, baselines and selected locations.                           |
| 31  | Compare changes and Undo                 | Controller Undo/Redo, position comparison and batch/recovery interactions have unit and production browser evidence.                           |
| 32  | Preview before destructive/bulk changes  | Inspectable comment previews require explicit atomic apply; source changes invalidate approval without losing typed input.                     |
| 33  | Import/export across tools               | SGF/UTF-8 and diagrams/CLI exist; verify new persistence and batch paths preserve unknown properties.                                          |
| 34  | Share and collaborative review           | Embedded links/comments exist; collaborative authority remains host-owned, with explicit privacy/permission contracts.                         |
| 35  | Personal workspace/preferences           | Twelve versioned scalar settings, safe legacy migration and explicit bounded reset preserve record semantics; browser evidence in ADR 0018.    |
| 36  | Completion/action-required feedback      | Live statuses/dirty dialog exist; audit actionable feedback and pending-work visibility.                                                       |
| 37  | Saved recurring multi-step automation    | JSON automation/CLI exists; provide validated reusable recipes; scheduling remains host-owned.                                                 |
| 38  | Roles and access control                 | Local SDK has no users; controlled intentions/read-only are presentation only, hosts enforce authorization.                                    |
| 39  | Review/approve/apply important changes   | Local bulk preview requires explicit apply and preserves Undo; multi-user approval authority remains host-owned.                               |
| 40  | Operator management                      | No hosted accounts/jobs exist; local diagnostics/recovery tools must avoid a fictitious admin service.                                         |
| 41  | Redacted support bundle                  | SDK/Studio provide explicit opt-in, safe inspect/clear/download and pending-work consent guards with actual file evidence.                     |
| 42  | In-product examples/help                 | Localized opt-in Help provides action/settings discovery and concise instructions, accessed above/near the board.                              |
| 43  | Bug/feature feedback and status          | Help links to enabled GitHub Issues; local bug/feature templates updated. Repository is private; public access/publishing remain release work. |
| 44  | Usage/failure dashboard                  | Opt-in Studio shows retained-window outcome/timing summaries and fixed failure guidance; no lifetime analytics or hosted telemetry claim.      |
| 45  | Progress/cancel/retry for long work      | Analysis session and file cancellation gates exist; audit bounded import/batch/backup work and status.                                         |
| 46  | User-selectable backup/restore           | Studio draft/backup controls and isolated operations checks preserve selection/baseline/rules; production download artifacts verified.         |
| 47  | External API/webhook/service integration | Host snapshots/intentions and provider/transport interfaces exist; document authorization/deadline/event bridge ownership.                     |
| 48  | Extension architecture                   | Selective modules, framework adapters, overlays and providers exist; verify no extension requires private imports.                             |

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

## Execution Evidence

[Executed increments and their evidence](13-readiness-execution-evidence.md) retain
all implementation/check history separately from this current-state worklist.
Historical counts and next-step notes are scoped to their increment; they do not
replace the final current-state, requirement-by-requirement completion audit.

[Retained release evidence](15-release-preparation-evidence.md) separately records
the local artifact preparation exercise and its publication/rollback boundaries.
