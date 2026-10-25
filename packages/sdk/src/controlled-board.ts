import type { BoardOptions } from './board-types.js';
import type { BoardSnapshot, BoardSnapshotValue, BoardIntent, BoardLabels } from './board-state.js';
import { createBoardSnapshot } from './board-state.js';
import { snapshotFrame } from './board-frame.js';
import { mountBoardSurface } from './board-surface.js';
import { createStroke } from './annotations.js';
import { boardNotices, boardFailureLabelKeys } from './board-notices.js';
import type { DiagramOptions } from './diagram-export.js';

export type ControlledBoardPresentation = Pick<
  BoardOptions,
  | 'readOnly'
  | 'theme'
  | 'coordinates'
  | 'moveNumbers'
  | 'crop'
  | 'transform'
  | 'drawing'
  | 'touch'
  | 'stoneTextures'
>;
export interface ControlledBoardOptions extends ControlledBoardPresentation {
  readonly state: BoardSnapshot;
  readonly onIntent?: (intent: BoardIntent) => void;
  /** Forward native/keyboard menu requests as intentions instead of showing the browser menu. */
  readonly contextMenu?: boolean;
  readonly labels?: BoardLabels;
}
export interface ControlledBoardView {
  getSnapshot(): BoardSnapshotValue;
  /** Merge presentation changes; supplied state is a complete replacement, not a patch. */
  update(options: Partial<ControlledBoardOptions>): void;
  announce(message: string): void;
  exportSvg(options?: DiagramOptions): string;
  exportPng(options?: DiagramOptions): Promise<Blob>;
  dispose(): void;
}

function configCopy(config: ControlledBoardOptions): ControlledBoardOptions {
  for (const key of ['readOnly', 'coordinates', 'moveNumbers', 'contextMenu'] as const)
    if (config[key] !== undefined && typeof config[key] !== 'boolean')
      throw new TypeError(`${key} must be boolean`);
  if (config.theme !== undefined && config.theme !== 'wood' && config.theme !== 'flat')
    throw new TypeError('Invalid board theme');
  if (config.onIntent !== undefined && typeof config.onIntent !== 'function')
    throw new TypeError('onIntent must be a function');
  const labels: Record<string, string> = {};
  if (config.labels !== undefined) {
    if (!config.labels || typeof config.labels !== 'object' || Array.isArray(config.labels))
      throw new TypeError('Labels must be an object');
    for (const key of [
      'board',
      'point',
      'state',
      'confirm',
      'cancel',
      'selected',
      'placement',
      'black',
      'white',
      'empty',
      ...Object.keys(boardNotices),
      ...Object.values(boardFailureLabelKeys),
      'failureUnknown',
    ] as (keyof BoardLabels)[]) {
      const value = config.labels[key];
      if (value === undefined) continue;
      if (typeof value !== 'string' || value.length > 1024)
        throw new TypeError('Labels must be bounded text');
      labels[key] = value;
    }
  }
  return {
    ...config,
    crop: config.crop ? Object.freeze({ ...config.crop }) : config.crop,
    labels: Object.freeze(labels),
  };
}

/** Display host state and emit immutable intentions. This function never creates a record/controller. */
export function mountControlledBoard(
  container: HTMLElement,
  initial: ControlledBoardOptions,
): ControlledBoardView {
  let state = createBoardSnapshot(initial.state),
    frame = snapshotFrame(state);
  // Keep the owned snapshot in configuration, not the caller's source graph.
  let config = configCopy({ ...initial, state }),
    disposed = false;
  type Payload = BoardIntent extends infer T
    ? T extends BoardIntent
      ? Omit<T, 'stateKey'>
      : never
    : never;
  const emit = (intent: Payload) =>
    config.onIntent?.(Object.freeze({ ...intent, stateKey: state.key }) as BoardIntent);
  const surfaceOptions = (value: ControlledBoardOptions) => ({
    readOnly: !!value.readOnly || !value.onIntent,
    theme: value.theme,
    coordinates: value.coordinates,
    moveNumbers: value.moveNumbers,
    crop: value.crop,
    transform: value.transform,
    drawing: value.drawing,
    touch: value.touch,
    stoneTextures: value.stoneTextures,
    labels: value.labels,
    onContextMenu:
      value.contextMenu && value.onIntent
        ? (point: { x: number; y: number }, screen: { x: number; y: number }) =>
            emit({ type: 'context-menu', point, clientX: screen.x, clientY: screen.y })
        : undefined,
  });
  const surface = mountBoardSurface(container, surfaceOptions(config), {
    getState: () => frame,
    inspectNode: () => null,
    subscribe: (listener) => {
      listener(frame);
      return () => {};
    },
    play: (point) => {
      emit({ type: 'point', point: Object.freeze({ ...point }) });
      return { ok: true };
    },
    addStroke: (points, style) => {
      const stroke = createStroke('intent', points, state, style);
      emit({ type: 'stroke', points: stroke.points, color: stroke.color, width: stroke.width });
      return { ok: true };
    },
    previous: () => emit({ type: 'navigate', direction: 'previous' }),
    next: () => emit({ type: 'navigate', direction: 'next' }),
    dispose: () => {},
  });
  const active = () => {
    if (disposed) throw new Error('Controlled board is disposed');
  };
  return Object.freeze({
    getSnapshot() {
      active();
      return state;
    },
    update(next: Partial<ControlledBoardOptions>) {
      active();
      const previous = { state, frame, config };
      const candidate = Object.hasOwn(next, 'state') ? createBoardSnapshot(next.state!) : state;
      let nextConfig = configCopy({ ...config, ...next, state: candidate });
      // Match record boards: a resized host position can invalidate an old presentation crop.
      if (
        !Object.hasOwn(next, 'crop') &&
        nextConfig.crop &&
        (nextConfig.crop.x + nextConfig.crop.width > candidate.width ||
          nextConfig.crop.y + nextConfig.crop.height > candidate.height)
      )
        nextConfig = { ...nextConfig, crop: null };
      state = candidate;
      frame = candidate === previous.state ? previous.frame : snapshotFrame(candidate);
      config = nextConfig;
      try {
        surface.update(surfaceOptions(nextConfig));
      } catch (error) {
        state = previous.state;
        frame = previous.frame;
        config = previous.config;
        throw error;
      }
    },
    announce: surface.announce,
    exportSvg: surface.exportSvg,
    exportPng: surface.exportPng,
    dispose() {
      if (disposed) return;
      disposed = true;
      // A retained handle must not retain the host callback or last snapshot/frame.
      state = createBoardSnapshot({
        key: 'disposed',
        width: 2,
        height: 2,
        stones: [null, null, null, null],
      });
      frame = snapshotFrame(state);
      config = { state };
      surface.dispose();
    },
  });
}
