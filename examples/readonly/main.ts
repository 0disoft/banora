import { mountBoard, RecordController } from '@0disoft/banora';
import type { BoardView } from '@0disoft/banora';

const controller = new RecordController({
  sgf: '(;SZ[9]C[An original embedding example.];B[gc];W[cg];B[cc];W[gg])',
});
const container = document.getElementById('board')!;
let view: BoardView | null = mountBoard(container, { controller, readOnly: true, theme: 'flat' });
const status = document.getElementById('position')!;
const unsubscribe = controller.subscribe((state) => {
  status.textContent = `Move ${state.position.moveNumber} · ${state.position.toPlay} to play · ${state.node.properties.C?.[0] ?? 'Explore the next position.'}`;
});
document.getElementById('previous')!.addEventListener('click', () => controller.previous());
document.getElementById('next')!.addEventListener('click', () => controller.next());
document.getElementById('toggle')!.addEventListener('click', (event) => {
  if (view) {
    view.dispose();
    view = null;
  } else view = mountBoard(container, { controller, readOnly: true, theme: 'flat' });
  (event.target as HTMLButtonElement).textContent = view ? 'Unmount board' : 'Mount board';
});
window.addEventListener('pagehide', (event) => {
  if (!event.persisted) {
    view?.dispose();
    unsubscribe();
    controller.dispose();
  }
});
