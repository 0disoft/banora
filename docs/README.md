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
the unpublished SDK tarball installation and a complete editing/save/reopen flow.

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

The [terminal automation contract](sdk/automation.md) documents machine-readable
commands, input limits and the external state authority boundary.

The [record recovery contract](sdk/recovery.md) documents portable checkpoints,
export baselines and host-owned storage; Studio autosave is still pending.

The additive [host-controlled board guide](sdk/controlled-board.md) documents
external snapshot/intention integration and its implementation status.

Specifications and ADRs describe the complete direction. API documentation and
implementation status distinguish available code/evidence from planned features.
Mark unresolved details UNDECIDED and technical owners UNASSIGNED. Public project
documentation and contributor-facing examples use English.

Remaining generic engineering/operations templates are scaffolds, not evidence of
implemented infrastructure. The [operational contract](ops/00-operational-contract.md)
can be filled when actual release or hosted-service responsibilities are defined.

Diagrams are explanatory views of the documented architecture; see the
[diagram index](../diagrams/README.md). Change the owning contract before updating
an overview or diagram that summarizes it.
