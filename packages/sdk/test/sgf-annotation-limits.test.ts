import { expect, test } from 'bun:test';
import { decodeSgf, parseSgf, pointToSgf, serializeSgf } from '../src/sgf.js';
import { RecordController } from '../src/controller.js';

const point = (index: number, width = 19) =>
  pointToSgf({ x: index % width, y: Math.floor(index / width) });
const arrows = (count: number) =>
  Array.from({ length: count }, (_, index) => {
    const from = Math.floor(index / 360),
      remainder = index % 360;
    return `[${point(from)}:${point(remainder >= from ? remainder + 1 : remainder)}]`;
  }).join('');
const code = (sgf: string, maxExpandedPoints?: number) => {
  const result = parseSgf(sgf, maxExpandedPoints === undefined ? {} : { maxExpandedPoints });
  return result.ok ? 'ok' : result.diagnostics[0]!.code;
};

test('labels consume the existing point budget and duplicate coordinates reject without deduplication', () => {
  expect(code('(;SZ[9]LB[aa:A])', 1)).toBe('ok');
  expect(code('(;SZ[9]LB[aa:A][ab:B])', 1)).toBe('limit');
  expect(code('(;SZ[9]LB[aa:A][aa:B])')).toBe('property');
  expect(code('(;SZ[52]LB[Fa:left][Ga:right][Za:last])')).toBe('ok');
  expect(code('(;SZ[52]LB[Ga:first][Ga:second])')).toBe('property');
  expect(code('(;SZ[9]LB[aa:A];LB[aa:B])', 2)).toBe('ok');
  expect(code('(;SZ[9]LB[aa])')).toBe('property');
  expect(code('(;SZ[9]LB[zz:A])')).toBe('property');
});

test('labels, arrows, lines and expanded marker rectangles share the collection budget', () => {
  const sgf = '(;SZ[9]LB[aa:A];AR[aa:bb])(;SZ[9]TR[aa:ab]LN[bb:cc])';
  expect(code(sgf, 5)).toBe('ok');
  expect(code(sgf, 4)).toBe('limit');
  expect(code('(;SZ[9]AR[aa:bb];LN[bb:cc])', 1)).toBe('limit');
  expect(code('(;SZ[9]LN[aa:bb][bb:aa])')).toBe('property');
  expect(code('(;SZ[9]AR[aa:bb][bb:aa])')).toBe('ok');
});

test('4096 annotations pass exactly; the next unique connection rejects for text and byte imports', () => {
  const atLimit = `(;SZ[19]AR${arrows(4096)})`;
  const overLimit = `(;SZ[19]AR${arrows(4097)})`;
  const result = parseSgf(atLimit);
  expect(result.ok).toBe(true);
  if (!result.ok) throw Error('Expected bounded annotation tree');
  expect(result.record.games[0]!.properties.AR).toHaveLength(4096);
  expect(parseSgf(serializeSgf(result.record)).ok).toBe(true);
  expect(code(overLimit)).toBe('limit');
  const decoded = decodeSgf(new TextEncoder().encode(overLimit));
  expect(decoded.ok).toBe(false);
  if (!decoded.ok) expect(decoded.diagnostics[0]!.code).toBe('limit');
  expect(code(`(;SZ[19]AR${arrows(4096)};AR[aa:ab])`)).toBe('ok');
});

test('node bound combines marker kinds, labels and connections; setup/visibility are separately bounded', () => {
  const mixed = (count: number) =>
    `(;SZ[19]AB[aa:ss]VW[aa:ss]DD[aa:ss]TR[aa:ss]LB${Array.from({ length: 361 }, (_, i) => `[${point(i)}:x]`).join('')}AR${arrows(count)})`;
  expect(code(mixed(3374))).toBe('ok');
  expect(code(mixed(3375))).toBe('limit');
  expect(code('(;SZ[52]CR[aa:ZZ]SQ[aa:ZZ])')).toBe('limit');
});

test('reported 100000-label and unique-arrow payloads reject rather than creating rendering state', () => {
  expect(code('(;SZ[9]LB' + '[aa:A]'.repeat(100000) + ')', 1)).toBe('limit');
  expect(code(`(;SZ[19]AR${arrows(100000)})`)).toBe('limit');
});

test('rejected import/edit retains selection, original escapes, checkpoint, dirty state and undo/redo', () => {
  const model = new RecordController({
    sgf: '(;SZ[9]XX[raw\\]value]LB[aa:one\\:two];B[bb])',
    limits: { maxExpandedPoints: 1 },
  });
  try {
    model.next();
    model.setComment('before');
    model.setComment('after');
    model.undo();
    const before = model.getState(),
      checkpoint = model.createCheckpoint(),
      exported = model.prepareExport().text;
    expect(model.loadSgf('(;SZ[9]AR[aa:bb][bb:cc])', { discardChanges: true }).ok).toBe(false);
    expect(model.getState()).toBe(before);
    model.goTo(before.record.games[0]!.id);
    const root = model.getState();
    expect(model.setMarker({ x: 1, y: 1 }, 'triangle').ok).toBe(false);
    expect(model.getState()).toBe(root);
    model.next();
    expect(model.prepareExport().text).toBe(exported);
    expect(model.createCheckpoint()).toEqual(checkpoint);
    expect(model.redo().ok).toBe(true);
    expect(model.getState().node.properties.C).toEqual(['after']);
  } finally {
    model.dispose();
  }
});
