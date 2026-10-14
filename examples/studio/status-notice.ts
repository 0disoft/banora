import { setUiText } from '../ui-language.js';

/** Transient feedback is separate from the persistent unsaved-record indicator. */
export function mountStatusNotice(element: HTMLElement) {
  let timer: number | undefined;
  let disposed = false;
  const clear = () => {
    window.clearTimeout(timer);
    timer = undefined;
    // Clear the source binding too, so changing language cannot revive old feedback.
    setUiText(element, '');
  };
  return {
    show(message: string) {
      if (disposed) return;
      clear();
      setUiText(element, message);
      if (message) timer = window.setTimeout(clear, 3000);
    },
    clear,
    dispose() {
      clear();
      disposed = true;
    },
  };
}
