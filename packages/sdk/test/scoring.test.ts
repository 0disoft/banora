import { expect, test } from 'bun:test';
import { createPosition, pass, play, setup } from '../src/core.js';
import type { MoveResult, Position } from '../src/core.js';
import { RecordController } from '../src/controller.js';
import { getRuleProfile } from '../src/rules.js';
import { scorePosition } from '../src/scoring.js';
import type { ScoreOptions, ScoreResult, ScoreSummary } from '../src/scoring.js';
const position = (result: MoveResult): Position => {
  if (!result.ok) throw Error(result.reason);
  return result.position;
};
const score = (result: ScoreResult): ScoreSummary => {
  if (!result.ok) throw Error(result.message);
  return result.value;
};
function captured(): Position {
  const before = position(
    setup(createPosition({ width: 3 }), [
      { x: 1, y: 1, color: 'white' },
      { x: 0, y: 1, color: 'black' },
      { x: 1, y: 0, color: 'black' },
      { x: 2, y: 1, color: 'black' },
    ]),
  );
  return position(play(before, { x: 1, y: 2 }));
}

test('territory and area report separate captures/stones/komi without changing a position', () => {
  const before = captured(),
    unchanged = JSON.stringify(before);
  const territory = score(scorePosition(before, { profile: 'japanese-territory', komi: 0.5 }));
  expect(territory.black).toMatchObject({
    territory: 5,
    stones: 4,
    captures: 1,
    prisoners: 1,
    total: 6,
  });
  expect(territory.white.total).toBe(0.5);
  expect(territory.winner).toBe('black');
  expect(territory.margin).toBe(5.5);
  const area = score(scorePosition(before, { profile: 'tromp-taylor', komi: 0.5 }));
  expect(area.black.total).toBe(9);
  expect(area.black.prisoners).toBe(1);
  expect(area.black.territory).toBe(5);
  expect(area.ownership.every((owner) => owner === 'black')).toBe(true);
  expect(JSON.stringify(before)).toBe(unchanged);
  expect(territory.warnings).toEqual(['passes-incomplete']);
});
test('one dead seed removes the entire group and corrections restore the original diagram and counts', () => {
  const before = position(
    setup(createPosition({ width: 3 }), [
      { x: 0, y: 0, color: 'black' },
      ...[0, 1, 2].map((y) => ({ x: 1, y, color: 'black' as const })),
      { x: 0, y: 1, color: 'white' },
      { x: 0, y: 2, color: 'white' },
    ]),
  );
  const options: ScoreOptions = {
    profile: 'japanese-territory',
    deadStones: [
      { x: 0, y: 1 },
      { x: 0, y: 1 },
    ],
  };
  const removed = score(scorePosition(before, options));
  expect(removed.deadStones).toEqual([
    { x: 0, y: 1 },
    { x: 0, y: 2 },
  ]);
  expect(removed.black.deadPrisoners).toBe(2);
  expect(removed.black.total).toBe(7);
  expect(removed.board[3]).toBeNull();
  expect(before.board[3]).toBe('white');
  const restored = score(scorePosition(before, { profile: 'japanese-territory', deadStones: [] }));
  expect(restored.black.deadPrisoners).toBe(0);
  expect(restored.board).toEqual(before.board);
  expect(restored.deadStones).toEqual([]);
  expect(Object.isFrozen(removed)).toBe(true);
  expect(Object.isFrozen(removed.deadStones[0])).toBe(true);
  expect(Object.isFrozen(removed.black)).toBe(true);
  expect(Object.isFrozen(removed.ownership)).toBe(true);
});
test('neutral regions stay neutral and manually marked seki excludes only the relevant Japanese territories', () => {
  const empty = score(scorePosition(createPosition({ width: 2 }), { profile: 'tromp-taylor' }));
  expect(empty.neutral).toBe(4);
  expect(empty.black.total).toBe(0);
  expect(empty.white.total).toBe(0);
  expect(empty.winner).toBe('draw');
  const mixed = position(
    setup(createPosition({ width: 3 }), [
      ...[0, 1, 2].map((y) => ({ x: 0, y, color: 'black' as const })),
      ...[0, 1, 2].map((y) => ({ x: 2, y, color: 'white' as const })),
    ]),
  );
  expect(score(scorePosition(mixed, { profile: 'tromp-taylor' }))).toMatchObject({
    neutral: 3,
    black: { total: 3 },
    white: { total: 3 },
  });
  const before = captured(),
    seki = [{ x: 1, y: 0 }];
  const japanese = score(
    scorePosition(before, { profile: 'japanese-territory', sekiStones: seki }),
  );
  expect(japanese.neutral).toBe(3);
  expect(japanese.black.territory).toBe(2);
  expect(japanese.black.total).toBe(3);
  const area = score(scorePosition(before, { profile: 'tromp-taylor', sekiStones: seki }));
  expect(area.neutral).toBe(0);
  expect(area.black.total).toBe(9);
});
test('AGA White-last-pass accounting reconciles territory and area differences without synthesizing moves', () => {
  let before = createPosition({ width: 4, rules: getRuleProfile('aga-territory').play });
  for (const point of [
    { x: 0, y: 0 },
    { x: 3, y: 3 },
    { x: 1, y: 0 },
    { x: 2, y: 3 },
    { x: 0, y: 1 },
  ])
    before = position(play(before, point));
  before = position(pass(position(pass(before))));
  const incomplete = score(scorePosition(before, { profile: 'aga-territory', komi: 0.5 }));
  expect(incomplete.passSequenceComplete).toBe(false);
  expect(incomplete.warnings).toEqual(['white-last-pass-required']);
  const final = position(pass(before)),
    territory = score(scorePosition(final, { profile: 'aga-territory', komi: 0.5 })),
    area = score(scorePosition(final, { profile: 'aga-area', komi: 0.5 }));
  expect(final.passPrisoners).toEqual({ black: 2, white: 1 });
  expect(territory.black.passPrisoners).toBe(2);
  expect(territory.difference).toBe(area.difference);
  expect(area.difference).toBe(0.5);
  expect(territory.warnings).toEqual([]);
  expect(area.passSequenceComplete).toBe(true);
  expect(before.consecutivePasses).toBe(2);
});
test('handicap, negative/fractional komi and explicit score adjustments are visible components', () => {
  const before = createPosition({ width: 3, rules: getRuleProfile('aga-area').play });
  const adjusted = score(
    scorePosition(before, {
      profile: 'aga-area',
      handicap: 4,
      komi: -0.5,
      adjustments: { black: 1.25, white: 0.25 },
    }),
  );
  expect(adjusted.white.handicapCompensation).toBe(3);
  expect(adjusted.white.komi).toBe(-0.5);
  expect(adjusted.black.adjustment).toBe(1.25);
  expect(adjusted.white.total).toBe(2.75);
  expect(adjusted.margin).toBe(1.5);
  expect(
    score(scorePosition(before, { profile: 'aga-territory', handicap: 4 })).white
      .handicapCompensation,
  ).toBe(0);
});
test('invalid selections, options, missing pass history and malformed positions fail without changing a record', () => {
  const model = new RecordController({ sgf: '(;SZ[3]AB[aa][ba])' }),
    before = model.getState(),
    text = model.prepareExport().text;
  for (const options of [
    { profile: '__proto__' },
    { profile: 'japanese-territory', komi: NaN },
    { profile: 'japanese-territory', komi: null },
    { profile: 'japanese-territory', handicap: 1.5 },
    { profile: 'japanese-territory', adjustments: { white: Infinity } },
    { profile: 'japanese-territory', deadStones: [{ x: 2, y: 2 }] },
    { profile: 'japanese-territory', sekiStones: [{ x: -1, y: 0 }] },
    { profile: 'japanese-territory', deadStones: [{ x: 0, y: 0 }], sekiStones: [{ x: 1, y: 0 }] },
    { profile: 'aga-area' },
  ]) {
    expect(scorePosition(before.position, options as ScoreOptions).ok).toBe(false);
    expect(model.getState()).toBe(before);
  }
  expect(
    scorePosition({ ...before.position, board: [] }, { profile: 'tromp-taylor' }),
  ).toMatchObject({ ok: false, reason: 'invalid-position' });
  expect(
    scorePosition({ ...before.position, board: Array(9) }, { profile: 'tromp-taylor' }),
  ).toMatchObject({ ok: false, reason: 'invalid-position' });
  expect(model.prepareExport().text).toBe(text);
  expect(model.getState().dirty).toBe(false);
  model.dispose();
});
