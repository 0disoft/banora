# Banora React

Optional React 19 adapter for the common Banora SDK. This development package is
not published. Build it with `bun run build:adapters` from the repository root.

```ts
import {createElement} from 'react';
import {RecordController} from '@banora/sdk';
import {Board, Viewer, useRecordState} from '@banora/react';

// Create once outside render, or retain with a hook. The host owns this controller.
const controller = new RecordController({sgf: '(;SZ[9];B[aa])'});
function Review() {
  const state = useRecordState(controller);
  return createElement('section', null,
    createElement('p', null, `Move ${state.position.moveNumber}`),
    createElement(Board, {controller, readOnly: true}),
    createElement(Viewer, {controller}));
}
```

`Board` accepts SDK board options, `className`, React `style`, `ariaLabel` and
`onStateChange(state)`. `Viewer` accepts the SDK viewer options except initial
`sgf`, plus the same container/event props. Initialize a shared controller with SGF.
`useRecordState(controller)` returns an immutable snapshot using React's external
store interface. Unmounting releases the view and subscription, preserving a
host-supplied controller. Without a controller, each component owns a separate
record and disposes it on unmount. Configuration changes preserve its state;
controller replacement disposes/remounts the view. Host controllers must outlive
their views and be disposed by the host when no longer needed.

`onView(viewOrNull)` supplies a borrowed BoardView/ViewerView handle for
`exportSvg(options)` or asynchronous `exportPng(options)`. Cleanup clears the binding
with null. Use a stable callback (for example a state setter or `useCallback`);
callback replacement clears the old binding and connects the new one. Configure
through props and leave view disposal to the component. Image export does not save
the SGF record or clear dirty state.

The framework owns the empty container; the SDK owns its descendants. SSR emits
only containers; board DOM mounts in client effects. Supply matching record content
on server/client for state hydration. Rendered board HTML hydration is deferred.
See the repository's SDK public API, compatibility document and React consumer
example for the currently tested versions and limitations.
