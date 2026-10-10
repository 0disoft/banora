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
| test | `bun run test` | Focused SDK behavior tests using Bun's test runner |
| docs | `bun run docs` | English documentation, LF endings and relative links |
| smoke | `bun run smoke` | SDK build, isolated tarball install, strict consumer typecheck and Node public-export execution |
| smoke (browser) | `bun run smoke:browser` | Production examples, SGF round-trip, guarded replacement, keyboard/touch, read-only lifecycle and local-only requests |
| check | `bun run check` | Typecheck, tests, documentation and packed-consumer smoke |

`bun run build` builds the common SDK. `lint`, `format`, `contract`, `migration-check`
are not yet configured; report them as skipped when relevant. Manual
`git diff --check` is whitespace evidence, not an invented lint result.

Browser smoke is an explicit oneshot check, separate from the fast default `check`.
`check` builds the SDK first because consumers resolve its public built declarations;
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
