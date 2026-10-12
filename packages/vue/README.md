# Banora Vue

Optional Vue 3 adapter for the Banora 0.1 SDK.
Install with `npm install @0disoft/banora @0disoft/banora-vue`.
Build locally with `bun run build:adapters` from the repository root.

`ControlledBoard` accepts a required plain `state` and `@intent` (`onIntent`)
instead of a record controller. The host owns rules/records and supplies accepted
snapshots. Common display/input props update the surface; `@view` borrows it and
receives null on unmount. See the
[host-controlled guide](https://github.com/0disoft/banora/blob/main/docs/sdk/controlled-board.md).

```vue
<script setup lang="ts">
import {shallowRef} from 'vue';
import {RecordController} from '@0disoft/banora';
import {Board, Viewer, useRecordState} from '@0disoft/banora-vue';
const controller = shallowRef(new RecordController({sgf: '(;SZ[9];B[aa])'}));
const state = useRecordState(controller);
</script>
<template>
  <p>Move {{ state.position.moveNumber }}</p>
  <Board :controller="controller" read-only />
  <Viewer :controller="controller" @state-change="snapshot => console.log(snapshot.dirty)" />
</template>
```

`Board` accepts SDK board options; `Viewer` accepts viewer options except initial
`sgf`. Both emit `stateChange(snapshot)` and forward attributes to their container.
`useRecordState(controllerOrRefOrGetter)` runs inside setup and returns a read-only
snapshot ref. Ordinary Vue refs are also accepted: the adapter unwraps controller
proxies before SDK calls. Prefer `shallowRef` for controller handles; if directly
calling a controller kept in a deep ref, call `toRaw(controller.value)` first,
because the controller uses JavaScript private fields.

Configuration updates retain the record; controller replacement remounts the view.
Unmounting releases views/subscriptions and preserves host-owned controllers.
Without a supplied controller each component owns its own record and disposes it
on unmount. Dispose host controllers only after all their views are unmounted.
The framework owns the container, the SDK its descendants. SSR emits only containers
and state text, with no browser globals or board DOM; client mount creates the SVG.
Supply matching record content for hydration. Board HTML hydration is deferred.
See the repository's SDK API, compatibility document and Vue consumer example.

The `view(viewOrNull)` event supplies a borrowed BoardView/ViewerView for
`exportSvg(options)` or asynchronous `exportPng(options)`. Keep it in a shallow ref;
null clears the handle on unmount/controller replacement. Use component props for
configuration and let the component dispose its view. Images do not save the SGF
record or clear dirty state.

Pass `drawing: {color:'#206650',width:0.08}` to Board (inside `board` for Viewer)
to enable the shared freehand tool; null disables it. Immutable state includes
`strokes`, with controller add/remove/clear, Undo and SGF export/reopen. Read-only
views display saved ink, and diagrams include it. SGF uses the private BPN
extension, which other viewers may not display.

Pass `touch: {mode:'confirm',magnifier:true}` to Board or nested `board.touch` to
Viewer for magnified touch aiming and confirmation. Release mode places on lift;
null restores direct activation. Pending targets stay in the view, can be refined
with keyboard arrows, and are cancelled by configuration/context changes or
unmount. Ink takes priority; read-only views do not enter touch aiming.

Compose two Board components with `nodeId`, `compareTo` and `referenceGeneration`
(the snapshot's `recordGeneration`) for read-only side-by-side comparisons.
Pins display their own node/path without navigating/editing the shared controller;
missing/stale pins become unavailable and cannot export until restored/rebound.
Viewer follows its cursor and accepts `board.compareTo`. The Vue example includes
pinning, configuration updates, ownership and remounts using the public API.
