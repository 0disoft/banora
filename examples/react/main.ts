import { createElement as h, StrictMode, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Board, Viewer, useRecordState } from '@banora/react';
import { RecordController } from '@banora/sdk';
import type { BoardRotation, ControllerState } from '@banora/sdk';
import sample from '../fixtures/study.sgf?raw';

const records = [new RecordController({ sgf: sample }), new RecordController({ sgf: '(;SZ[13]GN[Second record];B[dd];W[jj])' })];
function App() {
  const [second, setSecond] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [readOnly, setReadOnly] = useState(false);
  const [flat, setFlat] = useState(false);
  const [rotation, setRotation] = useState<BoardRotation>(0);
  const [flipX, setFlipX] = useState(false);
  const transform = {rotation,flipX};
  const [callbackB, setCallbackB] = useState(false);
  const [events, setEvents] = useState(0);
  const [last, setLast] = useState('');
  const controller = records[second ? 1 : 0]!;
  const state = useRecordState(controller);
  const onStateChange = useCallback((state: ControllerState) => { setEvents(count => count + 1); setLast(`${callbackB ? 'B' : 'A'}:${state.position.moveNumber}`); }, [callbackB]);
  const button = (id: string, text: string, onClick: () => void) => h('button', { id, onClick }, text);
  return h('main', null,
    h('a', { href: '../studio/' }, '← Studio'), h('h1', null, 'Banora in React'),
    h('p', null, 'Board and Viewer share one controller. React Strict Mode is enabled.'),
    h('p', { id: 'state', role: 'status' }, `Move ${state.position.moveNumber} · ${state.position.width} × ${state.position.height} · ${state.dirty ? 'changed' : 'clean'}`),
    h('p', { id: 'events' }, `Events ${events} · ${last}`),
    h('div', { className: 'controls' }, button('advance', 'Advance controller', () => controller.next()),
      button('toggle', mounted ? 'Unmount widgets' : 'Mount widgets', () => setMounted(value => !value)),
      button('readonly', readOnly ? 'Enable placement' : 'Read only', () => setReadOnly(value => !value)),
      button('theme', 'Change theme', () => setFlat(value => !value)),
      button('rotate', 'Rotate board', () => setRotation(value => (value + 90) % 360 as BoardRotation)),
      button('reflect', 'Reflect board', () => setFlipX(value => !value)),
      button('callback', 'Change callback', () => setCallbackB(value => !value)),
      button('swap', 'Switch controller', () => setSecond(value => !value))),
    mounted ? h('div', { className: 'boards' }, h('section', { id: 'board-host' },
      h(Board, { controller, readOnly, transform, theme: flat ? 'flat' : 'wood', onStateChange })),
    h('section', { id: 'viewer-host' }, h(Viewer, { controller, editable: !readOnly, board: { transform, theme: flat ? 'flat' : 'wood' } }))) :
      h('p', null, 'Widgets unmounted. The controller remains active.'),
    mounted ? h('section', { id: 'owned-board', style: { maxWidth: 350 } }, h('h2', null, 'Optional owned controller'),
      h(Board, { readOnly, transform, theme: flat ? 'flat' : 'wood' })) : null);
}
createRoot(document.getElementById('app')!).render(h(StrictMode, null, h(App)));
window.addEventListener('pagehide', event => { if (!event.persisted) records.forEach(controller => controller.dispose()); });
