import { createElement, StrictMode, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { ControlledBoard } from '@0disoft/banora-react';
import { createHost } from './host.js';
import { attachControls } from './controls.js';

const host = createHost();
function App() {
  const session = useSyncExternalStore(host.subscribe, host.getState, host.getState);
  return session.mounted
    ? createElement(ControlledBoard, { ...host.options(session), onView: host.bindView })
    : null;
}
const stopControls = attachControls(host, 'React');
const root = createRoot(document.querySelector('#board-root')!);
root.render(createElement(StrictMode, null, createElement(App)));
window.addEventListener(
  'pagehide',
  () => {
    root.unmount();
    stopControls();
  },
  { once: true },
);
