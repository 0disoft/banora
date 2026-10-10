# Banora Vue

Optional Vue 3 adapter for the common Banora SDK. This development package is not
published. Build it with `bun run build:adapters` from the repository root.

```vue
<script setup lang="ts">
import {shallowRef} from 'vue';
import {RecordController} from '@banora/sdk';
import {Board, Viewer, useRecordState} from '@banora/vue';
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
