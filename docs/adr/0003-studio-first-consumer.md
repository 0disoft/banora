# ADR 0003: Banora Studio as the First Consumer

- Status: Recorded design baseline; implementation pending
- Date: 2026-10-10
- Technical owner: UNASSIGNED
- Product contract: [Specification](../product/02-spec.md)
- Delivery sequence: [Roadmap](../product/01-roadmap.md)

## Context

The initial SDK needs a concrete consumer to guide its public API and demonstrate
a useful outcome. A broad board/rules/viewer/React/AI roadmap could delay release
without proving that developers can use the SDK through its published surface.

## Decision

Make Banora Studio the first consumer: a browser SGF review/basic editing example
planned at `examples/studio` in this repository. It will become the public demo
when implemented. No hosting provider or deployment is selected by this decision.

The initial screen consists of a board, move navigation controls, a variation tree
and comments panel. Users open a local SGF or bundled example, navigate branches,
play a continuation, edit comments/markers, download the SGF and reopen it.

Studio consumes only built public SDK exports. It must not import private source
files, add demo-only SDK hooks, or implement a competing rules/state engine.
A second, minimal read-only embedding example exercises a simpler consumer flow.
The first release also verifies headless package imports.

M1 includes basic continuation, comment and marker editing needed by Studio.
Extended branch management, teaching tools, React integration and browser script
distribution follow in M2. Accounts, cloud storage and external AI are outside
Studio's initial workflow.

[ADR 0004](0004-framework-independent-adapters.md) extends M2's official framework
targets to React, Vue, and Svelte. Studio's framework-independent M1 flow is unchanged.

## Rationale and Tradeoffs

Studio provides something Go players can use and developers can inspect. Its
editing/reopen loop exercises board state, rules, record branches and serialization
together. Keeping it in the SDK repository avoids a separately maintained product
and lets examples evolve with the public contract.

An editor can bias API design toward its own needs. The read-only embedding
example limits that bias and exposes unnecessary editor dependencies. Built-package
consumption reveals export, asset and integration issues hidden by internal imports.

## Release Evidence

Complete the workflow in the specification, preserving supported edits and original
SGF properties/branches after download/reopen. Verify mobile and keyboard operation
in the declared matrix, exercise the read-only consumer, and validate packed headless
imports. No account, cloud service or AI provider may be required for this flow.

These are acceptance criteria, not evidence of implemented or published examples.
Exact public API symbols, support versions, SGF coverage and demo hosting remain
UNDECIDED until their respective implementation decisions are recorded.
