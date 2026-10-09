# Documentation

- Status: Design baseline; implementation not started

## Start Here

1. [Product brief](product/00-product-brief.md): purpose, audience and open-source direction.
2. [Product specification](product/02-spec.md): planned capabilities and acceptance criteria.
3. [Roadmap](product/01-roadmap.md): first release and subsequent milestones.
4. [Architecture overview](../ARCHITECTURE.md) and [decisions](adr/README.md).
5. [SDK contract](sdk/README.md): consumer-facing API and compatibility direction.
6. [Development](../DEVELOPMENT.md): implementation and validation approach.

## Sources of Truth

| Subject | Authoritative document |
| --- | --- |
| Product scope and acceptance | [Product specification](product/02-spec.md) |
| Delivery sequence | [Roadmap](product/01-roadmap.md) |
| Architecture decisions | [ADR index](adr/README.md) |
| State model and ownership | [Domain model](architecture/01-domain-model.md) |
| Public API responsibilities | [Public API](sdk/public-api.md) |
| Packaging and compatibility | [Compatibility](sdk/compatibility.md) |
| Invariants | [Project invariants](engineering/00-project-invariants.md) |
| Validation names and reporting | [Validation](../VALIDATION.md) |
| Testing scope | [Testing standard](engineering/05-testing-standard.md) |
| Performance measurements | [Performance budget](engineering/03-performance-budget.md) |
| Open questions and risks | [Risk register](product/03-risk-register.md) |
| Agent routing | [Context map](../.agents/context-map.md) |
| Repository hygiene | [.editorconfig](../.editorconfig), [.gitattributes](../.gitattributes), [.gitignore](../.gitignore) |

## Planned Versus Implemented

The documents describe design intent, not available APIs, benchmark results or
completed milestones. Mark unresolved details UNDECIDED and technical owners
UNASSIGNED. Add runnable examples and compatibility evidence when implementation
exists. Public project documentation and contributor-facing examples use English.

Remaining generic engineering/operations templates are scaffolds, not evidence of
implemented infrastructure. The [operational contract](ops/00-operational-contract.md)
can be filled when actual release or hosted-service responsibilities are defined.

Diagrams are explanatory views of the documented architecture; see the
[diagram index](../diagrams/README.md). Change the owning contract before updating
an overview or diagram that summarizes it.
