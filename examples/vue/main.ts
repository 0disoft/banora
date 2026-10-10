import { createApp, defineComponent, h, onBeforeUnmount, onMounted, ref, shallowRef, toRaw, watch } from 'vue';
import type {PropType} from 'vue';
import { Board, Viewer, useRecordState } from '@banora/vue';
import { RecordController } from '@banora/sdk';
import type { BoardRotation, BoardView, ControllerState, ViewerView } from '@banora/sdk';
import { downloadDiagram } from '../diagram-download.js';
import sample from '../fixtures/study.sgf?raw';
import { describeComparison,pinComparison,startComparison } from '../comparison-pair.js';
import type { ComparisonPair } from '../comparison-pair.js';
import {mountSharing} from '../sharing-controls.js';

const Sharing=defineComponent({props:{controller:{type:Object as PropType<RecordController>,required:true}},setup(props) {
  const host=ref<HTMLDivElement>();let dispose:(() => void)|undefined,stop:(() => void)|undefined;
  onMounted(() => {stop=watch(() => props.controller,controller => {
    dispose?.();if (host.value) dispose=mountSharing(host.value,toRaw(controller) as RecordController);
  },{immediate:true});});
  onBeforeUnmount(() => {stop?.();dispose?.();});
  return () => h('div',{ref:host});
}});

const records = [new RecordController({ sgf: sample }), new RecordController({ sgf: '(;SZ[13]GN[Second record];B[dd];W[jj])' })];
const App = defineComponent({ setup() {
  // Ordinary ref intentionally exercises class-proxy normalization in the adapter.
  const controller = ref(records[0]!);
  const mounted = ref(true); const readOnly = ref(false); const flat = ref(false);
  const callbackB = ref(false); const events = ref(0); const last = ref('');
  const rotation = ref<BoardRotation>(0), flipX = ref(false);
  const ink = ref(false);
  const drawing = () => ink.value ? {color:'#cc5522',width:0.12} : null;
  const confirmTouch=ref(false),magnifier=ref(true);
  const touch=() => ({mode:confirmTouch.value ? 'confirm' as const : 'release' as const,magnifier:magnifier.value});
  const boardView = shallowRef<BoardView | ViewerView | null>(null), viewerView = shallowRef<BoardView | ViewerView | null>(null);
  const bindBoard = (view: BoardView | ViewerView | null) => { boardView.value = view; };
  const bindViewer = (view: BoardView | ViewerView | null) => { viewerView.value = view; };
  const error = ref('');
  const transform = () => ({rotation:rotation.value,flipX:flipX.value});
  const state = useRecordState(controller);
  const comparison=shallowRef<ComparisonPair|null>(null);
  const pair=() => comparison.value?.controller===toRaw(controller.value) ? comparison.value : null;
  const onStateChange = (state: ControllerState) => { events.value++; last.value = `${callbackB.value ? 'B' : 'A'}:${state.position.moveNumber}`; };
  const button = (id: string, text: string, onClick: () => void) => h('button', { id, onClick }, text);
  return () => h('main', null, [h('a', { href: '../studio/' }, '← Studio'), h('h1', null, 'Banora in Vue'),
    h('p', null, 'Board and Viewer share one controller, including Vue ref/proxy integration.'),
    h('p', { id: 'state', role: 'status' }, `Move ${state.value.position.moveNumber} · ${state.value.position.width} × ${state.value.position.height} · ${state.value.dirty ? 'changed' : 'clean'}`),
    h('p', { id: 'events' }, `Events ${events.value} · ${last.value}`),
    h('p', {id:'diagram-error',role:'status'},error.value),
    h('p', {id:'view-handles'},`View handles ${Number(!!boardView.value) + Number(!!viewerView.value)}`),
    h('p', {id:'ink-count'},`Ink strokes ${state.value.strokes.length}`),
    h('div', { class: 'controls' }, [button('advance', 'Advance controller', () => toRaw(controller.value).next()),
      button('toggle', mounted.value ? 'Unmount widgets' : 'Mount widgets', () => { mounted.value = !mounted.value; }),
      button('readonly', readOnly.value ? 'Enable placement' : 'Read only', () => { readOnly.value = !readOnly.value; }),
      button('theme', 'Change theme', () => { flat.value = !flat.value; }),
      button('rotate', 'Rotate board', () => { rotation.value = (rotation.value + 90) % 360 as BoardRotation; }),
      button('reflect', 'Reflect board', () => { flipX.value = !flipX.value; }),
      button('ink', ink.value ? 'Use placement tool' : 'Use ink tool', () => {ink.value=!ink.value;}),
      button('clear-ink', 'Clear ink', () => toRaw(controller.value).clearStrokes()),
      button('undo-edit', 'Undo record edit', () => toRaw(controller.value).undo()),
      button('touch-confirm', confirmTouch.value ? 'Place on touch release' : 'Require touch confirmation', () => {confirmTouch.value=!confirmTouch.value;}),
      button('magnify', magnifier.value ? 'Hide touch magnifier' : 'Show touch magnifier', () => {magnifier.value=!magnifier.value;}),
      button('callback', 'Change callback', () => { callbackB.value = !callbackB.value; }),
      button('swap', 'Switch controller', () => { controller.value = toRaw(controller.value) === records[0] ? records[1]! : records[0]!; })]),
    h('div', {class:'controls'},[
      h('button', {id:'png', disabled:!mounted.value || !boardView.value, onClick:() => { void downloadDiagram(boardView.value,'png','vue-board.png').catch(result => {error.value=String(result);}); }}, 'Save board PNG'),
      h('button', {id:'svg', disabled:!mounted.value || !viewerView.value, onClick:() => { void downloadDiagram(viewerView.value,'svg','vue-viewer.svg').catch(result => {error.value=String(result);}); }}, 'Save viewer SVG')]),
    h('div',{class:'controls'},[
      button('compare',pair() ? 'Close comparison' : 'Compare positions',() => {comparison.value=pair() ? null : startComparison(toRaw(controller.value) as RecordController);}),
      h('button',{id:'pin-left',disabled:!pair(),onClick:() => {const active=pair();if (active) comparison.value=pinComparison(active,'left');}},'Pin current on left'),
      h('button',{id:'pin-right',disabled:!pair(),onClick:() => {const active=pair();if (active) comparison.value=pinComparison(active,'right');}},'Pin current on right')]),
    mounted.value ? h('div', { class: 'boards' }, [h('section', { id: 'board-host' }, h(Board, {
      controller: controller.value, readOnly: readOnly.value, transform:transform(), drawing:drawing(), touch:touch(), theme: flat.value ? 'flat' : 'wood', onStateChange, onView:bindBoard,
    })), h('section', { id: 'viewer-host' }, h(Viewer, { controller: controller.value, editable: !readOnly.value, onView:bindViewer, board: { transform:transform(), drawing:drawing(), touch:touch(), theme: flat.value ? 'flat' : 'wood' } }))]) :
      h('p', null, 'Widgets unmounted. The controller remains active.'),
    mounted.value ? h(Sharing,{controller:controller.value as RecordController}) : null,
    mounted.value ? h('section', { id: 'owned-board', style: { maxWidth: '350px' } }, [h('h2', null, 'Optional owned controller'),
      h(Board, { readOnly: readOnly.value, transform:transform(), drawing:drawing(), touch:touch(), theme: flat.value ? 'flat' : 'wood' })]) : null,
    mounted.value && pair() ? h('section',{id:'comparison-host'},[h('h2','Position comparison'),
      h('p',{id:'comparison-summary'},describeComparison(pair()!,state.value)),h('div',{class:'boards'},[
        h('section',{id:'compare-left'},h(Board,{controller:controller.value,nodeId:pair()!.left,compareTo:pair()!.right,referenceGeneration:pair()!.generation,transform:transform(),theme:flat.value ? 'flat' : 'wood'})),
        h('section',{id:'compare-right'},h(Board,{controller:controller.value,nodeId:pair()!.right,compareTo:pair()!.left,referenceGeneration:pair()!.generation,transform:transform(),theme:flat.value ? 'flat' : 'wood'}))])]) : null]);
} });
createApp(App).mount(document.getElementById('app')!);
window.addEventListener('pagehide', event => { if (!event.persisted) records.forEach(controller => controller.dispose()); });
