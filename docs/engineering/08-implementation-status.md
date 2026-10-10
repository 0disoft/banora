# Implementation Status

This file tracks evidence against the complete [roadmap](../product/01-roadmap.md).
An implemented slice does not complete its milestone or establish untested compatibility.

## Current Evidence

- Common SDK: `packages/sdk`, local package name `@banora/sdk`, version `0.1.0-dev.0`.
  Names are development identifiers, not a claim of npm ownership/publication.
- Immutable headless board transitions: dimensions 2 through 52, rectangular boards,
  play, captures, pass, explicit suicide policy, simple ko and atomic setup.
- Five focused core tests pass with Bun 1.4.2; strict TypeScript checking and Vite
  ESM/declaration builds pass. Node 24.14.0 can consume the built headless entrypoint.
- Tooling uses Bun 1.x, TypeScript 7.x and Vite 8.x, with the lockfile capturing
  resolved versions. Core has zero runtime dependencies. No hosted CI is configured.
- Root and package MIT license files cover original code/documentation.

## Remaining Delivery

1. M1: SGF byte/text loading and preservation, authoritative record controller,
   editing history, export baseline, SVG/input, Studio, read-only embedding and
   packed-consumer/mobile/keyboard evidence. Not complete.
2. M2: Separate official React/Vue/Svelte packages, browser script, extended editing,
   teaching, transforms, diagrams and sharing. Not implemented.
3. M3: Explicit superko/profiles, scoring and authored puzzles. Not implemented.
4. M4: External analysis adapter, freshness/cancellation and overlays. Not implemented.

Publishing, hosting and external provider credentials remain separate operational
actions. Runtime support claims require actual consumer evidence; local tests do not
prove browser/framework compatibility. Future increments update this evidence table.
