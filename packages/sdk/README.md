# Banora SDK

Early development package; not published. Core, SGF, controller, SVG board and viewer are
available through the root export and their respective subpaths after building this
workspace. See the repository documentation
for implementation status and the remaining milestones. No third-party runtime
dependencies or external assets are included.

`RecordController.createCheckpoint()` / `loadCheckpoint()` preserve a working
record, export baseline, selected location and rules without selecting a storage
service. `@banora/sdk/checkpoint` supplies checked parsing and schema discovery;
terminal automation can emit/resume the same recovery data. Undo is session-local,
and hosts own storage, privacy, retention and concurrent writes.

`@banora/sdk/playback` supplies recorded-node Play/Pause with 500–5,000 ms
intervals, end/manual-edit/import cancellation and borrowed-controller cleanup.
The separate DOM `playback-controls` mount is shared by Studio and every complete
Viewer; native Viewer props forward `playback:{intervalMs}`. Board cursor arrows
remain intact, with scoped record arrows and Alt+Left/Right for board focus. See
the [playback guide](https://github.com/0disoft/banora/blob/main/docs/sdk/playback.md).

`@banora/sdk/automation` exposes DOM-free `executeAutomation` and immutable
`AUTOMATION_SCHEMA` for checked JSON record commands and external snapshots.
The optional `@banora/cli` executable exposes the same operations through terminal
files/stdin and structured responses. See the
[agent guide](https://github.com/0disoft/banora/blob/main/packages/cli/README.md).

`@banora/sdk/puzzle` exports headless curated `PuzzleSession`; the separate
`@banora/sdk/puzzle-view` provides `mountPuzzle(container,{session})` or an owned
`{definition}` mount with authored responses, hints and restart. Definitions use
explicit `banora.puzzle/v1` answer trees and SGF context. Importing the view is
SSR-safe; mounting requires a DOM. No AI engine or automatic problem grading.

`@banora/sdk/analysis` supplies explicit provider-neutral `AnalysisSession` requests,
exact context/result matching and cancellation. `@banora/sdk/katago` bridges host-owned
KataGo JSON lines with checked rules/history/komi and declared reporting perspective.
`@banora/sdk/analysis-view` exports `mountAnalysis` for candidate metrics, isolated
legal PVs and root ownership. It never edits the borrowed source record or submits
on mount. These imports bundle no model, credentials or automatic transport; the
view mounts only in a browser. Read the repository's analysis contracts for limits,
unsupported KataGo contexts and owned/borrowed disposal.

The build also supplies `dist/banora.global.js`, a self-contained classic browser
script exposing the common API as `Banora`, and `dist/banora.global.d.ts` ambient
namespace declarations. Copy the script alongside a page and load it with an
ordinary script tag; then call `Banora.mountViewer(container, {sgf})` or compose the
other APIs. The global script is not a CommonJS or named ESM entrypoint. Use normal
selective ESM exports for module-based applications.
The standalone script preserves the complete MIT notice in its banner when copied
outside the package; retain that notice when redistributing it.

Freehand ink uses the shared controller, including Undo/Redo and SGF export/reopen:

```ts
const view = mountBoard(container, {controller, drawing:{color:'#206650',width:0.08}});
// Drag to draw; Space adds a keyboard point, Enter finishes, Escape cancels.
controller.addStroke([{x:1.25,y:2},{x:3,y:4.5}]);
controller.removeStroke(controller.getState().strokes[0]!.id);
controller.clearStrokes();
view.update({drawing:null}); // Restore ordinary stone/point activation.
```

Saved strokes are node-local and included in SVG/PNG diagrams; pending previews
are excluded. SGF stores them in Banora's bounded, versioned private BPN extension;
other SGF programs may not display them. Read-only views display ink without
allowing drawing. Styles accept six-digit hex colors and widths from 0.02 to 0.5
intersection spacing; each stroke has 2 through 512 fractional logical points.

`touch:{mode:'release'}` enables drag-and-release touch aiming with a magnified
local board patch. Use `mode:'confirm'` for explicit Confirm/Cancel after release,
and `magnifier:false` to hide the lens. Null restores direct activation. Pending
targets are transient, excluded from records/diagrams, and cancelled by context
changes or disposal. Keyboard arrows refine a released target, Enter confirms,
and Escape cancels. Mouse/pen keep ordinary activation; ink takes priority.

Read another branch with `controller.inspectNode(id)` without moving the cursor.
`comparePositions(before.position, after.position)` reports visible-stone changes.
Use `mountComparison(container,{controller,left:leftId,right:rightId})` for two
read-only boards, node selectors, comments and highlighted differences; it is also
available from `@banora/sdk/comparison`. The view exports either side as SVG/PNG
and borrows the controller, preserving it on disposal. Different board sizes are
displayed without diffing. Imported records reset the comparison to their new root.
For custom layouts, Board accepts `nodeId`, `compareTo` and `referenceGeneration`
(the snapshot's `recordGeneration`). Stale or removed pins become unavailable.
