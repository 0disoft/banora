# ADR 0002: Contract Source of Truth

- Status: Recorded design baseline
- Date: 2026-10-10
- Technical owner: UNASSIGNED

## Context

The repository starts as an SDK design scaffold. Product features, technical
choices and public contracts need distinct owners so summaries and generated
metadata do not imply shipped functionality or override actual design decisions.

## Decision

- [Product specification](../product/02-spec.md) owns capability scope and acceptance.
- [Roadmap](../product/01-roadmap.md) owns milestone sequencing and planned delivery.
- ADRs own architecture decisions and rationale; architecture documents explain
  the state model and runtime boundaries.
- [Public API](../sdk/public-api.md) owns consumer contract direction; exact exported
  symbols are recorded when implementation exists.
- [Compatibility](../sdk/compatibility.md) owns packaging, supported runtimes,
  versioning and migration, with measured consumer evidence before claims.
- [Validation](../../VALIDATION.md) owns stable validation names and reporting.
- [Documentation index](../README.md) routes readers to these owners.

Public documentation is written in English. Label planned capabilities, unresolved
details and unmeasured targets explicitly. README and diagrams summarize the owning
documents; they are not separate competing specifications.

## Consequences

Change the owning contract and update its summaries/links together. Do not invent
published package instructions, compatibility results, completed milestones or
credentials. Unconfigured validation remains visibly skipped. A documentation-only
design update does not add runtime APIs, a database schema, a task runner or a release.
