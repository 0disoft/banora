import { setUiText, subscribeUiLanguage } from '../ui-language.js';

/** Transient feedback is separate from the persistent unsaved-record indicator. */
export function mountStatusNotice(element: HTMLElement) {
  let timer: number | undefined;
  let disposed = false;
  let message: string | (() => string) = '';
  const render = () => {
    if (typeof message === 'function') {
      delete element.dataset.uiText;
      element.textContent = message();
    } else setUiText(element, message);
  };
  const unsubscribe = subscribeUiLanguage(render);
  const clear = () => {
    window.clearTimeout(timer);
    timer = undefined;
    // Clear the source binding too, so changing language cannot revive old feedback.
    message = '';
    render();
  };
  return {
    show(next: string | (() => string)) {
      if (disposed) return;
      clear();
      message = next;
      render();
      if (element.textContent) timer = window.setTimeout(clear, 3000);
    },
    clear,
    dispose() {
      clear();
      disposed = true;
      unsubscribe();
    },
  };
}
