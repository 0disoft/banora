import { expect, spyOn, test } from 'bun:test';
import { createPosition, play, replayMove, setup } from '../src/core.js';
import type { MoveResult, Position, SetupStone } from '../src/core.js';

function successful(result: MoveResult): Position {
  if (!result.ok) throw new Error(result.reason);
  return result.position;
}

test('a proven enemy liberty stops traversal of a large surviving chain', () => {
  for (const width of [19, 52]) {
    const stones: SetupStone[] = [];
    for (let y = 0; y < width - 1; y++)
      for (let x = 0; x < width - 1; x++) stones.push({ x, y, color: 'white' });
    const original = successful(setup(createPosition({ width }), stones));
    const point = { x: width - 1, y: width - 2 };
    for (const action of [
      () => play(original, point),
      () => replayMove(original, point, 'black'),
    ]) {
      const floor = Math.floor;
      let enumerations = 0;
      const spy = spyOn(Math, 'floor').mockImplementation((value) => {
        enumerations++;
        return floor(value);
      });
      let result: MoveResult;
      try {
        result = action();
      } finally {
        spy.mockRestore();
      }
      const next = successful(result);
      expect(enumerations).toBe(2); // The move and one enemy stone, up to its first liberty.
      expect(next.board.filter((stone) => stone === 'white')).toHaveLength(stones.length);
      expect(next.board[point.y * width + point.x]).toBe('black');
      expect(next.captures).toEqual({ black: 0, white: 0 });
      if (result.ok) expect(result.captured).toEqual([]);
      expect(next.previousBoard).toBe(original.board);
      expect(original.board[point.y * width + point.x]).toBeNull();
      expect(Object.isFrozen(next.board)).toBe(true);
    }
  }
});

test('a remote liberty saves an enemy chain touching multiple sides of the move', () => {
  const stones: SetupStone[] = [];
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 5; x++)
      if (!(x === 0 && y === 0) && !(x === 2 && y === 2)) stones.push({ x, y, color: 'white' });
  // All four adjacent white stones have no local liberty after the center move;
  // the connected chain survives through its only liberty at the far corner.
  const original = successful(setup(createPosition({ width: 5 }), stones));
  expect(play(original, { x: 2, y: 2 })).toEqual({ ok: false, reason: 'suicide' });
  // Recorded playback permits suicide and preserves every enemy stone.
  const replayed = successful(replayMove(original, { x: 2, y: 2 }, 'black'));
  expect(replayed.board).toEqual(original.board);
  expect(replayed.captures).toEqual({ black: 0, white: 1 });
  expect(original.captures).toEqual({ black: 0, white: 0 });
});

test('a chain with no liberty is fully removed in the original capture order', () => {
  const original = successful(
    setup(createPosition({ width: 3 }), [
      { x: 0, y: 0, color: 'white' },
      { x: 1, y: 0, color: 'white' },
      { x: 0, y: 1, color: 'white' },
      { x: 2, y: 0, color: 'black' },
      { x: 1, y: 1, color: 'black' },
    ]),
  );
  for (const action of [play, replayMove]) {
    const result = action(original, { x: 0, y: 2 }, 'black');
    const next = successful(result);
    if (result.ok)
      expect(result.captured).toEqual([
        { x: 0, y: 1 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ]);
    expect(next.captures).toEqual({ black: 3, white: 0 });
    expect(next.board.filter((stone) => stone === 'white')).toHaveLength(0);
    expect(original.board.filter((stone) => stone === 'white')).toHaveLength(3);
    expect(original.captures).toEqual({ black: 0, white: 0 });
  }
});
