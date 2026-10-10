# Validation

- Status: Active local validation; hosted CI not configured

## Validation Source of Truth

This document owns stable validation names for this scaffold.

## Standard Validation Names

- format
- lint
- typecheck
- test
- contract
- migration-check
- smoke
- docs
- check

## Required Final Report

Final responses must list executed validations, passed validations, skipped validations, skip reasons, and remaining risk.

## Runner Policy

Use the root Bun package scripts. Run state-changing build/check commands serially.

| Name | Command | Evidence |
| --- | --- | --- |
| typecheck | `bun run typecheck` | Strict TypeScript checks for implementation, tests and scripts |
| typecheck (Svelte) | `bun run typecheck:svelte` | Native components and example checked with Svelte's supported isolated TypeScript toolchain |
| test | `bun run test` | Focused SDK behavior tests using Bun's test runner |
| docs | `bun run docs` | English documentation, LF endings and relative links |
| smoke | `bun run smoke` | SDK build, isolated tarball install, strict ESM/headless/global declarations and Node public-export/classic VM execution |
| smoke (adapters) | `bun run smoke:adapters` | Separate npm tarball installs, framework dependency isolation, strict declarations and real React/Vue/Svelte SSR |
| smoke (browser) | `bun run smoke:browser` | Studio/viewer and framework consumers; editing/ink round-trips, magnified touch, pinned comparisons, guards, transforms/crops/input, view bindings, standalone SVG/PNG pixels, encoding/cancellation and lifecycle |
| check | `bun run check` | SDK/adapter builds, root/Svelte typechecks, tests, docs and SDK packed-consumer smoke |

`bun run build` builds the common SDK; `bun run build:adapters` also builds the
three adapters. SDK build emits selective ESM/declarations plus a standalone IIFE
and its global declaration; example build copies that exact script into its output.
`lint`, `format`, `contract`, `migration-check`
are not yet configured; report them as skipped when relevant. Manual
`git diff --check` is whitespace evidence, not an invented lint result.

Browser and packed-adapter smoke are explicit oneshot checks separate from `check`.
After building examples/SDK, `bun scripts/browser-smoke.ts --touch-only` runs the
focused real-touch scenario using the same oneshot server/session cleanup.
`--comparison-only` similarly selects the comparison scenario without rerunning
unrelated browser flows during implementation.
Use them for adapter/common-renderer changes; documentation-only edits need docs
and whitespace review. Adapter packed checks require npm (supplied by Node 24),
install with lifecycle scripts disabled and do not use workspace source aliases.
`check` builds packages first because consumers resolve public built declarations;
it works from a fresh checkout after installing dependencies. Headless packed subpaths
are checked without DOM type libraries; the root/renderer/viewer exports are also
verified to import without runtime browser globals.
It uses a temporary localhost server and its own Playwright CLI session, both closed
on completion/failure. Screenshots/downloads are ignored under `output/playwright/`;
packed-consumer installations are ignored under `.tmp/`. Install Chrome or use
Playwright CLI's browser installation command when no compatible browser is available.

## Hygiene Validation

Repository hygiene file changes must check line-ending churn, binary diff pollution,
tracked secret files, ignored build/cache artifacts, and generated-output drift.

## Scope

general validation routes must stay stack-neutral unless a runner file explicitly defines a command.

## Repository Shape

sdk validation must stay repository-shape focused and must not imply generated application source code.
