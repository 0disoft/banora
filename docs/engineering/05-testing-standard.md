# Testing Standard

- Status: M1-M4 behavior/consumer evidence recorded in the
  [delivery audit](10-delivery-audit.md); broader matrix remains unclaimed
- Validation names: [VALIDATION.md](../../VALIDATION.md)
- Required behavior: [Product specification](../product/02-spec.md)

## Risk-Based Coverage

| Changed responsibility         | Focused evidence                                                                                                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rules                          | Captures, suicide, declared ko/repetition policy, pass, setup and undo/redo                                                                                                                     |
| Records / SGF                  | FF4 Go parse/edit/UTF-8 export/reparse with unknown properties, branches and setup; declared-encoding failure retains active record                                                             |
| Edit history / export baseline | Navigation adds no edit entries/dirty state; grouped comment Undo; Undo-to-baseline clears dirty; failed/cancelled export retains baseline; Export/Discard/Cancel retains or replaces as chosen |
| State authority                | Same actions yield equivalent headless/browser positions; invalid moves do not mutate                                                                                                           |
| Renderer/input                 | Coordinate transforms, hit testing, keyboard/mobile interaction and disposal                                                                                                                    |
| Packaging/adapters             | Studio/read-only/headless packed consumer imports, declarations, asset paths, optional dependency exclusion                                                                                     |
| Studio workflow (M1)           | Open SGF, navigate/create variation, edit comments/markers, download/reopen; keyboard and mobile operation                                                                                      |
| Framework adapters (M2)        | Independent React 19/Vue 3/Svelte 5 target consumers: updates, remount/dispose, external controller retention, safe server imports/client mounting and native type/component packaging          |
| Scoring (M3)                   | Confirmed dead-stone selection and each claimed scoring-policy edge case                                                                                                                        |
| Puzzles (M3)                   | Accepted/rejected authored branches, scripted response and restart                                                                                                                              |
| Analysis (M4)                  | Late responses, cancelled requests, changed context, provider failure and unmount                                                                                                               |
| Documentation                  | Relative links, scope/status consistency and whitespace review                                                                                                                                  |

Add tests for observable behavior and material failure modes. Avoid assertions
that merely reproduce implementation internals. Keep real SGF regression fixtures
and targeted rule cases; retire tests that no longer protect a supported contract.

## Verification Budget

Run the narrowest applicable configured checks and stop after the acceptance
criteria and changed-risk checks pass. Expand or repeat checks for a new change,
failure or unresolved concern. Documentation-only work does not need runtime tests.

Validate actual packed consumers/examples before publishing compatibility claims.
Keep CI scoped to relevant implementation/package changes and release risks, and
batch validated pushes/releases to avoid redundant runner usage.

## Current Validation State

Root Bun scripts configure `test`, `typecheck`, `docs` and `check`, including the
SDK build, plus packed headless `smoke`. Explicit `smoke:browser` checks production
Studio/read-only, all three framework, puzzle and analysis workflows with Playwright
CLI. Independent adapter smoke checks installed types and real host SSR. See
VALIDATION.md for commands and the configured Oxlint/Oxfmt checks. `contract` and
`migration-check` remain unconfigured. Report only observed checks and explicit
coverage boundaries.
