# SDK Public API

- Status: Core, SGF, controller, board, viewer and three optional framework adapters implemented
- Product contract: [Specification](../product/02-spec.md)
- Architecture: [ADR 0001](../adr/0001-initial-architecture-boundaries.md)
- Initial contracts: [ADR 0005](../adr/0005-initial-api-record-and-package-contracts.md)

## Implemented Core Exports

After `bun run build`, `@banora/sdk/core` and the root export expose:

- `createPosition({ width?, height?, toPlay?, rules? })`: immutable position;
  dimensions are integers from 2 to 52, defaulting to 19 square. Invalid options throw.
- `play(position, { x, y }, color?)`, `pass(position, color?)` and
  `setup(position, stones, toPlay?)`: structured `MoveResult`, with a new immutable
  position on success and a typed reason on failure. Setup is atomic and clears ko.
- `stoneAt(position, point)`, `isOnBoard(position, point)` and `opposite(color)`.
- `replayMove(position, pointOrNull, color)` executes recorded Go moves without
  ordinary turn/ko/suicide rejection, including occupied-point replacement. Use
  `play` for legal user moves; record playback follows SGF semantics.
- `Color`, `Point`, `RulePolicy`, `Position`, `PositionOptions`, `SetupStone`,
  `MoveResult` and `MoveFailure` types, with declarations included in the build.

Rules currently expose `suicide: 'forbid' | 'allow'` and `ko: 'simple' | 'none'`.
The defaults forbid suicide and enforce simple ko. Named profiles, superko and
scoring are not implemented. Snapshots freeze their board, captures and rule policy.
Move color defaults to the current turn; a mismatched color is rejected.

## Implemented Records and Controller

`@banora/sdk/sgf` exports `parseSgf(text, limits?)`, `decodeSgf(bytes, limits?)`,
`serializeSgf(record)`, `createSgfNode`, point helpers, immutable record types and
`DEFAULT_SGF_LIMITS`. Parsing returns a structured success/diagnostic result.
See [compatibility](compatibility.md#record-compatibility) for the supported subset.

`@banora/sdk/controller` exports `RecordController` and related state/command types.
Create it with `{ sgf?, size?, rules?, limits? }`; invalid initial input throws.

| Operation | Behavior |
| --- | --- |
| `getState()` / `subscribe(listener)` | Immutable current state; subscription immediately delivers a snapshot and returns cleanup |
| `goTo(id)` / `previous()` / `next(variation?)` | Select an existing node/path without creating an edit |
| `play(pointOrNull)` | Validate a new move/pass; reuse an existing matching continuation or append an undoable branch |
| `setComment(text)` / `setMarker(point, kindOrNull, label?)` | Undoable comments and triangle/square/circle/cross/label edits |
| `setConnection(from, to, 'line' \| 'arrow', present?)` | Add/remove a node-local SGF line or directed arrow; endpoints must differ |
| `addStroke(points, style?)` / `removeStroke(id)` / `clearStrokes()` | Undoable node-local freehand annotations; removing an absent ID or clearing empty ink is a no-op |
| `setSetup(stones, toPlay?)` | Patch free black/white/empty setup points and optional turn; after a move append a setup child rather than mixing move/setup properties |
| `removeBranch(nodeId?)` | Remove a non-root node and descendants; a deleted selection moves to its surviving parent |
| `reorderBranch(nodeId, index)` | Move a non-root node to a zero-based sibling slot without moving the current cursor |
| `beginEditGroup()` / `endEditGroup()` | Group comments into one undo unit; begin returns an idempotent cleanup scoped to that group; navigation/global end closes it |
| `undo()` / `redo()` | Restore record edits and the cursor captured for that history entry |
| `loadSgf(textOrBytes, { discardChanges? })` | Validate first; reject dirty replacement unless explicitly permitted; successful import resets editing history |
| `prepareExport()` | Return an immutable `{ id, text }` ticket without changing dirty state |
| `acknowledgeExport(id)` / `cancelExport(id)` | Acknowledge host export success or cancel; only acknowledgment advances the exact exported semantic baseline |
| `dispose()` | Release controller subscriptions/cache/tickets; subsequent state/mutation use is rejected |

An asynchronous acknowledgment of older content leaves newer edits dirty; stale
acknowledgments cannot replace a newer acknowledged baseline. Import invalidates old
tickets. Keep at most eight outstanding tickets, 100 edit history entries and 128
cached positions. Parsed node IDs remain stable through editing, not across
serialization. Subscriber reentrancy delivers snapshots in order; notification errors
are logged without rolling back committed commands. Root exports include all these APIs.
`getState()` retains the same immutable snapshot identity until a committed state
change. Failed commands, export preparation and selecting the already active node
leave it unchanged. This contract supports external-store framework bindings.

Keep the cleanup returned by `beginEditGroup()` when a view owns a comment session.
It cannot end a newer group started by another editor. `endEditGroup()` remains an
explicit controller-wide operation for host commands. Viewer blur/editability
changes/hiding comments/disposal release only their own group; read-only viewer
cleanup never changes another editor's grouping. Existing callers can continue
ignoring the new cleanup return and explicitly call `endEditGroup()`.

Branch/setup/connection commands use the same edit Undo/Redo and dirty baseline.
Root removal/reordering and invalid sibling indices return `invalid-edit`; unknown
nodes return `node-not-found`. Setup points must be unique and on-board; placement
does not capture or increment the move number. Existing setup properties are patched,
not discarded. Undo restores removed subtrees, node IDs and the prior cursor.
Sibling index zero defines the default continuation. `ControllerState.connections`
contains immutable `{ kind, from, to }` values. Lines are undirected; arrows preserve
direction. SGF AR/LN are validated under the
[FF4 markup definitions](https://www.red-bean.com/sgf/properties.html#AR).

### Freehand Record Format

`ControllerState.strokes` contains deeply immutable `Stroke` values with `id`,
`points`, `color` and `width`. `Stroke` and `StrokeStyle` are exported from the
controller and root entrypoints. Points use fractional logical coordinates, rounded
to four decimal places, within the board's first/last intersections. A stroke has
2 through 512 points and must include at least two distinct rounded points.
Style defaults to `{color:'#206650', width:0.08}`; color accepts six-digit hex only,
width accepts 0.02 through 0.5 in intersection spacing. Each node allows 64 strokes
and 4096 total points, also subject to configured SGF byte/value limits. Invalid
strokes return `invalid-annotation`; node/SGF limits return `limit`, without edits
or notifications. Each successful stroke operation is one edit Undo unit, separate
from active comment groups. Strokes do not change stones, turns or captures.

SGF has no standard freehand property. Banora reserves the private `BPN` property
for one JSON value per stroke, ordered back to front:

```json
{"v":1,"id":"ink1","color":"#206650","width":0.08,"points":[[1.25,2],[2,2.75]]}
```

The exact version-1 keys are required; IDs contain 1 through 64 ASCII letters,
digits, underscores or hyphens and are unique within a node. Invalid schemas,
unknown versions, unsafe styles, duplicate IDs and excessive/outside points cause
structured SGF import rejection before replacing the active record. Other unknown
SGF properties retain their existing preservation behavior. Unedited BPN escaping
is retained; semantic dirty comparison normalizes JSON formatting and style/point
precision while retaining drawing order. Other SGF tools may preserve these values
as unknown properties but will generally not display the strokes. Banora's export
and reopen retain the annotations; this is an extension, not universal SGF markup.

## Implemented Board Mounting

`@banora/sdk/board` and the root export expose `mountBoard(container, options?)`.
The returned `BoardView` exposes `controller`, `update(options)`, `exportSvg`,
`exportPng` and idempotent `dispose()`. Options include `controller`, `readOnly`, `theme: 'wood' | 'flat'`,
`coordinates`, `moveNumbers`, integer `crop`, `transform`, `drawing` and `onPoint(point)`.

An externally supplied controller survives view disposal. If omitted, the view
creates and disposes its own controller. The SDK owns only its appended SVG and
live-announcement elements, leaving other host children intact. Importing the board
module does not access browser globals; mounting requires a real DOM container.
Update cannot replace the controller; dispose/remount for a different controller.

Pointer/touch maps to logical coordinates through the SVG screen matrix. Arrow keys
move a visible cursor, Enter/Space activate it, and Page Up/Down navigate the record.
Default activation issues a legal move unless read-only. `onPoint` delegates activation
to the host (including annotation/inspection behavior); hosts own that callback's
mutation policy. A read-only board without a callback never places stones.

Crop changes presentation only. Invalid crop configuration throws without replacing
the previous options; record-size changes reset a crop that no longer fits. CSS
variables `--banora-board`, `--banora-grid`, `--banora-black`, `--banora-white` and
`--banora-annotation` customize presentation, including values inherited from the
host container. Node-local lines/arrows render over stones with contrasting outlines.
Coordinates skip I for standard Go columns, falling back
to numeric columns beyond the available single-letter alphabet.

`transform: { rotation?: 0 | 90 | 180 | 270, flipX?: boolean }` reflects across the
logical vertical axis first and then rotates clockwise. It transforms drawing/crop
bounds only. Pointer input is inverted to logical coordinates; arrow keys move along
screen axes. Labels and move numbers stay upright. Invalid configurations throw
without changing the previous presentation or controller; `transform: undefined`
explicitly restores defaults. Rotating does not create edits or change dirty state.
All three optional framework wrappers forward these same options.

`drawing: {color?, width?}` opts into freehand input; `null` or explicitly
`undefined` restores ordinary point activation. The immutable style uses the stroke
constraints above; invalid mount/update options throw without changing the active
configuration. Read-only boards display saved ink but cannot draw. Drawing consumes
input instead of calling `onPoint` or placing stones. Primary mouse/touch/pen drags
capture the pointer, sample fractional logical points at least 0.01 intersections
apart, and commit one stroke on release inside the visible board. A click is a
no-op. More than 512 sampled points cancels the gesture with live feedback rather
than silently truncating it. Drawing disables native touch panning only while active.
Pressure-sensitive widths and smoothed curves are not implemented.

Arrow keys move the cursor along screen axes; Space starts/appends a keyboard stroke
and Enter appends the current point and completes it (or starts if none exists).
Escape, focus loss, pointer cancellation/capture loss, a record/node change, a
successful configuration update or disposal discards the pending preview. Invalid
configuration leaves an in-progress gesture intact. Preview points do not edit the
controller and are excluded from SVG/PNG export. Completed ink renders over the
board/markers and is included in both diagrams. Rotation/reflection/crop affect
presentation only; saved points remain logical. Framework Board components forward
`drawing`; Viewer components accept it in their nested `board` options.

`@banora/sdk/geometry` and root exports provide headless `toDisplayPoint`,
`toLogicalPoint`, `displayBoardSize`, `displayCrop` and `normalizeBoardTransform`,
plus `BoardRotation`, `BoardTransform`, `BoardSize` and `BoardCrop` types. Point
conversion accepts finite fractional/outside points for annotations/margins; callers
still validate legal moves against their logical board. Dimensions remain 2 to 52.

### Touch Aim and Confirmation

`touch: {mode?: 'direct' | 'release' | 'confirm', magnifier?: boolean}` configures
touch-only placement. `TouchOptions` is exported from the board and root entrypoints.
Omitted/null/explicitly undefined touch options keep the existing direct activation;
an explicit empty object opts into release mode. Magnification defaults to true.
Invalid modes or non-boolean magnifier values throw atomically on mount/update.
Mouse/pen and ordinary keyboard activation keep their existing behavior; freehand
drawing takes priority. Read-only views do not enter touch aim/confirmation; the
existing host-owned `onPoint` inspection callback keeps its own mutation policy.

Release/confirm modes capture a primary touch, show the rounded logical target and
optionally a magnified local SVG patch offset from the finger. Dragging updates the
aim without editing the record. Release inside the visible board activates the
last intersection in release mode. Confirm mode instead presents explicit Confirm
and Cancel buttons; Enter/Space confirms and Escape cancels. Arrow keys can refine
the pending target along screen axes. `onPoint` receives only the final logical
coordinate, using the same activation path as ordinary input. Default activation
still uses controller legality checks, Undo and dirty tracking.

Releasing outside the board, pointer cancellation/capture loss, viewport resizing, active-drag focus
loss, record/node changes, successful configuration updates and disposal cancel the
selection. Confirmation survives focus moving to its buttons. Invalid configuration
preserves an existing gesture. Cancelled pointer releases cannot become ordinary
placements. A new touch replaces an old pending confirmation. Pending targets,
magnifiers and confirmation controls are view state, excluded from SGF and SVG/PNG
diagrams, and do not notify controller subscribers or create Undo entries. Touch
panning is disabled on editable boards only while a release/confirm mode or ink
tool is enabled; choose direct mode for the previous browser touch behavior.
The lens uses the shared rendered board, including colors, marks, crop and transforms,
and owns no rules/state engine. Its fixed viewport portal belongs to the view and is
removed from the document body on disposal; confirmation controls belong to the
view's container. Real-device support remains subject to device evidence.

## Position Diagrams

Both `BoardView` and `ViewerView` provide `exportSvg(options?): string` and
`exportPng(options?): Promise<Blob>`. `DiagramOptions` accepts pixel `width`,
`height` and a plain-text `title` (at most 1024 characters). A missing dimension
follows the current viewBox aspect ratio; default width is 1024. Dimensions must
be integers from 1 to 8192, totaling at most 16 megapixels. Invalid size/options
throw or reject without modifying the record. Returned PNG blobs use `image/png`.

Diagrams capture the drawing at invocation, including the current theme, crop,
transform, marks, arrows and move numbers. Computed colors/fonts are copied into
the standalone SVG; hover previews/cursors/interaction and scripts are excluded.
Inherited or external paint references are rejected rather than exporting a broken
reference. Text uses the browser's installed fonts; font files are not embedded.
XML-invalid control characters and lone surrogates become U+FFFD in diagram text
only; valid Unicode pairs remain intact and SGF content/state is not changed.
This follows the [XML 1.0 character range](https://www.w3.org/TR/xml/#charsets).
PNG uses a temporary SVG image and 2D canvas for encoding, not a second live board
renderer. Encoding/decode errors reject; pending PNG exports reject with `AbortError`
when the view is disposed, and release temporary URLs/canvas resources. Decoding
has a ten-second timeout. Export after disposal is rejected.

Hosts own download/storage. Image export does not acknowledge an SGF export ticket
or clear dirty state; an image cannot preserve the complete record/variation tree.
Studio's Save SVG/PNG actions and all three framework examples exercise this contract.

## Complete Viewer

`@banora/sdk/viewer` and the root export expose `mountViewer(container, options?)`.
`ViewerOptions` accepts either a shared `controller` or initial `sgf` text/bytes,
`editable` (default false), `comments`, `variations` and nested `board` options.
Supplying both controller and SGF throws. The viewer includes game selection,
move controls, branch selection, player information/captures and comments.

The returned `ViewerView` exposes `controller`, `update(options)`, board-only diagram
exports and idempotent `dispose()`. Updating presentation/editability retains the same controller and
record. Enable editing for legal board moves/pass, grouped comments and Undo/Redo.
Hosts can supply `board.onPoint` for other editing/inspection modes. Hosts still
own unsaved-change confirmation and file export transport.

Viewer disposal removes only its own DOM/listeners and preserves an external
controller. An internally created controller is disposed with the viewer. The
variation tree has the same 500-node display bound as Studio; all nodes remain
accessible through controller navigation. Comments and metadata are rendered as
text. Mounting requires a DOM; importing the package on the server is safe.

This local-workspace example assumes an existing `#record` container and built SDK:

```ts
import { mountViewer } from '@banora/sdk/viewer';

const view = mountViewer(document.querySelector<HTMLElement>('#record')!, {
  sgf: '(;FF[4]GM[1]SZ[9];B[gc];W[cg])',
});
view.update({ board: { theme: 'flat' }, comments: true });
// Call view.dispose() when the host unmounts the container.
```

## Optional Framework Adapters

Build the separate `@banora/react`, `@banora/vue` and `@banora/svelte` development
packages with `bun run build:adapters`. They are not published. Each exports `Board`
and `Viewer` components, binding the same SDK controller and renderer. Create a
`RecordController({ sgf })` to initialize a shared record; adapter viewers omit the
plain mount's initial `sgf` option. All other rendering/editability options are shared.

| Package | State binding | Container and events |
| --- | --- | --- |
| React | `useRecordState(controller): ControllerState` via `useSyncExternalStore` | `className`, React `style`, `ariaLabel`, `onStateChange(state)`, `onView(viewOrNull)` |
| Vue | `useRecordState(controllerOrRefOrGetter)` in setup, returning a read-only snapshot ref | Forwarded attributes, `stateChange(state)` and `view(viewOrNull)` emissions |
| Svelte | `createRecordStore(controller)` returning a readable snapshot store | `class`, CSS text `style`, `ariaLabel`, `onStateChange(state)`, `onView(viewOrNull)` |

Configuration updates preserve record state. Replacing the controller remounts the
view; unmounting removes its listeners/subscriptions and retains a host controller.
Without a controller each component owns a separate record, disposed on unmount.
Subscriptions immediately report the current snapshot, including on remount;
React development Strict Mode may mount/clean up/mount effects before normal use.
The framework owns the empty container and the SDK its descendants.

View bindings expose `BoardView | ViewerView | null` for imperative diagram export.
Mount supplies the handle; cleanup clears it with null. React/Svelte callback changes
also clear the old binding and connect the new callback; memoize React callbacks to
avoid unnecessary rebinding. Vue's event listener follows native event semantics.
Treat a received handle as borrowed: use component props for configuration and let
the framework adapter own its disposal. No view binding runs during SSR.

Vue adapters accept deep refs by unwrapping their controller handle; prefer
`shallowRef` and use `toRaw` before directly calling a controller stored in a deep
ref. React hooks must follow React's hook rules; Vue bindings run inside setup.
Use a Svelte `$derived(createRecordStore(controller))` for a replaceable raw handle.

Server rendering produces host containers/state text without creating board DOM.
Client effects mount the SVG. Match server/client record content for state hydration;
rendered board HTML hydration is deferred. Svelte ships native components and their
declarations for a Svelte-aware compiler. Each isolated package consumer validates
types and SSR separately; production examples validate client lifecycle/configuration.
See [compatibility](compatibility.md), package READMEs and framework examples.

## Classic Browser Distribution

`bun run build` also creates `packages/sdk/dist/banora.global.js`, a self-contained
classic script exposing the same common SDK under the global `Banora` namespace.
It has no framework/runtime asset dependencies and does not need an ESM loader.
Copy the built file alongside a page before using this example; no package/CDN
publication is implied:

```html
<div id="record"></div>
<script src="./banora.global.js"></script>
<script>
  const view = Banora.mountViewer(document.querySelector('#record'), {
    sgf: '(;SZ[9];B[gc];W[cg])'
  });
  // Dispose the view when the host removes this container.
</script>
```

The tarball includes `dist/banora.global.d.ts` ambient namespace declarations;
reference that file when typechecking a classic TypeScript consumer. Use the normal
ESM entrypoints in applications that already have a module loader. The IIFE is a
browser script artifact, not a CommonJS or named ESM export. Importing it as ESM is
not the supported integration path. `examples/browser` consumes the exact built
artifact, including production navigation/edit/Undo and shared-controller remount.

## Logical API Surfaces and Remaining Work

| Surface | Responsibility |
| --- | --- |
| Core | Create positions/rule policies, apply actions, validate moves, inspect captures and navigate history |
| Records / SGF | Parse/export SGF, inspect metadata/properties, edit branches, select a node/path |
| SVG renderer | Mount a board, update snapshots, theme/crop/transform it, emit logical input, dispose resources |
| Viewer / editor | Load records, navigate branches, bind controls/comments, select editing modes |
| React / Vue / Svelte adapters | Framework lifecycle, configuration, events and read-only state bindings over the same model/controller |
| Scoring | Dead-stone selection and score calculation with explicit rules |
| Puzzles | Authored answers, scripted responses, hints, restart and feedback |
| Analysis | Provider requests/results, cancellation, freshness and overlay normalization |

Except for the implemented core/records/controller/board/viewer/adapters above, these are responsibilities, not finalized
npm subpaths or exported type names.
Resolve names while implementing the first consumer example, then document actual
signatures here before publication.

## Contract Principles

- Prefer small typed configuration objects and composable interfaces.
- Keep plain-browser use straightforward; advanced consumers can supply their own
  state/controller and controls. Document who owns and mutates each object.
- Return structured move rejection reasons without partial mutation. Define parse
  diagnostics, import failures, and adapter errors explicitly.
- Publish read-only state views and action/change events. Renderers do not decide
  captures, enforce ko or maintain a competing record model.
- Use logical board coordinates in public actions/events. Display rotation,
  reflection and cropping must not change those meanings.
  Coordinates use zero-based `{ x, y }`, with the origin at the top-left. Stone
  colors use `'black'` and `'white'`; pass is a distinct action, not a coordinate.
- Specify subscription cleanup and disposal. A destroyed view rejects late work
  while host-owned records remain available.
- Separate scoring input/output from uncertain AI evaluations. Document score
  perspective, win-probability units and ownership conventions for each adapter.
- Never require a remote provider for local board, record or viewer operations.
- Keep mount/update/dispose and subscription interfaces framework-independent. Optional
  adapters must not create their own rules engine, SVG renderer or mutable record copy.
- Define the renderer-owned DOM subtree so frameworks mount a container without
  concurrently managing its internal SVG elements. Cleanup releases listeners and
  subscriptions while retaining host-owned records/controllers as documented.

## Controller and Editing Contract

One controller owns the current record, selected node/cursor and edit history.
Consumers send commands and subscribe to read-only state/change events. Views
release their own renderer, listeners and subscriptions on disposal; an externally
supplied controller remains available. Implemented names and acknowledgment semantics
are listed above, including optional framework components.

Previous/next and branch selection are navigation operations, separate from edit
Undo/Redo. Variation creation, comments and marker changes are undoable edits.
Group a comment editing session into one undo unit. Navigation adds no edit entry
and does not mark the record dirty; changing branches restores the rule-relevant
history for that path. Repetition history and edit history are separate concepts.

Dirty state compares semantic record content with the export baseline, excluding
cursor/presentation state. Import establishes a clean baseline; a successful export
advances it. Undo to that content clears dirty state. Failed/cancelled exports keep
the previous baseline. A browser download request does not prove disk persistence;
hosts acknowledge export according to their transport. This records exported content,
not verified filesystem persistence.

Studio offers Export / Discard / Cancel before replacing or closing a dirty record.
Export continues only after success, Discard allows replacement/close, and Cancel
retains the active record. The SDK exposes these operations/state without requiring
a confirmation dialog in every host. Autosave and recovery are deferred.

## API Validation Priorities

Design the initial API around two browser consumers: Banora Studio's SGF review and
basic editing flow, and a minimal read-only embedded record. Both use built public
SDK exports. Studio may compose lower-level public modules, but may not bypass the
contract through internal source imports or demo-only hooks.

Verify headless imports, browser mounting, SGF download/reopen and selective imports
in M1. In M2, exercise React, Vue, and Svelte configuration updates, state/event
bindings, remount/dispose, type/component packaging and SSR/client-mount behavior
in separate consumer examples. No shared smoke check establishes all three frameworks'
compatibility. [Initial major targets and current evidence](compatibility.md) identify
the selected peer lines, actual component packaging and tested versions.
Once analysis ships, include delayed responses,
context changes and cancellation. Migration examples must accompany breaking
changes to actions, coordinates, events, serialization or ownership semantics.
