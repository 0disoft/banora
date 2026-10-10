# Banora SDK

Early development package; not published. Core, SGF, controller, SVG board and viewer are
available through the root export and their respective subpaths after building this
workspace. See the repository documentation
for implementation status and the remaining milestones. No third-party runtime
dependencies or external assets are included.

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
