import { DEFAULT_SGF_LIMITS, expandSgfPoints, isSgfPass, pointFromSgf } from './sgf.js';
import type { SgfNode } from './sgf.js';

/** Mutates only the fresh map being built for this frame. */
export function numberNode(
  node: SgfNode,
  numbers: Map<number, number>,
  number: number,
  width: number,
  height: number,
  budget?: { remaining: number },
): number {
  for (const key of ['AB', 'AW', 'AE'])
    for (const value of node.properties[key] ?? []) {
      if (budget && (typeof value !== 'string' || value.length > DEFAULT_SGF_LIMITS.maxValueLength))
        throw new RangeError('Diagram setup value exceeds the SGF value limit');
      const points = expandSgfPoints(value, width, height);
      if (budget && (budget.remaining -= Math.max(1, points.length)) < 0)
        throw new RangeError('Diagram setup points exceed the SGF expansion limit');
      for (const point of points) numbers.delete(point.y * width + point.x);
    }
  const value = node.properties.B?.[0] ?? node.properties.W?.[0];
  if (value !== undefined) number++;
  if (node.properties.MN) number = Number(node.properties.MN[0]);
  if (value !== undefined && !isSgfPass(value, width, height)) {
    const point = pointFromSgf(value, width, height);
    numbers.set(point.y * width + point.x, number);
  }
  return number;
}
