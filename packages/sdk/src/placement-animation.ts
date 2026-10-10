import type { BoardOptions } from './board.js';
import type { ControllerState } from './controller.js';
import type { Point } from './core.js';
import { pointFromSgf } from './sgf.js';

export interface PlacementAnimationOptions {
  readonly durationMs?: number;
}
export function normalizePlacementAnimation(
  input?: boolean | PlacementAnimationOptions | null,
): Readonly<Required<PlacementAnimationOptions>> | null {
  if (input == null || input === false) return null;
  const options = input === true ? {} : input;
  if (typeof options !== 'object' || Array.isArray(options))
    throw new TypeError('Placement animation must be a boolean, options or null');
  const durationMs = options.durationMs === undefined ? 160 : options.durationMs;
  if (!Number.isInteger(durationMs) || durationMs < 1 || durationMs > 1000)
    throw new RangeError('Placement duration must be 1 through 1000 ms');
  return Object.freeze({ durationMs });
}

/** One adjacent recorded/new move onto an empty point, allowing capture removals. */
export function placementTarget(
  before: ControllerState,
  after: ControllerState,
): Readonly<Point> | null {
  const a = before.position,
    b = after.position;
  if (
    before.recordGeneration !== after.recordGeneration ||
    before.gameIndex !== after.gameIndex ||
    a.width !== b.width ||
    a.height !== b.height ||
    after.path.length !== before.path.length + 1 ||
    before.path.some((id, index) => after.path[index] !== id) ||
    b.moveNumber !== a.moveNumber + 1
  )
    return null;
  const color = after.node.properties.B ? 'black' : 'white',
    value = after.node.properties.B?.[0] ?? after.node.properties.W?.[0];
  if (!value || (value === 'tt' && b.width <= 19 && b.height <= 19)) return null;
  let point: Point;
  try {
    point = pointFromSgf(value, b.width, b.height);
  } catch {
    return null;
  }
  const index = point.y * b.width + point.x;
  if (a.board[index] !== null || b.board[index] !== color) return null;
  for (let i = 0; i < b.board.length; i++)
    if (i !== index && a.board[i] !== b.board[i] && b.board[i] !== null) return null;
  return Object.freeze(point);
}
function sameDisplay(before: ControllerState, after: ControllerState): boolean {
  if (before === after) return true;
  if (
    before.recordGeneration !== after.recordGeneration ||
    before.node.id !== after.node.id ||
    before.gameIndex !== after.gameIndex
  )
    return false;
  const a = before.position,
    b = after.position;
  return (
    a === b ||
    (a.width === b.width &&
      a.height === b.height &&
      a.moveNumber === b.moveNumber &&
      a.toPlay === b.toPlay &&
      a.captures.black === b.captures.black &&
      a.captures.white === b.captures.white &&
      a.board.every((color, index) => b.board[index] === color))
  );
}
function contextFor(options: BoardOptions): readonly unknown[] {
  return [
    !!options.readOnly,
    options.theme ?? 'wood',
    options.coordinates !== false,
    !!options.moveNumbers,
    options.nodeId ?? null,
    options.compareTo ?? null,
    options.referenceGeneration,
    options.transform?.rotation,
    options.transform?.flipX,
    options.crop?.x,
    options.crop?.y,
    options.crop?.width,
    options.crop?.height,
    options.drawing?.color,
    options.drawing?.width,
    options.touch?.mode,
    options.touch?.magnifier,
    options.stoneTextures?.black?.dataUrl,
    options.stoneTextures?.white?.dataUrl,
  ];
}

/** At most one view-owned transform effect, with no timers or frame loop. */
export function mountPlacementAnimation(svg: SVGSVGElement, signal: AbortSignal) {
  const window = svg.ownerDocument.defaultView;
  const media = window?.matchMedia?.('(prefers-reduced-motion: reduce)');
  let previous: ControllerState | undefined,
    context: readonly unknown[] | undefined,
    duration: number | undefined;
  let active:
    | {
        point: Readonly<Point>;
        started: number;
        duration: number;
        element?: SVGElement;
        effect?: Animation;
      }
    | undefined;
  const now = () => window?.performance.now() ?? 0;
  function detach(): void {
    if (active?.effect) {
      active.effect.onfinish = active.effect.oncancel = null;
      active.effect.cancel();
    }
    active?.element?.removeAttribute('data-placement-animation');
    if (active) {
      active.effect = undefined;
      active.element = undefined;
    }
  }
  function cancel(): void {
    detach();
    active = undefined;
  }
  media?.addEventListener(
    'change',
    () => {
      if (media.matches) cancel();
    },
    { signal },
  );
  signal.addEventListener('abort', cancel, { once: true });
  return {
    cancel,
    sync(
      state: ControllerState,
      options: BoardOptions,
      config: Readonly<Required<PlacementAnimationOptions>> | null,
    ): void {
      const nextContext = contextFor(options),
        changed =
          !context ||
          context.some((value, index) => value !== nextContext[index]) ||
          duration !== config?.durationMs;
      const transition = previous && !sameDisplay(previous, state);
      if (
        changed ||
        transition ||
        !config ||
        options.nodeId != null ||
        media?.matches ||
        signal.aborted
      ) {
        cancel();
        if (
          !changed &&
          transition &&
          config &&
          options.nodeId == null &&
          !media?.matches &&
          !signal.aborted
        ) {
          const point = placementTarget(previous!, state);
          if (point) active = { point, started: now(), duration: config.durationMs };
        }
      }
      previous = state;
      context = nextContext;
      duration = config?.durationMs;
      if (!active) return;
      const elapsed = now() - active.started;
      if (elapsed >= active.duration) {
        cancel();
        return;
      }
      detach();
      const point = active.point,
        element = svg.querySelector<SVGElement>(`[data-stone="${point.x},${point.y}"]`);
      if (!element || typeof element.animate !== 'function') {
        cancel();
        return;
      }
      try {
        const effect = element.animate(
          [
            {
              transform: 'translateY(-0.12px) scale(0.65)',
              transformBox: 'fill-box',
              transformOrigin: '50% 50%',
            },
            { transform: 'none', transformBox: 'fill-box', transformOrigin: '50% 50%' },
          ],
          { duration: active.duration, easing: 'cubic-bezier(0.2,0.8,0.2,1)', fill: 'none' },
        );
        active.element = element;
        active.effect = effect;
        element.setAttribute('data-placement-animation', '');
        effect.currentTime = elapsed;
        const finish = () => {
          if (active?.effect === effect) cancel();
        };
        effect.onfinish = effect.oncancel = finish;
      } catch {
        cancel();
      }
    },
  };
}
