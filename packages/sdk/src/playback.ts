import type { RecordController, ControllerState } from './controller.js';

export interface PlaybackOptions {
  readonly intervalMs?: number;
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
  let timer: ReturnType<typeof setTimeout> | undefined;
  let snapshot: PlaybackState;
  const listeners = new Set<(state: PlaybackState) => void>();
  const active = () => {
    if (disposed) throw new Error('Record playback is disposed');
  };
  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const publish = () => {
    snapshot = Object.freeze({ playing, intervalMs, canPlay: selected.node.children.length > 0 });
    for (const listener of [...listeners]) listener(snapshot);
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
    if (!playing || disposed) return;
    timer = setTimeout(() => {
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
    }, intervalMs);
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
  return Object.freeze({
    getState() {
      active();
      return snapshot;
    },
    subscribe(listener: (state: PlaybackState) => void) {
      active();
      listeners.add(listener);
      listener(snapshot);
      return () => {
        listeners.delete(listener);
      };
    },
    play() {
      active();
      if (playing || !selected.node.children.length) return;
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
      unsubscribe();
      listeners.clear();
    },
  });
}
