import { createApp, defineComponent, h, ref, toRaw } from 'vue';
import { Board, Viewer, useRecordState } from '@banora/vue';
import { RecordController } from '@banora/sdk';
import type { BoardRotation, ControllerState } from '@banora/sdk';
import sample from '../fixtures/study.sgf?raw';

const records = [new RecordController({ sgf: sample }), new RecordController({ sgf: '(;SZ[13]GN[Second record];B[dd];W[jj])' })];
const App = defineComponent({ setup() {
  // Ordinary ref intentionally exercises class-proxy normalization in the adapter.
  const controller = ref(records[0]!);
  const mounted = ref(true); const readOnly = ref(false); const flat = ref(false);
  const callbackB = ref(false); const events = ref(0); const last = ref('');
  const rotation = ref<BoardRotation>(0), flipX = ref(false);
  const transform = () => ({rotation:rotation.value,flipX:flipX.value});
  const state = useRecordState(controller);
  const onStateChange = (state: ControllerState) => { events.value++; last.value = `${callbackB.value ? 'B' : 'A'}:${state.position.moveNumber}`; };
  const button = (id: string, text: string, onClick: () => void) => h('button', { id, onClick }, text);
  return () => h('main', null, [h('a', { href: '../studio/' }, '← Studio'), h('h1', null, 'Banora in Vue'),
    h('p', null, 'Board and Viewer share one controller, including Vue ref/proxy integration.'),
    h('p', { id: 'state', role: 'status' }, `Move ${state.value.position.moveNumber} · ${state.value.position.width} × ${state.value.position.height} · ${state.value.dirty ? 'changed' : 'clean'}`),
    h('p', { id: 'events' }, `Events ${events.value} · ${last.value}`),
    h('div', { class: 'controls' }, [button('advance', 'Advance controller', () => toRaw(controller.value).next()),
      button('toggle', mounted.value ? 'Unmount widgets' : 'Mount widgets', () => { mounted.value = !mounted.value; }),
      button('readonly', readOnly.value ? 'Enable placement' : 'Read only', () => { readOnly.value = !readOnly.value; }),
      button('theme', 'Change theme', () => { flat.value = !flat.value; }),
      button('rotate', 'Rotate board', () => { rotation.value = (rotation.value + 90) % 360 as BoardRotation; }),
      button('reflect', 'Reflect board', () => { flipX.value = !flipX.value; }),
      button('callback', 'Change callback', () => { callbackB.value = !callbackB.value; }),
      button('swap', 'Switch controller', () => { controller.value = toRaw(controller.value) === records[0] ? records[1]! : records[0]!; })]),
    mounted.value ? h('div', { class: 'boards' }, [h('section', { id: 'board-host' }, h(Board, {
      controller: controller.value, readOnly: readOnly.value, transform:transform(), theme: flat.value ? 'flat' : 'wood', onStateChange,
    })), h('section', { id: 'viewer-host' }, h(Viewer, { controller: controller.value, editable: !readOnly.value, board: { transform:transform(), theme: flat.value ? 'flat' : 'wood' } }))]) :
      h('p', null, 'Widgets unmounted. The controller remains active.'),
    mounted.value ? h('section', { id: 'owned-board', style: { maxWidth: '350px' } }, [h('h2', null, 'Optional owned controller'),
      h(Board, { readOnly: readOnly.value, transform:transform(), theme: flat.value ? 'flat' : 'wood' })]) : null]);
} });
createApp(App).mount(document.getElementById('app')!);
window.addEventListener('pagehide', event => { if (!event.persisted) records.forEach(controller => controller.dispose()); });
