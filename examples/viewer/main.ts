import { mountViewer, RecordController } from '@0disoft/banora';
import type { ViewerView } from '@0disoft/banora';
import sample from '../fixtures/study.sgf?raw';

const controller = new RecordController({ sgf: sample });
const container = document.getElementById('viewer')!;
let editable = false;
let view: ViewerView | null = mountViewer(container, { controller });
document.getElementById('editing')!.addEventListener('click', (event) => {
  editable = !editable;
  view?.update({ editable });
  (event.target as HTMLButtonElement).textContent = editable ? 'Disable editing' : 'Enable editing';
});
document.getElementById('toggle')!.addEventListener('click', (event) => {
  if (view) {
    view.dispose();
    view = null;
  } else view = mountViewer(container, { controller, editable });
  (event.target as HTMLButtonElement).textContent = view ? 'Unmount viewer' : 'Mount viewer';
});
const unsubscribe = controller.subscribe((state) => {
  document.getElementById('state')!.textContent =
    `Controller: move ${state.position.moveNumber}, ${state.dirty ? 'changed' : 'clean'}`;
});
window.addEventListener('pagehide', (event) => {
  if (!event.persisted) {
    view?.dispose();
    unsubscribe();
    controller.dispose();
  }
});
