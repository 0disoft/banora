import { expect, spyOn, test } from 'bun:test';
import { createPosition, pass, play, replayMove, setup } from '../src/core.js';
import type { Color, MoveResult, Position } from '../src/core.js';
import * as history from '../src/repetition-history.js';

function success(result: MoveResult): Position {
  if (!result.ok) throw Error(result.reason);
  return result.position;
}

test('superko reuses only unchanged owned board keys and still records each next-player situation', () => {
  for (const ko of ['positional-superko', 'situational-superko'] as const) {
    let position = createPosition({ width: 52, height: 52, rules: { ko, passStones: true } });
    const root = position;
    const count = spyOn(history, 'boardKey');
    try {
      for (let i = 0; i < 1000; i++) position = success(pass(position));
      expect(count).toHaveBeenCalledTimes(1);
      expect(position.board).toBe(root.board);
      expect(position.repetitionHistory!.size).toBe(2);
      expect(position.consecutivePasses).toBe(1000);
      expect(position.moveNumber).toBe(1000);
      expect(position.passPrisoners).toEqual({ black: 500, white: 500 });
      expect(root.repetitionHistory!.size).toBe(1);
      for (const color of ['black', 'white'] as const)
        expect(history.hasSituation(position.repetitionHistory, '.'.repeat(2704), color)).toBe(
          true,
        );
      position = success(play(position, { x: 0, y: 0 }));
      const played = position;
      count.mockClear();
      for (let i = 0; i < 4; i++) position = success(pass(position));
      expect(count).toHaveBeenCalledTimes(1);
      expect(position.board).toBe(played.board);
      expect(position.board).not.toBe(root.board);
      expect(
        history.hasSituation(position.repetitionHistory, 'B' + '.'.repeat(2703), 'black'),
      ).toBe(true);
      position = success(setup(position, [{ x: 1, y: 0, color: 'white' }], 'black'));
      expect(position.repetitionHistory!.size).toBe(1);
      count.mockClear();
      position = success(pass(position));
      position = success(replayMove(position, null, 'black'));
      expect(count).toHaveBeenCalledTimes(1);
      expect(position.consecutivePasses).toBe(1);
      expect(
        history.hasSituation(position.repetitionHistory, 'BW' + '.'.repeat(2702), 'white'),
      ).toBe(true);
    } finally {
      count.mockRestore();
    }
  }
});

test('foreign mutable/frozen accessor boards are never trusted as immutable cache keys', () => {
  for (const frozen of [false, true]) {
    const root = createPosition({ width: 3, height: 3, rules: { ko: 'situational-superko' } });
    let color: Color | null = null;
    const board = [...root.board];
    if (frozen) {
      Object.defineProperty(board, 0, { get: () => color, enumerable: true });
      Object.freeze(board);
    }
    const external = { ...root, board };
    const count = spyOn(history, 'boardKey');
    try {
      const first = success(pass(external));
      if (frozen) color = 'black';
      else board[0] = 'black';
      const second = success(pass(external));
      expect(count).toHaveBeenCalledTimes(2);
      expect(first.board[0]).toBeNull();
      expect(second.board[0]).toBe('black');
      expect(first.board).not.toBe(board);
      expect(second.board).not.toBe(board);
      expect(history.hasSituation(second.repetitionHistory, 'B........', 'white')).toBe(true);
      expect(history.hasSituation(first.repetitionHistory, 'B........', 'white')).toBe(false);
      count.mockClear();
      const third = success(pass(second));
      success(pass(third));
      expect(count).toHaveBeenCalledTimes(1);
      expect(third.board).toBe(second.board);
    } finally {
      count.mockRestore();
    }
  }
});

test('simple/no-ko passes never construct repetition keys', () => {
  const count = spyOn(history, 'boardKey');
  try {
    for (const ko of ['simple', 'none'] as const) {
      let position = createPosition({ rules: { ko } });
      for (let i = 0; i < 10; i++) position = success(pass(position));
      expect(position.repetitionHistory).toBeNull();
    }
    expect(count).toHaveBeenCalledTimes(0);
  } finally {
    count.mockRestore();
  }
});
