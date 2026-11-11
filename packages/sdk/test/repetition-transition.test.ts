import { expect, spyOn, test } from 'bun:test';
import { createPosition, play, setup } from '../src/core.js';
import {
  hasSituation,
  rememberSituation,
  tryRememberSituation,
} from '../src/repetition-history.js';
import type { RepetitionHistory } from '../src/repetition-history.js';

test('checked history insertion matches separate lookup/insertion across turns, tries and collisions', () => {
  const collision = rememberSituation(null, 'costarring', 'black');
  let branched = rememberSituation(null, 'a', 'black');
  for (const value of ['b', 'c', 'd', 'e']) branched = rememberSituation(branched, value, 'white');
  const histories: (RepetitionHistory | null)[] = [
    null,
    rememberSituation(null, '', 'black'),
    rememberSituation(null, 'same', 'white'),
    collision,
    rememberSituation(collision, 'liquid', 'black'),
    branched,
  ];
  for (const history of histories) {
    const before = JSON.stringify(history);
    for (const board of ['', 'same', 'costarring', 'liquid', 'a', '.'.repeat(2704)])
      for (const color of ['black', 'white'] as const)
        for (const positional of [false, true]) {
          const expected = hasSituation(history, board, positional ? undefined : color)
            ? null
            : rememberSituation(history, board, color);
          const actual = tryRememberSituation(history, board, color, positional);
          expect(actual).toEqual(expected);
          expect(JSON.stringify(history)).toBe(before);
          if (actual) {
            expect(Object.isFrozen(actual)).toBe(true);
            expect(Object.isFrozen(actual.root)).toBe(true);
          }
        }
  }
});

test('ordinary superko placements hash each required turn once without changing history', () => {
  for (const [ko, hashes] of [
    ['situational-superko', 1],
    ['positional-superko', 2],
  ] as const) {
    const root = createPosition({ rules: { ko } });
    const count = spyOn(String.prototype, 'charCodeAt');
    try {
      const result = play(root, { x: 3, y: 3 });
      expect(result.ok).toBe(true);
      expect(count).toHaveBeenCalledTimes((19 * 19 + 1) * hashes);
      if (!result.ok) throw Error(result.reason);
      expect(result.position.repetitionHistory!.size).toBe(2);
      expect(root.repetitionHistory!.size).toBe(1);
      expect(result.position.board[3 * 19 + 3]).toBe('black');
    } finally {
      count.mockRestore();
    }
  }
});

test('positional rejection checks black first and short-circuits without insertion', () => {
  const history = rememberSituation(null, 'same', 'black');
  const count = spyOn(String.prototype, 'charCodeAt');
  try {
    expect(tryRememberSituation(history, 'same', 'white', true)).toBeNull();
    expect(count).toHaveBeenCalledTimes('sameB'.length);
    expect(history.size).toBe(1);
    count.mockClear();
    const allowed = tryRememberSituation(history, 'same', 'white');
    expect(count).toHaveBeenCalledTimes('sameW'.length);
    expect(allowed!.size).toBe(2);
    expect(history.size).toBe(1);
  } finally {
    count.mockRestore();
  }
});

test('wrong-turn, bounds, occupied and suicide errors still precede history hashing', () => {
  const root = createPosition({ width: 3, height: 3, rules: { ko: 'situational-superko' } });
  const surrounded = setup(root, [
    { x: 0, y: 1, color: 'white' },
    { x: 1, y: 0, color: 'white' },
    { x: 2, y: 1, color: 'white' },
    { x: 1, y: 2, color: 'white' },
  ]);
  if (!surrounded.ok) throw Error(surrounded.reason);
  const count = spyOn(String.prototype, 'charCodeAt');
  try {
    expect(play(root, { x: 0, y: 0 }, 'white')).toEqual({ ok: false, reason: 'wrong-turn' });
    expect(play(root, { x: 3, y: 0 })).toEqual({ ok: false, reason: 'out-of-bounds' });
    expect(play(surrounded.position, { x: 0, y: 1 })).toEqual({ ok: false, reason: 'occupied' });
    expect(play(surrounded.position, { x: 1, y: 1 })).toEqual({ ok: false, reason: 'suicide' });
    expect(count).toHaveBeenCalledTimes(0);
    expect(surrounded.position.repetitionHistory!.size).toBe(1);
  } finally {
    count.mockRestore();
  }
});
