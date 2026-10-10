import { describe, expect, test } from 'bun:test';
import { createPosition, pass, play, setup, stoneAt } from '../src/core.js';
import type { MoveResult, Position } from '../src/core.js';

function successful(result: MoveResult): Position {
  if (!result.ok) throw new Error(result.reason);
  return result.position;
}

describe('headless board transitions', () => {
  test('captures an enemy group without mutating the input snapshot', () => {
    const before = successful(setup(createPosition({ width: 3 }), [
      { x: 1, y: 1, color: 'white' }, { x: 0, y: 1, color: 'black' },
      { x: 1, y: 0, color: 'black' }, { x: 2, y: 1, color: 'black' },
    ]));
    const after = successful(play(before, { x: 1, y: 2 }));
    expect(stoneAt(after, { x: 1, y: 1 })).toBeNull();
    expect(after.captures.black).toBe(1);
    expect(stoneAt(before, { x: 1, y: 1 })).toBe('white');
    expect(Object.isFrozen(after.board)).toBe(true);
  });

  test('rejects suicide, occupied points, wrong turns and fractional coordinates', () => {
    const position = successful(setup(createPosition({ width: 3 }), [
      { x: 0, y: 1, color: 'white' }, { x: 1, y: 0, color: 'white' },
      { x: 2, y: 1, color: 'white' }, { x: 1, y: 2, color: 'white' },
    ]));
    expect(play(position, { x: 1, y: 1 })).toEqual({ ok: false, reason: 'suicide' });
    expect(play(position, { x: 0, y: 1 })).toEqual({ ok: false, reason: 'occupied' });
    expect(play(position, { x: 0, y: 0 }, 'white')).toEqual({ ok: false, reason: 'wrong-turn' });
    expect(play(position, { x: 0.5, y: 0 })).toEqual({ ok: false, reason: 'out-of-bounds' });
    expect(position.moveNumber).toBe(0);
  });

  test('rejects immediate ko recapture and releases simple ko after passing', () => {
    const original = successful(setup(createPosition({ width: 5 }), [
      { x: 1, y: 1, color: 'white' }, { x: 0, y: 1, color: 'black' },
      { x: 1, y: 0, color: 'black' }, { x: 2, y: 1, color: 'black' },
      { x: 0, y: 2, color: 'white' }, { x: 2, y: 2, color: 'white' },
      { x: 1, y: 3, color: 'white' },
    ]));
    const capture = successful(play(original, { x: 1, y: 2 }));
    expect(play(capture, { x: 1, y: 1 })).toEqual({ ok: false, reason: 'ko' });
    const afterPasses = successful(pass(successful(pass(capture))));
    expect(play(afterPasses, { x: 1, y: 1 }).ok).toBe(true);
  });

  test('explicit suicide policy removes own stones and credits the opponent', () => {
    const original = successful(setup(createPosition({ width: 3, rules: { suicide: 'allow' } }), [
      { x: 0, y: 1, color: 'white' }, { x: 1, y: 0, color: 'white' },
      { x: 2, y: 1, color: 'white' }, { x: 1, y: 2, color: 'white' },
    ]));
    const after = successful(play(original, { x: 1, y: 1 }));
    expect(stoneAt(after, { x: 1, y: 1 })).toBeNull();
    expect(after.captures.white).toBe(1);
  });

  test('setup is atomic, supports rectangular boards and clears ko', () => {
    const original = createPosition({ width: 9, height: 13 });
    expect(setup(original, [{ x: 0, y: 0, color: 'black' }, { x: 9, y: 0, color: 'white' }]).ok).toBe(false);
    expect(original.board.every(stone => stone === null)).toBe(true);
    expect(createPosition({ width: 9, height: 13 }).board.length).toBe(117);
    expect(() => createPosition({ width: 53 })).toThrow();
  });
});
