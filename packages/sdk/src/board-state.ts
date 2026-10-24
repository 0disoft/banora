import type { Color, Point } from './core.js';
import type { Marker, Connection } from './controller.js';
import { createStroke, strokeLimits } from './annotations.js';
import type { Stroke } from './annotations.js';

export interface BoardNumber {
  readonly point: Point;
  readonly value: number;
}
export interface BoardLabels {
  readonly board?: string;
  readonly point?: string;
  readonly state?: string;
  readonly confirm?: string;
  readonly cancel?: string;
  readonly selected?: string;
  readonly placement?: string;
  readonly black?: string;
  readonly white?: string;
  readonly empty?: string;
}
/** Bounded presentation primitives; labels are text, never HTML or SVG source. */
export interface BoardOverlay {
  readonly kind: 'heatmap' | 'badge' | 'ring';
  readonly point: Point;
  readonly color: string;
  readonly opacity?: number;
  readonly label?: string;
  readonly textColor?: string;
  readonly ariaLabel?: string;
}
/** Host-owned display data. No rules, record tree, transport or framework is required. */
export interface BoardSnapshot {
  /** Opaque host document/node/revision identity. Change it when the interaction target changes. */
  readonly key: string;
  readonly width: number;
  readonly height: number;
  /** Top-left, row-major cells; null means empty. */
  readonly stones: readonly (Color | null)[];
  readonly toPlay?: Color;
  readonly moveNumber?: number;
  readonly captures?: Readonly<Record<Color, number>>;
  readonly lastMove?: Point | null;
  readonly numbers?: readonly BoardNumber[];
  readonly markers?: readonly Marker[];
  readonly connections?: readonly Connection[];
  readonly strokes?: readonly Stroke[];
  /** null/omitted shows every point; [] hides every point. */
  readonly visiblePoints?: readonly Point[] | null;
  readonly dimPoints?: readonly Point[];
  readonly overlays?: readonly BoardOverlay[];
}
export interface BoardSnapshotValue extends Required<BoardSnapshot> {}
export type BoardIntent = Readonly<{ stateKey: string }> &
  (
    | Readonly<{ type: 'point'; point: Point }>
    | Readonly<{ type: 'navigate'; direction: 'previous' | 'next' }>
    | Readonly<{ type: 'stroke'; points: readonly Point[]; color: string; width: number }>
    | Readonly<{ type: 'context-menu'; point: Point; clientX: number; clientY: number }>
  );

const integer = (value: unknown, name: string, max = Number.MAX_SAFE_INTEGER): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > max)
    throw new RangeError(`${name} must be a bounded nonnegative integer`);
  return value;
};
const text = (value: unknown, name: string, max: number): string => {
  if (typeof value !== 'string' || value.length > max)
    throw new TypeError(`${name} must be text of at most ${max} characters`);
  return value;
};
function list<T>(value: readonly T[] | undefined, name: string, max: number): readonly T[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max)
    throw new RangeError(`${name} exceeds its bound`);
  return Array.from(value);
}
const hex = (value: unknown): string => {
  if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value))
    throw new TypeError('Overlay colors must be six-digit hex colors');
  return value.toLowerCase();
};

/** Validate and own a deeply frozen copy before committing any UI update. Safe to import without DOM. */
export function createBoardSnapshot(input: BoardSnapshot): BoardSnapshotValue {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new TypeError('Board snapshot must be an object');
  const key = text(input.key, 'State key', 512);
  if (!key) throw new TypeError('State key must not be empty');
  const width = integer(input.width, 'Width', 52),
    height = integer(input.height, 'Height', 52);
  if (width < 2 || height < 2) throw new RangeError('Dimensions must be 2 through 52');
  const area = width * height;
  if (!Array.isArray(input.stones) || input.stones.length !== area)
    throw new RangeError('Stones must contain exactly width * height cells');
  const stones = Array.from(input.stones, (color) => {
    if (color !== null && color !== 'black' && color !== 'white')
      throw new TypeError('Invalid stone color');
    return color;
  });
  const toPlay = input.toPlay === undefined ? 'black' : input.toPlay;
  if (toPlay !== 'black' && toPlay !== 'white') throw new TypeError('Invalid next color');
  const point = (value: Point): Readonly<Point> => {
    if (!value || typeof value !== 'object') throw new TypeError('Point must be an object');
    const x = integer(value.x, 'Point x', width - 1),
      y = integer(value.y, 'Point y', height - 1);
    return Object.freeze({ x, y });
  };
  const pointList = (values: readonly Point[] | undefined, name: string) => {
    const seen = new Set<number>();
    return Object.freeze(
      list(values, name, area).map((value) => {
        const copy = point(value),
          index = copy.y * width + copy.x;
        if (seen.has(index)) throw new RangeError(`${name} contains duplicate points`);
        seen.add(index);
        return copy;
      }),
    );
  };
  const numberPoints = new Set<number>();
  const numbers = list(input.numbers, 'Numbers', area).map((number) => {
    if (!number) throw new TypeError('Invalid board number');
    const at = point(number.point),
      index = at.y * width + at.x;
    if (numberPoints.has(index)) throw new RangeError('Duplicate numbered point');
    numberPoints.add(index);
    return Object.freeze({ point: at, value: integer(number.value, 'Move number') });
  });
  const markers = list(input.markers, 'Markers', 4096).map((marker) => {
    if (!marker || !['triangle', 'square', 'circle', 'cross', 'label'].includes(marker.kind))
      throw new TypeError('Invalid marker kind');
    const label = marker.kind === 'label' ? text(marker.label, 'Marker label', 1024) : undefined;
    return Object.freeze({
      kind: marker.kind,
      point: point(marker.point),
      ...(label === undefined ? {} : { label }),
    });
  });
  const connections = list(input.connections, 'Connections', 4096).map((connection) => {
    if (!connection || !['line', 'arrow'].includes(connection.kind))
      throw new TypeError('Invalid connection kind');
    const from = point(connection.from),
      to = point(connection.to);
    if (from.x === to.x && from.y === to.y)
      throw new RangeError('Connection endpoints must differ');
    return Object.freeze({ kind: connection.kind, from, to });
  });
  let strokePoints = 0;
  const ids = new Set<string>();
  const strokes = list(input.strokes, 'Strokes', strokeLimits.strokes).map((stroke) => {
    if (!stroke || ids.has(stroke.id)) throw new TypeError('Invalid or duplicate stroke');
    const copy = createStroke(stroke.id, stroke.points, { width, height }, stroke);
    ids.add(copy.id);
    strokePoints += copy.points.length;
    if (strokePoints > strokeLimits.pointsPerNode) throw new RangeError('Too many ink points');
    return copy;
  });
  const overlays = list(input.overlays, 'Overlays', 8192).map((overlay) => {
    if (!overlay || !['heatmap', 'badge', 'ring'].includes(overlay.kind))
      throw new TypeError('Invalid overlay kind');
    const opacity = overlay.opacity === undefined ? 1 : overlay.opacity;
    if (typeof opacity !== 'number' || !Number.isFinite(opacity) || opacity < 0 || opacity > 1)
      throw new RangeError('Overlay opacity must be 0 through 1');
    return Object.freeze({
      kind: overlay.kind,
      point: point(overlay.point),
      color: hex(overlay.color),
      opacity,
      ...(overlay.label === undefined ? {} : { label: text(overlay.label, 'Overlay label', 64) }),
      ...(overlay.textColor === undefined ? {} : { textColor: hex(overlay.textColor) }),
      ...(overlay.ariaLabel === undefined
        ? {}
        : { ariaLabel: text(overlay.ariaLabel, 'Overlay description', 512) }),
    });
  });
  const captures = input.captures === undefined ? { black: 0, white: 0 } : input.captures;
  if (!captures || typeof captures !== 'object') throw new TypeError('Captures must be an object');
  return Object.freeze({
    key,
    width,
    height,
    stones: Object.freeze(stones),
    toPlay,
    moveNumber: integer(input.moveNumber === undefined ? 0 : input.moveNumber, 'Move number'),
    captures: Object.freeze({
      black: integer(captures.black, 'Black captures'),
      white: integer(captures.white, 'White captures'),
    }),
    lastMove: input.lastMove == null ? null : point(input.lastMove),
    numbers: Object.freeze(numbers),
    markers: Object.freeze(markers),
    connections: Object.freeze(connections),
    strokes: Object.freeze(strokes),
    overlays: Object.freeze(overlays),
    visiblePoints:
      input.visiblePoints == null ? null : pointList(input.visiblePoints, 'Visible points'),
    dimPoints: pointList(input.dimPoints, 'Dim points'),
  });
}
