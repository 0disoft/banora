# M1-M4 Local Acceptance Audit

- Scope: the complete M1/M2 requirements and exit evidence in the
  [roadmap](../product/01-roadmap.md), plus the seven first-release acceptance
  items in the [specification](../product/02-spec.md) and the separately recorded
  M3/M4 exit evidence below.
- Result: M1/M2 local acceptance is verified in the declared matrix, including the
  additional Studio file-drop fixture. M3 local exit evidence is recorded below.
  M4 local exit evidence and the final requirement review are now recorded below
  and in the [delivery audit](10-delivery-audit.md). No published release or broader
  runtime support is declared.
- Matrix: Windows, Node 24.14.0, Bun 1.4.2, Headless Chrome 154; framework and
  compiler versions are recorded in [compatibility](../sdk/compatibility.md).

## Verification Basis

The implementation, public exports and scenario assertions were inspected against
each requirement. At the original M1/M2 audit, `bun run check` passed 53 tests with 699 assertions, strict root
and Svelte typechecks, package builds, documentation checks and an independently
installed SDK tarball. The complete browser suite also passed with every scenario
requiring its exact JSON `Result` return. Source echoes, console messages and a
successful CLI exit cannot stand in for completed execution.
The focused file-drop scenario also passed, checking production DOM file events,
metadata/setup/branches, replacement guards, a downloaded SGF reopened in Studio
and retention after malformed UTF-8 bytes. Browser-created File/DataTransfer/
DragEvent objects exercise the file-drop boundary; native operating-system drag
automation is not claimed.

The adapter implementation/artifacts are unchanged from their independently
installed React/Vue/Svelte type and real SSR checks. Those checks establish host
container/state rendering without browser globals, rather than board HTML or
hydration. Actual production browser flows establish client mounting and updates.
The commands and result parsing are owned by [VALIDATION.md](../../VALIDATION.md).

## M1 Requirements

| Requirement | Inspected implementation and evidence | Result |
| --- | --- | --- |
| Headless board, captures, suicide, simple ko, pass, setup and history | `core.ts`, `record-runtime.ts`, `controller.ts`; core/controller tests and installed headless SDK; browser capture/rejection and Undo | Verified for the documented policies |
| SVG sizes, coordinates, themes, marks, crops, preview and keyboard/pointer input | `board.ts`; geometry tests and production browser/presentation/touch scenarios | Verified in the declared matrix |
| FF4 Go records, UTF-8 output, metadata, comments, variations and unknown properties | `sgf.ts`; bounded parse/encoding/preservation tests; exported files reopened in Studio and the installed SDK | Verified for the documented subset |
| Studio, responsive board, controls, tree, comments, local/example loading and download | `examples/studio`; browser scenario verifies desktop and 390x844 mobile layout, local file input, editing/export/reopen and guards; file-drop scenario verifies the production DOM drop path and actual downloaded content | Verified in the declared matrix |
| Continuations, comments, labels and shape markers | Controller edit methods and board tools; controller/editing tests and Studio editing scenarios preserve the original branch | Verified |
| Separate navigation/edit history, grouped comments, dirty/export baselines and replacement guards | Controller tests, browser editing/guard checks and actual export/reopen assets; cancellation and failed imports retain records | Verified; download initiation cannot prove disk persistence |
| Minimal read-only embedding | `examples/readonly`; browser checks navigation, rejected editing and shared-controller unmount/remount | Verified |
| One common ESM/types SDK, framework independence and public-package consumers | SDK package/build configuration and example imports; installed SDK types/headless exports/classic VM plus built browser consumers | Verified; SDK has zero runtime dependencies |

Komi and handicap are configured through SGF `KM`, `HA`, `AB` and `PL` in M1.
A Node probe using built public exports verified a two-stone handicap's initial
White turn, legal placement, Undo to the clean baseline, and preservation of komi,
handicap and unknown metadata on export/reopen. Automatic standard handicap
placement and score calculation are not claimed by that probe.

## First-Release Acceptance Items

| Specification item | Concrete evidence | Result |
| --- | --- | --- |
| 1. Open an SGF/example and display the record | Bundled/local files, metadata/sidebar and branch/comment/marker rendering in Studio; SGF preservation tests and the file-drop fixture | Verified |
| 2. Navigate/select a branch and retain the original continuation | Studio keyboard-created branch, branch selection and the original White C3 branch after reopen | Verified |
| 3. Edit with consistent captures, rejection and Undo/Redo | Browser capture/occupied rejection, grouped comment Undo/Redo and marker edit; headless policy tests | Verified |
| 4. Download/reopen without losing supported content | Actual `browser-roundtrip.sgf`, extended editing exports and installed SDK parse/edit/export/reparse | Verified |
| 5. Public Studio, read-only and headless consumers | Built package imports, independent SDK install and browser embedding lifecycle | Verified |
| 6. Keyboard/mobile without remote prerequisites | Desktop keyboard workflow, mobile touch emulation, no horizontal overflow, local GET-only requests and later touch confirmation fixtures | Verified on Chrome emulation; no physical-device claim |
| 7. Package contents, licensing, provenance and runnable examples | Tarball declarations/exports/licenses, package MIT files and classic bundle notice; repository-authored SVG/CSS/SGF/procedural texture assets | Verified for current SDK/adapter artifacts; hosted deployment is separate |

## M2 Requirements and Exit Evidence

| Requirement | Concrete evidence | Result |
| --- | --- | --- |
| Branch removal/reordering, free setup, lines/arrows and freehand ink | Editing/annotation tests and production editing/ink scenarios; actual SGF reopening, original unknown properties, Undo and immutable snapshots | Verified |
| Optional React/Vue/Svelte adapters/examples and browser script distribution | Independent adapter installs/types/SSR, framework lifecycle/Strict Mode/ref updates and classic script-only viewer/edit/remount scenario | Verified for the recorded versions |
| Rotation/reflection, animation, stone textures and magnified/confirmed touch | Eight rectangular/cropped transforms and logical input; actual texture/animation SVG/PNG pixels; media preference, cancellation and native configuration/lifecycle scenarios | Verified in the declared matrix |
| Side-by-side comparison and changed intersections | Headless inspection/diff tests and common/native pinned comparisons, highlights, diagram pixels, deletion/import generations and owner retention | Verified |
| PNG/SVG/static diagrams and position/node links | Actual downloaded SVG/PNG assets, bounded standalone exports, installed sharing codec, public link opening and Export/Discard/Cancel flows | Verified; clipboard is stubbed and nothing is hosted |
| Preserve original supported metadata/unknown properties while editing | Headless semantic round-trips and installed/Studio SGF reopens, including BPN ink and ordered branches | Verified for the compatibility contract |
| Shared framework behavior, updates, mount/dispose and documented SSR boundary | All three real consumers, owned/shared controller retention, callbacks, swaps and remount; independent native artifact packaging | Verified; no separate adapter rules engine |

## M3 Local Exit Evidence

The M3 slices were added after the M1/M2 audit. Inspect their public contracts and
focused fixtures separately; this does not change the older audit's test counts.
The puzzle/view increment passed `bun run check`: 86 tests with 1,103 assertions,
strict root/Svelte checks, builds, docs and installed headless/root/classic artifacts.
Its `--puzzle-only` browser route completed the exact Result and produced the actual
six-stone final SVG. Previously completed rule/scoring routes supply their own
specific assertions and assets; the unrelated full browser matrix was not rerun
for the isolated new puzzle view.

| M3 requirement | Authoritative evidence | Boundary |
| --- | --- | --- |
| Superko and named profiles | Core/controller repetition fixtures, installed rule exports, mounted keyboard legality/rejection scenario; [ADR 0006](../adr/0006-explicit-repetition-and-rule-profile-boundaries.md) | Explicit policy coverage, no inferred `RU` or complete tournament adjudication |
| Manual scoring/corrections | Scoring/pass fixtures, installed headless calculator, Studio group/input/preset scenario and identical before/after SGF downloads; [ADR 0007](../adr/0007-manual-scoring-and-named-profile-coverage.md) | Correct manual status/dame required; no automatic life/death or result persistence |
| Authored accepted/rejected continuations and responses | Headless tree/legality tests, installed `puzzle` types/runtime and public `examples/puzzle` browser scenario | Explicit curated schema/response policy; unlisted legal moves permit retry without claiming objective failure |
| Hints/restart/answer events and runnable consumer | Same puzzle scenario verifies real keyboard/touch, capture, pass, hints, outcomes, source retention, safe text, callbacks, diagrams and owned/borrowed lifecycle; [ADR 0008](../adr/0008-curated-puzzle-authoring-and-session.md) | Chrome 154/emulated mobile; no AI-generated responses or native framework Puzzle component claim |

This provides M3 local exit evidence for the declared scope. Subsequent M4 evidence
is recorded below; release work remains open, and none of these checks establishes
untested device compatibility.

## M4 Local Exit Evidence

The analysis view/consumer increment passed `bun run check`: 114 tests with 1,439
assertions, strict root/Svelte checks, builds, docs and installed headless/root/classic
artifacts. The focused `--analysis-only` browser route completed its exact Result,
identical source SGF downloads and the actual six-stone PV SVG excluding predictions/
cursor. The complete production browser suite was then run after the final example
build, including the analysis route and existing Studio/React/Vue/Svelte flows.
No real engine/model or physical device was involved.

| M4 requirement | Authoritative evidence | Boundary |
| --- | --- | --- |
| Provider-neutral contexts/results and explicit submission | Core result/session fixtures; installed ES2022-only Node request; [ADR 0009](../adr/0009-analysis-context-and-external-provider-contract.md) | Exact source/history/rules/komi, no auto transport or quality claim |
| KataGo JSON integration | Actual checked query/result/termination conversion, out-of-order/partial/action/error/warning fixtures, installed Node JSON flow; [ADR 0010](../adr/0010-katago-json-lines-and-supported-contexts.md) | Supported contexts documented; no executed engine/version/model compatibility |
| Candidates, win probability, score/move loss, PVs and ownership | Public production consumer/root/White metrics, capture/pass/previous/next PV, ownership toggle/numeric point inspection and transform/crop fixture | Root prediction only; speculative moves do not edit SGF or certify life/death |
| Late replies cannot annotate changed positions or destroyed views | Manual delayed JSON after source edit/cancel/unmount, controlled owned disposal and live-source session fixtures | Cancellation advisory; host owns process/socket deadlines and shutdown |
| Errors leave local play/edit usable | Production manual engine error followed by local move/Undo, retained comment/edit/export behavior and unchanged source downloads | Raw engine diagnostics redacted; no automatic retry |
| Runnable consumer and explicit lifecycle | Public `examples/analysis`, installed SSR-safe view, keyboard/emulated touch, source/PV SVG download, callback/invalid-update and owned/borrowed remount checks; [ADR 0011](../adr/0011-isolated-analysis-view-and-explicit-consumer.md) | Illustrative offline data/manual host JSON; common view without native Analysis component exports |

M4 has local exit evidence in this declared scope. The final aggregate requirement
review is complete in the [delivery audit](10-delivery-audit.md). Release decisions
and broader runtime/performance claims still require their own evidence/actions.

## Remaining Work and Claim Boundaries

1. Additional declared-encoding corpora remain useful follow-up evidence; current
   UTF-8/Latin-1 and explicit encoding-failure checks do not prove every decoder.
2. Keep broader browser floors, physical devices, screen readers and measured
   latency/frame-rate/memory budgets open. These are not implied by the declared
   Chrome matrix or structural resource bounds. Use the
   [performance plan](03-performance-budget.md) before advertising speed.
3. M3 repetition policies now have core/controller and installed/browser evidence,
   documented in [ADR 0006](../adr/0006-explicit-repetition-and-rule-profile-boundaries.md).
   Named play/scoring presets and the headless manual scoring calculator now have
   focused and installed-artifact evidence. Studio's scoring consumer has Chrome
   group correction, counting/adjustment, mobile touch, context/lifecycle and unchanged
   SGF download evidence. Headless authored puzzles and their view/runnable consumer
   have targeted, installed and browser evidence; the M3 table records their scope.
4. M4 now has provider-neutral contexts/results/session, checked KataGo JSON-line
   integration, isolated display/PVs/root ownership and a runnable consumer. The
   table above maps local exit evidence and the delivery audit closes the aggregate
   review; these checks do not establish live engine/model or untested device compatibility.
5. Registry ownership, intentional version promotion, third-party distribution
   notices, publication and hosting require a separate release task. The current
   local development version remains `0.1.0-dev.0`; this audit changes no versions.
