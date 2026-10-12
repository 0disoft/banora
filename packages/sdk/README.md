# Banora SDK

Development prerelease. Install with `npm install @0disoft/banora@dev` on Node 24.x.
Core, SGF, controller, SVG board and viewer are available through the root export
and their respective subpaths. See the repository documentation
for implementation status and the remaining milestones. No third-party runtime
dependencies or external assets are included.

## Quick Start

Create a container such as `<div id="board"></div>`, then mount in browser code:

```ts
import { mountViewer } from '@0disoft/banora';

const container = document.getElementById('board');
if (!container) throw new Error('Missing board container');
const viewer = mountViewer(container, { sgf: '(;FF[4]GM[1]SZ[9];B[cc];W[gg])' });
// When removing the view, call viewer.dispose() to release its owned controller.
```

The viewer is read-only by default. Use `editable: true` to edit, or pass a
host-owned `RecordController` and dispose that controller separately. See the
[SDK guide](https://github.com/0disoft/banora/blob/main/docs/sdk/README.md),
[standalone editor](https://github.com/0disoft/banora/blob/main/examples/standalone/README.md)
and [live Studio](https://0disoft.github.io/banora/studio/).

## Capabilities

`RecordController.createCheckpoint()` / `loadCheckpoint()` preserve a working
record, export baseline, selected location and rules without selecting a storage
service. `@0disoft/banora/checkpoint` supplies checked parsing and schema discovery;
terminal automation can emit/resume the same recovery data. Undo is session-local,
and hosts own storage, privacy, retention and concurrent writes.

`@0disoft/banora/record-search` searches every game/variation with bounded literal
property queries and portable result targets, without replay/navigation. Controller
`previewComments`, `applyComments` and `setComments` validate multi-node changes
and apply them as one Undo unit while retaining selection/export semantics.
Previews are immutable, tied to their issuing controller/current source, and never
implicitly logged. Terminal automation exposes search, portable batch targets,
preview-only diffs and optional exact-source guards. Studio demonstrates record-wide
search, navigation and selected comment preview/application through these public
exports, with session-local selection and one-step Undo.

`@0disoft/banora/diagnostics` exposes an explicit `DiagnosticJournal` and safe failure
projection. It retains at most 256 fixed operation/code events and produces frozen
local summaries/support reports, without recording authored data, raw exceptions,
fingerprint strings or arbitrary metadata. Hosts own opt-in, reviewed sharing and
clear/retention; the SDK adds no automatic collection, persistence or remote calls.
Studio Help separately demonstrates session-only opt-in, inspected JSON/download,
clear/reload and diagnostic freshness without changing authored/export state.

`diagnoseAutomation` from root/`@0disoft/banora/automation` runs a canonical request
once and returns bounded diagnostic evidence with no authored output. Optional
`banora diagnose` adds reviewed JSON file publication and safe Node environment/
execution timing. See the [terminal diagnostic contract](https://github.com/0disoft/banora/blob/main/docs/sdk/diagnostics.md#terminal-and-automation-consumer).

`@0disoft/banora/playback` supplies recorded-node Play/Pause with 500–5,000 ms
intervals, end/manual-edit/import cancellation and borrowed-controller cleanup.
The separate DOM `playback-controls` mount is shared by Studio and every complete
Viewer; native Viewer props forward `playback:{intervalMs}`. Board cursor arrows
remain intact, with scoped record arrows and Alt+Left/Right for board focus. See
the [playback guide](https://github.com/0disoft/banora/blob/main/docs/sdk/playback.md).

`@0disoft/banora/automation` exposes DOM-free `executeAutomation` and immutable
`AUTOMATION_SCHEMA` for checked JSON record commands and external snapshots.
The optional `@0disoft/banora-cli` executable exposes the same operations through terminal
files/stdin and structured responses. See the
[agent guide](https://github.com/0disoft/banora/blob/main/packages/cli/README.md).

`@0disoft/banora/puzzle` exports headless curated `PuzzleSession`; the separate
`@0disoft/banora/puzzle-view` provides `mountPuzzle(container,{session})` or an owned
`{definition}` mount with authored responses, hints and restart. Definitions use
explicit `banora.puzzle/v1` answer trees and SGF context. Importing the view is
SSR-safe; mounting requires a DOM. No AI engine or automatic problem grading.

`@0disoft/banora/analysis` supplies explicit provider-neutral `AnalysisSession` requests,
exact context/result matching and cancellation. `@0disoft/banora/katago` bridges host-owned
KataGo JSON lines with checked rules/history/komi and declared reporting perspective.
`@0disoft/banora/analysis-view` exports `mountAnalysis` for candidate metrics, isolated
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
available from `@0disoft/banora/comparison`. The view exports either side as SVG/PNG
and borrows the controller, preserving it on disposal. Different board sizes are
displayed without diffing. Imported records reset the comparison to their new root.
For custom layouts, Board accepts `nodeId`, `compareTo` and `referenceGeneration`
(the snapshot's `recordGeneration`). Stale or removed pins become unavailable.
