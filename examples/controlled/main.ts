import { mountControlledBoard } from '@0disoft/banora/controlled-board';
import type { ControlledBoardView } from '@0disoft/banora/controlled-board';
import { createHost } from './host.js';
import { attachControls } from './controls.js';

const host = createHost(),
  container = document.querySelector<HTMLElement>('#board-root')!;
let view: ControlledBoardView | null = null;
const render = () => {
  const session = host.getState();
  if (!session.mounted) {
    view?.dispose();
    view = null;
  } else if (view) view.update(host.options());
  else view = mountControlledBoard(container, host.options());
  host.bindView(view);
};
const stopControls = attachControls(host, 'Vanilla'),
  stop = host.subscribe(render);
render();
window.addEventListener(
  'pagehide',
  () => {
    stop();
    stopControls();
    view?.dispose();
    host.bindView(null);
  },
  { once: true },
);
