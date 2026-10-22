# Documentation

- Status: Active design and implementation contracts

## Start Here

1. [Product brief](product/00-product-brief.md): purpose, audience and open-source direction.
2. [Product specification](product/02-spec.md): capability scope and acceptance criteria.
3. [Roadmap](product/01-roadmap.md): first release and subsequent milestones.
4. [Architecture overview](../ARCHITECTURE.md) and [decisions](adr/README.md).
5. [SDK contract](sdk/README.md): consumer-facing API and compatibility direction.
6. [Development](../DEVELOPMENT.md): implementation and validation approach.

To build an application, start with the
[standalone record editor guide](../examples/standalone/README.md). It explains
npm or local SDK tarball installation and a complete editing/save/reopen flow.

For terminal work, use [reusable automation](../examples/automation/README.md);
the [fixture index](../examples/fixtures/README.md) lists normal/error/boundary
reproduction and safe reset paths.

The first consumer is **Banora Studio**, implemented at `examples/studio`, plus a
minimal read-only embedding example. Read the
[first consumer decision](adr/0003-studio-first-consumer.md) for their role and
the [specification](product/02-spec.md) for the initial editing/reopen workflow.

## Sources of Truth

| Subject                                                    | Authoritative document                                                                              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Product scope and acceptance                               | [Product specification](product/02-spec.md)                                                         |
| Current implementation evidence and remaining work         | [Implementation status](engineering/08-implementation-status.md)                                    |
| M1-M4 requirement-by-requirement local acceptance          | [Milestone audit](engineering/09-milestone-audit.md)                                                |
| Final implementation delivery and invariant/artifact audit | [Delivery audit](engineering/10-delivery-audit.md)                                                  |
| Selected actual KataGo engine/model/runtime evidence       | [Live engine audit](engineering/11-live-katago-evidence.md)                                         |
| Delivery sequence                                          | [Roadmap](product/01-roadmap.md)                                                                    |
| Architecture decisions                                     | [ADR index](adr/README.md)                                                                          |
| State model and ownership                                  | [Domain model](architecture/01-domain-model.md)                                                     |
| Public API responsibilities                                | [Public API](sdk/public-api.md)                                                                     |
| Packaging and compatibility                                | [Compatibility](sdk/compatibility.md)                                                               |
| Framework support direction                                | [React, Vue, and Svelte adapter decision](adr/0004-framework-independent-adapters.md)               |
| Invariants                                                 | [Project invariants](engineering/00-project-invariants.md)                                          |
| Validation names and reporting                             | [Validation](../VALIDATION.md)                                                                      |
| Testing scope                                              | [Testing standard](engineering/05-testing-standard.md)                                              |
| Performance measurements                                   | [Performance budget](engineering/03-performance-budget.md)                                          |
| Open questions and risks                                   | [Risk register](product/03-risk-register.md)                                                        |
| Agent routing                                              | [Context map](../.agents/context-map.md)                                                            |
| Repository hygiene                                         | [.editorconfig](../.editorconfig), [.gitattributes](../.gitattributes), [.gitignore](../.gitignore) |

## Planned Versus Implemented

The [project readiness review](engineering/12-readiness-review.md) tracks the active
72-question engineering, operations and product audit and its delivery sequence.
It does not supersede the product scope or establish completion by itself.
Detailed historical records are separate: [development/product increments](engineering/13-readiness-execution-evidence.md)
and [release/publication tooling](engineering/18-release-tooling-execution-evidence.md).
[Actual public demo recovery](engineering/19-demo-recovery-execution-evidence.md)
records the retained tar, real deployment transition and live artifact/Studio checks.
[Draft demo backups](engineering/20-draft-demo-backup-execution-evidence.md) record
maintainer-only asset capture and independently reviewed restoration.
[Expanded browser execution](engineering/21-expanded-browser-execution-evidence.md)
records the current 22-scope Firefox/WebKit profile and its device exclusions.
[Browser memory lifecycles](engineering/22-browser-memory-lifecycle-evidence.md)
record actual repeated import/mount/dispose results and controller collection.
[Package channel preflight](engineering/23-channel-preflight-execution-evidence.md)
records the complete-family public registry inspection and prior-version limits.
[Package README correction](engineering/24-package-readme-correction.md) records
the observed npm onboarding defect and intentional documentation prerelease.
[Registry target health](engineering/25-registry-target-health-evidence.md) separates
old-version installed-consumer checks from current-channel publication health.
[Installed consumer recovery](engineering/26-installed-consumer-recovery-evidence.md)
records actual SDK/CLI current-to-previous-to-current portable-data preservation.
[Initial default-channel release](engineering/27-initial-default-channel-release-evidence.md)
records actual five-package publication, unqualified installation/README checks
and downloaded public prepared-bundle recovery.
[Native desktop zoom](engineering/28-native-browser-zoom-evidence.md) records actual
100%/200%/400% Chrome workflows and the corrected final-Undo menu focus defect.
[Offline maintainer recovery](engineering/29-offline-maintainer-recovery-evidence.md)
records actual source/history/release-tag restoration and execution of the
independently retained prepared SDK from a recovered checkout.
[Current readiness audit](engineering/30-current-readiness-audit.md) closes the
72-question review for the agreed SDK/reference-consumer scope, with current
public-demo execution, source-to-evidence mapping and explicit remaining limits.
[Studio/localization follow-up](engineering/31-studio-localization-release.md)
records the selected compatible 0.1.1 family, refreshed Studio and twelve-language
scope separately from the initial-release evidence.
[Notice/localization patch](engineering/32-notice-localization-release.md) records
the published 0.1.2 family, three-second notices, localized failures, hosted checks,
fresh-registry health and verified public release recovery.

The [terminal automation contract](sdk/automation.md) documents machine-readable
commands, input limits and the external state authority boundary.

The [record recovery contract](sdk/recovery.md) documents portable checkpoints,
export baselines, host-owned storage and Studio's bounded local autosave/backups.

The additive [host-controlled board guide](sdk/controlled-board.md) documents
external snapshot/intention integration and its implementation status.

Specifications and ADRs describe the complete direction. API documentation and
implementation status distinguish available code/evidence from planned features.
Mark unresolved details UNDECIDED and technical owners UNASSIGNED. Public project
documentation and contributor-facing examples use English.

Remaining generic engineering/operations templates are scaffolds, not evidence of
implemented infrastructure. The [operational contract](ops/00-operational-contract.md)
now owns executable local recovery, incident, configuration and private-data procedures.
The [release](ops/release.md) and [rollback](ops/rollback.md) procedures own local
retained-artifact preparation, integrity checks and isolated restaging.
[Maintainer recovery](ops/maintainer-recovery.md) owns source/artifact retention
and offline Git restoration, distinct from private provider authentication.
[Consolidated Studio menu deployment](engineering/33-studio-menu-deployment.md)
records the compact menu, grouped settings, affected CI, public byte health and
actual public-browser verification without a new npm release.
[Browser review comparison](engineering/34-browser-review-comparison.md) records
measured before/after closed-tab collection, move-number navigation and backup
restoration, including unchanged/noisy navigation outcomes and local-only limits.
[Demo deployment](ops/demo-deployment.md) records the public source, GitHub private
reporting and manually deployed Pages site. npm authority remains separate; these procedures
do not establish hosted-service infrastructure or publication.

Diagrams are explanatory views of the documented architecture; see the
[diagram index](../diagrams/README.md). Change the owning contract before updating
an overview or diagram that summarizes it.
