# Host-Controlled Boards

- Status: Headless/common SVG and native adapters implemented; installed types/SSR and four production client consumers checked
- Decision: [ADR 0012](../adr/0012-host-controlled-board-and-presentation-boundary.md)

Use this boundary when another engine, server or application owns the game state.
`@0disoft/banora/board-state` exports `createBoardSnapshot`, `BoardSnapshot`,
`BoardSnapshotValue`, `BoardNumber`, `BoardOverlay` and `BoardIntent`. Importing and
normalizing snapshots requires no DOM, framework, SGF or rule history.

A snapshot has a nonempty opaque `key`, dimensions from 2 through 52 and exactly
`width * height` top-left row-major cells, using `black`, `white` or null. Optional
next color defaults to Black; move number and captures default to zero. These are
display values, not inferred game rules. Supply explicit host values when relevant.

Optional last move, numbered points, markers, lines/arrows, bounded ink and
heatmap/badge/ring overlays are logical-coordinate presentation data. Visible
points may be nonrectangular: null/omitted shows all points, [] shows none.
Dim points do not change the position. Colors are six-digit hex; labels/descriptions
are bounded text. URLs, arbitrary SVG/HTML and provider-specific payloads are absent.

The factory validates and deeply freezes owned copies. Top-level cell and annotation
collections capture their array length once and copy only own indexed entries
within that bound; host iterators, array methods and species cannot supply extra
entries or hide invalid/sparse data. Cells still require exactly width * height
entries, with existing independent bounds for optional collections. This bounds
SDK copying work; it does not sandbox arbitrary host getters or proxy traps.
Invalid dimensions/cells, out-of-bounds points, duplicate mask/number/stroke entries
and invalid presentation values throw before an update can commit. State keys are not authentication:
hosts verify permissions, game legality, revision equality and stale replies.
Point, navigation, stroke and context-menu intentions carry `stateKey`; the host
can reject them without changing the displayed board or supply an accepted snapshot.

This integration does not replace existing `RecordController`/Board/Viewer APIs,
does not write SGF or implement a second rules engine, and does not open a server
connection. Applications choose their own state store, serialization and transport.

## Common SVG Surface

`@0disoft/banora/controlled-board` exports `mountControlledBoard`,
`ControlledBoardOptions`, `ControlledBoardPresentation` and `ControlledBoardView`.
The root/global SDK exports the same API. Importing the mount is safe on the server;
calling it requires a browser DOM. It does not create a `RecordController`.

```ts
import {mountControlledBoard} from '@0disoft/banora/controlled-board';
const view = mountControlledBoard(document.getElementById('board')!, {
  state: {key:'host/game/node/revision-1', width:9, height:9, stones:Array(81).fill(null)},
  onIntent: event => console.log(event),
  touch: {mode:'confirm'},
  contextMenu: true,
});
// The board stays unchanged until an accepted host snapshot is supplied.
view.update({state: {key:'host/game/node/revision-2', width:9, height:9,
  stones:['black', ...Array(80).fill(null)], lastMove:{x:0,y:0}, toPlay:'white'}});
```

`getSnapshot()` returns the owned immutable value. `update(partialOptions)` merges
presentation options and completely replaces a supplied state. Invalid combined
updates retain the old snapshot, configuration, callbacks and display. Resizing
clears an old out-of-bounds crop unless a new crop is explicitly supplied.
Every successful update cancels pending ink/touch, so a replacement cannot accept
an old confirmation. A view with no intention handler disables placement; readOnly
also disables point/stroke intentions. Navigation and opted-in context menus remain
host actions and never traverse a local record. Handlers own their asynchronous
errors/retries and check `stateKey` before committing requests or replies.

Presentation supports theme/CSS variables, coordinates/numbers, crop, rotation/
reflection, prepared textures, ink input and direct/release/confirmed touch.
Nonrectangular masks clip grid/stones/annotations/overlays and filter point/ink
input; keyboard navigation skips holes. Empty masks expose no point activation.
Point, navigation, normalized frozen stroke and pointer/keyboard context-menu
intentions contain only their payload and stateKey. No provider metrics are inferred.

`labels` accepts bounded board/point/state/confirm/cancel and color/empty text.
Point/state templates accept `{coordinate}`, `{stone}`, `{moveNumber}`, `{toPlay}`,
`{blackCaptures}` and `{whiteCaptures}` as applicable; unknown placeholders remain
literal. Overlay ariaLabel descriptions join keyboard point announcements.
Transient diagnostic messages retain SDK English; this is not full application
localization. `announce(text)` lets a host report rejection without changing state.

`exportSvg` and asynchronous `exportPng` use the shared standalone-diagram path,
including supplied annotations/masks/overlays and excluding transient cursors/ink/
touch previews. Export never writes a record. `dispose()` is idempotent, aborts
pending image work and removes view listeners, DOM and lens UI. Configuration keeps
only the checked snapshot, not its original host input. A retained disposed handle
releases the last snapshot/frame and host intention callback; private empty display
data supports terminal guards. This does not mutate or dispose host state/engines
or invalidate snapshots explicitly retained by the host. Other operations reject a disposed view. Record adjacency
animation, SGF navigation/comparison and complete Viewer UI remain record APIs.

## Native Components

React, Vue and Svelte expose an additive `ControlledBoard` and
`ControlledBoardProps` in their existing optional packages. They accept the same
required state and presentation options. They never create a record controller;
state/options/callback updates reuse the mounted surface. Outer class/style/
accessibility attributes remain framework-owned. SSR renders only the host
container, without invoking intentions or browser view callbacks.

React uses `className`, React style, `ariaLabel` and `onView(viewOrNull)`.
Svelte uses `class`, CSS-text style, `ariaLabel` and `onView(viewOrNull)`.
Their view callback receives null on cleanup/replacement. Keep it stable and
borrow the view only for snapshot inspection, announcements or diagram export;
configure through props and let the component dispose it. Vue forwards attributes
and emits `intent`/`view`, including a null view on unmount. Vue also accepts an
`onIntent` callback prop; it is the same listener as `@intent`, not a second action.
Views never unsubscribe/dispose an externally managed store or native engine.

```ts
import {createElement} from 'react';
import {ControlledBoard} from '@0disoft/banora-react';
import type {BoardSnapshot, BoardIntent} from '@0disoft/banora/board-state';
export function HostBoard(props: {snapshot:BoardSnapshot; send:(intent:BoardIntent)=>void}) {
  return createElement(ControlledBoard, {state:props.snapshot, onIntent:props.send});
}
```

```vue
<script setup lang="ts">
import {ControlledBoard} from '@0disoft/banora-vue';
import type {BoardSnapshot, BoardIntent} from '@0disoft/banora/board-state';
defineProps<{snapshot:BoardSnapshot}>();
const emit = defineEmits<{intent:[BoardIntent]}>();
</script>
<template><ControlledBoard :state="snapshot" @intent="intent => emit('intent', intent)" /></template>
```

```svelte
<script lang="ts">
import {ControlledBoard} from '@0disoft/banora-svelte';
import type {BoardSnapshot, BoardIntent} from '@0disoft/banora/board-state';
let {snapshot, send}:{snapshot:BoardSnapshot; send:(intent:BoardIntent)=>void} = $props();
</script>
<ControlledBoard state={snapshot} onIntent={send} />
```

Use a host subscription/effect/store to replace the snapshot; no particular
transport, state-store package or framework cross-dependency is required. The
React/Vue artifacts keep every SDK subpath external and Svelte preserves native
component sources. Independently installed tarballs check those types, peers,
native sources and real server host rendering. Native browser lifecycle/input
evidence is recorded separately from SSR evidence.

## Runnable Host Consumers and Evidence

The [controlled consumer examples](../../examples/controlled/README.md) render
one transport-free host simulator through Vanilla TypeScript, React Strict Mode,
Vue ordinary refs and Svelte effects. The host separately queues intentions,
approves/rejects them, replaces positions and rejects stale state keys. Its occupied
point check is illustrative; real applications retain their own game legality,
authorization and asynchronous request/reply handling.

Production Chrome 154 checks all four consumers for unchanged state before
approval, rejection/stale keys, callback replacement, read-only updates, retained
host state across remount and actual standalone SVG/PNG downloads. Mobile touch
emulation checks confirmation, cancellation on snapshot replacement and view-owned
lens cleanup. Common surface checks cover all eight rectangular transforms,
nonrectangular masks, labels/overlays, keyboard/ink/menu intentions and invalid
combined-update rollback. Packed artifacts separately verify headless snapshot
imports without DOM types and three native adapter server host renders.

These checks establish the documented browser boundary, not native toolkit
rendering, a particular RPC/engine/store integration, real-device support,
hydration or other browser engines. No external application adoption is performed.
