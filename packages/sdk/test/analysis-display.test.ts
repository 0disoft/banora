import { expect, spyOn, test } from 'bun:test';
import * as core from '../src/core.js';
import { RecordController } from '../src/controller.js';
import { AnalysisSession } from '../src/analysis.js';
import type { AnalysisCandidate } from '../src/analysis.js';
import {
  analysisCoordinate,
  analysisDisplaySgf,
  analysisPreview,
  createAnalysisPreview,
} from '../src/analysis-display.js';
import { mountAnalysis } from '../src/analysis-view.js';
const candidate = (moves: AnalysisCandidate['principalVariation']): AnalysisCandidate => ({
  move: moves[0] ?? null,
  rank: 0,
  principalVariation: moves,
  visits: 10,
  winProbabilityBlack: 0.7,
  scoreLeadBlack: 3,
  scoreLoss: 0,
});

test('one preview checkpoint advances captures and passes once and reuses unchanged steps', () => {
  const source = new RecordController({
    sgf: '(;SZ[5]MN[80]AB[ab][ba][cb]AW[bb])',
    rules: { ko: 'positional-superko', passStones: true },
  });
  const before = source.getState();
  const move = candidate([{ x: 1, y: 2 }, null, { x: 2, y: 2 }]);
  const expected = Array.from({ length: 4 }, (_, step) =>
    analysisPreview(before.position, move, step),
  );
  const previews = createAnalysisPreview();
  const play = spyOn(core, 'play'),
    pass = spyOn(core, 'pass');
  try {
    const held = [];
    for (let step = 0; step < 4; step++) {
      const value = previews.read(before.position, move, step);
      held.push(value);
      expect(value).toEqual(expected[step]!);
      expect(analysisDisplaySgf(value)).toBe(analysisDisplaySgf(expected[step]!));
      expect(previews.read(before.position, move, step)).toBe(value);
    }
    expect(play).toHaveBeenCalledTimes(2);
    expect(pass).toHaveBeenCalledTimes(1);
    expect(held.map((value) => value.played.length)).toEqual([0, 1, 2, 3]);
    expect(Object.isFrozen(held[1]!.played)).toBe(true);
    expect(held[1]!.position.captures.black).toBe(1);
    expect(held[3]!.position.passPrisoners.black).toBe(1);
    expect(source.getState()).toBe(before);
  } finally {
    play.mockRestore();
    pass.mockRestore();
    previews.clear();
    source.dispose();
  }
});

test('preview checkpoint falls back for backward/jump/root/candidate changes and clears retained work', () => {
  const root = core.createPosition({ width: 5, rules: { ko: 'situational-superko' } });
  const move = candidate([{ x: 0, y: 0 }, { x: 1, y: 0 }, null]);
  const previews = createAnalysisPreview();
  for (const step of [0, 1, 3, 2, 1, 2, 3])
    expect(previews.read(root, move, step)).toEqual(analysisPreview(root, move, step));
  const previous = previews.read(root, move, 3);
  const replacement = { ...move };
  const replaced = previews.read(root, replacement, 3);
  expect(replaced).not.toBe(previous);
  expect(replaced).toEqual(previous);
  const otherRoot = core.createPosition({ width: 5, toPlay: 'white' });
  expect(previews.read(otherRoot, move, 3)).toEqual(analysisPreview(otherRoot, move, 3));
  const held = previews.read(root, move, 3);
  previews.clear();
  const replay = spyOn(core, 'play');
  try {
    const restored = previews.read(root, move, 3);
    expect(restored).not.toBe(held);
    expect(restored).toEqual(held);
    expect(replay).toHaveBeenCalledTimes(2);
  } finally {
    replay.mockRestore();
    previews.clear();
  }
});

test('preview checkpoint preserves invalid-step/illegal-move failures and empty-PV behavior', () => {
  const root = core.createPosition({ width: 5 });
  const move = candidate([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]);
  const previews = createAnalysisPreview();
  const valid = previews.read(root, move, 1);
  for (const step of [-1, 1.5, 3, NaN, Infinity])
    expect(() => previews.read(root, move, step)).toThrow('PV step');
  expect(() => previews.read(root, move, 2)).toThrow('legal');
  expect(previews.read(root, move, 1)).toBe(valid);
  const only = { ...candidate([]), move: { x: 2, y: 2 } };
  expect(previews.read(root, only, 0)).toEqual(analysisPreview(root, only, 0));
  expect(previews.read(root, only, 1)).toEqual(analysisPreview(root, only, 1));
  expect(previews.read(root, null, 0).position).toBe(root);
  expect(() => previews.read(root, null, 1)).toThrow('PV step');
  previews.clear();
});
test('analysis PV display follows legal captures/passes, numbers only present stones and preserves source history/export', () => {
  const source = new RecordController({
      sgf: '(;SZ[5]KM[6.5]XX[private]C[Private comment]AB[ab][ba][cb]AW[bb])',
    }),
    before = source.getState(),
    exported = source.prepareExport().text;
  const move = candidate([{ x: 1, y: 2 }, null, { x: 2, y: 2 }]),
    initial = analysisPreview(before.position, move, 0),
    capture = analysisPreview(before.position, move, 1),
    passed = analysisPreview(before.position, move, 2),
    last = analysisPreview(before.position, move, 3);
  expect(initial.position).toBe(before.position);
  expect(capture.position.board[6]).toBe(null);
  expect(capture.position.captures.black).toBe(1);
  expect(passed.position.toPlay).toBe('black');
  expect(passed.played[1]?.move).toBe(null);
  expect(last.position.board[12]).toBe('black');
  const sgf = analysisDisplaySgf(last),
    display = new RecordController({ sgf });
  expect(display.getState().position.board).toEqual(last.position.board);
  expect(display.getState().node.properties.LB).toEqual(['bc:1', 'cc:3']);
  expect(sgf).not.toContain('Private');
  expect(sgf).not.toContain('XX');
  expect(sgf).not.toContain('KM');
  expect(source.getState()).toBe(before);
  expect(source.prepareExport().text).toBe(exported);
  expect(Object.isFrozen(last.played)).toBe(true);
  for (const invalid of [-1, 1.5, 4])
    expect(() => analysisPreview(before.position, move, invalid)).toThrow('PV step');
  expect(() => analysisPreview(before.position, candidate([{ x: 1, y: 1 }]), 1)).toThrow('legal');
  display.dispose();
  source.dispose();
});
test('candidate-only previews, pass labels and root serialization have explicit stable behavior', () => {
  const source = new RecordController({ sgf: '(;SZ[9:5]PL[W])' }),
    position = source.getState().position,
    move = { ...candidate([]), move: { x: 2, y: 1 } };
  const preview = analysisPreview(position, move, 1);
  expect(preview.line).toEqual([{ x: 2, y: 1 }]);
  expect(preview.position.board[11]).toBe('white');
  expect(analysisCoordinate(move.move, 5)).toBe('C4');
  expect(analysisCoordinate(null, 5)).toBe('Pass');
  expect(analysisDisplaySgf(analysisPreview(position, null, 0))).toContain('PL[W]');
  expect(analysisPreview(position, candidate([]), 1).played[0]?.move).toBe(null);
  source.dispose();
});
test('analysis view imports without browser globals and exposes the session borrowed controller only while live', () => {
  expect(typeof mountAnalysis).toBe('function');
  const source = new RecordController({ size: 5 }),
    session = new AnalysisSession(
      source,
      {
        id: 'test',
        async analyze() {
          return {};
        },
      },
      { profile: 'japanese-territory' },
    );
  expect(session.controller).toBe(source);
  session.dispose();
  expect(() => session.controller).toThrow('disposed');
  expect(source.play({ x: 0, y: 0 }).ok).toBe(true);
  source.dispose();
});
