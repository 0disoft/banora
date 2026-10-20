import { expect, test } from 'bun:test';
import { RecordController } from '../src/controller.js';
import { createSgfNode, parseSgf, serializeSgf } from '../src/sgf.js';
import type { SgfRecord } from '../src/sgf.js';
import { sameRecordContent, semanticRecord } from '../src/record-runtime.js';

function parsed(text: string): SgfRecord {
  const result = parseSgf(text);
  if (!result.ok) throw Error(result.diagnostics[0]!.message);
  return result.record;
}

test('structural content comparison agrees with normalized signatures and ignores node identities', () => {
  const inputs = [
    '(;SZ[9]C[text]XX[a\\:b])',
    '(;GM[1]FF[4]CA[Latin1]XX[a:b]C[text]SZ[9])',
    '(;SZ[9]C[other]XX[a:b])',
    '(;SZ[9]TR[aa:bb]LN[aa:bb][cc:dd]AR[aa:cc][bb:dd]LB[aa:first][bb:second])',
    '(;LB[bb:second][aa:first]AR[bb:dd][aa:cc]LN[dd:cc][bb:aa]TR[bb][ab][ba][aa]SZ[9])',
    '(;SZ[9]TR[aa:bb]LN[aa:bb][cc:dd]AR[cc:aa][bb:dd]LB[aa:first][bb:second])',
    '(;SZ[9]XX[first][second])',
    '(;SZ[9]XX[second][first])',
    '(;SZ[9](;B[aa])(;B[bb]))',
    '(;SZ[9](;B[bb])(;B[aa]))',
    '(;SZ[9];B[aa];W[])',
    '(;SZ[9];B[aa];W[tt])',
    '(;SZ[9];B[aa](;W[])(;W[bb]))',
    '(;SZ[9];B[aa];W[];W[bb])',
    '(;SZ[9])(;SZ[13])',
    '(;SZ[13])(;SZ[9])',
    '(;SZ[9:13])',
    '(;SZ[9]DD[]VW[])',
    '(;SZ[9])',
    '(;SZ[13])',
    '(;C[default size])',
  ];
  const records = inputs.map(parsed);
  const cache = new WeakMap();
  for (const left of records)
    for (const right of records) {
      expect(sameRecordContent(left, right)).toBe(semanticRecord(left) === semanticRecord(right));
      expect(sameRecordContent(right, left)).toBe(sameRecordContent(left, right));
      expect(sameRecordContent(left, right, cache)).toBe(
        semanticRecord(left) === semanticRecord(right),
      );
    }
  const renamed = createSgfNode('different-id', records[0]!.games[0]!.properties);
  expect(sameRecordContent(records[0]!, { games: [renamed] })).toBe(true);
});

test('ink normalization and changed ink use the existing exact semantic rules', () => {
  const first = {
    v: 1,
    id: 'line',
    color: '#ABCDEF',
    width: 0.08,
    points: [
      [1.12345, 2],
      [3, 4],
    ],
  };
  const second = {
    points: [
      [1.12346, 2],
      [3, 4],
    ],
    width: 0.08,
    color: '#abcdef',
    id: 'line',
    v: 1,
  };
  const record = (wire: unknown) =>
    parsed(
      serializeSgf({ games: [createSgfNode('root', { SZ: ['9'], BPN: [JSON.stringify(wire)] })] }),
    );
  const a = record(first),
    b = record(second),
    changed = record({ ...first, id: 'other' });
  expect(semanticRecord(a)).toBe(semanticRecord(b));
  expect(sameRecordContent(a, b)).toBe(true);
  expect(sameRecordContent(a, changed)).toBe(false);
});

test('deep copied paths return clean without relying on record or property identity', () => {
  const controller = new RecordController({ sgf: '(;SZ[9]' + ';B[];W[]'.repeat(2500) + ')' });
  try {
    let node = controller.getState().node;
    while (node.children[0]) node = node.children[0];
    controller.goTo(node.id);
    const original = controller.getState().record;
    expect(controller.setComment('tail').ok).toBe(true);
    expect(controller.getState().dirty).toBe(true);
    expect(sameRecordContent(original, controller.getState().record)).toBe(false);
    expect(controller.setComment('').ok).toBe(true);
    expect(controller.getState().record).not.toBe(original);
    expect(controller.getState().dirty).toBe(false);
    expect(sameRecordContent(original, controller.getState().record)).toBe(true);
  } finally {
    controller.dispose();
  }
});

test('export baselines preserve exact snapshot content across edits, restoration and recreated branches', () => {
  const controller = new RecordController({ sgf: '(;SZ[9];B[aa];W[bb])' });
  try {
    controller.next();
    const old = controller.prepareExport();
    expect(controller.removeBranch().ok).toBe(true);
    expect(controller.play({ x: 0, y: 0 }).ok).toBe(true);
    expect(controller.play({ x: 1, y: 1 }).ok).toBe(true);
    expect(controller.getState().dirty).toBe(false);
    expect(controller.setComment('exported').ok).toBe(true);
    const ticket = controller.prepareExport(),
      checkpoint = controller.createCheckpoint();
    expect(controller.setComment('later').ok).toBe(true);
    expect(controller.acknowledgeExport(ticket.id).ok).toBe(true);
    expect(controller.getState().dirty).toBe(true);
    expect(controller.acknowledgeExport(old.id).ok).toBe(false);
    expect(controller.undo().ok).toBe(true);
    expect(controller.getState().dirty).toBe(false);
    expect(controller.redo().ok).toBe(true);
    expect(controller.getState().dirty).toBe(true);
    expect(controller.loadCheckpoint(checkpoint, { discardChanges: true }).ok).toBe(true);
    expect(controller.getState().dirty).toBe(true);
    expect(controller.setComment('').ok).toBe(true);
    expect(controller.getState().dirty).toBe(false);
  } finally {
    controller.dispose();
  }
});
