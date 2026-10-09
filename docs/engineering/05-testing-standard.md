# Testing Standard

- Status: Planned evidence; test tooling and commands are not configured
- Validation names: [VALIDATION.md](../../VALIDATION.md)
- Required behavior: [Product specification](../product/02-spec.md)

## Risk-Based Coverage

| Changed responsibility | Focused evidence |
| --- | --- |
| Rules | Captures, suicide, declared ko/repetition policy, pass, setup and undo/redo |
| Records / SGF | Parse/edit/export/reparse with comments, unknown properties, branches and setup |
| State authority | Same actions yield equivalent headless/browser positions; invalid moves do not mutate |
| Renderer/input | Coordinate transforms, hit testing, keyboard/mobile interaction and disposal |
| Packaging/adapters | Studio/read-only/headless packed consumer imports, declarations, asset paths, optional dependency exclusion |
| Studio workflow (M1) | Open SGF, navigate/create variation, edit comments/markers, download/reopen; keyboard and mobile operation |
| Framework adapters (M2) | Independent React/Vue/Svelte consumers: config/state/event updates, remount/dispose, SSR boundary and type/component packaging |
| Scoring (M3) | Confirmed dead-stone selection and each claimed scoring-policy edge case |
| Puzzles (M3) | Accepted/rejected authored branches, scripted response and restart |
| Analysis (M4) | Late responses, cancelled requests, changed context, provider failure and unmount |
| Documentation | Relative links, scope/status consistency and whitespace review |

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

## Current Scaffold State

Runner `none` provides no executable test/lint/typecheck/build jobs. Record manual
documentation checks as manual evidence. Report automated validation names as
skipped until their commands are genuinely configured; do not invent passing jobs.
