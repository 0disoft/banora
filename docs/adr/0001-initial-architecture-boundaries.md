# ADR 0001: Initial Architecture Boundaries

- Status: Recorded design baseline; scoped implementation evidence in the
  [delivery audit](../engineering/10-delivery-audit.md)
- Date: 2026-10-10
- Technical owner: UNASSIGNED
- Product contract: [Specification](../product/02-spec.md)
- Framework support extension: [ADR 0004](0004-framework-independent-adapters.md)
- Initial contract refinement: [ADR 0005](0005-initial-api-record-and-package-contracts.md)

## Context

Banora should serve a small embedded viewer and extensible Go applications with
one model. Reference libraries demonstrate useful viewer, UI, game and modular
capabilities, but simply collecting every feature would delay a usable release.

The first implementation needs straightforward browser integration, shared server
logic, theme control, record preservation, and room for external analysis later.

## Decision

1. Use pure TypeScript for board/rules and SGF/record logic. Keep the headless
   surfaces independent of DOM, React, storage and provider dependencies.
2. Use SVG/CSS as the initial renderer. Expose display transforms, themes and
   annotation/input hooks while retaining logical coordinate semantics.
3. Build a framework-independent viewer/controller and optional React adapter.
   All adapters use the same authoritative transition path and record cursor.
4. Use Vite library distribution with ESM/types and browser script output. Use
   Bun for development scripts; consumers must not require Bun or Make.
5. Keep core, records, rendering, viewer, scoring, puzzles and analysis logically
   separate. ADR 0005 refines packaging to one common SDK and three optional
   framework adapter packages in this repository; implemented local names/exports
   are recorded in SDK contracts, while registry ownership/publication remain open.
6. Separate confirmed scoring from life/death prediction. External analysis uses
   a provider-neutral contract, with KataGo JSON analysis as an integration candidate.
7. Defer Canvas, workers and Rust/WASM until measured limitations justify them.

## Rationale and Tradeoffs

TypeScript provides one inspectable implementation for browser and server
consumers. SVG supports configurable board presentation and vector export, but
many boards or high-frequency overlays may warrant a different renderer later.
The exact workload threshold must be measured rather than assumed.

Optional adapters limit dependency coupling, at the cost of defining clear
ownership and lifecycle interfaces. An external AI engine avoids making model
execution part of the basic SDK; hosts then own credentials, compute and transport.

Rust/WASM would add another toolchain and boundary before a bottleneck is known.
React-only design would narrow integration choices. Bundling a complete game
platform would increase scope beyond the first viewer milestone.

## Consequences

Every renderer consumes snapshots and emits actions; it cannot independently
decide legal moves. Record navigation must preserve rule-relevant history.
Analysis results need request/context identity and apply-time freshness checks.
Public APIs, support floors, tool versions and performance budgets remain open
until implementation and consumer validation establish them.

## Validation Before Shipping

Exercise browser and headless consumers, record round-trips, targeted rule fixtures,
framework mount/dispose, package exports/types and a representative mobile viewer.
Measure rendering before choosing an additional backend. See the
[testing standard](../engineering/05-testing-standard.md).

## Technical References

- [Vite library mode](https://vite.dev/guide/build.html#library-mode).
- [KataGo JSON analysis interface](https://github.com/lightvector/KataGo/blob/master/docs/Analysis_Engine.md).

These references explain candidate tooling/protocols; no exact release compatibility
or benchmark result is asserted by this ADR.
