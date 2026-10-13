# Current SDK Readiness Audit

This audit records the initial release at `b52bf65`. Later Studio design,
workspace, variation and twelve-language changes have their own scoped validation
and the [0.1.1 follow-up release record](31-studio-localization-release.md).
The original source comparisons, counts and live observations below remain
bound to their historical commits; they do not validate the later changes.

Status: the 72-question review is complete for the agreed Banora SDK and reference
consumer scope. Every question has an implementation/evidence answer or a verified
integration boundary. This is an initial `0.1.0` delivery, with the coverage limits
below; it is not a claim that 72 hosted-service features exist.

Reviewed source: `b52bf6502178bb0ade47b7c90d14946785ae177b`, plus the documentation
corrections recorded with this audit. The original questions and detailed answers
remain in the [readiness review](12-readiness-review.md). The
[product brief](../product/00-product-brief.md), [specification](../product/02-spec.md),
[system boundary](../architecture/00-system-boundary.md) and accepted ADRs define
ownership. No account service, database, cloud collector, scheduler or unrelated
application was added to satisfy a generic checklist.

## Evidence Used

- **R — root and installed consumers:** [CI 38285481945](https://github.com/0disoft/banora/actions/runs/38285481945)
  at `380c7a7` passed 248 tests/3,576 assertions and 298 installed CLI checks.
  Relevant positive/negative assertions were compared with current source, including
  checkpoint replay, revision checks, stale preview rejection and private diagnostics.
- **B — production browser workflows:** [CI 38282906525](https://github.com/0disoft/banora/actions/runs/38282906525)
  at `7ecddf1` passed the full affected default browser scope. This includes the
  final-Undo menu focus fix. Subsequent source changes are private recovery tooling
  and documentation; Studio runtime and package source have not changed since it.
- **N — actual npm consumers:** [initial publication](27-initial-default-channel-release-evidence.md)
  records hosted preparation, all five published packages and independent installed
  SDK/CLI/framework health. Fresh public metadata/downloads at
  `2026-10-12T17:45:28.043Z` confirmed `latest=0.1.0`, `dev=0.1.0-dev.1`, MIT metadata,
  and exact reviewed archive bytes for all five packages. The observation receipt is
  `.artifacts/readiness-public-oGoR0M/registry.json`, SHA256
  `8947348706dc2ae54387c6464dcf62a5f0a63a4fd849b516f5ef89a7ada680c8`.
  Package source has no diff from published `8ce3526`. This fresh observation did
  not rerun installed consumers or mutate tags; the earlier consumers executed
  these same bytes.
- **L — current live demo:** the deployment, byte health and real public Chrome
  workflow described below executed against `b52bf65`.
- **C — actual version recovery:** [installed SDK/CLI transitions](26-installed-consumer-recovery-evidence.md)
  preserved authored checkpoint/SGF/baseline state through dev.1 → dev.0 → dev.1.
- **D — actual Pages recovery:** [retained original recovery](19-demo-recovery-execution-evidence.md)
  and [draft backup recovery](20-draft-demo-backup-execution-evidence.md) restored
  reviewed original site bytes and passed separate live health/workflow checks.
- **X — actual offline source/artifact recovery:** [source recovery](29-offline-maintainer-recovery-evidence.md)
  restored six refs, the published tag and 438 tracked files, then restored 149
  prepared files and executed their SDK controller under Node without fetching.
- **K — actual external engine:** [live KataGo evidence](11-live-katago-evidence.md)
  uses the recorded Eigen CPU engine/model, explicit reporting perspectives and
  selected contexts. Broader engine/backend or playing-strength claims do not follow.
- **Z/F — accessibility/environment coverage:** [native Chrome zoom](28-native-browser-zoom-evidence.md)
  at 100%/200%/400%, four locales and real keyboard flows; separately recorded
  [Firefox/WebKit desktop scopes](21-expanded-browser-execution-evidence.md).
- **M — measurements:** [Node timings](14-sdk-performance-evidence.md),
  [browser timings](17-browser-performance-evidence.md) and
  [retained lifecycle resources](22-browser-memory-lifecycle-evidence.md) record
  the actual method, source, observed improvements and attribution limits.

Historical execution remains bound to its recorded source and method. Current
source comparison establishes why an unchanged implementation can reuse that
evidence; it does not convert a prior measured environment into a universal guarantee.

## Current Public Demo Execution

[Pages run 38287112395](https://github.com/0disoft/banora/actions/runs/38287112395)
completed build, deploy, health and archive successfully. Recovery was correctly
skipped. The public `banora-build.json` identifies source `b52bf65` and that run.
The read-only health job checked all 47 files, including 14 HTML files, in 47
attempts against original tar SHA256
`fc771a8c6c9aab7c389ea0dbfae84ba01b766d6d67ee36a221a798458afe5c20`.
Downloaded health receipt SHA256 is
`99edc1a8320a93dc35e4919e5b424acb440fc5692edb5d0f1938f48c2d5f018a`.

The automatic maintainer-only draft backup is release `410868783`, tag
`demo-backup-38287112395`. It contains the exact 942,080-byte original tar and
225-byte manifest, manifest SHA256
`1b43ca55037fb38bf1cf8eb202027c8138fbffe33e298f78c2daa17601090a9c`.
The draft is retained without publication. Capture is not another recovery drill;
actual earlier recovery is recorded separately under D.

An exclusively owned Playwright CLI Chrome `154.0.8037.97` session used only the
public Studio selectors at `https://0disoft.github.io/banora/studio/`:

1. Import an authored SGF with an unknown property and two recorded moves.
2. Use the keyboard to create a different continuation, then perform the final
   Undo through the nearby menu. Verify exhausted Undo, restored clean baseline,
   Escape closing the menu and focus returning to its trigger.
3. Navigate with the keyboard and commit a multilingual comment.
4. Download the actual SGF, verify the comment/unknown property, reopen those
   downloaded bytes and check the selected comment and clean baseline again.
5. Check page errors, failed asset responses and unexpected remote requests;
   inspect the screenshot and close only the owned browser session.

The initial probe activated an existing recorded continuation and correctly stayed
clean; the fixture was corrected to move the cursor to a different intersection
before asserting a new edit. No SDK/runtime change was needed for that assumption.
The completed live receipt was produced at `2026-10-12T17:56:41.889Z`, retained as
`output/playwright/live-final-38287112395.json`, SHA256
`2f38252f89dd17d706c5c6d9fdfcf1cfa8eaffb36bf7189b3e417ad459e7340f`.
The actual downloaded SGF is 128 bytes, SHA256
`08a1b71235bbd8f8a3db431ac99b1a7dccc5c34b75da25cf91edb12a10955252`.
These are public Chrome/SGF checks, not a repeat of every browser or physical device.

## Source-to-Evidence Review

Each row answers the corresponding original question. A host-owned feature is
closed here as an inspected SDK boundary, not as an implemented host service.
The detailed [72-row review](12-readiness-review.md) retains individual limits.

| ID  | Current implementation or inspected boundary                                                                               | Concrete assertion / evidence                                                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [Development tools](../../scripts/development.ts), `mise.toml`, frozen lock                                                | Setup rejects unsupported tools; Windows doctor and hosted clean setup ran. R                                                                                             |
| 2   | [Root commands](../../package.json), development tool                                                                      | Discovery reads real scripts; clean validates every allowlisted path before deletion and preserves release retention. R                                                   |
| 3   | [Dependency policy](../../scripts/repository-policy.ts), classified module map                                             | Core/headless cannot depend on browser; examples/adapters use public exports; unrelated frameworks are rejected. R/N                                                      |
| 4   | [ADRs](../adr/README.md)                                                                                                   | Decisions 0001–0025 name ownership, alternatives and implemented/planned distinctions; this is source review, not inferred runtime proof.                                 |
| 5   | [SDK exports](../../packages/sdk/package.json), declarations/schema                                                        | Independent public imports, no-DOM execution, installed types/SSR and native consumers execute. R/N/B                                                                     |
| 6   | [Configuration](../ops/config-and-env.md), validated owning modules                                                        | Explicit bounds/options; no automatic SDK environment/credential/endpoint loading. CI OIDC is separate. R/K                                                               |
| 7   | [Fixtures](../../examples/fixtures/README.md), authored recipes                                                            | Normal/error/boundary fixtures and independently installed recipes produce real outcomes. R/N                                                                             |
| 8   | [Tests and focused routes](../../VALIDATION.md)                                                                            | Atomic invalid-input and positive round trips, plus installed consumers; no test count substitutes for the named assertions. R/B                                          |
| 9   | [CI planner](../../scripts/ci.ts), CI workflow                                                                             | Docs/private/runtime changes select appropriate existing checks; cached cancellable ordinary CI remains read-only. R and actual hosted runs                               |
| 10  | [Dependabot](../../.github/dependabot.yml), supported-major manifests                                                      | Grouped monthly minor/patch updates and intentional major promotion; real no-update bot runs recorded, no changed-lockfile result invented.                               |
| 11  | [Quality policy](../../scripts/repository-policy.ts), Oxlint/Oxfmt                                                         | Forbidden dependency directions and formatting fail checks; 40 KB files trigger review, not arbitrary runtime failure. R                                                  |
| 12  | [Failure projection](../../packages/sdk/src/diagnostics.ts)                                                                | Closed domain/code/recovery mapping, safe unknown errors and explicit manual retry advice; authored state remains unchanged. R/B                                          |
| 13  | Diagnostic journal and [Studio consent](../../examples/studio/diagnostics.ts)                                              | Bounded operation IDs/events; clear and consent epochs reject late completions; no global trace collector. R/B                                                            |
| 14  | Journal summaries, [observability](../ops/observability.md), demo health                                                   | Local retained timing/failure inspection and real site-byte failures; authenticated host dashboards, alerts and SLOs belong to the host. R/B/L                            |
| 15  | [Analysis](../../packages/sdk/src/analysis.ts), [KataGo provider](../../packages/sdk/src/katago.ts), explicit host process | Cancellation/freshness/pending/framing bounds and host deadline; no implicit retry of authored writes or paid requests. R/B/K                                             |
| 16  | [Checkpoint parser](../../packages/sdk/src/checkpoint.ts), preferences/drafts                                              | Actual restore validates schema and selected replay before replacement; legacy migration resumes safely; unknown future data is preserved. R/C/X                          |
| 17  | [Reviewed workflows](../../.github/workflows/ci.yml), Pages/release jobs                                                   | Rebuildable static/package infrastructure with scoped authority; SDK owns no account/network/server IaC. Actual prepare/publish/deploy executed. N/L                      |
| 18  | [Candidate preparation](../../scripts/release.ts), independent consumers                                                   | Nine actual gates and 149 retained files; installed/native/production checks precede publication. N                                                                       |
| 19  | [Release](../ops/release.md), [rollback](../ops/rollback.md)                                                               | Exact reviewed publication and post-health; original Pages bytes and actual installed-version recovery executed. Initial latest has no prior non-prerelease target. N/D/C |
| 20  | Selective exports, [controlled board](../../packages/sdk/src/controlled-board.ts), optional analysis                       | Host can select read-only/modules/providers and dispose/cancel; these are activation controls, not remote cohorts or authorization. R/B                                   |
| 21  | [Draft autosave](../../examples/studio/draft-session.ts), backup tools                                                     | Guarded autosave/restore, automatic demo archive and actual offline source/artifact restoration. Browser/local copies are not off-device durability. B/D/X/L              |
| 22  | [Operational tools](../../scripts/operations.ts), release/development tools                                                | Discoverable doctor, migration/recovery/drill and retained-source/artifact procedures execute without code edits. R/X                                                     |
| 23  | [File/workflow signals](../../scripts/security.ts), audit and approved root policy                                         | Fail-closed permissions/config isolation and dependency signals; public/private reporting settings rechecked. Signal checks are not an exhaustive security scan. R/N/L    |
| 24  | [Docs checker](../../scripts/check-docs.ts), source declarations/schema/help                                               | Command references/English/LF/links checked; installed artifacts verify actual exports; stale behavioral/status text corrected by source/API review. R/N                  |
| 25  | [Standalone guide](../../examples/standalone/README.md), Studio initial sample                                             | Real independent onboarding and open/edit/download/reopen; no account setup required. N/B/L                                                                               |
| 26  | Production Studio/read-only/framework/puzzle/analysis consumers                                                            | Public project-path assets and authored samples execute; offline analysis values remain explicitly illustrative. B/L                                                      |
| 27  | [Automation recipes](../../examples/automation/README.md), standalone app                                                  | Installed recipe discovery and execution use canonical JSON, not checkout-only templates. R/N                                                                             |
| 28  | [Record search](../../packages/sdk/src/record-search.ts), Studio search/help                                               | Whole-collection branches/metadata, bounded paging, literal query and real position/action navigation; stale ownership/no-results covered. R/B                            |
| 29  | [Comment batch](../../packages/sdk/src/comment-batch.ts), controller                                                       | At most 256 targets, checked candidate, one atomic apply/Undo and preserved selection/export; other mass operations are not promised. R/B                                 |
| 30  | Checkpoints, draft store/session                                                                                           | Working and baseline SGF, selection/rules and completed draft saves survive restore/reload; pending writes are not guaranteed durable. R/B/C                              |
| 31  | [Controller](../../packages/sdk/src/controller.ts), comparison view                                                        | Editing Undo differs from navigation; comparison does not mutate source; recovery starts fresh history. R/B/C                                                             |
| 32  | Controller preview/apply and Studio search                                                                                 | Reviewed whole-record identity rejects stale/forged previews; failed/cancelled preview preserves work and typed input. R/B                                                |
| 33  | [SGF](../../packages/sdk/src/sgf.ts), diagram export and file actions                                                      | Actual export/download/reopen preserves unknown properties and multilingual text; invalid/oversized imports preserve work. R/B/L                                          |
| 34  | [Share codec](../../packages/sdk/src/share.ts), sharing consumer                                                           | Explicit embedded record/node/position links preserve review data; dirty replacement is guarded. Real-time collaboration/auth/retention is host-owned. R/B                |
| 35  | [Preferences](../../examples/studio/preferences.ts)                                                                        | Twelve bounded versioned scalar fields, per-field writes, safe legacy/future behavior and independent reset. R/B                                                          |
| 36  | Studio operation/status and recovery controls                                                                              | Pending/failure/dirty/completed feedback and explicit retry/guard actions; no invented task server or disk-save acknowledgement. B/L                                      |
| 37  | [Automation](../../packages/sdk/src/automation.ts), optional CLI                                                           | Saved multi-step requests/recipes, checkpoint resume and one-shot execution work; clocks, conditions and file locking belong to the host. R/N/C                           |
| 38  | Controlled snapshot/intention API and four native/plain consumers                                                          | Display waits for host acceptance; rejection/stale keys do not mutate host state. User/tenant roles are not client flags. B/R                                             |
| 39  | Local preview/apply, controlled host intentions                                                                            | Approval cannot apply a stale candidate; authenticated multi-user reviewer identity/storage belongs to the host. R/B                                                      |
| 40  | Operational/development/release tools                                                                                      | Owned maintenance is executable; there is no Banora account/job database requiring an admin console. R/X/N                                                                |
| 41  | SDK/Studio/CLI diagnostics                                                                                                 | Actual downloaded reports exclude authored text, paths and raw exceptions; no automatic upload; protected output/input aliases. R/B/N                                     |
| 42  | [Support controls](../../examples/studio/support-controls.ts), nearby board menu                                           | Localized action search launches actual controls; no-results/reopen/focus/narrow flows work. B/Z/L                                                                        |
| 43  | Help Issues link, [issue templates](../../.github/ISSUE_TEMPLATE/bug-report.md)                                            | Actual public Issues and private vulnerability reporting are enabled; no response SLA or fictional support ticket generated. B and provider reads                         |
| 44  | Opt-in journal summaries/inspection                                                                                        | Recent operation/failure/timing dashboard clears on disable/reload and makes no remote request; host analytics/abandonment metrics require host consent. R/B              |
| 45  | Analysis session/provider, scoped asynchronous file reads                                                                  | Pending/cancel/failure and stale/disposed ownership checks work. Bounded synchronous imports do not show fictional progress or launch a general worker. R/B/K             |
| 46  | [Recovery controls](../../examples/studio/recovery-controls.ts), checkpoint/store                                          | Chosen draft/portable backup restore preserves baseline/selection/rules, with corrupt/future/quota/cancel handling. R/B/C/X                                               |
| 47  | Controlled snapshots/intentions/subscriptions and provider transport                                                       | Actual host examples bridge reviewed intentions/engine JSON; host owns endpoints/webhooks/auth/retry/delivery. SDK import opens no connection. B/K/R                      |
| 48  | Public selective entrypoints and optional native adapters/overlays/providers                                               | Headless imports, installed artifacts and public consumer boundaries work; extension ownership/lifecycle is explicit. R/N/B                                               |
| 49  | Production and current public Studio workflow                                                                              | Open/navigate/edit/save/reopen achieves the actual user outcome with preserved data. B/L/N                                                                                |
| 50  | Current source, package READMEs and operational contracts                                                                  | Authored examples and host obligations are identified; public APIs execute; empty generic scaffolds are not counted as implemented infrastructure. R/B/N                  |
| 51  | Search/recovery/share/scoring/comparison/menu integration                                                                  | Cross-feature flows preserve authoritative record/baseline and controls return after borrowing; late work cannot replace newer records. R/B/L                             |
| 52  | Initial sample, file actions and standalone onboarding                                                                     | Independent first install and actual public download/reopen give a first result without account/service setup. N/B/L                                                      |
| 53  | Search/support/recovery/provider failure UI                                                                                | Empty/no-results/failure fixtures expose next actions; unsupported analysis contexts do not fabricate predictions. R/B/K                                                  |
| 54  | Parser/checkpoint/batch validation and input controls                                                                      | Atomic rejection preserves active work and correction input, including rejected long comment text. R/B                                                                    |
| 55  | Draft session, preferences and checkpoints                                                                                 | Reload/selected restore and cross-process CLI recovery preserve committed work; abrupt-exit debounce loss window stays explicit. B/C/R                                    |
| 56  | Controller Undo and localized replacement/removal dialogs                                                                  | Cancel/Escape, Export/Discard/Cancel and one-step batch Undo preserve state; pre-session history is not falsely restored. R/B/Z/L                                         |
| 57  | [Draft store](../../examples/studio/draft-store.ts), async generation/review checks                                        | Transaction revisions, per-field preferences and stale file/share/provider gates prevent owned overwrite; host arbiters handle multiple users. R/B                        |
| 58  | Analysis/transport and storage state machines                                                                              | Waiting/cancel/failure/retry are distinct; provider EOF/failure settles owned work and local editing remains available. R/B/K                                             |
| 59  | Core/rules/record replay, locale/export                                                                                    | Captures/superko/pass/MN/setup/explicit scoring and stored/displayed transforms checked; missing komi is not invented. R/B/N                                              |
| 60  | Controlled board and CI/URL/input authority boundaries                                                                     | Client state keys/read-only are not auth; real examples reject stale/unaccepted intentions; hosted jobs have separate reviewed permissions. R/B/N/L                       |
| 61  | Diagnostic projection, inert rendering and explicit data outputs                                                           | Actual reports omit private content; drafts/checkpoints/share links deliberately contain authored data and have documented consent/deletion limits. R/B                   |
| 62  | Import/export/backup/delete/reset paths                                                                                    | Revision-checked selected deletion and preference-only reset avoid global storage clearing; host accounts/tenant deletion remain host-owned. R/B                          |
| 63  | Keyboard, accessible names/dialogs, native zoom                                                                            | Core keyboard and real native zoom workflows execute; physical devices/screen readers are owner-waived, not certified. Z/F/B/L                                            |
| 64  | Four locales, narrow layout, long text and native wrappers                                                                 | Actual language/search/tree/menu/guard checks and emulated CPU/touch profiles pass; physical low-spec/iOS are not claimed. B/Z/F/M                                        |
| 65  | Public-artifact performance and lifecycle probes                                                                           | Measured replay/navigation improvements, stable DOM/listener counts and owned controller collection; peak/RSS/heap attribution/physical paint remain unproven. M          |
| 66  | Bounded SDK/Studio resources and affected cached CI                                                                        | No default remote calls/workers; bounded storage/search/evidence and existing focused jobs constrain owned work. Service/API costs are host-owned. R/B/L                  |
| 67  | Operation IDs/codes, safe guidance and installed diagnose                                                                  | Actual local failures trace to corrective categories without leaking source; IDs are local, not global traces or upload permission. R/B/N                                 |
| 68  | Local ops, release/recovery commands and public reporting                                                                  | Maintainer can diagnose/check/restore/triage without source edits; authenticated host user/admin work stays with that host. R/X/N                                         |
| 69  | Owned draft/checkpoint/artifact/source and site recovery                                                                   | Real portable version transitions, offline source/artifact use and original live site recovery execute. Account reclamation/disk durability are not simulated. C/D/X      |
| 70  | Setup, installed public packages, actual CI/OIDC/Pages                                                                     | Initial release and fresh public/default installation execute; source/tag/assets restore and portable downgrade work; no prior stable npm target is fabricated. N/C/D/X/L |
| 71  | Product/development/security/ops descriptions and actual metadata                                                          | Corrected stale unpublished/private/draft claims; five actual public archives match release; no 1.0/SLA/unexecuted device promise. N/L and source review                  |
| 72  | Priorities and deferrals below                                                                                             | Actionable follow-up priorities remain explicit; they are future consumer/maintenance work, not hidden current delivery claims.                                           |

## Remaining Limits and Next Decisions

The owner waived physical-device and screen-reader validation. Actual Safari/iOS,
physical low-spec devices, browser floors, unmeasured paint/peak/RSS, provider
account recovery and off-device durability remain unverified. Same-device source
copies and provider draft assets protect different failure modes; neither proves
recovery after losing both the device and provider account.

The first `latest=0.1.0` release has no earlier non-prerelease stable target.
Do not retag `latest` to a development build or create a meaningless new release
solely to claim channel rollback. Exact known-good artifacts, actual Pages recovery
and portable SDK/CLI data recovery are available; a faulty first stable selection
requires a reviewed forward fix or an explicitly chosen host artifact. Validate
the next real prior stable target before changing that channel.

Next three priorities:

1. Retain independently reviewed source/prepared/static backups off-device under
   owner-selected storage and access policy, then repeat their isolated restore
   there. The local commands and reviewed hashes are available; no private storage
   destination, credentials or account-recovery codes were invented or collected.
2. Validate the first actual external consumer's packaging, host authority,
   persistence and failure workflows before adoption. Use public APIs and a
   minimal authored fixture; do not install Banora into Pebble or another app
   without its own task authorization.
3. Keep same-major dependency maintenance focused and rehearse the next meaningful
   stable upgrade/rollback with saved authored data when that version exists.
   Investigate additional performance attribution when a measured consumer need
   warrants it rather than adding default CI benchmark jobs.

Defer hosted accounts, real-time collaboration, remote analytics/cohorts, schedulers,
arbitrary-code plugin loading and unrelated infrastructure. Their requirements
belong to a concrete authenticated host/service decision, with credentials,
durability and operating cost explicitly owned there.

This final increment changes documentation only. SDK API, package versions,
saved-data schemas, dependencies, repository hygiene and runner/workflow authority
are unchanged. Pages deployment used the existing authorized workflow once to ship
the already verified Studio focus correction. Documentation checks do not replace
the recorded behavioral, installation, engine or recovery executions.

Local final documentation checks passed: format, 140 documents/716 relative links,
403 file/workflow signal inspections and `git diff --check`. A one-off consistency
check confirmed both review tables retain exactly question IDs 1–72 and the
reviewed stale private/unpublished/unassigned claims are absent. No new permanent
test or CI job was added for documentation status text. Repository SDK/ops-change
procedures and Playwright CLI guided the work; the approved root security policy
was reviewed without editing its scope, exclusions or authority.
