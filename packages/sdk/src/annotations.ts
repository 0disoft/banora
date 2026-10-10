import type { Point } from './core.js';

export interface StrokeStyle { readonly color?: string; readonly width?: number }
export interface Stroke {
  readonly id: string;
  readonly points: readonly Point[];
  readonly color: string;
  /** Width in logical intersection spacing, independent of display scale. */
  readonly width: number;
}
export const strokeLimits = Object.freeze({ strokes: 64, pointsPerStroke: 512, pointsPerNode: 4096 });
const validId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id);
const round = (value: number) => Math.round(value * 10_000) / 10_000;

export function normalizeStrokeStyle(style: StrokeStyle = {}): Readonly<Required<StrokeStyle>> {
  const color = style.color ?? '#206650', width = style.width ?? 0.08;
  if (typeof color !== 'string' || !/^#[\da-f]{6}$/i.test(color) ||
    !Number.isFinite(width) || width < 0.02 || width > 0.5) throw new RangeError('Ink requires a six-digit hex color and width from 0.02 through 0.5');
  return Object.freeze({ color: color.toLowerCase(), width: round(width) });
}

export function createStroke(id: string, points: readonly Point[], size: {width: number; height: number}, style: StrokeStyle = {}): Stroke {
  if (!validId(id) || !Array.isArray(points) || points.length < 2 || points.length > strokeLimits.pointsPerStroke) {
    throw new RangeError('Ink requires an ID and 2 through 512 points');
  }
  const copied = points.map(point => {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
      point.x < 0 || point.y < 0 || point.x > size.width - 1 || point.y > size.height - 1) throw new RangeError('Ink point must be inside the logical board');
    return Object.freeze({x:round(point.x), y:round(point.y)});
  });
  if (!copied.some(point => point.x !== copied[0]!.x || point.y !== copied[0]!.y)) throw new RangeError('Ink points must describe a line');
  return Object.freeze({ id, points: Object.freeze(copied), ...normalizeStrokeStyle(style) });
}

export function encodeStroke(stroke: Stroke): string {
  return JSON.stringify({v:1, id:stroke.id, color:stroke.color, width:stroke.width,
    points:stroke.points.map(point => [point.x, point.y])});
}

/** BPN is a Banora extension, not a standard SGF drawing property. */
export function decodeStrokes(values: readonly string[] | undefined, size: {width: number; height: number}): readonly Stroke[] {
  if (!values) return Object.freeze([]);
  if (values.length > strokeLimits.strokes) throw new RangeError('Node ink count exceeds 64');
  const ids = new Set<string>();
  let total = 0;
  const strokes = values.map(value => {
    const item: unknown = JSON.parse(value);
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new RangeError('Invalid BPN object');
    const wire = item as Record<string, unknown>;
    if (wire.v !== 1 || Object.keys(wire).sort().join(',') !== 'color,id,points,v,width' ||
      !validId(wire.id) || typeof wire.color !== 'string' || typeof wire.width !== 'number' || !Array.isArray(wire.points) ||
      wire.points.length < 2 || wire.points.length > strokeLimits.pointsPerStroke) {
      throw new RangeError('Invalid or unsupported BPN schema');
    }
    const points = wire.points.map((pair: unknown) => {
      if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'number' || typeof pair[1] !== 'number') throw new RangeError('Invalid BPN point');
      return {x:pair[0], y:pair[1]};
    });
    const stroke = createStroke(wire.id, points, size, {color:wire.color, width:wire.width});
    total += points.length;
    if (ids.has(stroke.id) || total > strokeLimits.pointsPerNode) throw new RangeError('Duplicate ink ID or node point limit exceeded');
    ids.add(stroke.id);
    return stroke;
  });
  return Object.freeze(strokes);
}
