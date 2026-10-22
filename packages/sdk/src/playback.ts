import type { RecordController, ControllerState } from './controller.js';

export interface PlaybackScheduler {
  /** Schedule once, asynchronously; return an idempotent cancellation function. */
  after(delayMs: number, task: () => void): () => void;
}
export interface PlaybackOptions {
  readonly intervalMs?: number;
  readonly scheduler?: PlaybackScheduler;
  /** Aborting pauses playback and prevents further play; disposal remains explicit. */
  readonly signal?: AbortSignal;
}
export interface PlaybackState {
  readonly playing: boolean;
  readonly intervalMs: number;
  readonly canPlay: boolean;
}
export interface RecordPlayback {
  getState(): PlaybackState;
  subscribe(listener: (state: PlaybackState) => void): () => void;
  play(): void;
  pause(): void;
  setInterval(intervalMs: number): void;
  dispose(): void;
}
export function normalizePlaybackInterval(value = 1000): number {
  if (!Number.isInteger(value) || value < 500 || value > 5000)
    throw new RangeError('Playback interval must be an integer from 500 through 5000 milliseconds');
  return value;
}
/** Replay recorded nodes, never create moves. External edits/navigation cancel the timer. */
export function createRecordPlayback(
  controller: RecordController,
  options: PlaybackOptions = {},
): RecordPlayback {
  let intervalMs = normalizePlaybackInterval(options.intervalMs),
    playing = false,
    disposed = false;
  let selected = controller.getState();
  let expected: ControllerState['node'] | undefined;
  let timer: (() => void) | undefined;
  const { signal } = options;
  const scheduler = options.scheduler ?? {
    after(delayMs: number, task: () => void) {
      const handle = setTimeout(task, delayMs);
      return () => clearTimeout(handle);
    },
  };
  let snapshot: PlaybackState;
  const listeners = new Set<(state: PlaybackState) => void>();
  const active = () => {
    if (disposed) throw new Error('Record playback is disposed');
  };
  const cancel = () => {
    timer?.();
    timer = undefined;
  };
  const publish = () => {
    snapshot = Object.freeze({ playing, intervalMs, canPlay: selected.node.children.length > 0 });
    for (const listener of [...listeners]) {
      if (!listeners.has(listener)) continue;
      try {
        listener(snapshot);
      } catch {
        console.error('Banora playback listener failed');
      }
    }
  };
  const pause = () => {
    cancel();
    expected = undefined;
    if (!playing) return;
    playing = false;
    publish();
  };
  const schedule = () => {
    cancel();
    if (!playing || disposed || signal?.aborted) return;
    let cancelled = false;
    const stop = scheduler.after(intervalMs, () => {
      if (cancelled || !playing || disposed || signal?.aborted) return;
      timer = undefined;
      expected = selected.node.children[0];
      try {
        if (!controller.next().ok) pause();
      } catch {
        pause();
      } finally {
        expected = undefined;
      }
      schedule();
    });
    timer = () => {
      cancelled = true;
      stop();
    };
  };
  publish();
  const unsubscribe = controller.subscribe((state) => {
    const changed =
      selected.record !== state.record ||
      selected.node.id !== state.node.id ||
      selected.recordGeneration !== state.recordGeneration;
    const ownStep =
      expected === state.node &&
      selected.record === state.record &&
      selected.recordGeneration === state.recordGeneration;
    if (ownStep) expected = undefined;
    selected = state;
    if (playing && ((changed && !ownStep) || !state.node.children.length)) pause();
    else publish();
  });
  signal?.addEventListener('abort', pause, { once: true });
  return Object.freeze({
    getState() {
      active();
      return snapshot;
    },
    subscribe(listener: (state: PlaybackState) => void) {
      active();
      listeners.add(listener);
      try {
        listener(snapshot);
      } catch (error) {
        listeners.delete(listener);
        throw error;
      }
      return () => {
        listeners.delete(listener);
      };
    },
    play() {
      active();
      if (playing || signal?.aborted || !selected.node.children.length) return;
      playing = true;
      publish();
      schedule();
    },
    pause() {
      active();
      pause();
    },
    setInterval(value: number) {
      active();
      intervalMs = normalizePlaybackInterval(value);
      publish();
      schedule();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      playing = false;
      cancel();
      signal?.removeEventListener('abort', pause);
      unsubscribe();
      listeners.clear();
    },
  });
}
