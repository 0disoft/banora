import { createUiMessages, formatUiMessage } from './locale.js';
import type { LocaleOptions } from './locale.js';
import { createRecordPlayback } from './playback.js';
import type { PlaybackOptions, RecordPlayback } from './playback.js';
import type { RecordController, CommandResult } from './controller.js';

export interface PlaybackControlsOptions extends PlaybackOptions, LocaleOptions {
  readonly controller: RecordController;
  /** Keyboard/input boundary. Use one scope per record; defaults to the container. */
  readonly scope?: HTMLElement;
  readonly onAction?: (result: CommandResult) => void;
}
export interface PlaybackControls {
  readonly playback: RecordPlayback;
  update(options: LocaleOptions): void;
  dispose(): void;
}
export function mountPlaybackControls(
  container: HTMLElement,
  options: PlaybackControlsOptions,
): PlaybackControls {
  let ui = createUiMessages(options);
  const playback = createRecordPlayback(options.controller, options);
  const document = container.ownerDocument,
    scope = options.scope ?? container;
  const abort = new AbortController(),
    root = document.createElement('div');
  root.className = 'banora-record-playback';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Record playback');
  root.style.cssText =
    'display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;flex-basis:100%;margin-block:10px;font:inherit';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'button';
  const label = document.createElement('label');
  label.textContent = 'Interval ';
  const interval = document.createElement('select');
  interval.setAttribute('aria-label', 'Playback interval');
  for (let milliseconds = 500; milliseconds <= 5000; milliseconds += 500) {
    const option = document.createElement('option');
    option.value = String(milliseconds);
    option.textContent = `${milliseconds / 1000} s`;
    interval.append(option);
  }
  label.append(interval);
  const hint = document.createElement('span');
  hint.textContent = '← / → move through the record · Alt + ← / → while the board is focused';
  hint.style.cssText = 'flex-basis:100%;text-align:center;font-size:12px;opacity:.75';
  root.append(toggle, label, hint);
  container.append(root);
  function render() {
    const state = playback.getState();
    root.lang = locale;
    root.setAttribute('aria-label', ui.playback);
    label.firstChild!.textContent = ui.interval;
    interval.setAttribute('aria-label', ui.playbackInterval);
    hint.textContent = ui.playbackHint;
    for (const option of interval.options)
      option.textContent = formatUiMessage(ui.seconds, { number: Number(option.value) / 1000 });
    toggle.textContent = state.playing ? ui.pause : ui.play;
    toggle.setAttribute('aria-label', state.playing ? ui.pausePlayback : ui.playRecord);
    toggle.setAttribute('aria-pressed', String(state.playing));
    toggle.disabled = !state.canPlay;
    if (![...interval.options].some((option) => Number(option.value) === state.intervalMs)) {
      const custom = document.createElement('option');
      custom.value = String(state.intervalMs);
      custom.textContent = formatUiMessage(ui.seconds, { number: state.intervalMs / 1000 });
      interval.append(custom);
    }
    interval.value = String(state.intervalMs);
  }
  let locale = options.locale ?? 'en';
  const unsubscribe = playback.subscribe(render);
  toggle.addEventListener(
    'click',
    () => (playback.getState().playing ? playback.pause() : playback.play()),
    { signal: abort.signal },
  );
  interval.addEventListener('change', () => playback.setInterval(Number(interval.value)), {
    signal: abort.signal,
  });
  const editable =
    'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],[role="slider"],[role="spinbutton"]';
  scope.addEventListener(
    'keydown',
    (event) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        !['ArrowLeft', 'ArrowRight'].includes(event.key)
      )
        return;
      const target = event.target as Element | null;
      if (
        !target ||
        target.closest(editable) ||
        target.closest('dialog,[role="dialog"]') ||
        document.querySelector('dialog[open]')
      )
        return;
      if (target.closest('svg[role="application"]') && !event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      playback.pause();
      const state = options.controller.getState();
      let result: CommandResult | undefined;
      if (event.key === 'ArrowLeft' && state.path.length > 1)
        result = options.controller.previous();
      else if (event.key === 'ArrowRight' && state.node.children.length)
        result = options.controller.next();
      if (result) options.onAction?.(result);
    },
    { capture: true, signal: abort.signal },
  );
  scope.addEventListener(
    'pointerdown',
    (event) => {
      if (!root.contains(event.target as Node)) playback.pause();
    },
    { capture: true, signal: abort.signal },
  );
  scope.addEventListener(
    'focusin',
    (event) => {
      const target = event.target as Element;
      if (!root.contains(target) && target.closest(editable)) playback.pause();
    },
    { signal: abort.signal },
  );
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) playback.pause();
    },
    { signal: abort.signal },
  );
  document.defaultView?.addEventListener('pagehide', () => playback.pause(), {
    signal: abort.signal,
  });
  let disposed = false;
  return Object.freeze({
    playback,
    update(next: LocaleOptions) {
      if (disposed) throw new Error('Playback controls are disposed');
      const nextUi = createUiMessages(next);
      ui = nextUi;
      locale = next.locale ?? 'en';
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      abort.abort();
      unsubscribe();
      playback.dispose();
      root.remove();
    },
  });
}
