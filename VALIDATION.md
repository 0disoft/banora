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

| Name                 | Command                                      | Evidence                                                                                                                                                                               |
| -------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| lint                 | `bun run lint`                               | Oxlint correctness rules, React hooks/compiler and Vue rules; warnings and unused suppressions fail                                                                                    |
| format               | `bun run format`                             | Read-only Oxfmt check for supported source, styles, components and documentation                                                                                                       |
| typecheck            | `bun run typecheck`                          | Strict TypeScript checks for implementation, tests and scripts                                                                                                                         |
| typecheck (Svelte)   | `bun run typecheck:svelte`                   | Native components and example checked with Svelte's supported isolated TypeScript toolchain                                                                                            |
| test                 | `bun run test`                               | Focused SDK behavior and CLI completion-result tests using Bun's test runner                                                                                                           |
| docs                 | `bun run docs`                               | English documentation, LF endings and relative links                                                                                                                                   |
| smoke                | `bun run smoke`                              | SDK build, isolated tarball install, strict ESM/headless/global declarations and Node public-export/classic VM execution                                                               |
| smoke (adapters)     | `bun run smoke:adapters`                     | Separate npm tarball installs, framework dependency isolation, strict declarations and real React/Vue/Svelte SSR                                                                       |
| smoke (starter)      | `bun run smoke:starter`                      | Copyable standalone app, isolated npm SDK/tools installation, independent strict types/build, actual browser editing/download/reopen, guards and keyboard/emulated touch               |
| smoke (KataGo)       | `bun run smoke:katago <binary> <model>`      | 35 actual local-engine/process checks across all reporting perspectives; explicitly supplied assets required                                                                           |
| smoke (KataGo, Node) | `bun run smoke:katago:node <binary> <model>` | Same checks on the actual Node runtime with external public SDK imports                                                                                                                |
| smoke (browser)      | `bun run smoke:browser`                      | Studio/viewer and framework consumers; editing/ink round-trips, touch, comparisons, embedded sharing/guards/clipboard, transforms/input, diagrams, encoding/cancellation and lifecycle |
| check                | `bun run check`                              | Lint, format, SDK/adapter builds, root/Svelte typechecks, tests, docs and SDK packed-consumer smoke                                                                                    |

`bun run build` builds the common SDK; `bun run build:adapters` also builds the
three adapters. SDK build emits selective ESM/declarations plus a standalone IIFE
and its global declaration; example build copies that exact script into its output.
`bun run example:katago <binary> <model>` builds the SDK and runs a bounded local
CPU analysis example, requiring explicitly supplied engine/model files. It owns
stdin/stdout/stderr, cancellation/deadline and process shutdown; it is not part of
the default `check` or a hosted-service/browser check.
The two optional KataGo smoke routes record version/hashes, protocol transcripts
and case results under `.tmp`; they assert actual metrics/coordinates/PVs/ownership,
source preservation and termination/failure/exit behavior. They neither download
assets nor substitute protocol fixtures for engine output. See the
[live evidence](docs/engineering/11-live-katago-evidence.md) for the exact tested matrix.
`contract` and `migration-check` are not configured; report them as skipped when relevant. Manual
`git diff --check` is whitespace evidence, not an invented lint result.

## Code Quality Tooling

`bun run build:cli` builds the SDK and optional Node executable; `bun run cli`
runs its local artifact. `bun run smoke:cli` builds and independently installs
SDK/CLI tarballs with npm, then checks the actual installed bin and Node JSON,
stdin/files, editing/reopen, snapshots, schema/errors/limits and output protection.
The default `check` also builds the CLI and runs that installed consumer after SDK
smoke. Runtime CLI operations require no browser, framework or remote service.
Each request is isolated; live app/engine bridges and headless diagram rendering
are not implied. `llms.txt` points agents to discovery and owning contracts.

Oxlint 1.x and Oxfmt 0.x are root development dependencies, with resolved versions
in `bun.lock`. Use `bun install --frozen-lockfile` to reproduce a reviewed graph.
Review formatter changes when updating its lock entry: a pre-1.0 minor release
can change formatting or configuration behavior.

Oxlint enables correctness rules from the ESLint, TypeScript, Oxc, React and Vue
plugins. Vue/Svelte script linting does not establish full template or framework
compatibility; root/Svelte typechecks and framework browser/packed consumers remain
required for relevant changes. Type-aware linting is not enabled in this baseline.
Intentional Playwright callback expressions, control-character sanitizers and
`createElement` object-ref false positives have narrow, explained suppressions.
Unused suppression comments fail the lint check.

Oxfmt uses two spaces, LF, semicolons, single quotes and a 100-column print width.
Playwright runners remove only the callback file's final statement semicolon before
passing it to the CLI's parenthesized expression boundary. A regression test checks
real expression evaluation, comments, internal semicolons and rejection of extra
statements; the callback files follow the same formatting rules as other scripts.
It preserves import/package-key order, Svelte section order, significant HTML
whitespace, Markdown prose wrapping and fenced examples. Build output, dependency
trees, caches, local evidence, scaffold state and generated lockfiles are excluded.
`bun run lint:fix` and `bun run format:write` explicitly modify source files; review
their diff before committing. Validation commands never apply automatic fixes.
The formatting baseline is committed separately from the tooling/lint changes.
Both read-only checks run first in `bun run check`.

Browser and packed-adapter smoke are explicit oneshot checks separate from `check`.
Framework lifecycle and transform checks count SVG board applications, excluding
comment indicator icons from renderer counts.
Standalone smoke is also separate: it copies `examples/standalone`, installs the
SDK tarball and independent tools with npm lifecycle scripts disabled, then serves
that consumer's production build through its own temporary localhost server.
It requires `banora-standalone-complete` in the actual CLI Result, downloaded SGF
preservation and outgoing Save & open content. For a focused rerun of an already
built copy, `bun scripts/starter-browser-smoke.ts .tmp/standalone-consumer-<id>`
uses the same server/session cleanup; it accepts only consumers under `.tmp`.
After building examples, `bun scripts/browser-smoke.ts --controlled-only` checks
plain host snapshots, immutable intentions, eight rectangular transforms,
nonrectangular masks/keyboard input, data overlays, combined-update rollback,
read-only/ink/navigation/context menus, actual SVG/PNG and view-owned cleanup.
It also runs the four production controlled consumers (Vanilla/React/Vue/Svelte),
host approval/rejection/stale keys, latest callbacks, read-only updates, remount,
actual diagram downloads and mobile touch confirmation/replacement/cleanup.
Both fixtures require their exact completion value in the CLI Result; consumer
downloads additionally require PNG signatures and standalone noninteractive SVG
with the host-approved stones. It is also part of the complete browser suite.

`bun scripts/browser-smoke.ts --playback-only` checks recorded playback in Studio,
common Viewer, React/Vue/Svelte and classic script: 0.5–5 second speed selection,
pause/end, scoped arrows/board Alt arrows, editable/select/dialog guards,
keyboard-opened modal pauses and host modals outside the Viewer scope, long SGF
preservation, record replacement, public updates and disposal/remount. The
scenario also checks Studio/Viewer variation numbers across branches, passes,
annotation/setup nodes, SGF `MN`, accessible labels and a selected node beyond the
500-node tree display limit. The exact
completion Result and downloaded 162-move SGF are required. This fixture is also
part of the complete production-browser suite. Browser scenarios restore the
expected Studio route before the legacy editor scenario; native wrapper coverage
does not accidentally run editor checks on another consumer page.

After building, `bun scripts/browser-smoke.ts --rules-only` selects the mounted
simple/none/positional/situational repetition fixture, actual keyboard play,
rejection announcements, immutable state/events, setup epochs, recorded navigation
and borrowed-controller disposal. It also runs in the complete browser suite.
Every browser scenario must return its exact completion string in the CLI's actual
JSON `Result` section. Echoed code, console messages, missing/partial output and a
successful command exit alone cannot establish completion. Both full and focused
routes enforce this; result-parser regressions run with the behavior tests.
After building examples/SDK, `bun scripts/browser-smoke.ts --touch-only` runs the
focused real-touch scenario using the same oneshot server/session cleanup.
`--scoring-only` selects Studio's manual group controls, all four counting presets,
seki, negative komi/adjustments, AGA pass/handicap components and final-pass warning,
invalid-input recovery, keyboard focus, navigation/setup/import reset, preservation
across comment/annotation edits and their Undo, and auxiliary
view disposal. Emulated mobile touch/layout and identical before/after downloaded
SGF are required. It runs in the full suite with the same strict completion Result.
`--puzzle-only` selects the production curated puzzle consumer and public puzzle-view
fixture. It checks authored capture/response/correct/incorrect/pass, illegal and
unlisted retention, hints/restart, keyboard focus, safe author text, presentation/
callback updates, downloaded SVG, failed mounting and owned/borrowed disposal/remount.
Emulated mobile touch/layout also complete the same authored solution. Its explicit
Result and actual diagram are required; it is included in the complete suite.
`--analysis-only` selects the production analysis consumer and public analysis-view
fixture. It verifies candidate/root Black metrics and current-player loss, pass/
capture PV steps, ownership/point values, rectangular transforms/crop, callback/
presentation updates, explicit manual JSON submission, errors/cancel/stale/destroyed
replies and owned/borrowed lifetime. Keyboard/emulated touch/layout, identical source
SGF downloads and an actual six-stone PV SVG excluding predictions/cursor are
required with the exact completion Result. It is included in the complete suite;
illustrative protocol data does not establish actual engine/model compatibility.
`--drop-only` exercises Studio's production DOM file drag/drop boundary, metadata,
deferred read completion/error races against newer valid/invalid selections and
new/example record replacement,
handicap/setup and branch rendering, Cancel/Export & continue, actual export/reopen
and retention after malformed bytes. It requires a completed Result and downloaded
SGF content. This uses browser-created File/DataTransfer/DragEvent objects; it does
not claim native operating-system file-drag automation.
`--comparison-only` similarly selects the comparison scenario without rerunning
unrelated browser flows during implementation.
`--share-only` selects production link opening/creation, clipboard fallback,
deferred copy completion/failure races against newer links, copies and import errors,
position privacy, Export/Discard/Cancel and framework cleanup. Clipboard writes
are stubbed in this check to avoid modifying the machine's clipboard.
`--texture-only` selects public SDK texture preparation/rendering/diagram pixels,
bounded inputs, object-URL cleanup and presentation isolation, then Studio and
React/Vue/Svelte file selection/reset, native props, diagrams and cancelled late
preparation. It verifies explicit completion markers and actual download assets
instead of assuming a returned CLI command finished the complete scenarios.
All texture fixtures are locally authored raster data.
`--animation-only` checks public SDK placement eligibility, real Web Animations,
redraw continuation, cancellation, live reduced-motion changes and final SVG/PNG
geometry. Its explicit completion marker is required before reporting success.
It then exercises Studio and all three native consumers' opt-in/duration controls,
Board/Viewer/owned propagation, pinned/static behavior, diagrams and lifecycle;
completion markers and actual download assets are checked for these consumers too.
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

## Board Menu Evidence

After building examples, `bun scripts/browser-smoke.ts --menu-only` verifies Studio
menu bounds at 320px/1440px, control restoration, Escape/focus, shared editing/Undo
and retained scoring sessions. An emulated mobile Chromium context also verifies
that 2x pinch zoom keeps the menu inside the visual viewport and leaves it operable.
This scenario runs in the full browser suite; physical keyboard/zoom behavior on
devices and other browsers remains unverified.

## UI Localization Evidence

After building examples, `bun scripts/browser-smoke.ts --locale-only` checks
English/Korean/Chinese/Japanese Viewer updates, custom literal messages, rejection rollback,
crop retention/reset across differently sized games and imports, later partial
Viewer updates and explicit invalid-crop rollback,
localized board accessibility, authored content/selection/dirty-state preservation,
Studio labels, sharing, manual scoring, SGF export, saved language preference,
Chinese/Japanese browser-language detection and saved-selection precedence, and
comment indicators (blank/whitespace, add/clear, Undo/Redo and localized accessible descriptions), plus
390px/1440px layouts. Language changes inside the board menu also preserve both
texture file inputs, their actual PNG upload handlers and clean record history.
It runs in the full browser suite. Existing role-based
fixtures explicitly select English; they do not rely on the runner machine's
browser language. Headless locale helpers are tested through an isolated packed
SDK install without DOM types. Physical devices are not implied by viewport checks.
