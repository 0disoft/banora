# M1-M4 Implementation Delivery Audit

- Date: 2026-10-10
- Result: The specified SDK/example implementation is complete in the recorded local
  matrix. This is an implementation delivery, not package publication or hosting.
- Requirements: [product specification](../product/02-spec.md),
  [roadmap](../product/01-roadmap.md),
  [project invariants](00-project-invariants.md) and accepted ADRs.
- Detailed milestone evidence: [local acceptance audit](09-milestone-audit.md).
- Matrix: Windows, Node 24.14.0, Bun 1.4.2, Headless Chrome 154, React 19.3.0,
  Vue 3.5.43 and Svelte 5.57.2. Browser touch uses emulation, not physical devices.

## Audit Method and Current Evidence

Treat completion as unproven until each requirement has an implementation, public
consumer surface and relevant observed evidence. Inspect actual source/exports,
behavior assertions, executable consumer routes, result parsing and downloaded
artifacts; a green command without covering assertions is insufficient. The table
below preserves the full feature scope, not just the newest analysis increment.

The final runtime implementation passed `bun run check`: 114 tests with 1,439
assertions across 19 files, strict root/Svelte typechecks, SDK/adapter builds,
documentation checks and isolated SDK headless/root/classic consumers. The complete
production browser suite passed after the final example build, covering all existing
Studio/framework flows and the new analysis route. The strengthened focused
analysis route also completed its exact Result and actual source/PV downloads.
Subsequent changes are documentation and scenario diagnostics/assertions; SDK and
adapter runtime source is unchanged from those executions.

For this final audit, `bun run smoke:adapters` independently installed the current
SDK plus each adapter tarball and passed strict declarations, dependency isolation,
licenses and real React/Vue/Svelte host SSR. The isolated installed framework versions
are the same versions listed above. SDK headless public subpaths use ES2022-only
consumer libraries; root/view modules import without browser globals, while mounting
still requires a DOM. SSR emits host containers/state text, not board HTML/hydration.

Inspect the built ESM import closures for selective `core`, `sgf` and `board` entries:
none imports analysis/KataGo, puzzle, scoring, viewer, comparison or sharing modules.
Core has no runtime framework/DOM imports; adapters import their own framework and
the same public SDK controller/renderer. This is dependency-boundary evidence,
not a measured bundle-size or speed guarantee. The classic global build intentionally
contains the common API rather than being a minimal selective import.

`scripts/scenario-result.ts` requires one exact JSON `Result` value for each browser
scenario. The oneshot runner rejects missing/partial/source-echo-only completion and
cleans its localhost server/browser session. Download checks inspect actual files,
including preserved SGF, real PNG/SVG assets, identical scoring/analysis source
exports and the six-stone puzzle/analysis final diagrams. Generated artifacts are
execution evidence only; source contracts and fixtures remain authoritative.

## Complete Capability Inventory

All rows are verified within the coverage stated by their owning API/compatibility
documents; no row implies a broader browser, tournament-rule or engine claim.

| Specification capability                                        | Current implementation and public surface                                                                     | Observed evidence                                                                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Board sizes, coordinates and crop                               | `core.ts` dimensions 2..52 including rectangular positions; `board.ts` SVG grid/standard star points and crop | Core/geometry fixtures, installed Node core and presentation/browser flows                                                     |
| SVG, flat/wood, CSS variables, letters/shapes/move numbers      | Common Board/Viewer and node annotations                                                                      | Production rendering/editor/presentation fixtures, inherited CSS and actual diagrams                                           |
| Pointer/touch/keyboard, preview and responsive layout           | Logical input in Board plus shared touch tools                                                                | Browser keyboard/capture/rejection, screen-axis transforms, mobile layout and touch scenarios                                  |
| Captures, suicide, simple ko, pass, komi/handicap and history   | Pure core/controller; explicit rules/scoring settings                                                         | Core/controller/scoring fixtures and installed/browser transitions                                                             |
| SGF records and navigation                                      | Bounded FF4 Go parser/serializer, collections, metadata/setup/branches/comments and encoding diagnostics      | SGF/controller tests, file-drop/import guard and downloaded export/reopen                                                      |
| Viewer/Studio controls/tree/comments/player info/loading/export | `mountViewer`, Studio and read-only/viewer examples                                                           | Production browser workflow and actual SGF reopening                                                                           |
| Basic editing                                                   | Controller continuation/comment/marker commands and edit Undo                                                 | Original branch retention, grouped comment edits, labels/shapes and semantic dirty tests                                       |
| Framework-independent/selective integration                     | Common package entrypoints, public-package Studio/read-only consumers                                         | SDK tarball/no-DOM runtime/types, source import inspection and ESM closure review                                              |
| React/Vue/Svelte and browser script                             | Separate native Board/Viewer/state adapters; global IIFE/declarations                                         | Actual three-framework client lifecycle, fresh independent installed types/SSR and script-only viewer                          |
| Rotation/reflection, textures and motion                        | Common geometry, prepared embedded stone textures, opt-in placement animation                                 | Eight rectangular/cropped transforms, real texture/animation diagram pixels, reduced-motion/cancellation and native forwarding |
| Branch removal/reorder, setup, lines/arrows/pen                 | Undoable controller edits and versioned node-local BPN ink                                                    | Extended editor/ink fixtures, legal logical drag/touch/keyboard, download/reopen and Undo                                      |
| Magnified/release/confirmed mobile input                        | Shared touch aim and optional confirmation                                                                    | Emulated-touch magnifier/transform/callback/cancel scenarios plus keyboard refinement                                          |
| Side-by-side comparison                                         | Immutable inspection/diff and pinned common/native composition                                                | Differences, source retention, deletion/import generation and diagram/lifecycle checks                                         |
| Position/node links and PNG/SVG export                          | Versioned bounded sharing, standalone vector/raster diagrams                                                  | Public link codec/opening/guards, native consumers, actual embedded PNG/SVG pixels and disposal/failure checks                 |
| Superko and named rules                                         | Exact persistent positional/situational membership, explicit profiles/pass ledger                             | Long cycles/different-turn/self-capture/hash collision, setup/cache/Undo/import and mounted legality fixtures                  |
| Manual scoring                                                  | Whole-group dead/seki selection, territory/area, capture/dead/pass prisoners, komi/handicap/adjustments       | Headless preset fixtures and Studio input/group/preset/correction/touch checks; identical source SGF                           |
| Curated puzzles                                                 | Bounded authored trees, responses, hints, restart/outcomes/events and common view                             | Headless/installed fixtures and production correct/incorrect/unlisted/illegal/pass/capture/lifecycle checks                    |
| Analysis display                                                | Black metrics/current-player loss, isolated legal PVs and root ownership/point inspection                     | Production/public-SDK browser metrics, captures/pass/steps, crop/reflection, keyboard/touch and source/PV exports              |
| External analysis integration                                   | Exact provider-neutral sessions and host-owned KataGo JSON query/result/termination                           | Deferred cancellation/freshness fixtures, checked protocol boundaries, installed Node flow and explicit manual JSON consumer   |

The seven numbered first-release acceptance items are separately mapped and
verified in the milestone audit: open/display, branch/navigation/continuation,
edits/legal rejection/Undo, download/reopen, public Studio/read-only/headless use,
keyboard/mobile without remote prerequisites, and package/license/example contents.

## Invariants and Failure Gates

| Invariant numbers                                  | Implementation/evidence that establishes the contract                                                                                                                                                       |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1, 13: one game authority/shared adapters          | Core transitions feed RecordController; native adapters call the same public mounts, subscribe and dispose. No adapter rules/drawing implementation; actual React Strict Mode/Vue refs/Svelte update checks |
| 2, 11: headless and optional dependency boundaries | Selective ESM closures, ES2022-only installed declarations/Node execution, zero SDK runtime dependencies and independent adapter installs excluding unrelated frameworks                                    |
| 3: atomic failures                                 | Core/controller/SGF/puzzle/analysis bad-input fixtures and production guarded/malformed import/invalid-view update cases preserve active state                                                              |
| 4: logical coordinates                             | Pure geometry inverse tests at rectangular intersections plus mouse, keyboard/touch, cropped/reflected/rotated diagram and overlay checks                                                                   |
| 5, 16: supported SGF preservation/diagnostics      | Parser validates supported property syntax/encoding/bounds, retains unknown values; controller and actual Studio/file-drop download/reopen retain metadata and branches; export declares UTF-8              |
| 6: accurate profile claims                         | Explicit rule/scoring descriptors and agreed-position coverage; ko/superko/pass/scoring fixtures and unsupported KataGo contexts are documented rather than aliased                                         |
| 7: scoring distinct from prediction                | Manual user-selected whole-group scoring and correction remain separate from provider root/PV ownership; source exports stay identical; no automatic status agreement                                       |
| 8: request/current context/live consumer           | Exact source generation/history/settings identities, apply-time freshness, immediate stale/cancel/dispose settlement and late response/error rejection in headless/browser fixtures                         |
| 9: explicit ownership/disposal                     | Owned/borrowed Board/Viewer/puzzle/analysis cases, failed mounts, callbacks, remount, pending encoding and delayed analysis checks preserve externally supplied source records                              |
| 10: no implicit remote work                        | Core/record source has no transport/telemetry; local consumers require only same-origin assets. Browser scenarios observe requests; analysis construction/update/remount submits nothing                    |
| 12: current APIs/examples/documentation            | Built public-package imports only, package exports/types, docs links/status consistency and explicit tested/untested coverage. No private SDK import substitutes for a consumer                             |
| 14, 15: navigation/edit/dirty separation           | Navigation creates no edits/dirty state; grouped comments, branches, semantic baseline, export tickets, Undo-to-baseline and guard/failure fixtures; download initiation does not prove disk persistence    |

Named gates are implemented rather than assumed: SGF byte/node/depth/value bounds,
atomic dirty replacement/import, bounded edit history/export tickets, scoped edit
groups, reference import generations, private annotation bounds, texture/image and
diagram limits, shared link size/target/privacy checks, puzzle node/depth/text/legal
tree bounds, analysis identity/metric/PV/ownership bounds, and KataGo line/pending/
supported-context limits. Their owning API documents and focused tests define exact
numbers; broad fuzzing, arbitrary corpus coverage and device benchmarks are not implied.

## Named Artifacts and Commands

- Common SDK: ESM/selective declarations, classic `Banora` script/ambient declarations
  and MIT notice. Separate React/Vue/Svelte packages expose native Board/Viewer/state
  bindings with their own declared peers and MIT files.
- Runnable public-package consumers: `examples/studio`, `readonly`, `viewer`,
  `browser`, `react`, `vue`, `svelte`, `puzzle` and `analysis`. Vite inputs include
  every page; `bun run dev` serves them and `bun run build:examples` emits static pages.
- Root `check`, `typecheck`, Svelte typecheck, `test`, `docs`, build, SDK smoke,
  packed-adapter smoke and browser smoke are actual Bun scripts in `VALIDATION.md`.
  Focused browser routes run through its same explicit completion/artifact gate.
- Root/package licenses cover original code/documents/authored SGF, SVG/CSS and
  procedural/raster fixtures. SDK has no bundled engine/model/fonts or third-party
  runtime dependency; independent artifact checks inspect licenses. Framework
  consumer distribution notices belong to the later release task.
- Git hygiene excludes dependencies/builds/cache/Playwright output/local secret
  files. No tracked credential/environment file or hosted workflow is added by
  implementation delivery. Dependencies use compatible major ranges and the
  committed lock records the resolved development graph.

## Explicit Boundaries, Skips and Completion

At this audit, `lint`, `format`, `contract` and `migration-check` were unconfigured
and skipped, not reported green. Oxlint and Oxfmt have since been configured; see
[current validation](../../VALIDATION.md#code-quality-tooling). Whitespace evidence
for the original audit is `git diff --check`. The final audit
does not rerun already-passing unchanged core/browser source unnecessarily; fresh
packed adapters close the remaining current-artifact SSR evidence question.

Additional browser floors, physical devices, screen readers, FF4/encoding corpora,
large-record/device performance measurements and broader KataGo version/config/model
validation remain follow-up evidence beyond the selected local-engine audit. Named scoring covers agreed status,
not complete tournament adjudication. Offline analysis numbers are authored
illustrations; manual JSON uses explicitly supplied engine output and opens no
connection. The subsequent [live-engine audit](11-live-katago-evidence.md) establishes
one actual local KataGo CPU/model/config on Bun and Node; broader engine evidence
remains unclaimed. Native Puzzle/Analysis components and server-rendered board HTML are
not promised by the implemented adapter contract. Canvas/workers/Rust/WASM require
a measured bottleneck; autosave/recovery and managed collaboration/storage are deferred.

Package registry ownership, release version promotion/publication, public hosting,
external provider credentials and services are separate operational actions, not
missing implementation deliverables. Development versions remain `0.1.0-dev.0`.
No push/publication/deployment is performed by this audit.

Every required feature, first-release acceptance item, milestone exit condition,
invariant and consumer artifact has evidence above and in the linked detailed
contracts. No required SDK/example implementation item remains open in the delegated
scope. This closes implementation delivery without broadening compatibility claims
or treating future operational/measurement work as already achieved.

## Post-Delivery Consumer Evidence

The copyable standalone record editor now passes its independent npm tarball/tool
installation, strict types, production build and actual browser open/edit/download/
reopen/guard/invalid-input workflow, including keyboard and emulated touch. Its
own MIT notice travels with the template. The host-owned local KataGo CLI and
[35-case actual engine audit](11-live-katago-evidence.md) add selected CPU/model
stdio evidence on Bun 1.4.2 and Node 24.14.0. SDK/native runtime source remains
unchanged; these increments extend consumer evidence, not implicit SDK transport
or publication/deployment scope.
The post-delivery `check` again passes 114 tests/1,439 assertions, root/Svelte types,
package builds, docs and the installed SDK/headless/classic consumers. Existing
production browser and independently installed native/SSR evidence remain valid:
their SDK/adapter source and locked dependencies are unchanged. The new standalone
app and both actual-engine runtime routes have their own completed checks above.
