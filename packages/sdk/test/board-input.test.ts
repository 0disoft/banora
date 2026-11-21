import { expect, test } from 'bun:test';
import { strokeLimits } from '../src/annotations.js';
import { BoardInput } from '../src/board-input.js';

test('touch cancellation clears state before releasing capture and consumes the late pointer-up', () => {
  const captures: number[] = [];
  const releases: number[] = [];
  const input = new BoardInput(
    (pointer) => captures.push(pointer),
    (pointer) => {
      expect(input.touch).toBeNull();
      releases.push(pointer);
    },
  );
  expect(input.startTouch(3, { x: 1, y: 2 }, { x: 100, y: 200 })).toBe(true);
  expect(input.moveTouch({ x: 1, y: 2 }, { x: 101, y: 200 })).toBe(false);
  expect(input.moveTouch(null, { x: 102, y: 200 })).toBe(true);
  input.cancel();
  expect(input.takeCancelledPointer(4)).toBe(false);
  expect(input.takeCancelledPointer(3)).toBe(true);
  expect(input.takeCancelledPointer(3)).toBe(false);
  input.awaitConfirmation({ x: 1, y: 2 });
  const focus = { x: 3, y: 4 };
  input.moveConfirmation(focus);
  focus.x = 5;
  expect(input.takeConfirmation()).toEqual({ x: 3, y: 4 });
  expect(input.takeConfirmation()).toBeNull();
  expect(captures).toEqual([3]);
  expect(releases).toEqual([3]);
});

test('capture failures and ink sample limits clear pending input', () => {
  const releases: number[] = [];
  const input = new BoardInput(
    () => {
      throw Error('capture unavailable');
    },
    (pointer) => releases.push(pointer),
  );
  expect(input.startInk(1, { x: 0, y: 0 })).toBe(false);
  expect(input.ink).toBeNull();
  expect(input.takeCancelledPointer(1)).toBe(true);
  expect(input.startTouch(2, { x: 0, y: 0 }, { x: 2, y: 2 })).toBe(false);
  expect(input.touch).toBeNull();
  expect(input.takeCancelledPointer(2)).toBe(true);
  expect(input.startInk(null, { x: 0, y: 0 })).toBe(true);
  expect(input.appendInk({ x: 0, y: 0 })).toBe(false);
  for (let i = 1; i < strokeLimits.pointsPerStroke; i++)
    expect(input.appendInk({ x: i % 2, y: 0 })).toBe(false);
  expect(input.ink?.points).toHaveLength(strokeLimits.pointsPerStroke);
  expect(input.appendInk({ x: strokeLimits.pointsPerStroke % 2, y: 0 })).toBe(true);
  expect(input.takeInk()).toBeUndefined();
  expect(releases).toEqual([1, 2]);
});
