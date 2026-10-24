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

test('bounded neighborhoods include distant selections with exact global depth, indent and MN', () => {
  const controller = new RecordController({
    sgf: `(;SZ[5]XX[keep]${';B[];W[]'.repeat(300)};MN[900]C[authored]${';B[];W[]'.repeat(100)})`,
  });
  try {
    const full = getVariationRows(controller.getState(), false, 50_000).rows;
    const authored = controller.prepareExport().text;
    for (const index of [499, 500, 501, 650, full.length - 1]) {
      expect(controller.goTo(full[index]!.node.id).ok).toBe(true);
      for (const limit of [1, 2, 7, 499, 500, 501]) {
        const result = getVariationRows(controller.getState(), false, limit);
        expect(result.rows.length).toBeLessThanOrEqual(limit);
        expect(result.rows.some((row) => row.node.id === full[index]!.node.id)).toBe(true);
        const start = full.findIndex((row) => row.node.id === result.rows[0]!.node.id);
        expect(result.rows).toEqual(full.slice(start, start + result.rows.length));
        expect(result.truncated).toBe(true);
      }
    }
    expect(controller.prepareExport().text).toBe(authored);
    for (const limit of [0, -1, 1.5, NaN, Infinity, 50_001])
      expect(() => getVariationRows(controller.getState(), true, limit)).toThrow(RangeError);
  } finally {
    controller.dispose();
  }
});

test('distant wide forks retain sibling choices and collapse rules within the same row cap', () => {
  const controller = new RecordController({
    sgf: `(;SZ[5]${Array.from({ length: 700 }, (_, i) => `(;B[]N[choice ${i}];W[])`).join('')})`,
  });
  try {
    const chosen = controller.getState().node.children[620]!;
    expect(controller.goTo(chosen.id).ok).toBe(true);
    const full = getVariationRows(controller.getState(), true, 50_000).rows;
    const result = getVariationRows(controller.getState(), true);
    expect(result.rows).toHaveLength(500);
    expect(result.truncated).toBe(true);
    const index = result.rows.findIndex((row) => row.node.id === chosen.id);
    expect(index).toBeGreaterThan(0);
    expect(result.rows[index + 1]!.node).toBe(chosen.children[0]!);
    expect(result.rows[index]!.indent).toBe(1);
    expect(result.rows[index]!.collapsed).toBe(false);
    expect(
      result.rows.some((row) => row.node.properties.N?.[0] === 'choice 619' && row.collapsed),
    ).toBe(true);
    const start = full.findIndex((row) => row.node === result.rows[0]!.node);
    expect(result.rows).toEqual(full.slice(start, start + 500));
  } finally {
    controller.dispose();
  }
});
