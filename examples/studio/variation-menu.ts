import type { ControllerState, RecordController } from '@0disoft/banora';
import { setUiText, subscribeUiLanguage, translateUi } from '../ui-language.js';

/** Delete the pointed row without navigating away from the selected branch. */
export function mountVariationMenu(
  tree: HTMLElement,
  controller: Pick<RecordController, 'getState' | 'inspectNode' | 'subscribe'>,
  remove: (id: string) => void,
): () => void {
  const panel = document.createElement('div');
  panel.id = 'variation-menu';
  panel.className = 'variation-menu';
  panel.popover = 'auto';
  panel.setAttribute('role', 'menu');
  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'button';
  action.setAttribute('role', 'menuitem');
  setUiText(action, 'Delete variation');
  panel.append(action);
  document.body.append(panel);
  const updateLanguage = () => panel.setAttribute('aria-label', translateUi('Variation actions'));
  updateLanguage();
  const disposeLanguage = subscribeUiLanguage(updateLanguage);
  const abort = new AbortController();
  const { signal } = abort;
  let target: { id: string; opener: HTMLButtonElement; state: ControllerState } | undefined;
  const hide = (restoreFocus = false) => {
    const opener = target?.opener;
    target = undefined;
    if (panel.matches(':popover-open')) panel.hidePopover();
    if (restoreFocus && opener?.isConnected) opener.focus({ preventScroll: true });
  };
  const open = (event: MouseEvent | KeyboardEvent) => {
    const opener = (event.target as Element).closest<HTMLButtonElement>('button[data-node]');
    if (!opener || !tree.contains(opener)) return;
    const id = opener.dataset.node!;
    if ((controller.inspectNode(id)?.path.length ?? 0) <= 1) return;
    event.preventDefault();
    hide();
    target = { id, opener, state: controller.getState() };
    const bounds = opener.getBoundingClientRect();
    const x = event instanceof MouseEvent ? event.clientX : bounds.left + 20;
    const y = event instanceof MouseEvent ? event.clientY : bounds.bottom;
    panel.showPopover();
    panel.style.left = `${Math.max(8, Math.min(x, innerWidth - panel.offsetWidth - 8))}px`;
    panel.style.top = `${Math.max(8, Math.min(y, innerHeight - panel.offsetHeight - 8))}px`;
    action.focus({ preventScroll: true });
  };
  tree.addEventListener('contextmenu', open, { signal });
  tree.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) open(event);
    },
    { signal },
  );
  action.addEventListener(
    'click',
    () => {
      const selected = panel.matches(':popover-open') ? target : undefined;
      hide();
      const current = controller.getState();
      if (
        selected &&
        selected.state.record === current.record &&
        selected.state.recordGeneration === current.recordGeneration &&
        selected.state.gameIndex === current.gameIndex
      )
        remove(selected.id);
    },
    { signal },
  );
  panel.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        hide(true);
      } else if (event.key === 'Tab') hide();
    },
    { signal },
  );
  const unsubscribe = controller.subscribe(() => hide());
  tree.addEventListener('scroll', () => hide(), { signal });
  window.addEventListener('resize', () => hide(), { signal });
  return () => {
    hide();
    abort.abort();
    unsubscribe();
    disposeLanguage();
    panel.remove();
  };
}
