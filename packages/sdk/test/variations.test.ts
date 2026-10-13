import { expect, test } from 'bun:test';
import { RecordController } from '../src/controller.js';
import { getVariationRows, variationCandidates, variationPathKey } from '../src/variations.js';

test('fork candidates remain reachable while unselected and nested continuations stay folded', () => {
  const controller = new RecordController({
    sgf: '(;SZ[9];B[aa](;W[bb];B[cc](;W[dd];B[ee])(;W[]MN[20];C[pass note]))(;W[ff];B[gg]))',
  });
  const first = controller.getState().node.children[0]!;
  controller.goTo(first.id);
  const before = controller.prepareExport().text;
  expect(getVariationRows(controller.getState(), true).rows.map((row) => row.moveNumber)).toEqual([
    0, 1, 2, 2,
  ]);
  expect(variationCandidates(controller.getState()).map((candidate) => candidate.label)).toEqual([
    'A',
    'B',
  ]);
  const branch = first.children[0]!;
  controller.goTo(branch.id);
  const key = variationPathKey(controller.getState());
  expect(getVariationRows(controller.getState(), true).rows.map((row) => row.moveNumber)).toEqual([
    0, 1, 2, 3, 4, 20, 2,
  ]);
  controller.goTo(branch.children[0]!.id);
  expect(variationPathKey(controller.getState())).toBe(key);
  const pass = controller.getState().node.children[1]!;
  controller.goTo(pass.id);
  expect(getVariationRows(controller.getState(), true).rows.map((row) => row.moveNumber)).toEqual([
    0, 1, 2, 3, 4, 20, 20, 2,
  ]);
  expect(controller.prepareExport().text).toBe(before);
  controller.previous();
  controller.previous();
  controller.previous();
  expect(getVariationRows(controller.getState(), true).rows).toHaveLength(4);
  expect(getVariationRows(controller.getState(), false).rows).toHaveLength(10);
  expect(getVariationRows(controller.getState(), true, 2).truncated).toBe(true);
  controller.dispose();
});

test('pass, setup-only, duplicate and occupied candidates never become misleading board hints', () => {
  const controller = new RecordController({
    sgf: '(;SZ[9]AB[aa](;B[];W[cc])(;AB[dd];W[ee])(;B[bb])(;B[bb])(;B[aa]))',
  });
  expect(variationCandidates(controller.getState()).map((candidate) => candidate.point)).toEqual([
    { x: 1, y: 1 },
  ]);
  expect(getVariationRows(controller.getState(), true).rows).toHaveLength(6);
  controller.dispose();
});
