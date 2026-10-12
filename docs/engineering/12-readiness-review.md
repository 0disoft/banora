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

| ID  | Requested outcome                                | Current source / execution evidence                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Reproducible tools and initial setup             | [mise.toml](../../mise.toml), frozen setup and tool doctor implemented. Windows doctor passed Bun 1.4.2/Node 24.14.0 and 17 dependencies; fresh hosted Ubuntu setup/tool checks passed Bun 1.4.3/Node 24.21.0 at fed716a. Physical fresh-machine and other OS coverage remain unclaimed.                                                                                                       |
| 2   | Common run/build/check/cleanup commands          | Root script discovery reads actual package metadata; safe cleanup previews fixed generated paths, validates links before deleting and preserves retained release bundles. Current command discovery includes migration-check.                                                                                                                                                                  |
| 3   | Module responsibility and dependency enforcement | [Source policy](../../scripts/repository-policy.ts) classifies core/headless/browser dependencies and consumer/framework isolation; current boundaries and no-DOM packed consumers pass.                                                                                                                                                                                                       |
| 4   | Design decisions and rejected alternatives       | [ADR index](../adr/README.md) includes decisions 0001-0023 and rejected alternatives; source owners and implemented/planned distinctions are recorded. New decisions must update their owning contract.                                                                                                                                                                                        |
| 5   | Interface types, documents and compatibility     | Source-generated declarations, frozen automation/checkpoint schemas and actual installed SDK/CLI/framework consumers exist. Root validation and installed types/SSR consumers now pass on Windows and hosted Ubuntu. Broader runtime/browser floors remain unclaimed.                                                                                                                          |
| 6   | Validated configuration and safe secrets         | [Configuration](../ops/config-and-env.md) records actual defaults/validation/reload ownership; [secrets](../ops/secrets.md) separates CI/host credentials and authored-data privacy. No SDK environment loader or embedded secret is introduced.                                                                                                                                               |
| 7   | Normal/error/boundary development fixtures       | [Fixture index](../../examples/fixtures/README.md) connects authored normal/error/boundary cases to actual regressions and safe resets; installed recipes execute and preserve isolated state.                                                                                                                                                                                                 |
| 8   | Fast regression checks with repro cases          | Current local root check passed 203 tests/2,831 assertions and 297 installed CLI checks; [VALIDATION](../../VALIDATION.md) exposes focused files, named migration checks and browser scopes. Fixtures reproduce actual failures; browser option process checks fail before launch rather than silently testing another engine.                                                                 |
| 9   | Change-aware CI and caching                      | [CI source](../../.github/workflows/ci.yml) configures one cached, cancellable, change-aware job. [Main run 38164778251](https://github.com/0disoft/banora/actions/runs/38164778251) passed root/installed consumers, full production browser, dependency audit and standalone editor at fed716a in 3m46s; monthly-only step correctly skipped. See [flow evidence](16-product-flow-audit.md). |
| 10  | Stable updates within supported majors           | Bun major ranges, frozen lockfile and grouped monthly update configuration exist. The remote default-main Dependabot blob matches reviewed source after the validated push; [update policy](../ops/ci.md) keeps promotions reviewed. Actual Bun/Actions bot jobs succeeded at fed716a with no needed updates; no changed-lockfile PR or auto-merge is claimed.                                 |
| 11  | Format/static/forbidden-pattern/size rules       | Oxlint/Oxfmt, import boundaries, forbidden authority/secret signals and 40 KB source review candidates run in check; current lint/format/boundaries pass. Size is a review signal, not an arbitrary functional failure.                                                                                                                                                                        |
| 12  | Error classes, messages, causes and retryability | Closed typed failure domains/recovery guidance and local translated consumer statuses are implemented; SDK/CLI/Studio diagnostic tests check safe projection and actionable failure boundaries. Host error capture/retry remains explicit.                                                                                                                                                     |
| 13  | Structured operation identifiers/logs            | Explicit bounded diagnostic journals/IDs, opt-in Studio inspection/download and one-run terminal reports execute with safe fields. IDs correlate retained local operations; no cross-service trace backend is claimed.                                                                                                                                                                         |
| 14  | Latency/failure/resource visibility and alerts   | Retained-window outcome/timing summaries, SDK benchmark reports and [observability procedure](../ops/observability.md) exist. Host resource dashboards/alerts and measured service objectives remain host-owned.                                                                                                                                                                               |
| 15  | Timeout/retry/rate limits/failure containment    | Analysis/transport budgets, cancellation, freshness and explicit host deadlines have headless/browser/live-engine evidence. No implicit retry of authored mutations or SDK network connection occurs; host rate/auth policies remain separate.                                                                                                                                                 |
| 16  | Versioned data, migration and recovery           | [migration-check](../ops/data-migrations.md) passed 18 tests/402 assertions for legacy-field interrupted resume/idempotence, future-data preservation and actual checkpoint/backup restoration. No silent unknown-version conversion or downgrade.                                                                                                                                             |
| 17  | Rebuildable infrastructure and permissions       | SDK owns no server/network/account infrastructure. CI authority and static package/example builds are declarative; reviewed release artifacts are retained locally. Host deployment/IaC is neither selected nor claimed implemented.                                                                                                                                                           |
| 18  | Pre-release verification environment             | Independent installed SDK/CLI/native framework and retained browser/starter checks executed at 52f7c3f. Its 149-file hosted candidate was downloaded and consumed by the read-only publication preview; no public staging service is implied.                                                                                                                                                  |
| 19  | Release verification and rollback automation     | Nine preparation gates and five-package development registry health passed. Actual Pages recovery run 38244314862 restored retained bytes; 46 live files and Studio export/reopen passed. npm-channel and consuming-host rollback remain unverified.                                                                                                                                           |
| 20  | Feature activation and emergency disable         | Optional modules/providers, explicit configuration/read-only presentation and owned cancellation/disposal enable host-controlled activation. They do not replace server authorization or imply remote cohort/flag infrastructure.                                                                                                                                                              |
| 21  | Automatic backups and verified restore           | Studio bounded autosave/revisions, user-selected portable backups and guarded recovery execute with reload/conflict/denial coverage. [Recovery limits](../ops/backup-and-restore.md) distinguish local transactions, downloaded files and off-device host backups.                                                                                                                             |
| 22  | Executable operational procedures                | Doctor/discovery/cleanup, redacted recovery checks/drill, migration check and retained prepare/verify/restage commands execute; [runbooks](../ops/00-operational-contract.md) name ownership and failure actions. No fictional live admin service is introduced.                                                                                                                               |
| 23  | Secret/dependency/permission security gates      | File/permission signals, fail-closed dependency audit and exact parsed-workflow OIDC policy are active. Ancestor npm configuration inheritance was reproduced and fixed. Root policy is approved and installed; GitHub private reporting is enabled.                                                                                                                                           |
| 24  | Code/document synchronization                    | Declarations and frozen schema/help come from source; command discovery reads actual metadata. Docs checks verify English/LF/links/root command references; packed consumers verify public artifacts. Behavioral/default consistency also requires source review, not a link-only green check.                                                                                                 |

## Product Workflows

The following workflow/audit rows now reflect current source review. Production
browser evidence includes the completed run at 5648c12 plus Studio row reuse,
including the latest pass/komi presentation and tree-navigation scenarios. Current
root check passed 198 tests/2,770 assertions and 297 installed CLI checks; the
browser measurement separately completed native/4x CPU workloads. Earlier independent installation,
engine, benchmark and retained-release evidence remain tied to their own sources.
See the [current product audit](16-product-flow-audit.md) for actual repro/fix limits.
These statements replace stale work plans, not the outstanding distribution gates.

| ID  | Requested outcome                        | Current source / execution evidence                                                                                                                                                                                                                                                           |
| --- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 25  | First-run guidance to a first result     | [Standalone guide](../../examples/standalone/README.md) gives local-tarball setup and save/reopen steps; Studio starts with an authored sample and opt-in Help. Independent starter installation/browser evidence is retained in the release audit; no new-machine execution is claimed here. |
| 26  | Trial space and samples                  | Built Studio/read-only/viewer/puzzle/analysis and framework pages executed in the production suite at 3355418. Sample reset and actual local file workflows pass; analysis offline values are explicitly illustrative. Public Pages deployment and live SGF round-trip passed at 9c35e23.     |
| 27  | Templates for recurring work             | Five embedded CLI JSON recipes and the copyable standalone app provide recurring-work starting points. Current installed CLI executes every recipe; no checkout-only template loader or interpreter is required.                                                                              |
| 28  | One-place search and navigation          | [Search consumer](../../examples/studio/search-controls.ts) searches games/branches with paging and real position navigation; Help discovers actual actions/settings. Production search/support routes verify stale-result rejection, no-results states and menu/focus restoration.           |
| 29  | Bounded batch edit/export                | Guarded comment batches select at most 256 nodes, preview/apply atomically and produce one Undo entry. Production search exports all edited comments/unknown properties; other mass move/delete/export operations are not claimed.                                                            |
| 30  | Autosave and resume                      | Versioned checkpoints and Studio IndexedDB drafts preserve working/baseline SGF, selection and rules. Production recovery verifies reload, two tabs and actual backups. Pending debounce/transactions and abrupt exit are not a durability guarantee.                                         |
| 31  | Compare changes and Undo                 | Controller edit Undo/Redo remains distinct from navigation; comparison is presentation-only. Production search/recovery/comparison verify baseline, selection and source preservation. Restoring a checkpoint starts new Undo history.                                                        |
| 32  | Preview before destructive/bulk changes  | Preview retains typed text on cancel/failure, applies only against the reviewed whole record and is invalidated by changes. Production search checks stale preview rejection and one-step Undo; no remote approval authority is implied.                                                      |
| 33  | Import/export across tools               | SGF import/export, actual downloaded/reopened records and standalone SVG/PNG use public APIs. Production batch/recovery/locale paths preserve unknown properties and authored text. Unsupported encoding/oversized input retain active work.                                                  |
| 34  | Share and collaborative review           | Embedded record/node/position links support asynchronous review with comments. Production sharing validates dirty replacement, exact branches and cancellation. Readable encoded links are neither encrypted nor synchronized collaborative documents.                                        |
| 35  | Personal workspace/preferences           | Twelve separately versioned scalar preferences migrate safely and reset without altering records/drafts. Production preference fixtures cover tabs, denied/corrupt/future storage and presentation; cross-device identity/workspaces are host-owned.                                          |
| 36  | Completion/action-required feedback      | Operation statuses, dirty state and guarded replacement identify completion or required action without an always-on task service. Production support/recovery/search verify actionable failure/cancel/retry states. Download initiation does not establish disk completion.                   |
| 37  | Saved recurring multi-step automation    | Installed CLI requests/recipes execute saved multi-step work, checkpoint resume and approved preview/apply/Undo. Hosts own clocks, conditions, overlapping-file locks and scheduling; the SDK starts no scheduler or background executor.                                                     |
| 38  | Roles and access control                 | [Controlled board contract](../sdk/controlled-board.md) carries intentions/state keys and waits for accepted host snapshots. Four real consumers exercise rejection/stale keys. Read-only and state keys provide no user/tenant authorization.                                                |
| 39  | Review/approve/apply important changes   | Explicit local preview/apply guards reviewed source and preserves one-step Undo. Real browser/installed CLI test stale review rejection. Multi-user reviewer identity, approval storage and privileged writes belong to an authenticated host.                                                |
| 40  | Operator management                      | There is no Banora account/job service to administer. Doctor, recovery verification, migration and retained-release commands cover owned local maintenance; host account/tenant/data administration is an explicit integration obligation.                                                    |
| 41  | Redacted support bundle                  | Opt-in Studio and terminal diagnostics emit bounded fixed operation/status/code/environment fields without authored content or raw errors. Actual downloaded reports, consent changes and publication protection pass; sending a report remains explicit.                                     |
| 42  | In-product examples/help                 | Help offers localized action/settings discovery, concise instructions and real controls near the board. Production support verifies four languages, search misses, menu reopening and narrow-layout keyboard behavior.                                                                        |
| 43  | Bug/feature feedback and status          | Help links to GitHub Issues and repository templates exist. Public Issues and GitHub private vulnerability reporting are now enabled; no support SLA is promised.                                                                                                                             |
| 44  | Usage/failure dashboard                  | Local opt-in retained-window counts/failures/timing are inspectable and downloadable. Production support verifies actual evidence, clear/reload and no remote requests. Lifetime analytics, abandonment tracking and hosted alerts remain host-owned.                                         |
| 45  | Progress/cancel/retry for long work      | Analysis has explicit pending/cancel/error states and provider freshness/deadline contracts; file reads reject superseded/disposed results. Imports/search/batches are bounded synchronous work, without fabricated progress or a general job queue.                                          |
| 46  | User-selectable backup/restore           | Actual portable backup download/open and chosen-draft restore preserve baseline/selection/rules; production recovery checks corrupt/future data, cancellation and storage denial. Off-device retention/provenance and process-kill durability remain host-owned/unverified.                   |
| 47  | External API/webhook/service integration | Public snapshots/intentions, subscriptions and provider/transport interfaces allow host bridges without opening connections. Real controlled/analysis flows verify cancellation and source authority; hosts choose endpoint, webhook delivery, auth, deadlines and retries.                   |
| 48  | Extension architecture                   | Public selective entrypoints, native optional adapters, bounded overlays/providers and shared mounts are checked by boundaries, declarations and installed no-DOM consumers. Examples use public imports; no arbitrary-code plugin loader is introduced.                                      |

## End-to-End Audit

| ID  | Requested outcome                               | Current source / execution evidence and limits                                                                                                                                                                                                                                                                                                             |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 49  | Reach the user's actual desired result          | Actual production Studio open/navigate/edit/export/reopen, search/batch/recovery and new tree-keyboard workflows passed at 5648c12 plus Studio row reuse. Current root check passed installed public SDK/CLI consumers; no arbitrary host-app certification is implied.                                                                                    |
| 50  | Find placeholder or manual-only implementations | Current source/README review distinguishes authored offline analysis, manual engine bridging and host-owned services from shipped SDK behavior. Ops commands execute local checks; no TODO/stub service or fictional admin/collector is counted as implementation.                                                                                         |
| 51  | Connect individually working features           | Production search/Undo/export, draft replacement/backup, menu-borrowed controls, scoring/comparison/share and async cancellation combinations pass. Existing source/baseline/presentation authority remains separate across those paths.                                                                                                                   |
| 52  | First meaningful outcome without explanation    | Studio's authored initial sample and file actions lead to a downloaded/reopened SGF in the production flow; the standalone guide and independent installation evidence cover embedding. No fresh physical-machine walkthrough was repeated.                                                                                                                |
| 53  | Empty/no-result/failure next actions            | Production search/support no-results, fresh empty record, draft capacity/denial/corruption and provider error fixtures expose usable next actions. Diagnostic guidance uses fixed recovery categories; illustrative analysis does not invent results for unsupported positions.                                                                            |
| 54  | Preserve invalid input for correction           | Invalid SGF/encoding/backup and over-limit comment previews retain active work and correction input; production search explicitly checks 5,000-character rejected input preservation. Exact parser diagnostics and UI correction guidance remain scoped to their domains.                                                                                  |
| 55  | Resume after reload or close                    | Production reload/selected draft restore preserves committed SGF/baseline/branch; preference reload retains valid settings. SDK checkpoints resume across CLI processes. Unsaved pending work after abrupt termination remains a documented loss window.                                                                                                   |
| 56  | Cancel and Undo risky actions                   | Localized replacement/removal guards now have actual accessible names and preserve state on Escape. Production search preview cancel/one-step Undo and recovery Export/Discard/Cancel pass. Restored pre-session Undo is deliberately unavailable.                                                                                                         |
| 57  | Duplicate/concurrent operations                 | Revision-checked draft writes prevent concurrent overwrite; real two-tab recovery/quota/delete fixtures pass. Search disables repeat Apply and async file/share/provider paths scope results to current authority. Hosts still arbitrate multi-user writes.                                                                                                |
| 58  | Distinguish waiting/retry/failure               | Analysis pending/cancel/failure and transport freshness/EOF boundaries are verified by headless/browser fixtures; storage denial offers backup/retry. No implicit retry of authored writes or default remote endpoint is present.                                                                                                                          |
| 59  | Accurate displayed/stored calculations          | Current rules/SGF/controller tests and production replay/score/transform flows check stored/displayed state. Move counts include passes and MN; latest four-locale pass/missing-komi downloads preserve encoding and do not invent KM defaults.                                                                                                            |
| 60  | Real permission boundaries                      | No local users/tenants exist. Controlled intention keys are freshness labels, not auth; host authorization is explicit. CI permissions and input/URL/texture boundaries have source/static/headless coverage; no deployed tenant-access test is claimed.                                                                                                   |
| 61  | Avoid sensitive data in logs/storage/output     | Current diagnostic privacy/callback tests and actual browser report validation exclude authored text, raw exceptions and paths. Drafts/embedded links intentionally contain private authored data; consent, deletion and host-sharing obligations are documented.                                                                                          |
| 62  | Complete data lifecycle                         | Import/export, local drafts, portable backups, explicit revision-checked deletion and preference-only reset execute without global storage clear. Future data can be backed up without coercion. There is no SDK account; hosts own account/tenant deletion.                                                                                               |
| 63  | Keyboard/zoom/assistive workflows               | Chrome keyboard/editing and localized modal focus/Escape pass. Focused Windows Firefox 156 and WebKit 26.6 search/tree/dialog and framework-sharing flows pass; guard activation now uses Enter. Tree focus survives navigation/tail replacement. Arbitrary zoom, physical screen readers/devices remain unverified.                                       |
| 64  | Small screens/long text/languages               | Chrome four-language/narrow/menu/search/recovery fixtures pass. Focused Windows Firefox 156 and WebKit 26.6 search/tree/localized/narrow native-dialog flows also pass; see [compatibility scope](../sdk/compatibility.md#executed-browser-scope). CPU throttling is emulation; physical low-spec and other engine/feature combinations remain unverified. |
| 65  | Measure and improve real bottlenecks            | [Node evidence](14-sdk-performance-evidence.md) measures public SDK path-cache work; [browser evidence](17-browser-performance-evidence.md) measures actual Studio imports/navigation/heap snapshots and row-reuse gains at native/4x CPU. Physical paint, memory peak/leaks and actual low-spec devices remain unmeasured.                                |
| 66  | Control operating cost growth                   | Bounded local drafts/preferences/search/diagnostics and one cached cancellable change-aware CI job constrain owned growth. No default SDK network or worker is started. Hosted cost/scale remains a host obligation; no measured service-cost model is claimed.                                                                                            |
| 67  | Trace a reported failure                        | Local diagnostic operation IDs/codes and safe summaries connect an observed failure to corrective guidance; installed diagnose executes once with protected output. Private minimized repro input is reviewed separately; IDs are not global traces or upload authority.                                                                                   |
| 68  | Routine operator tasks without code edits       | Doctor/discovery/safe cleanup, migration checks, recovery checks/drill and retained-release commands execute without code edits. Runbooks name failure actions and owners; public Issues and private security reporting are enabled; hosted administration remains owner-controlled.                                                                       |
| 69  | Verified failure recovery                       | Corrupt/future/quota/conflict/cancel recovery fixtures pass. Actual Pages recovery restored preserved original tar bytes and verified 46 live files plus Studio export/reopen. Disk/data and npm-channel recovery remain unverified.                                                                                                                       |
| 70  | Fresh install/update/release and rollback       | Installed SDK/CLI/framework/starter and frozen setup pass locally/hosted. Five npm development packages passed fresh-registry installation. Actual retained-tar Pages recovery passed; npm-channel and consuming-host/data rollback remain unverified.                                                                                                     |
| 71  | Match user-facing promises to reality           | Current README/spec/consumer/ops review keeps SDK implementation distinct from illustrative analysis, manual bridges and host-owned services. Updated localized modal/pass/komi behavior is recorded in its owning specification; broader compatibility remains limited to observed execution.                                                             |
| 72  | Next three priorities and deferred work         | Next priorities: automate live Pages asset health and durable original-candidate retention; verify physical device/assistive workflows; extend paint/memory coverage. Defer accounts/cloud collaboration/schedulers to hosts and avoid infrastructure without a consumer.                                                                                  |

## Completion Rule

Browser coverage now includes all 19 opt-in desktop scopes on Windows Firefox 156
and Playwright WebKit 26.6, including recovery, editing/export and React/Vue/Svelte texture/
animation consumers. The original texture fixture race was reproduced and fixed
by awaiting actual rendered surfaces, without changing SDK runtime or loosening
preservation checks. [Compatibility](../sdk/compatibility.md#executed-browser-scope)
records the exact exclusions; these results do not establish full Firefox,
actual Safari/iOS, physical touch or assistive-device coverage.

The latest hosted candidate at `41e0e89` passed all nine preparation gates and
retained 149 files. Actual publication/health run `38212158941` verified all five
public development versions and passed fresh-registry installed consumers.
Earlier candidates remain preserved; later artifact changes require a new version
and reviewed candidate. These results do not close unrelated service or device rows.

The full objective still has unproven boundaries: npm-channel and host/data rollback,
physical devices and assistive technology, and host-owned service operations.
Actual CI, preparation and npm publication/health are recorded below with their scope.
Both dependency-update ecosystems executed successfully with no needed updates;
a changed-lockfile compatibility result must be recorded when an update is available.
The owner-approved [root security policy](../../SECURITY.md) is now installed.
GitHub private reporting is enabled and exposes its public report link.
Public GitHub source and Pages are approved and live. All five package-specific
OIDC publishers executed successfully; no physical-device certification is invented. Framework SDK/host
authority boundaries remain the recorded product scope; they are not implemented
account, tenant, cloud collaboration, scheduler or monitoring services.

Documentation alone does not close a behavioral row. Record executed commands,
their result and their coverage limits. Hosted workflow configuration alone is not
a successful GitHub run or enabled branch protection. No publication, public demo,
real device, cloud collaboration or production-monitoring claim follows from a
local test. Keep this review active until every question has a verified answer and
required in-scope implementation is complete.

## Execution Evidence

Latest observed code CI is [run 38211207618](https://github.com/0disoft/banora/actions/runs/38211207618)
at `41e0e89`: 220 tests / 3,073 assertions, installed SDK/classic and 297 installed
CLI checks passed on Linux with the narrow release-tool route. Windows root
checks and actual SDK/CLI/native framework installation are scoped in the history.

The latest fully prepared candidate is `41e0e89`: nine successful gates, 149 retained
files, actual hosted download and verified read-only publication preview.
All five tarballs match earlier reviewed bytes. Publication was bound to this
reviewed remote source; later changes require their own candidate review.

Actual [publication/health run 38212158941](https://github.com/0disoft/banora/actions/runs/38212158941)
verified all five public `0.1.0-dev.0` packages, downloaded fresh matching SHA256/
SHA512 tarballs and passed independent installed SDK/CLI/React/Vue/Svelte checks.
The final verification reused confirmed versions without reupload. Both observed
`latest` and `dev` tags point to this development prerelease; no stable support is
promised. Public source, live Pages, private reporting and the main-only required-
reviewer environment are established. The root security policy is owner-approved
and installed, including its approved public-repository/private-reporting wording.
Actual retained-artifact Pages recovery and 46 live-file/Studio checks passed;
physical device/assistive and npm-channel/host rollback limits remain above.

Detailed implementation and execution evidence:

- [Earlier readiness increments](13-readiness-execution-evidence.md).
- [Release tooling history](18-release-tooling-execution-evidence.md).
- [Actual public demo recovery](19-demo-recovery-execution-evidence.md).
- [Prepared artifacts and actual hosted transfer](15-release-preparation-evidence.md).
- [Production product-flow audit](16-product-flow-audit.md).
- [Measured SDK performance](14-sdk-performance-evidence.md) and [browser measurements](17-browser-performance-evidence.md).

The historical headings below retain their earlier anchors and point to the
preserved records. They do not change any requirement, count or failure boundary.

### October 12: Existing Publisher Package Identity

See [the preserved execution record](18-release-tooling-execution-evidence.md#october-12-existing-publisher-package-identity).

### October 12: Renamed Packages Passed on Hosted Linux Main

See [the preserved execution record](18-release-tooling-execution-evidence.md#october-12-renamed-packages-passed-on-hosted-linux-main).

### October 12: Manual Hosted Candidate Route

See [the preserved execution record](18-release-tooling-execution-evidence.md#october-12-manual-hosted-candidate-route).

### October 12: Reviewed-Byte Publication Tooling

See [the preserved execution record](18-release-tooling-execution-evidence.md#october-12-reviewed-byte-publication-tooling).

### October 12: Manual Publication Workflow and Policy Boundary

See [the preserved execution record](18-release-tooling-execution-evidence.md#october-12-manual-publication-workflow-and-policy-boundary).

### October 12: Hosted Publication Preview Executed

See [the preserved execution record](18-release-tooling-execution-evidence.md#october-12-hosted-publication-preview-executed).

### October 12: Fresh Registry Health Tooling

See [the preserved execution record](18-release-tooling-execution-evidence.md#october-12-fresh-registry-health-tooling).

### October 12: Independent Post-Publication Health Workflow

See [the preserved execution record](18-release-tooling-execution-evidence.md#october-12-independent-post-publication-health-workflow).
