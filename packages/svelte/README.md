# Banora Svelte

Optional native Svelte 5 adapter for the Banora 0.1 SDK.
Install with `npm install @0disoft/banora @0disoft/banora-svelte`.
Build locally with `bun run build:adapters` from the repository root.
A Svelte-aware compiler/bundler consumes the packaged `.svelte` components.

`ControlledBoard` accepts a required plain `state` and optional `onIntent`, with
common display/input props and borrowed `onView` bindings. It never creates a
record controller; the host supplies accepted snapshots and owns rules/records.
See the [host-controlled guide](https://github.com/0disoft/banora/blob/main/docs/sdk/controlled-board.md).

```svelte
<script lang="ts">
import {RecordController} from '@0disoft/banora';
import {Board, Viewer, createRecordStore} from '@0disoft/banora-svelte';
const controller = new RecordController({sgf: '(;SZ[9];B[aa])'});
const record = createRecordStore(controller);
</script>
<p>Move {$record.position.moveNumber}</p>
<Board {controller} readOnly={true} />
<Viewer {controller} onStateChange={snapshot => console.log(snapshot.dirty)} />
```

`Board` accepts SDK board options; `Viewer` accepts viewer options except initial
`sgf`. Both accept `class`, CSS text `style`, `ariaLabel` and `onStateChange(state)`.
`createRecordStore(controller)` is a Svelte readable store of immutable snapshots;
subscriptions are released when the last consumer unsubscribes. For replaceable
controllers use `$state.raw` and `$derived(createRecordStore(controller))`.

Configuration changes retain record state; controller replacement remounts the
view. Unmount releases listeners/subscriptions and preserves a host controller.
Without a supplied controller each component owns its own record and disposes it
on unmount. Dispose host controllers after their views are gone. The framework owns
the container; the SDK owns its descendants. SSR emits only containers/state text,
with board DOM created in client effects. Supply matching record content for state
hydration; rendered board HTML hydration is deferred.

Native components and declarations are packaged with `@sveltejs/package` 3.x and
checked by `svelte-check` 4.x using isolated TypeScript 6.x. This does not downgrade
the SDK/root TypeScript 7.x toolchain. See the repository's SDK API, compatibility
document and Svelte consumer example for tested versions and limitations.

`onView(viewOrNull)` supplies a borrowed BoardView/ViewerView handle for
`exportSvg(options)` or asynchronous `exportPng(options)`. Cleanup clears it with
null, including callback replacement. Keep handles raw, configure through props
and leave disposal to the component. Image export does not save the SGF record or
clear dirty state.

`drawing={{color:'#206650',width:0.08}}` enables the common freehand tool on Board;
use nested `board` options on Viewer. Null disables it. Immutable store snapshots
include `strokes`; the controller owns add/remove/clear, Undo and SGF export/reopen.
Read-only views display saved ink, and diagrams include it. SGF uses Banora's
private BPN extension, which other viewers may not display.

`touch={{mode:'confirm',magnifier:true}}` enables magnified touch aiming with
confirmation on Board; use nested `board.touch` on Viewer. Release mode places on
lift; null restores direct activation. Pending targets stay in the view, support
keyboard refinement and cancel on configuration/context changes or unmount. They
never enter SGF/diagrams. Ink takes priority; read-only views do not enter touch aiming.

Compose two Board components with `nodeId`, `compareTo` and `referenceGeneration`
(the snapshot's `recordGeneration`) for side-by-side comparisons. Pins display
their own node/path without navigating/editing the shared controller. Missing/stale
pins become unavailable and cannot export until restored/rebound. Viewer follows
its cursor and accepts `board.compareTo`. The Svelte example demonstrates pinning,
configuration updates, controller ownership and remounts.
