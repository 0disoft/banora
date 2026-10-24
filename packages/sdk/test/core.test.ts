import { describe, expect, test } from 'bun:test';
import { createPosition, pass, play, replayMove, setup, stoneAt } from '../src/core.js';
import type { MoveResult, Position } from '../src/core.js';

function successful(result: MoveResult): Position {
  if (!result.ok) throw new Error(result.reason);
  return result.position;
}

describe('headless board transitions', () => {
  test('shares only owned immutable boards across passes, prior positions and recorded moves', () => {
    const original = createPosition({ width: 3 });
    const passed = successful(pass(original));
    expect(passed).not.toBe(original);
    expect(passed.board).toBe(original.board);
    expect(passed.previousBoard).toBeNull();
    expect(passed.moveNumber).toBe(1);
    const played = successful(play(original, { x: 1, y: 1 }));
    expect(played.board).not.toBe(original.board);
    expect(played.previousBoard).toBe(original.board);
    const recorded = successful(replayMove(played, { x: 1, y: 1 }, 'white'));
    expect(recorded.previousBoard).toBe(played.board);
    expect(stoneAt(recorded, { x: 1, y: 1 })).toBe('white');
    expect(stoneAt(played, { x: 1, y: 1 })).toBe('black');
    expect(stoneAt(original, { x: 1, y: 1 })).toBeNull();
    for (const position of [original, passed, played, recorded]) {
      expect(Object.isFrozen(position)).toBe(true);
      expect(Object.isFrozen(position.board)).toBe(true);
      if (position.previousBoard) expect(Object.isFrozen(position.previousBoard)).toBe(true);
    }
    expect(() => (played.board as (string | null)[]).push('white')).toThrow();
  });
  test('foreign mutable and frozen accessor arrays remain defensively copied', () => {
    const original = createPosition({ width: 3 });
    const board = [...original.board];
    const external = { ...original, board };
    const played = successful(play(external, { x: 1, y: 1 }));
    const passed = successful(pass(external));
    expect(played.previousBoard).not.toBe(board);
    expect(passed.board).not.toBe(board);
    expect(Object.isFrozen(board)).toBe(false);
    board[0] = 'white';
    expect(played.previousBoard![0]).toBeNull();
    expect(passed.board[0]).toBeNull();
    let value: 'black' | null = null;
    const accessors = [...original.board];
    Object.defineProperty(accessors, '0', { get: () => value, enumerable: true });
    Object.freeze(accessors);
    const captured = successful(pass({ ...original, board: accessors }));
    expect(captured.board).not.toBe(accessors);
    value = 'black';
    expect(accessors[0]).toBe('black');
    expect(captured.board[0]).toBeNull();
    expect(Object.isFrozen(captured.board)).toBe(true);
    expect(successful(pass(captured)).board).toBe(captured.board);
  });
  test('captures an enemy group without mutating the input snapshot', () => {
    const before = successful(
      setup(createPosition({ width: 3 }), [
        { x: 1, y: 1, color: 'white' },
        { x: 0, y: 1, color: 'black' },
        { x: 1, y: 0, color: 'black' },
        { x: 2, y: 1, color: 'black' },
      ]),
    );
    const after = successful(play(before, { x: 1, y: 2 }));
    expect(stoneAt(after, { x: 1, y: 1 })).toBeNull();
    expect(after.captures.black).toBe(1);
    expect(stoneAt(before, { x: 1, y: 1 })).toBe('white');
    expect(Object.isFrozen(after.board)).toBe(true);
  });

  test('rejects suicide, occupied points, wrong turns and fractional coordinates', () => {
    const position = successful(
      setup(createPosition({ width: 3 }), [
        { x: 0, y: 1, color: 'white' },
        { x: 1, y: 0, color: 'white' },
        { x: 2, y: 1, color: 'white' },
        { x: 1, y: 2, color: 'white' },
      ]),
    );
    expect(play(position, { x: 1, y: 1 })).toEqual({ ok: false, reason: 'suicide' });
    expect(play(position, { x: 0, y: 1 })).toEqual({ ok: false, reason: 'occupied' });
    expect(play(position, { x: 0, y: 0 }, 'white')).toEqual({ ok: false, reason: 'wrong-turn' });
    expect(play(position, { x: 0.5, y: 0 })).toEqual({ ok: false, reason: 'out-of-bounds' });
    expect(position.moveNumber).toBe(0);
  });

  test('rejects immediate ko recapture and releases simple ko after passing', () => {
    const original = successful(
      setup(createPosition({ width: 5 }), [
        { x: 1, y: 1, color: 'white' },
        { x: 0, y: 1, color: 'black' },
        { x: 1, y: 0, color: 'black' },
        { x: 2, y: 1, color: 'black' },
        { x: 0, y: 2, color: 'white' },
        { x: 2, y: 2, color: 'white' },
        { x: 1, y: 3, color: 'white' },
      ]),
    );
    const capture = successful(play(original, { x: 1, y: 2 }));
    expect(play(capture, { x: 1, y: 1 })).toEqual({ ok: false, reason: 'ko' });
    const afterPasses = successful(pass(successful(pass(capture))));
    expect(play(afterPasses, { x: 1, y: 1 }).ok).toBe(true);
  });

  test('explicit suicide policy removes own stones and credits the opponent', () => {
    const original = successful(
      setup(createPosition({ width: 3, rules: { suicide: 'allow' } }), [
        { x: 0, y: 1, color: 'white' },
        { x: 1, y: 0, color: 'white' },
        { x: 2, y: 1, color: 'white' },
        { x: 1, y: 2, color: 'white' },
      ]),
    );
    const after = successful(play(original, { x: 1, y: 1 }));
    expect(stoneAt(after, { x: 1, y: 1 })).toBeNull();
    expect(after.captures.white).toBe(1);
  });

  test('setup is atomic, supports rectangular boards and clears ko', () => {
    const original = createPosition({ width: 9, height: 13 });
    expect(
      setup(original, [
        { x: 0, y: 0, color: 'black' },
        { x: 9, y: 0, color: 'white' },
      ]).ok,
    ).toBe(false);
    expect(original.board.every((stone) => stone === null)).toBe(true);
    expect(createPosition({ width: 9, height: 13 }).board.length).toBe(117);
    expect(() => createPosition({ width: 53 })).toThrow();
  });
});
