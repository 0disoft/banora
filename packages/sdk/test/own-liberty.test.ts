import { expect, spyOn, test } from 'bun:test';
import { createPosition, play, replayMove, setup } from '../src/core.js';
import type { MoveResult, Position, SetupStone } from '../src/core.js';

function successful(result: MoveResult): Position {
  if (!result.ok) throw new Error(result.reason);
  return result.position;
}

test('an adjacent liberty skips own-group traversal for large connected groups', () => {
  for (const width of [19, 52]) {
    const stones: SetupStone[] = [];
    for (let y = 0; y < width - 1; y++)
      for (let x = 0; x < width - 1; x++) stones.push({ x, y, color: 'black' });
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
      expect(enumerations).toBe(1); // Only the placed point's neighbors, not the whole chain.
      expect(next.board.filter((stone) => stone === 'black')).toHaveLength(stones.length + 1);
      expect(next.captures).toEqual({ black: 0, white: 0 });
      expect(next.previousBoard).toBe(original.board);
      expect(original.board[point.y * width + point.x]).toBeNull();
      expect(Object.isFrozen(next.board)).toBe(true);
    }
  }
});

test('a remote liberty still saves a group when no adjacent point is empty', () => {
  const original = successful(
    setup(createPosition({ width: 3 }), [
      { x: 0, y: 0, color: 'white' },
      { x: 2, y: 0, color: 'white' },
      { x: 1, y: 1, color: 'black' },
    ]),
  );
  const next = successful(play(original, { x: 1, y: 0 }));
  expect(next.board[1]).toBe('black');
  expect(next.board[4]).toBe('black');
  expect(next.captures).toEqual({ black: 0, white: 0 });
});

test('capture creates an adjacent liberty before suicide is checked', () => {
  const original = successful(
    setup(createPosition({ width: 3 }), [
      { x: 1, y: 0, color: 'white' },
      { x: 0, y: 0, color: 'black' },
      { x: 2, y: 0, color: 'black' },
      { x: 0, y: 1, color: 'white' },
      { x: 2, y: 1, color: 'white' },
      { x: 1, y: 2, color: 'white' },
    ]),
  );
  const result = play(original, { x: 1, y: 1 });
  const next = successful(result);
  expect(next.board[1]).toBeNull();
  expect(next.board[4]).toBe('black');
  expect(next.captures).toEqual({ black: 1, white: 0 });
  if (result.ok) expect(result.captured).toEqual([{ x: 1, y: 0 }]);
});

test('surrounded multi-stone suicide keeps full removal and prisoner accounting', () => {
  const stones: SetupStone[] = [
    { x: 0, y: 0, color: 'black' },
    { x: 1, y: 0, color: 'black' },
    { x: 2, y: 0, color: 'white' },
    { x: 0, y: 2, color: 'white' },
    { x: 1, y: 1, color: 'white' },
  ];
  for (const suicide of ['forbid', 'allow'] as const) {
    const original = successful(setup(createPosition({ width: 3, rules: { suicide } }), stones));
    const result = play(original, { x: 0, y: 1 });
    if (suicide === 'forbid') expect(result).toEqual({ ok: false, reason: 'suicide' });
    else {
      const next = successful(result);
      expect([next.board[0], next.board[1], next.board[3]]).toEqual([null, null, null]);
      expect(next.captures.white).toBe(3);
    }
    expect(original.captures).toEqual({ black: 0, white: 0 });
    expect(original.board[0]).toBe('black');
  }
});
