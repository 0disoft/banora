# System Boundary

- Status: Implemented boundaries with scoped [delivery evidence](../engineering/10-delivery-audit.md)
- Decision: [ADR 0001](../adr/0001-initial-architecture-boundaries.md)

## Ownership

| Owner | Responsibility |
| --- | --- |
| Core | Coordinates, board state, legal transitions, captures, rule policy and position history |
| Records / SGF | Game metadata, properties, comments, setup nodes, branches and active cursor |
| SVG renderer | Themes, grid/stones/overlays, display transforms, hit testing and visual lifecycle |
| Viewer / editor | Navigation controls, input modes, branch editing and orchestration |
| Framework adapter | Mount/unmount, host bindings and subscriptions; no game rules |
| Scoring | Agreed dead-stone selections and rule-specific score calculation |
| Puzzles | Authored solution branches, response behavior and feedback |
| Analysis adapter | Request/result normalization, cancellation and freshness checks |
| Host application | Accounts, persistence, game server authority, collaboration and service credentials |
| External engine | Move search, win/score prediction and ownership estimates |

## Boundary Rules

Core and SGF must not import DOM, React, Vue, Svelte, provider clients, or application storage.
Views operate on authoritative snapshots; all game mutations use the same action
path. Optional modules may depend on the core but the core must not depend on them.

Multiplayer hosts validate actions on an authoritative server. A client-side SDK
legality check is not authorization or match authority. Record storage, URLs and
remote analysis submission remain under the host's control.

## Integrations

Provide plain-browser integration in M1 and official optional React, Vue, and Svelte
adapters in M2, as defined in [ADR 0004](../adr/0004-framework-independent-adapters.md).
Framework adapters bind the same public controller/renderer through their native
lifecycle and state/event conventions; they do not own another rules or record model.
A provider-neutral session and checked KataGo JSON adapter support an explicitly
host-owned engine/service transport. The common analysis view owns only its isolated
drawing/PV state; it does not add predictions to the source SGF.
No credentials, provider endpoint, telemetry, database, or mandatory hosted product
are built into the core.

See the [runtime flow](02-runtime-flow.md) and [architecture overview](../../ARCHITECTURE.md).
