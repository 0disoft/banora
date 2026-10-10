import { describe, expect, test } from 'bun:test';
import { displayBoardSize, displayCrop, toDisplayPoint, toLogicalPoint } from '../src/geometry.js';

describe('logical display transforms', () => {
  test('all eight transforms invert every rectangular-board intersection and fractional annotation point', () => {
    const size = { width: 3, height: 5 };
    for (const rotation of [0, 90, 180, 270] as const)
      for (const flipX of [false, true]) {
        const transform = { rotation, flipX };
        const seen = new Set<string>();
        const displayed = displayBoardSize(size, transform);
        for (let y = 0; y < size.height; y++)
          for (let x = 0; x < size.width; x++) {
            const point = toDisplayPoint({ x, y }, size, transform);
            expect(
              point.x >= 0 &&
                point.x < displayed.width &&
                point.y >= 0 &&
                point.y < displayed.height,
            ).toBe(true);
            expect(toLogicalPoint(point, size, transform)).toEqual({ x, y });
            seen.add(`${point.x},${point.y}`);
          }
        expect(seen.size).toBe(15);
        const annotation = { x: -0.75, y: 2.5 };
        expect(
          toLogicalPoint(toDisplayPoint(annotation, size, transform), size, transform),
        ).toEqual(annotation);
      }
  });
  test('clockwise orientation, reflection order and transformed crop bounds are explicit', () => {
    const size = { width: 5, height: 9 };
    expect(toDisplayPoint({ x: 1, y: 2 }, size, { rotation: 90 })).toEqual({ x: 6, y: 1 });
    expect(toDisplayPoint({ x: 1, y: 2 }, size, { rotation: 90, flipX: true })).toEqual({
      x: 6,
      y: 3,
    });
    expect(displayCrop({ x: 1, y: 2, width: 2, height: 3 }, size, { rotation: 90 })).toEqual({
      x: 4,
      y: 1,
      width: 3,
      height: 2,
    });
    expect(displayCrop({ x: 1, y: 2, width: 1, height: 1 }, size, { rotation: 270 })).toEqual({
      x: 2,
      y: 3,
      width: 1,
      height: 1,
    });
    expect(() => displayBoardSize(size, { rotation: 45 as 90 })).toThrow();
    expect(() => displayCrop({ x: 4, y: 0, width: 2, height: 1 }, size)).toThrow();
  });
});
