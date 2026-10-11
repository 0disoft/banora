import { mountPuzzle } from '@0disoft/banora/puzzle-view';
import type { PuzzleView } from '@0disoft/banora/puzzle-view';
import { PuzzleSession } from '@0disoft/banora/puzzle';
import { puzzles } from '../fixtures/puzzles.js';
const find = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const choice = find<HTMLSelectElement>('puzzle'),
  theme = find<HTMLSelectElement>('theme'),
  toggle = find<HTMLButtonElement>('toggle');
for (const [index, puzzle] of puzzles.entries()) {
  const option = document.createElement('option');
  option.value = String(index);
  option.textContent = puzzle.title;
  choice.append(option);
}
let session = new PuzzleSession(puzzles[0]!),
  view: PuzzleView | undefined,
  events = 0,
  unsubscribe: (() => void) | undefined;
function showState() {
  const state = session.getState();
  find('state').textContent = `${state.status} · ${state.attempts} attempts · ${events} events`;
}
function mount() {
  view = mountPuzzle(find('puzzle-host'), {
    session,
    board: { theme: theme.value as 'wood' | 'flat', touch: { mode: 'release' } },
    onEvent: () => {
      events++;
      showState();
    },
  });
  toggle.textContent = 'Unmount puzzle';
  find<HTMLButtonElement>('svg').disabled = false;
}
function bind() {
  unsubscribe = session.subscribe(showState);
  mount();
}
bind();
choice.addEventListener('change', () => {
  view?.dispose();
  unsubscribe?.();
  session.dispose();
  session = new PuzzleSession(puzzles[Number(choice.value)]!);
  events = 0;
  bind();
});
theme.addEventListener('change', () =>
  view?.update({ board: { theme: theme.value as 'wood' | 'flat' } }),
);
toggle.addEventListener('click', () => {
  if (view) {
    view.dispose();
    view = undefined;
    toggle.textContent = 'Remount puzzle';
    find<HTMLButtonElement>('svg').disabled = true;
  } else mount();
});
find('svg').addEventListener('click', () => {
  if (!view) return;
  const url = URL.createObjectURL(new Blob([view.exportSvg()], { type: 'image/svg+xml' })),
    link = document.createElement('a');
  link.href = url;
  link.download = 'banora-puzzle.svg';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
});
window.addEventListener('pagehide', (event) => {
  if (!event.persisted) {
    view?.dispose();
    unsubscribe?.();
    session.dispose();
  }
});
