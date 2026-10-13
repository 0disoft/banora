import { expect, test } from 'bun:test';
import { RecordController, getMoveAssessment } from '../src/controller.js';
import { executeAutomation } from '../src/automation.js';

test('targeted move assessments preserve selection, comments, branches and authored properties through Undo/Redo', () => {
  const controller = new RecordController({
    sgf: '(;SZ[9]XX[retain];B[aa](;W[bb]TE[2]C[note])(;W[cc]IT[]XX[branch]))',
  });
  controller.next();
  const state = controller.getState();
  const target = state.node.children[1]!;
  const original = controller.prepareExport().text;
  expect(getMoveAssessment(state.node.children[0]!)).toBe('good');
  expect(controller.setMoveAssessment('bad', target.id).ok).toBe(true);
  expect(controller.getState().node.id).toBe(state.node.id);
  expect(controller.inspectNode(target.id)!.node.properties).toEqual({
    W: ['cc'],
    XX: ['branch'],
    BM: ['1'],
  });
  expect(controller.getState().node.children).toHaveLength(2);
  expect(controller.getState().node.children[0]!.properties).toEqual({
    W: ['bb'],
    TE: ['2'],
    C: ['note'],
  });
  const unchanged = controller.getState();
  controller.setMoveAssessment('bad', target.id);
  expect(controller.getState()).toBe(unchanged);
  controller.undo();
  expect(controller.prepareExport().text).toBe(original);
  controller.redo();
  expect(getMoveAssessment(controller.inspectNode(target.id)!.node)).toBe('bad');
  controller.setMoveAssessment('good', target.id);
  expect(controller.inspectNode(target.id)!.node.properties.BM).toBeUndefined();
  expect(controller.prepareExport().text).toContain('TE[1]');
  controller.setMoveAssessment(null, target.id);
  expect(getMoveAssessment(controller.inspectNode(target.id)!.node)).toBeNull();
  controller.dispose();
});

test('invalid assessment or non-move/missing targets leave record and history untouched; passes can be annotated', () => {
  const controller = new RecordController({ sgf: '(;SZ[9];B[])' });
  const original = controller.getState();
  expect(controller.setMoveAssessment('good')).toEqual({ ok: false, reason: 'invalid-edit' });
  expect(controller.setMoveAssessment('bad', 'missing')).toEqual({
    ok: false,
    reason: 'node-not-found',
  });
  expect(controller.setMoveAssessment('great' as 'good')).toEqual({
    ok: false,
    reason: 'invalid-annotation',
  });
  expect(controller.getState()).toBe(original);
  controller.next();
  expect(controller.setMoveAssessment('good').ok).toBe(true);
  expect(controller.prepareExport().text).toContain('B[]TE[1]');
  controller.dispose();
});

test('automation exposes assessments through validated JSON, preserving the selected path', () => {
  const request = { schemaVersion: 'banora.automation/v1', kind: 'record', sgf: '(;SZ[9];B[aa])' };
  const result = executeAutomation({
    ...request,
    operations: [{ op: 'move-assessment', value: 'bad', target: { gameIndex: 0, path: [0] } }],
  });
  if (!result.ok || result.kind !== 'record') throw Error('Assessment automation failed');
  expect(result.sgf).toContain('B[aa]BM[1]');
  expect(result.selection).toEqual({ gameIndex: 0, path: [] });
  const undo = executeAutomation({
    ...request,
    operations: [{ op: 'next' }, { op: 'move-assessment', value: 'good' }, { op: 'undo' }],
  });
  if (!undo.ok || undo.kind !== 'record') throw Error('Assessment Undo failed');
  expect(undo.sgf).not.toContain('TE[');
  expect(
    executeAutomation({ ...request, operations: [{ op: 'move-assessment', value: 'great' }] }).ok,
  ).toBe(false);
});
