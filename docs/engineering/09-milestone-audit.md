# M1 and M2 Local Acceptance Audit

- Scope: the complete M1/M2 requirements and exit evidence in the
  [roadmap](../product/01-roadmap.md), plus the seven first-release acceptance
  items in the [specification](../product/02-spec.md).
- Result: M1/M2 local acceptance is verified in the declared matrix, including the
  additional Studio file-drop fixture. This audit does not declare a release,
  broader runtime support or completion of M3/M4.
- Matrix: Windows, Node 24.14.0, Bun 1.4.2, Headless Chrome 154; framework and
  compiler versions are recorded in [compatibility](../sdk/compatibility.md).

## Verification Basis

The implementation, public exports and scenario assertions were inspected against
each requirement. `bun run check` passed 53 tests with 699 assertions, strict root
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

## Remaining Work and Claim Boundaries

1. Additional declared-encoding corpora remain useful follow-up evidence; current
   UTF-8/Latin-1 and explicit encoding-failure checks do not prove every decoder.
2. Keep broader browser floors, physical devices, screen readers and measured
   latency/frame-rate/memory budgets open. These are not implied by the declared
   Chrome matrix or structural resource bounds. Use the
   [performance plan](03-performance-budget.md) before advertising speed.
3. M3 repetition policies now have core/controller and installed/browser evidence,
   documented in [ADR 0006](../adr/0006-explicit-repetition-and-rule-profile-boundaries.md).
   Named profiles, manual dead-stone scoring with rule adjustments and authored
   puzzles with responses/hints/events remain unimplemented.
4. M4 remains unimplemented: provider-neutral/KataGo integration, display overlays,
   cancellation and complete position-context freshness checks.
5. Registry ownership, intentional version promotion, third-party distribution
   notices, publication and hosting require a separate release task. The current
   local development version remains `0.1.0-dev.0`; this audit changes no versions.
