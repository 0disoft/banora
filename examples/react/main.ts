import { createElement as h, StrictMode, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Board, Viewer, useRecordState } from '@banora/react';
import { RecordController } from '@banora/sdk';
import type { BoardRotation, BoardView, ControllerState, ViewerView } from '@banora/sdk';
import { downloadDiagram } from '../diagram-download.js';
import sample from '../fixtures/study.sgf?raw';
import { describeComparison,pinComparison,startComparison } from '../comparison-pair.js';
import type { ComparisonPair } from '../comparison-pair.js';
import {mountSharing} from '../sharing-controls.js';

function Sharing({controller}:{controller:RecordController}) {
  const host=useRef<HTMLDivElement>(null);
  useEffect(() => host.current ? mountSharing(host.current,controller) : undefined,[controller]);
  return h('div',{ref:host});
}

const records = [new RecordController({ sgf: sample }), new RecordController({ sgf: '(;SZ[13]GN[Second record];B[dd];W[jj])' })];
function App() {
  const [second, setSecond] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [readOnly, setReadOnly] = useState(false);
  const [flat, setFlat] = useState(false);
  const [rotation, setRotation] = useState<BoardRotation>(0);
  const [flipX, setFlipX] = useState(false);
  const [ink, setInk] = useState(false);
  const drawing = ink ? {color:'#cc5522',width:0.12} : null;
  const [confirmTouch,setConfirmTouch] = useState(false), [magnifier,setMagnifier] = useState(true);
  const touch = {mode:confirmTouch ? 'confirm' as const : 'release' as const,magnifier};
  const [boardView, setBoardView] = useState<BoardView | ViewerView | null>(null);
  const [viewerView, setViewerView] = useState<BoardView | ViewerView | null>(null);
  const [error, setError] = useState('');
  const transform = {rotation,flipX};
  const [callbackB, setCallbackB] = useState(false);
  const [events, setEvents] = useState(0);
  const [last, setLast] = useState('');
  const controller = records[second ? 1 : 0]!;
  const state = useRecordState(controller);
  const [comparison,setComparison]=useState<ComparisonPair|null>(null);
  const pair=comparison?.controller===controller ? comparison : null;
  const onStateChange = useCallback((state: ControllerState) => { setEvents(count => count + 1); setLast(`${callbackB ? 'B' : 'A'}:${state.position.moveNumber}`); }, [callbackB]);
  const button = (id: string, text: string, onClick: () => void) => h('button', { id, onClick }, text);
  return h('main', null,
    h('a', { href: '../studio/' }, '← Studio'), h('h1', null, 'Banora in React'),
    h('p', null, 'Board and Viewer share one controller. React Strict Mode is enabled.'),
    h('p', { id: 'state', role: 'status' }, `Move ${state.position.moveNumber} · ${state.position.width} × ${state.position.height} · ${state.dirty ? 'changed' : 'clean'}`),
    h('p', { id: 'events' }, `Events ${events} · ${last}`),
    h('p', {id:'diagram-error',role:'status'},error),
    h('p', {id:'view-handles'},`View handles ${Number(!!boardView) + Number(!!viewerView)}`),
    h('p', {id:'ink-count'},`Ink strokes ${state.strokes.length}`),
    h('div', { className: 'controls' }, button('advance', 'Advance controller', () => controller.next()),
      button('toggle', mounted ? 'Unmount widgets' : 'Mount widgets', () => setMounted(value => !value)),
      button('readonly', readOnly ? 'Enable placement' : 'Read only', () => setReadOnly(value => !value)),
      button('theme', 'Change theme', () => setFlat(value => !value)),
      button('rotate', 'Rotate board', () => setRotation(value => (value + 90) % 360 as BoardRotation)),
      button('reflect', 'Reflect board', () => setFlipX(value => !value)),
      button('ink', ink ? 'Use placement tool' : 'Use ink tool', () => setInk(value => !value)),
      button('clear-ink', 'Clear ink', () => controller.clearStrokes()),
      button('undo-edit', 'Undo record edit', () => controller.undo()),
      button('touch-confirm', confirmTouch ? 'Place on touch release' : 'Require touch confirmation', () => setConfirmTouch(value => !value)),
      button('magnify', magnifier ? 'Hide touch magnifier' : 'Show touch magnifier', () => setMagnifier(value => !value)),
      button('callback', 'Change callback', () => setCallbackB(value => !value)),
      button('swap', 'Switch controller', () => setSecond(value => !value))),
    h('div', {className:'controls'},
      h('button', {id:'png', disabled:!mounted || !boardView, onClick:() => { void downloadDiagram(boardView,'png','react-board.png').catch(error => setError(String(error))); }}, 'Save board PNG'),
      h('button', {id:'svg', disabled:!mounted || !viewerView, onClick:() => { void downloadDiagram(viewerView,'svg','react-viewer.svg').catch(error => setError(String(error))); }}, 'Save viewer SVG')),
    h('div',{className:'controls'},button('compare',pair ? 'Close comparison' : 'Compare positions',() => setComparison(pair ? null : startComparison(controller))),
      h('button',{id:'pin-left',disabled:!pair,onClick:() => pair && setComparison(pinComparison(pair,'left'))},'Pin current on left'),
      h('button',{id:'pin-right',disabled:!pair,onClick:() => pair && setComparison(pinComparison(pair,'right'))},'Pin current on right')),
    mounted ? h('div', { className: 'boards' }, h('section', { id: 'board-host' },
      h(Board, { controller, readOnly, transform, drawing, touch, theme: flat ? 'flat' : 'wood', onStateChange, onView:setBoardView })),
    h('section', { id: 'viewer-host' }, h(Viewer, { controller, editable: !readOnly, onView:setViewerView, board: { transform, drawing, touch, theme: flat ? 'flat' : 'wood' } }))) :
      h('p', null, 'Widgets unmounted. The controller remains active.'),
    mounted ? h(Sharing,{controller}) : null,
    mounted ? h('section', { id: 'owned-board', style: { maxWidth: 350 } }, h('h2', null, 'Optional owned controller'),
      h(Board, { readOnly, transform, drawing, touch, theme: flat ? 'flat' : 'wood' })) : null,
    mounted && pair ? h('section',{id:'comparison-host'},h('h2',null,'Position comparison'),
      h('p',{id:'comparison-summary'},describeComparison(pair,state)),h('div',{className:'boards'},
        h('section',{id:'compare-left'},h(Board,{controller,nodeId:pair.left,compareTo:pair.right,referenceGeneration:pair.generation,transform,theme:flat ? 'flat' : 'wood'})),
        h('section',{id:'compare-right'},h(Board,{controller,nodeId:pair.right,compareTo:pair.left,referenceGeneration:pair.generation,transform,theme:flat ? 'flat' : 'wood'})))) : null);
}
createRoot(document.getElementById('app')!).render(h(StrictMode, null, h(App)));
window.addEventListener('pagehide', event => { if (!event.persisted) records.forEach(controller => controller.dispose()); });
