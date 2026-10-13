import { subscribeUiLanguage, translateUi } from '../ui-language.js';

/** Native whole-page fullscreen, entered only from an explicit user gesture. */
export function mountFullscreen(button: HTMLButtonElement, onUnavailable: () => void): () => void {
  const abort = new AbortController();
  let pending = false;
  let disposed = false;
  function render() {
    const available =
      document.fullscreenEnabled &&
      typeof document.documentElement.requestFullscreen === 'function';
    const active = Boolean(document.fullscreenElement);
    button.disabled = !available || pending;
    button.setAttribute('aria-pressed', String(active));
    const label = translateUi(
      !available ? 'Fullscreen unavailable' : active ? 'Exit fullscreen' : 'Enter fullscreen',
    );
    button.setAttribute('aria-label', label);
    button.title = label;
  }
  button.addEventListener(
    'click',
    async () => {
      if (pending || disposed) return;
      pending = true;
      render();
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      } catch {
        if (!disposed) onUnavailable();
      } finally {
        pending = false;
        if (!disposed) render();
      }
    },
    { signal: abort.signal },
  );
  document.addEventListener('fullscreenchange', render, { signal: abort.signal });
  const disposeLanguage = subscribeUiLanguage(render);
  render();
  return () => {
    disposed = true;
    abort.abort();
    disposeLanguage();
  };
}
