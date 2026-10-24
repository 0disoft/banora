import { expect, spyOn, test } from 'bun:test';
import { RecordController } from '../src/controller.js';
import type { GameInfoPatch } from '../src/controller.js';
import * as sgf from '../src/sgf.js';
import { runInNewContext } from 'node:vm';

test('game information is one root edit with selection, raw unknown properties and other games preserved', () => {
  const source = new RecordController({
    sgf: '(;SZ[5]PB[old]KM[6.50]XX[a\\]b]GN[old\\]name];B[aa]C[note])(;SZ[9]PW[other])',
  });
  try {
    source.next();
    const before = source.getState(),
      original = source.createCheckpoint();
    const patch = {
      blackPlayer: '제로디\r\nRodisoft',
      whitePlayer: '白',
      gameName: 'Review ] \\',
      date: '2024-02-29,03-01',
      komi: -0.5,
      result: 'W+Resign',
    };
    const parser = spyOn(sgf, 'parseSgf');
    expect(source.setGameInfo(patch)).toEqual({ ok: true });
    expect(parser).toHaveBeenCalledTimes(1);
    const validated = parser.mock.calls[0]![0];
    const after = source.getState();
    expect(after.node.id).toBe(before.node.id);
    expect(after.record.games[1]).toBe(before.record.games[1]);
    expect(after.record.games[0]!.children[0]).toBe(before.node);
    expect(after.position).toEqual(before.position);
    expect(after.dirty).toBe(true);
    expect(source.getGameInfo()).toEqual({
      blackPlayer: '제로디 Rodisoft',
      whitePlayer: '白',
      gameName: 'Review ] \\',
      date: patch.date,
      komi: '-0.5',
      result: 'W+Resign',
    });
    expect(Object.isFrozen(source.getGameInfo())).toBe(true);
    patch.blackPlayer = 'mutated';
    expect(source.getGameInfo().blackPlayer).toBe('제로디 Rodisoft');
    const checkpoint = source.createCheckpoint();
    const ticket = source.prepareExport();
    expect(checkpoint.sgf).toBe(validated);
    expect(ticket.text).toBe(validated);
    expect(ticket.text).toContain('XX[a\\]b]');
    expect(parser).toHaveBeenCalledTimes(1);
    parser.mockRestore();
    const restored = new RecordController();
    try {
      expect(restored.loadCheckpoint(checkpoint, { discardChanges: true }).ok).toBe(true);
      expect(restored.getGameInfo()).toEqual(source.getGameInfo());
      expect(restored.getState().dirty).toBe(true);
      expect(restored.undo()).toEqual({ ok: false, reason: 'no-history' });
    } finally {
      restored.dispose();
    }
    const reopened = new RecordController({ sgf: ticket.text });
    try {
      expect(reopened.getGameInfo()).toEqual(source.getGameInfo());
    } finally {
      reopened.dispose();
    }
    expect(source.undo().ok).toBe(true);
    expect(source.createCheckpoint().sgf).toBe(original.sgf);
    expect(source.getState().dirty).toBe(false);
    expect(source.redo().ok).toBe(true);
    expect(source.getGameInfo().result).toBe('W+Resign');
  } finally {
    source.dispose();
  }
});

test('deletion, no-op, authored legacy information and current-game isolation', () => {
  const source = new RecordController({
    sgf: '(;SZ[5]DT[legacy date]RE[legacy result]KM[+6.50]PB[authored])(;SZ[5]PW[second])',
  });
  try {
    const before = source.getState();
    expect(source.getGameInfo().date).toBe('legacy date');
    expect(source.setGameInfo({})).toEqual({ ok: true });
    expect(source.setGameInfo({ blackPlayer: undefined, komi: '+6.50' })).toEqual({ ok: true });
    expect(source.getState()).toBe(before);
    expect(source.setGameInfo({ gameName: 'name' }).ok).toBe(true);
    expect(source.getGameInfo().date).toBe('legacy date');
    expect(source.getGameInfo().result).toBe('legacy result');
    expect(source.setGameInfo({ blackPlayer: null, komi: '', gameName: null }).ok).toBe(true);
    expect(source.getGameInfo().blackPlayer).toBeUndefined();
    expect(source.getGameInfo().komi).toBeUndefined();
    source.goTo(source.getState().record.games[1]!.id);
    const first = source.getState().record.games[0];
    expect(source.setGameInfo({ whitePlayer: 'changed second' }).ok).toBe(true);
    expect(source.getState().record.games[0]).toBe(first);
    expect(source.getGameInfo()).toEqual({ whitePlayer: 'changed second' });
  } finally {
    source.dispose();
  }
});

test('FF4 partial dates, shortcuts and Gregorian leap boundaries are checked without the system clock', () => {
  const source = new RecordController();
  try {
    for (const date of [
      '0000-02-29',
      '0096-02-29',
      '2000-02-29',
      '2024',
      '2024-02',
      '2024-02,03',
      '1996-12-27,28,1997-01-03,04',
      '2024-02,03-01',
      '2024,2025',
    ])
      expect(source.setGameInfo({ date }).ok).toBe(true);
    for (const date of [
      '1900-02-29',
      '2100-02-29',
      '2023-02-29',
      '2024-04-31',
      '2024-00',
      '2024-13',
      '2024-02-00',
      '2024,03',
      '2024-02,29',
      '2024-1-01',
      '2024/01/01',
      '2024-01-01, 02',
      '2024-01-01,',
    ]) {
      const state = source.getState();
      expect(source.setGameInfo({ date })).toEqual({ ok: false, reason: 'invalid-edit' });
      expect(source.getState()).toBe(state);
    }
  } finally {
    source.dispose();
  }
});

test('result and komi boundaries reject invalid values atomically and preserve finite SGF real spelling', () => {
  const source = new RecordController();
  try {
    for (const result of [
      '0',
      'Draw',
      'Void',
      '?',
      'B+',
      'W+0.5',
      'B+R',
      'W+Resign',
      'B+T',
      'W+Time',
      'B+F',
      'W+Forfeit',
    ])
      expect(source.setGameInfo({ result }).ok).toBe(true);
    for (const komi of [-1e9, 1e9, 1e-7, Number.MIN_VALUE, 0, '+6.50', '-0.5']) {
      expect(source.setGameInfo({ komi }).ok).toBe(true);
      expect(Number(source.getGameInfo().komi)).toBe(Number(komi));
      expect(source.getGameInfo().komi).not.toContain('e');
    }
    for (const patch of [
      { gameName: 'partial', result: 'Black resigns' },
      { result: 'B+-1' },
      { result: 'B+Infinity' },
      { result: 'B+1e4' },
      { komi: NaN },
      { komi: Infinity },
      { komi: 1e9 + 0.5 },
      { komi: -1e9 - 0.5 },
      { komi: '1e2' },
      { komi: '.5' },
      null,
      [],
      { unknown: 'x' },
      { blackPlayer: 7 },
      Object.create({ blackPlayer: 'inherited' }),
      {
        get blackPlayer() {
          throw Error('must not execute');
        },
      },
    ]) {
      const state = source.getState();
      expect(source.setGameInfo(patch as GameInfoPatch)).toEqual({
        ok: false,
        reason: 'invalid-edit',
      });
      expect(source.getState()).toBe(state);
    }
  } finally {
    source.dispose();
  }
});

test('value and canonical byte limits still reject full metadata edits without breaking comment groups', () => {
  const limited = new RecordController({
    sgf: '(;SZ[5])',
    limits: { maxValueLength: 8, maxBytes: 65 },
  });
  try {
    expect(limited.setGameInfo({ blackPlayer: '12345678' }).ok).toBe(true);
    const state = limited.getState();
    expect(limited.setGameInfo({ blackPlayer: '123456789' })).toEqual({
      ok: false,
      reason: 'limit',
    });
    expect(limited.getState()).toBe(state);
    expect(
      limited.setGameInfo({ blackPlayer: '한한한한한한한한', whitePlayer: '12345678' }).ok,
    ).toBe(false);
    expect(limited.getState()).toBe(state);
    limited.beginEditGroup();
    limited.setComment('a');
    expect(limited.setGameInfo({ date: 'invalid' }).ok).toBe(false);
    limited.setComment('b');
    limited.endEditGroup();
    expect(limited.undo().ok).toBe(true);
    expect(limited.getState().node.properties.C).toBeUndefined();
    expect(limited.getGameInfo().blackPlayer).toBe('12345678');
  } finally {
    limited.dispose();
  }
  expect(() => limited.setGameInfo({})).toThrow('disposed');
  expect(() => limited.getGameInfo()).toThrow('disposed');
});

test('reentrant host objects cannot apply information to a replacement record', () => {
  const source = new RecordController({ sgf: '(;SZ[5]GN[old])' });
  try {
    const patch = new Proxy(
      { gameName: 'wrong target' },
      {
        ownKeys(target) {
          expect(source.loadSgf('(;SZ[9]GN[replacement])', { discardChanges: true }).ok).toBe(true);
          return Reflect.ownKeys(target);
        },
      },
    );
    expect(source.setGameInfo(patch)).toEqual({ ok: false, reason: 'stale-preview' });
    expect(source.getGameInfo().gameName).toBe('replacement');
    expect(source.getState().dirty).toBe(false);
    expect(source.getState().canUndo).toBe(false);
  } finally {
    source.dispose();
  }
});

test('plain patches can cross realms, while missing own descriptors cannot become edits', () => {
  const source = new RecordController();
  try {
    expect(source.setGameInfo(runInNewContext('({blackPlayer: "other realm"})')).ok).toBe(true);
    expect(source.getGameInfo().blackPlayer).toBe('other realm');
    const patch = Object.create(null);
    patch.whitePlayer = 'dictionary';
    expect(source.setGameInfo(patch).ok).toBe(true);
    const state = source.getState();
    expect(source.setGameInfo(new Proxy({}, { ownKeys: () => ['gameName'] }))).toEqual({
      ok: false,
      reason: 'invalid-edit',
    });
    expect(source.getState()).toBe(state);
  } finally {
    source.dispose();
  }
});
