# Architecture Decisions

ADRs record the design baseline and its rationale. A recorded direction does not
mean its implementation or compatibility has been validated.

| ADR | Status | Subject |
| --- | --- | --- |
| [0001](0001-initial-architecture-boundaries.md) | Design baseline | TypeScript core, SVG rendering, module/state ownership and deferred optimizations |
| [0002](0002-contract-source-of-truth.md) | Design baseline | Contract ownership and planned-versus-implemented documentation |
| [0003](0003-studio-first-consumer.md) | Design baseline | Banora Studio as first public SDK consumer, with a read-only embedding example |
| [0004](0004-framework-independent-adapters.md) | Design baseline | Framework-independent browser SDK with official optional React, Vue, and Svelte adapters |
| [0005](0005-initial-api-record-and-package-contracts.md) | Design baseline | Controller API, SGF FF4, edit history, export baselines, package layout and initial support targets |
| [0006](0006-explicit-repetition-and-rule-profile-boundaries.md) | Accepted for repetition; remaining M3 pending | Explicit superko, immutable path history and rule profile coverage boundaries |

Update the owning ADR when a design changes and describe the consequences for
consumers and validation. Keep unresolved choices explicit. Use the
[ADR template](0000-template.md) for future decisions and link them here.
