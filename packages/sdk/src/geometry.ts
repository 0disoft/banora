import type { Point } from './core.js';

export type BoardRotation = 0 | 90 | 180 | 270;
export interface BoardTransform {
  readonly rotation?: BoardRotation;
  readonly flipX?: boolean;
}
export interface BoardSize {
  readonly width: number;
  readonly height: number;
}
export interface BoardCrop extends BoardSize {
  readonly x: number;
  readonly y: number;
}

export function normalizeBoardTransform(transform: BoardTransform = {}) {
  const rotation = transform.rotation ?? 0,
    flipX = transform.flipX ?? false;
  if (![0, 90, 180, 270].includes(rotation) || typeof flipX !== 'boolean')
    throw new RangeError('Invalid board transform');
  return Object.freeze({ rotation, flipX });
}
function validateSize(size: BoardSize) {
  if (
    ![size.width, size.height].every(
      (value) => Number.isInteger(value) && value >= 2 && value <= 52,
    )
  )
    throw new RangeError('Invalid board dimensions');
}
function validatePoint(point: Point) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y))
    throw new RangeError('Point must be finite');
}
export function displayBoardSize(size: BoardSize, transform: BoardTransform = {}): BoardSize {
  validateSize(size);
  const { rotation } = normalizeBoardTransform(transform);
  return Object.freeze(
    rotation === 90 || rotation === 270
      ? { width: size.height, height: size.width }
      : { width: size.width, height: size.height },
  );
}
/** Reflect across the logical vertical axis first, then rotate clockwise. */
export function toDisplayPoint(
  point: Point,
  size: BoardSize,
  transform: BoardTransform = {},
): Point {
  validateSize(size);
  validatePoint(point);
  const { rotation, flipX } = normalizeBoardTransform(transform);
  const x = flipX ? size.width - 1 - point.x : point.x,
    y = point.y;
  if (rotation === 90) return Object.freeze({ x: size.height - 1 - y, y: x });
  if (rotation === 180) return Object.freeze({ x: size.width - 1 - x, y: size.height - 1 - y });
  if (rotation === 270) return Object.freeze({ x: y, y: size.width - 1 - x });
  return Object.freeze({ x, y });
}
export function toLogicalPoint(
  point: Point,
  size: BoardSize,
  transform: BoardTransform = {},
): Point {
  validateSize(size);
  validatePoint(point);
  const { rotation, flipX } = normalizeBoardTransform(transform);
  let x = point.x,
    y = point.y;
  if (rotation === 90) {
    x = point.y;
    y = size.height - 1 - point.x;
  }
  if (rotation === 180) {
    x = size.width - 1 - point.x;
    y = size.height - 1 - point.y;
  }
  if (rotation === 270) {
    x = size.width - 1 - point.y;
    y = point.x;
  }
  return Object.freeze({ x: flipX ? size.width - 1 - x : x, y });
}
export function displayCrop(
  crop: BoardCrop,
  size: BoardSize,
  transform: BoardTransform = {},
): BoardCrop {
  validateSize(size);
  if (
    ![crop.x, crop.y, crop.width, crop.height].every(Number.isInteger) ||
    crop.width < 1 ||
    crop.height < 1 ||
    crop.x < 0 ||
    crop.y < 0 ||
    crop.x + crop.width > size.width ||
    crop.y + crop.height > size.height
  )
    throw new RangeError('Invalid board crop');
  const a = toDisplayPoint(crop, size, transform);
  const b = toDisplayPoint(
    { x: crop.x + crop.width - 1, y: crop.y + crop.height - 1 },
    size,
    transform,
  );
  return Object.freeze({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x) + 1,
    height: Math.abs(a.y - b.y) + 1,
  });
}
