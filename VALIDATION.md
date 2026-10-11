# Validation

- Status: Active local validation; hosted CI configured, hosted execution unverified

## Validation Source of Truth

This document owns stable validation names for this scaffold.

Feature evidence sections retain earlier scoped implementation results and counts.
Their prior command availability or remaining-work notes are historical; current
commands and coverage limits belong to Runner Policy and the active readiness review.
In particular, migration-check is now configured as documented below.

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

Terminal diagnostic coverage uses `packages/sdk/test/automation-diagnostics.test.ts`
for actual completed-step/failure traces, one execution, environment prevalidation,
private text/error-accessor exclusion, scoring/restore/checkpoint/snapshot and
request/retention bounds. `scripts/packed-consumer.ts` checks root/subpath/no-DOM/
classic public artifacts. `scripts/packed-cli.ts` exercises installed Node discovery,
file/stdin requests, fixed transport envelopes, safe environment/timing, actual
successful/failed report publication, existing-output/force and input protection.
Normal automation/checkpoint fixtures continue to verify authored result compatibility.

The installed Node CLI check discovers and executes every embedded `recipe`, checks
read-only branch/search and agreed scoring outcomes, resumes an actual returned
checkpoint across processes, and explicitly applies/Undo/rejects stale preview
requests. Discovery misuse/traversal/repeated flags return fixed usage errors;
no source checkout, browser or extra template interpreter is required.

`scripts/performance.test.ts` checks legal authored workloads and fresh warm/sample
measurement/verification/disposal behavior without time thresholds. The opt-in `perf`
runner rebuilds public Node SDK artifacts and records 24 original/authored workload
cases. `packages/sdk/test/controller-replay.test.ts` compares warm/evicted states
with fresh replay across captures/passes/setup/MN/collections/branches and guards
cache invalidation through edits/Undo/import/checkpoint rules. Shared controller
changes also run the production browser suite; desktop SDK timing does not prove paint latency.

## Required Final Report

`scripts/accessibility-scenario.js` runs against actual built production pages.
It checks Studio replacement/removal dialog names in four languages, native modal
keyboard focus/Escape, preserved authored state and selection, and three framework
sharing guards at desktop/320px widths. `--accessibility-only` selects this focused
browser route; full browser and sharing routes include it. This does not prove
physical screen-reader or untested engine support.

`scripts/release.test.ts` covers manifest bounds/state, traversal/duplicates,
modified/extra files, directory links, source-preserving isolated restaging, actual
Git source guards and failed/timed-out check processes. `bun run release prepare`
requires committed clean source and runs all nine gates against retained artifacts;
see [release](docs/ops/release.md). Prepared reuse verifies integrity without rerunning
gates. `verify` and `restore --bundle DIR` do not prove publication or live rollback.

Final responses must list executed validations, passed validations, skipped validations, skip reasons, and remaining risk.

## Runner Policy

Use the root Bun package scripts. Run state-changing build/check commands serially.

Operations require setup and `bun run build` first because they import public built
SDK artifacts. `scripts/operations.test.ts` verifies actual controller restoration
and command processes, preserving sources and excluding authored data. Direct
`bun scripts/operations.ts` emits one JSON result; package-runner banners are not
response content. Existing downloaded Studio backup fixtures are separately checked
by the operations command, without substituting a schema-only result for restoration.

| Name                  | Command                                      | Evidence                                                                                                                                                                               |
| --------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| lint                  | `bun run lint`                               | Oxlint correctness rules, React hooks/compiler and Vue rules; warnings and unused suppressions fail                                                                                    |
| doctor                | `bun run doctor`                             | Read-only stable Bun/Node major, lockfile and installed-tool diagnostics                                                                                                               |
| operations (recovery) | `bun run ops recovery-check --input FILE`    | Bounded UTF-8 checkpoint/Studio backup restored and compared in an isolated controller; source bytes/content are not emitted or changed                                                |
| operations (drill)    | `bun run ops drill-recovery`                 | Authored study checkpoint round-trip, corrupt/future preservation, dirty guard, explicit replacement and post-restore Undo; no physical/browser/remote durability claim                |
| performance (SDK)     | `bun run perf --output FILE`                 | Rebuild/public Node artifacts; original/authored workloads, raw warm/sample timings and correctness checks; no default CI timing threshold or browser/device claim                     |
| boundaries            | `bun run boundaries`                         | Classified SDK runtime imports, public consumer imports, framework isolation and file-size review candidates                                                                           |
| format                | `bun run format`                             | Read-only Oxfmt check for supported source, styles, components and documentation                                                                                                       |
| security (files)      | `bun run security:files`                     | Signal-only private-file/credential and workflow permission/trigger checks; no credential content in output                                                                            |
| security (deps)       | `bun run security:deps`                      | Registry high/critical dependency audit; requires network and fails on audit-service errors                                                                                            |
| typecheck             | `bun run typecheck`                          | Strict TypeScript checks for implementation, tests and scripts                                                                                                                         |
| typecheck (Svelte)    | `bun run typecheck:svelte`                   | Native components and example checked with Svelte's supported isolated TypeScript toolchain                                                                                            |
| test                  | `bun run test`                               | Focused SDK behavior and CLI completion-result tests using Bun's test runner                                                                                                           |
| docs                  | `bun run docs`                               | English documentation, LF endings and relative links                                                                                                                                   |
| smoke                 | `bun run smoke`                              | SDK build, isolated tarball install, strict ESM/headless/global declarations and Node public-export/classic VM execution                                                               |
| smoke (adapters)      | `bun run smoke:adapters`                     | Separate npm tarball installs, framework dependency isolation, strict declarations and real React/Vue/Svelte SSR                                                                       |
| smoke (starter)       | `bun run smoke:starter`                      | Copyable standalone app, isolated npm SDK/tools installation, independent strict types/build, actual browser editing/download/reopen, guards and keyboard/emulated touch               |
| smoke (KataGo)        | `bun run smoke:katago <binary> <model>`      | 35 actual local-engine/process checks across all reporting perspectives; explicitly supplied assets required                                                                           |
| smoke (KataGo, Node)  | `bun run smoke:katago:node <binary> <model>` | Same checks on the actual Node runtime with external public SDK imports                                                                                                                |
| smoke (browser)       | `bun run smoke:browser`                      | Studio/viewer and framework consumers; editing/ink round-trips, touch, comparisons, embedded sharing/guards/clipboard, transforms/input, diagrams, encoding/cancellation and lifecycle |
| check                 | `bun run check`                              | Lint, format, SDK/adapter builds, root/Svelte typechecks, tests, docs and SDK packed-consumer smoke                                                                                    |

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
`bun run migration-check` rebuilds public SDK artifacts and runs checkpoint,
preference, draft metadata and isolated operations regressions. It checks supported
legacy-field migration, interrupted write/cleanup reopening, idempotence, future-data
preservation and actual serialized restoration. It does not modify a user profile,
upgrade a future browser database or claim power-loss durability; see the
[migration procedure](docs/ops/data-migrations.md).
Standalone `contract` is not configured; interface gates run inside `check`. Manual
`git diff --check` is whitespace evidence, not an invented lint result.

## Code Quality Tooling

`bun run build:cli` builds the SDK and optional Node executable; `bun run cli`
runs its local artifact. `bun run smoke:cli` builds and independently installs
SDK/CLI tarballs with npm, then checks the actual installed bin and Node JSON,
stdin/files, editing/reopen, snapshots, schema/errors/limits and output protection.
Long-record checks resume an actual returned location beyond move 128 through
the installed Node CLI and save its edited SGF; SDK tests also cover a late
variation, portable reopen and the total-node locator bound.
Installed CLI checks also inspect Shift_JIS multibyte comments/player names/labels,
edit the record and reopen its UTF-8 output. SGF tests cover escaped-looking trail
bytes, decoded character limits and rejection of fake/mixed encoding declarations.
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
The runtime dependency boundary gate follows them before building. Environment
setup uses `bun run setup` with a frozen lockfile; `commands` reads actual scripts,
while `clean` previews artifacts and requires explicit `--apply` to remove them.
Cleanup tests verify previews, preserved source/dependencies and refusal of linked
targets before any deletion. Module tests reject static/dynamic/CommonJS renderer
imports and private/unrelated-framework consumer imports; type-only/computed
imports remain covered only to the extent of strict declarations/packed checks.

`bun run ci:plan --base <commit> --head <commit>` reports changed files and actual
check commands. `bun run ci:run` executes them serially; `--dry-run` prints only.
Missing/empty/invalid diffs select full evidence, never success without checks.
Documentation-only changes run format/docs/security signals; known optional SDK
changes select focused browser scenarios. Unknown shared changes select the full
browser suite. Lockfile/manifests also require installed adapters/starter and the
dependency audit. See [CI policy](docs/ops/ci.md) for routing, cache and permissions.
Planner tests verify fallback, multi-feature routing, root command existence and
permission/credential signals. These do not establish an actual GitHub run.

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
replies and owned/borrowed lifetime.
Unavailable-context fixtures also verify source navigation/edit/Undo/import drawing,
crop reset on smaller boards, recovery and disposal without automatic submission.
Keyboard/emulated touch/layout, identical source SGF downloads and an actual
six-stone PV SVG excluding predictions/cursor are
required with the exact completion Result. It is included in the complete suite;
illustrative protocol data does not establish actual engine/model compatibility.
`--drop-only` exercises Studio's production DOM file drag/drop boundary, metadata,
Shift_JIS comments/names/labels and their edited UTF-8 export/reopen,
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

## Record Editing Evidence

`bun run test` verifies that rejected moves, node/value-limit failures and empty
Undo/Redo requests preserve comment-group cleanup and one-step Undo/Redo. No-op
annotations retain the session; committed non-comment edits remain separate Undo
units. Snapshot identity and dirty-state recovery are checked through public APIs.

## Hygiene Validation

After building examples, `bun scripts/browser-smoke.ts --recovery-only` verifies
real IndexedDB saves, page close/reopen and selected dirty branch recovery,
session-local Undo, independent two-tab edits, injected quota denial with atomic
metadata rollback, cap/retry, stale deletion, corrupt/future records, confirm/cancel,
guarded backup restore, actual portable backup/SGF files and disabled-storage export.
English/Korean/Chinese/Japanese controls and 320px/1440px screenshots are checked.
The full browser suite includes this scenario. The board-menu scope additionally
opens/closes the recovery modal from borrowed controls and restores their handlers.
These checks do not establish abrupt process-kill or physical-device durability.

Checkpoint tests cover collection/branch selection, long paths, annotations and
unknown values, semantic export baselines, rules/superko replay, clean/dirty recovery,
future/malformed/oversized input, lower host limits, retained groups/history/tickets
after refusal and terminal conflicts. Packed SDK consumers check the headless
subpath/declarations; installed Node CLI checks resume a persisted JSON request and
save/reopen its SGF. Studio storage has the separate browser evidence above.

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

## Studio Preferences Evidence

After building examples, `bun scripts/browser-smoke.ts --preferences-only` checks
actual localStorage legacy migration, new-format precedence, twelve restored
settings, applied board theme/transform/numbers/size, independent simultaneous tabs, explicit
reset and retained dirty selection/Undo/Redo/drafts. The runner compares downloaded
before/after checkpoint payloads, including SGF, baseline, selection and rules.
Future/corrupt preferences survive ordinary edits until reset; unreadable autosave
starts off, and denied storage leaves editing/session controls usable. All four
reset translations fit the 320px board menu; its screenshot was inspected.
The scenario also runs in the full production browser suite. Headless model tests
cover failed migration writes and bounded per-field reset. Other browser engines,
physical devices and hosted CI are unverified. No SDK API or draft database schema
changes are required; affected CI routing includes `--preferences-only`.

## Record Tools SDK Evidence

`packages/sdk/test/record-tools.test.ts` covers whole-collection/branch search,
literal/case/field filtering, metadata/labels, passes/`MN`, pagination, work/output
bounds and deep 4,000-move traversal without replay. Comment batch checks cover
immutable previews, shared unchanged subtrees, cross-game targets, one notification/
Undo unit, selection/export/rule preservation, malformed/missing/duplicate/over-limit
refusal, no-op/group/Redo/ticket retention and stale/foreign/forged ownership.
`check` executes these tests and packed root/controller/selective-search consumers
under Node with strict declarations, including an ES2022-only no-DOM consumer.
SDK integration passed 167 tests / 2,296 assertions and existing 103 installed CLI
checks. New terminal/Studio interaction follows separately; no new UI evidence is
claimed from these headless checks. Independent contract/migration-check intents
remain unconfigured; public API and ADR 0019 own the additive contract.

## Record Tools Terminal Evidence

Automation schema discovery includes `search` and `comment-batch`; installed
`banora search` checks file/stdin, literal/explicit-empty/case queries, field/game
filters, pagination and structured argument/limit errors. Packed Node CLI checks
portable multi-node preview/apply, unchanged source, exact `expectedSgf` and
per-comment guards, one-step Undo/selected location, saved SGF reopen and rejected
output publication. A returned search path past move 360 resumes and edits through
an actual subsequent installed request. Repeated whole-record operations share
eight calls per request; malformed/stale requests expose no partial record.

Terminal integration passed `check` (170 tests / 2,322 assertions, root/Svelte types,
builds, quality/boundaries/docs and packed SDK/CLI). Final installed CLI smoke passed
169 checks after adding explicit-empty query handling. The full production browser
suite passed on Chrome 154 after the shared controller/schema changes, covering
existing SDK/Studio/framework workflows. Studio search/select/batch UI remains a
subsequent integration, not evidence inferred from terminal or existing UI checks.
Other browser engines, physical devices and hosted CI were not executed. Separate
`contract`/`migration-check` intents are unconfigured; no DB migration is added.

## Record Tools Studio Evidence

After `build:examples`, `bun scripts/browser-smoke.ts --search-only` uses the same
production Playwright CLI consumer as the full browser suite. Both routes inspect
the actual downloaded SGF for four edited comments, unknown-property preservation
and `MN[700]`. The scenario searches multiple games/branches, navigates a late
position, selects across pages, previews/cancels/applies/clears comments, and checks
one-step Undo/Redo and export-baseline retention. It verifies source-change preview
invalidation, retained typed input, import selection reset, inert retained old result
buttons, empty-result page ranges, the 256-selection cap and aggregate-input refusal.

English/Korean/Chinese/Japanese labels retain literal authored before/after text.
The dialog is checked at 1440px and 320px, with keyboard focus/Escape, quick-menu
borrowing/restoration and separate result/diff scrolling. `search-controls.ts`
imports only public SDK exports. Focused CI routing covers that consumer and its
scenario; shared Studio/language/menu changes retain broader routing. No SDK public
API, DB, storage schema, dependency or hygiene change is introduced by this UI.
Independent `contract`/`migration-check` runners remain unconfigured; physical
devices, other browser engines and hosted CI execution remain unverified.

Studio integration passed `check`: 170 tests / 2,323 assertions, lint/format,
boundaries, builds, root/Svelte types, 108 documents / 340 links, packed SDK and
169 installed CLI checks. The full production browser suite passed on Windows
Headless Chrome 154, including this search scenario and existing consumer flows.
The final focused route also passed after giving search selection its own translated
caption and revoking preview approval synchronously on Close/navigation/Escape.
An earlier focused run caught delayed native-close cleanup retaining Apply briefly;
the cancellation fix preserves typed input and passes the same regression scenario.

## Explicit Diagnostic Journal Evidence

`packages/sdk/test/diagnostics.test.ts` projects actual controller and SGF failures
without changing controller state, maps unsupported game input to correction rather
than an assumed upgrade, and tests unknown/prototype-like codes without coercion.
It covers bounded eviction/retained summaries, immutable historical snapshots,
clear/nonreused IDs, cross-realm plain data, capacity shadowing, forged advice,
malformed-input atomicity, raw-text/fingerprint exclusion and accessor/proxy failures.

`check` passed 174 tests / 2,432 assertions, quality/boundaries/builds/root/Svelte
types, 110 documents / 351 links, packed SDK and 169 installed CLI checks. After
the unsupported-input recovery refinement, focused tests passed 4 cases / 110
assertions and final typecheck/lint/build/packed SDK smoke passed. Independent
Node consumers execute root/selective/no-DOM declarations and classic VM reports.
`@banora/sdk/diagnostics` is additive; no controller/automation return contract,
DB, storage schema, dependency or hygiene change. Packed consumer runner and source
boundary classification include the new headless entrypoint.

Browser suites were not repeated for this isolated headless module; Studio does
not import it yet and the prior production suite covers the existing UI. No Studio
opt-in/download/help or CLI diagnostic-command evidence is inferred. Physical
devices, other engines and hosted CI/monitoring remain unverified. Separate
`contract`/`migration-check` intents are unconfigured. The operational guide now
uses real local commands and identifies the missing private security-report channel
instead of inventing a contact or a hosted collector.

## Studio Support and Diagnostic Evidence

`scripts/studio-diagnostics.test.ts` verifies default-off, no off-start timing,
one completion per attempt, epoch invalidation after clear/disable/re-enable/dispose,
optional clock failure, listener isolation and raw-text exclusion. The Studio model
is session-only and uses public SDK exports; no localStorage/IndexedDB consent or
diagnostic record is created.

After `build:examples`, `bun scripts/browser-smoke.ts --support-only` checks the
production consumer through Playwright CLI. The full suite calls the same scenario
and inspects the actual downloaded `banora.diagnostics/v1` JSON for a real SGF
failure and absence of authored/query/file content. The scenario checks navigation/
edit/search/batch evidence, report inspection/download/failure, unchanged record
dirty state, 64-event eviction, clear/disable/reload and consent changes during
delayed public File reads. Delaying File/URL APIs is fixture environment control;
no private SDK/controller or production test hooks are used.

Help discovery launches record dialogs, opens all indexed board-menu sections and
focuses theme/display size settings. Four locales, 320px layout, Escape/focus,
menu restoration and no remote requests are checked. The GitHub feedback link has
no prefill/referrer; read-only API inspection found Issues enabled on a private
repository, so public feedback access is not claimed. Current local template changes
have not been pushed. Separate `contract`/`migration-check` runners are unconfigured;
physical devices, other browser engines, hosted CI/telemetry and public release
remain unverified. No SDK API, DB/storage schema, dependency or hygiene changes;
browser/CI runners add a support-focused route and actual artifact inspection.

Studio integration passed `check`: 176 tests / 2,448 assertions, root/Svelte types,
builds, quality/boundaries, packed SDK and 169 installed CLI checks. The full
production suite passed shared consumer flows on Windows Headless Chrome 154.
Final focused support and locale routes passed the expanded menu/settings registry,
gutter refinement and authored `GN[Success]` preservation across all four languages.
Game headings/options remain authored text even when their value is a UI key.
Final root typecheck/lint, docs (111 documents / 353 links), file/permission signals
and whitespace checks passed. No broader engine/device or hosted execution is inferred.
