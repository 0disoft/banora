import type { StudioWorkspace } from './workspace.js';
import { setUiText, subscribeUiLanguage, translateUi } from '../ui-language.js';

export function mountWorkspaceTabs(
  workspace: StudioWorkspace,
  options: { canAct(): boolean; close(id: number): Promise<boolean> },
): () => void {
  const boardPanel = document.querySelector('.board-panel')!;
  const bar = document.createElement('aside');
  bar.className = 'workspace-tabs';
  const tabs = document.createElement('div');
  tabs.id = 'board-tabs';
  tabs.setAttribute('role', 'tablist');
  const actions = document.createElement('div');
  actions.className = 'workspace-tab-actions';
  const label = document.createElement('label');
  label.htmlFor = 'new-board-size';
  const caption = document.createElement('span');
  setUiText(caption, 'Board size');
  const size = document.createElement('select');
  size.id = 'new-board-size';
  for (const count of [19, 13, 9]) size.add(new Option(`${count} × ${count}`, String(count)));
  label.append(caption, size);
  const add = document.getElementById('new') as HTMLButtonElement;
  setUiText(add, 'New board');
  actions.append(label, add);
  const message = document.createElement('span');
  message.setAttribute('role', 'status');
  message.className = 'workspace-tab-status';
  bar.append(actions, tabs, message);
  boardPanel.before(bar);
  tabs.setAttribute(
    'aria-orientation',
    matchMedia('(min-width: 1001px)').matches ? 'vertical' : 'horizontal',
  );
  document.getElementById('board')!.setAttribute('role', 'tabpanel');
  const abort = new AbortController();
  const { signal } = abort;
  let closing = false;
  function render() {
    const focused = document.activeElement as HTMLElement | null;
    const focusedId = focused?.closest<HTMLElement>('[data-board-id]')?.dataset.boardId;
    const focusedClose = focused?.hasAttribute('data-close-board');
    const fragment = document.createDocumentFragment();
    for (const board of workspace.boards) {
      const state = board.controller.getState();
      const root = state.record.games[state.gameIndex]!;
      const title =
        root.properties.GN?.[0] ??
        board.filename.replace(/\.sgf$/i, '').replace(/^board-(\d+)$/, 'Board $1');
      const container = document.createElement('div');
      container.className = 'workspace-tab';
      container.dataset.boardId = String(board.id);
      const selected = board === workspace.active;
      const button = document.createElement('button');
      button.type = 'button';
      button.id = `board-tab-${board.id}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(selected));
      button.setAttribute('aria-controls', 'board');
      button.tabIndex = selected ? 0 : -1;
      button.textContent = root.properties.GN?.[0] ? title : translateUi(title);
      button.title = `${button.textContent} · ${state.position.width} × ${state.position.height}`;
      if (state.dirty) {
        const marker = document.createElement('span');
        marker.className = 'tab-dirty';
        marker.textContent = ' ·';
        marker.setAttribute('aria-label', translateUi('Unsaved changes'));
        button.append(marker);
      }
      button.addEventListener('click', () => {
        if (!closing && options.canAct()) {
          workspace.select(board.id);
          tabs.querySelector<HTMLElement>('[aria-selected="true"]')?.focus({ preventScroll: true });
        }
      });
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'close-board';
      close.setAttribute('data-close-board', String(board.id));
      close.setAttribute('aria-label', `${translateUi('Close board')}: ${button.textContent}`);
      close.title = translateUi('Close board');
      close.addEventListener('click', async () => {
        if (closing || !options.canAct()) return;
        closing = true;
        try {
          await options.close(board.id);
        } finally {
          closing = false;
          tabs.querySelector<HTMLElement>('[aria-selected="true"]')?.focus({ preventScroll: true });
        }
      });
      container.append(button, close);
      fragment.append(container);
    }
    tabs.replaceChildren(fragment);
    tabs.setAttribute('aria-label', translateUi('Boards'));
    document
      .getElementById('board')!
      .setAttribute('aria-labelledby', `board-tab-${workspace.active.id}`);
    add.disabled = workspace.boards.length >= 20;
    if (focusedId)
      tabs
        .querySelector<HTMLElement>(
          `[data-board-id="${focusedId}"] ${focusedClose ? '[data-close-board]' : '[role="tab"]'}`,
        )
        ?.focus({ preventScroll: true });
    const selected = tabs
      .querySelector<HTMLElement>('[aria-selected="true"]')
      ?.closest<HTMLElement>('.workspace-tab');
    if (selected) {
      const bounds = tabs.getBoundingClientRect(),
        rect = selected.getBoundingClientRect();
      const vertical = matchMedia('(min-width: 1001px)').matches;
      tabs.setAttribute('aria-orientation', vertical ? 'vertical' : 'horizontal');
      if (vertical) {
        if (rect.top < bounds.top) tabs.scrollTop += rect.top - bounds.top;
        else if (rect.bottom > bounds.bottom) tabs.scrollTop += rect.bottom - bounds.bottom;
      } else {
        if (rect.left < bounds.left) tabs.scrollLeft += rect.left - bounds.left;
        else if (rect.right > bounds.right) tabs.scrollLeft += rect.right - bounds.right;
      }
    }
  }
  document.addEventListener(
    'keydown',
    (event) => {
      if (
        !(event.target instanceof HTMLElement) ||
        !tabs.contains(event.target) ||
        event.target.getAttribute('role') !== 'tab' ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      const buttons = [...tabs.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
      const index = buttons.indexOf(event.target as HTMLButtonElement);
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? buttons.length - 1
            : ['ArrowRight', 'ArrowDown'].includes(event.key)
              ? (index + 1) % buttons.length
              : ['ArrowLeft', 'ArrowUp'].includes(event.key)
                ? (index - 1 + buttons.length) % buttons.length
                : undefined;
      if (next === undefined || !options.canAct() || closing) return;
      event.preventDefault();
      event.stopPropagation();
      const id = Number(buttons[next]!.closest<HTMLElement>('[data-board-id]')!.dataset.boardId);
      workspace.select(id);
      tabs.querySelector<HTMLElement>('[aria-selected="true"]')?.focus({ preventScroll: true });
    },
    { capture: true, signal },
  );
  add.addEventListener(
    'click',
    () => {
      if (closing || !options.canAct()) return;
      try {
        workspace.add(Number(size.value));
        message.textContent = '';
        tabs.querySelector<HTMLElement>('[aria-selected="true"]')?.focus({ preventScroll: true });
      } catch (error) {
        setUiText(message, error instanceof Error ? error.message : 'Could not create board.');
      }
    },
    { signal },
  );
  const unsubscribe = workspace.subscribe(render);
  window.addEventListener(
    'resize',
    () =>
      tabs.setAttribute(
        'aria-orientation',
        matchMedia('(min-width: 1001px)').matches ? 'vertical' : 'horizontal',
      ),
    { signal },
  );
  const disposeLanguage = subscribeUiLanguage(() => {
    caption.textContent = translateUi('Board size');
    render();
  });
  return () => {
    abort.abort();
    unsubscribe();
    disposeLanguage();
    bar.remove();
  };
}
