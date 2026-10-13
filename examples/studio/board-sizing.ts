import { subscribeUiLanguage, translateUi } from '../ui-language.js';

/** Consumer-only display sizing; the SDK owns the board geometry and pointer mapping. */
export function mountBoardSizing(board: HTMLElement, select: HTMLSelectElement): () => void {
  const panel = document.querySelector<HTMLElement>('.board-panel')!;
  const rail = document.querySelector('.workspace-tabs')!;
  const frame = document.createElement('div');
  frame.className = 'board-frame';
  board.before(frame);
  frame.append(board);
  const sizing = document.createElement('div');
  sizing.className = 'board-size-control';
  const label = select.closest('label')!;
  const originalParent = label.parentElement!;
  sizing.append(label);
  const abort = new AbortController();
  const { signal } = abort;
  let custom: number | undefined;
  let drag:
    | {
        id: number;
        x: number;
        y: number;
        width: number;
        corner: string;
        handle: HTMLElement;
        original: number | undefined;
      }
    | undefined;
  const customOption = new Option(translateUi('Custom'), 'custom');
  select.add(customOption);
  const handles: HTMLButtonElement[] = [];
  function limits() {
    const style = getComputedStyle(panel);
    const max = Math.max(
      1,
      panel.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
    );
    const min = Math.min(260, max);
    const toolbar = document.querySelector<HTMLElement>('.board-toolbar')!;
    const navigation = document.querySelector<HTMLElement>('.navigation')!;
    const navStyle = getComputedStyle(navigation);
    const toolbarStyle = getComputedStyle(toolbar);
    const overhead =
      document.querySelector('header')!.getBoundingClientRect().height +
      toolbar.getBoundingClientRect().height +
      parseFloat(toolbarStyle.marginBottom) +
      navigation.getBoundingClientRect().height +
      parseFloat(navStyle.marginTop) +
      parseFloat(style.paddingTop) +
      parseFloat(style.paddingBottom) +
      (innerWidth <= 1000 ? rail.getBoundingClientRect().height : 0) +
      8;
    const available = innerWidth > 700 ? Math.max(min, innerHeight - overhead) : max;
    return { min, max, base: Math.min(789, max, available) };
  }
  function render() {
    const { min, max, base } = limits();
    const scale = select.value === 'small' ? 0.85 : select.value === 'large' ? 1.15 : 1;
    const width = Math.round(Math.max(min, Math.min(max, custom ?? base * scale)));
    frame.style.width = `${width}px`;
    board.dataset.displaySize = custom === undefined ? select.value : 'custom';
    for (const handle of handles) {
      handle.setAttribute('aria-valuemin', String(Math.round(min)));
      handle.setAttribute('aria-valuemax', String(Math.round(max)));
      handle.setAttribute('aria-valuenow', String(width));
      handle.setAttribute('aria-label', translateUi('Resize board'));
    }
  }
  rail.querySelector('#board-tabs')!.before(sizing);
  function finish(cancel: boolean) {
    if (!drag) return;
    const current = drag;
    drag = undefined;
    if (cancel) {
      custom = current.original;
      if (custom === undefined) select.value = frame.dataset.preset ?? 'default';
      render();
    }
    frame.classList.remove('resizing');
    if (current.handle.hasPointerCapture(current.id))
      current.handle.releasePointerCapture(current.id);
  }
  for (const corner of ['n', 'e', 's', 'w', 'nw', 'ne', 'sw', 'se']) {
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = `board-resize ${corner}`;
    handle.dataset.resizeCorner = corner;
    handle.setAttribute('role', 'slider');
    handle.setAttribute('aria-orientation', 'horizontal');
    handle.tabIndex = corner === 'se' ? 0 : -1;
    handles.push(handle);
    frame.append(handle);
    handle.addEventListener(
      'pointerdown',
      (event) => {
        if (!event.isPrimary || event.button !== 0 || drag) return;
        event.preventDefault();
        event.stopPropagation();
        handle.focus({ preventScroll: true });
        frame.dataset.preset = select.value;
        drag = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          width: frame.getBoundingClientRect().width,
          corner,
          handle,
          original: custom,
        };
        handle.setPointerCapture(event.pointerId);
        frame.classList.add('resizing');
      },
      { signal },
    );
    handle.addEventListener(
      'pointermove',
      (event) => {
        if (!drag || event.pointerId !== drag.id) return;
        const dx = (event.clientX - drag.x) * (corner.endsWith('w') ? -1 : 1);
        const dy = (event.clientY - drag.y) * (corner.startsWith('n') ? -1 : 1);
        const delta =
          corner === 'e' || corner === 'w'
            ? dx
            : corner === 'n' || corner === 's'
              ? dy
              : Math.abs(dx) > Math.abs(dy)
                ? dx
                : dy;
        if (delta === 0 && custom === drag.original) return;
        const { min, max } = limits();
        custom = Math.max(min, Math.min(max, drag.width + delta));
        select.value = 'custom';
        render();
      },
      { signal },
    );
    handle.addEventListener(
      'pointerup',
      (event) => {
        if (event.pointerId === drag?.id) finish(false);
      },
      { signal },
    );
    for (const name of ['pointercancel', 'lostpointercapture'])
      handle.addEventListener(name, () => finish(true), { signal });
    handle.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape' && drag) {
          event.preventDefault();
          finish(true);
          return;
        }
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        const { min, max } = limits();
        custom = Math.max(
          min,
          Math.min(
            max,
            frame.getBoundingClientRect().width +
              (['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : -1) * (event.shiftKey ? 50 : 10),
          ),
        );
        select.value = 'custom';
        render();
      },
      { signal },
    );
  }
  select.addEventListener(
    'change',
    () => {
      // Choosing Custom freezes the current width; presets return to responsive sizing.
      custom = select.value === 'custom' ? frame.getBoundingClientRect().width : undefined;
      render();
    },
    { signal },
  );
  window.addEventListener('resize', render, { signal });
  const observer = new ResizeObserver(render);
  observer.observe(panel);
  observer.observe(document.querySelector('.navigation')!);
  const disposeLanguage = subscribeUiLanguage(() => {
    customOption.textContent = translateUi('Custom');
    render();
  });
  render();
  return () => {
    finish(true);
    abort.abort();
    observer.disconnect();
    disposeLanguage();
    customOption.remove();
    originalParent.append(label);
    sizing.remove();
    frame.replaceWith(board);
  };
}
