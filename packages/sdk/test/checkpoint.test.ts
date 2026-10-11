import { expect, test } from 'bun:test';
import { RecordController } from '../src/controller.js';
import { CHECKPOINT_SCHEMA, parseRecordCheckpoint } from '../src/checkpoint.js';
import { executeAutomation } from '../src/automation.js';

test('checkpoint resumes a collection branch, annotations, unknown data, rules and export baseline', () => {
  const source = new RecordController({
    sgf: '(;SZ[5]XX[keep])(;SZ[9];B[aa](;W[bb])(;W[cc]C[original]))',
    rules: { ko: 'situational-superko', passStones: true },
  });
  source.goTo(source.getState().record.games[1]!.children[0]!.children[1]!.id);
  source.setComment('unfinished 한국어');
  source.addStroke([
    { x: 1.5, y: 2 },
    { x: 3, y: 4 },
  ]);
  const before = source.getState();
  const checkpoint = source.createCheckpoint();
  expect(source.getState()).toBe(before);
  expect(checkpoint.selection).toEqual({ gameIndex: 1, path: [0, 1] });
  expect(Object.isFrozen(checkpoint.selection.path)).toBe(true);
  expect(Object.isFrozen(CHECKPOINT_SCHEMA.properties.rules)).toBe(true);
  const restored = new RecordController();
  expect(restored.loadCheckpoint(JSON.parse(JSON.stringify(checkpoint))).ok).toBe(true);
  const state = restored.getState();
  expect(state.gameIndex).toBe(1);
  expect(state.node.properties.C).toEqual(['unfinished 한국어']);
  expect(state.strokes[0]?.points[0]?.x).toBe(1.5);
  expect(state.record.games[0]?.properties.XX).toEqual(['keep']);
  expect(state.position.rules).toEqual(before.position.rules);
  expect(state.position.board).toEqual(before.position.board);
  expect(state.dirty).toBe(true);
  expect(state.canUndo).toBe(false);
  expect(state.recordGeneration).toBe(1);
  restored.clearStrokes();
  restored.setComment('original');
  expect(restored.getState().dirty).toBe(false);
  restored.setComment('later');
  restored.undo();
  expect(restored.getState().dirty).toBe(false);
  source.dispose();
  restored.dispose();
});

test('checkpoints retain the acknowledged ticket baseline even after newer edits', () => {
  const source = new RecordController({ sgf: '(;SZ[5]C[import])' });
  source.setComment('downloaded');
  const ticket = source.prepareExport();
  source.setComment('later');
  source.acknowledgeExport(ticket.id);
  const restored = new RecordController();
  restored.loadCheckpoint(source.createCheckpoint());
  expect(restored.getState().dirty).toBe(true);
  restored.setComment('downloaded');
  expect(restored.getState().dirty).toBe(false);
  restored.setComment('import');
  expect(restored.getState().dirty).toBe(true);
  const exportTicket = restored.prepareExport();
  restored.acknowledgeExport(exportTicket.id);
  const clean = source.createCheckpoint();
  const pending = source.prepareExport();
  expect(source.loadCheckpoint(restored.createCheckpoint(), { discardChanges: true }).ok).toBe(
    true,
  );
  expect(source.getState().dirty).toBe(false);
  expect(source.acknowledgeExport(pending.id).ok).toBe(false);
  expect(clean.sgf).toContain('C[later]');
  source.dispose();
  restored.dispose();
});

test('broader host SGF limits cannot emit an unrestorable checkpoint envelope', () => {
  const controller = new RecordController({
    sgf: '(;SZ[5]C[' + 'x'.repeat(5 * 1024 * 1024 + 1) + '])',
    limits: { maxBytes: 6 * 1024 * 1024, maxValueLength: 6 * 1024 * 1024 },
  });
  const before = controller.getState();
  expect(() => controller.createCheckpoint()).toThrow(RangeError);
  expect(controller.getState()).toBe(before);
  expect(controller.prepareExport().text.length).toBeGreaterThan(5 * 1024 * 1024);
  controller.dispose();
});

test('bad, future, oversized or guarded recovery preserves state, history and tickets', () => {
  const source = new RecordController({ size: 5 });
  const valid = source.createCheckpoint();
  source.beginEditGroup();
  source.setComment('first');
  const before = source.getState(),
    ticket = source.prepareExport();
  let notices = 0;
  const unsubscribe = source.subscribe(() => notices++);
  for (const input of [
    null,
    { ...valid, schemaVersion: 'banora.checkpoint/v2' },
    { ...valid, dirty: false },
    { ...valid, rules: { ...valid.rules, ko: 'unknown' } },
    { ...valid, selection: { gameIndex: 0, path: [0] } },
    { ...valid, selection: { gameIndex: 0, path: Array(1) } },
    { ...valid, sgf: 'bad' },
    { ...valid, baselineSgf: 'bad' },
    { ...valid, sgf: 'x'.repeat(5 * 1024 * 1024 + 1) },
  ]) {
    expect(source.loadCheckpoint(input, { discardChanges: true })).toMatchObject({
      ok: false,
      reason: 'invalid-checkpoint',
    });
    expect(source.getState()).toBe(before);
  }
  expect(source.loadCheckpoint(valid)).toEqual({ ok: false, reason: 'unsaved-changes' });
  expect(notices).toBe(1);
  source.setComment('second');
  source.endEditGroup();
  source.undo();
  expect(source.getState().dirty).toBe(false);
  expect(source.acknowledgeExport(ticket.id).ok).toBe(true);
  expect(source.getState().dirty).toBe(true);
  unsubscribe();
  source.dispose();
  const limited = new RecordController({ size: 5, limits: { maxNodes: 1 } });
  expect(limited.loadCheckpoint({ ...valid, baselineSgf: '(;SZ[5];B[aa])' }).ok).toBe(false);
  expect(limited.getState().recordGeneration).toBe(0);
  limited.dispose();
});

test('long checkpoint locations retain superko replay and independently owned input', () => {
  const source = new RecordController({
    sgf: '(;SZ[5]AW[bb][ac][cc][bd]AB[ab][ba][cb];B[bc]' + ';W[];B[]'.repeat(80) + ')',
    rules: { ko: 'positional-superko' },
  });
  for (let i = 0; i < 161; i++) expect(source.next().ok).toBe(true);
  const input = JSON.parse(JSON.stringify(source.createCheckpoint()));
  const parsed = parseRecordCheckpoint(input);
  expect(parsed.ok).toBe(true);
  input.rules.ko = 'none';
  input.selection.path[0] = 999;
  if (!parsed.ok) throw Error('Expected checkpoint');
  expect(parsed.value.rules.ko).toBe('positional-superko');
  expect(parsed.value.selection.path[0]).toBe(0);
  const restored = new RecordController();
  restored.loadCheckpoint(parsed.value);
  expect(restored.getState().position.moveNumber).toBe(161);
  expect(restored.play({ x: 1, y: 1 })).toEqual({ ok: false, reason: 'superko' });
  expect(restored.getState().dirty).toBe(false);
  restored.dispose();
  source.dispose();
});

test('automation can emit and resume checkpoints without silently overriding their input', () => {
  const created = executeAutomation({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    size: 5,
    includeCheckpoint: true,
    operations: [
      { op: 'play', point: { x: 2, y: 2 } },
      { op: 'comment', text: 'draft' },
    ],
  });
  if (!created.ok || created.kind !== 'record' || !created.checkpoint)
    throw Error('Expected checkpoint output');
  const resumed = executeAutomation({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    checkpoint: created.checkpoint,
    includeCheckpoint: true,
    operations: [{ op: 'comment', text: 'resumed' }],
  });
  if (!resumed.ok || resumed.kind !== 'record') throw Error('Expected resumed record');
  expect(resumed.snapshot.stones[12]).toBe('black');
  expect(resumed.selected.properties.C).toEqual(['resumed']);
  expect(resumed.history.dirty).toBe(true);
  expect(resumed.checkpoint?.baselineSgf).toBe(created.checkpoint.baselineSgf);
  for (const conflict of [
    { sgf: '(;SZ[5])' },
    { size: 5 },
    { profile: 'aga-area' },
    { selection: { gameIndex: 0, path: [] } },
  ]) {
    expect(
      executeAutomation({
        schemaVersion: 'banora.automation/v1',
        kind: 'record',
        checkpoint: created.checkpoint,
        ...conflict,
      }),
    ).toMatchObject({ ok: false, error: { code: 'invalid-request' } });
  }
  expect(
    executeAutomation({
      schemaVersion: 'banora.automation/v1',
      kind: 'record',
      checkpoint: { ...created.checkpoint, baselineSgf: 'bad' },
    }),
  ).toMatchObject({ ok: false, error: { code: 'invalid-input' } });
});
