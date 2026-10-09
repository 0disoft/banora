# Diagrams

- Status: Planned architecture views; no running system implied
- Source of truth: [ADR 0001](../docs/adr/0001-initial-architecture-boundaries.md)

- [System context](system-context.mmd): SDK, host and optional external analysis.
- [Module view](container-view.mmd): logical responsibilities, not a deployment topology.
- [Core runtime flow](core-runtime-flow.mmd): actions, rejection and authoritative updates.

These Mermaid sources summarize the [system boundary](../docs/architecture/00-system-boundary.md)
and [runtime flow](../docs/architecture/02-runtime-flow.md). Update those contracts
first when behavior changes.

[Release](release-flow.mmd) and [rollback](rollback-flow.mmd) diagrams remain generic
scaffold placeholders until executable release operations are defined.
