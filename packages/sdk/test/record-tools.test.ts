import { expect, test } from 'bun:test';
import { RecordController } from '../src/controller.js';
import { searchRecord } from '../src/record-search.js';
import { createSgfNode, recordNodeAt } from '../src/sgf.js';

test('whole-collection literal search covers branches, metadata, labels, passes and move overrides without navigation', () => {
  const controller = new RecordController({
    sgf: '(;SZ[9]GN[Study 한국]C[ROOT];B[aa]MN[10](;W[]C[Needle 한국];N[needle note])(;W[bb]LB[bb:NEEDLE]))(;SZ[5]PB[Needle player];B[aa]C[other])',
  });
  const state = controller.getState();
  const result = searchRecord(state.record, { query: 'needle' });
  expect(result.total).toBe(4);
  expect(result.hits.map((hit) => hit.target)).toEqual([
    { gameIndex: 0, path: [0, 0] },
    { gameIndex: 0, path: [0, 0, 0] },
    { gameIndex: 0, path: [0, 1] },
    { gameIndex: 1, path: [] },
  ]);
  expect(result.hits.map((hit) => hit.moveNumber)).toEqual([11, 11, 11, 0]);
  expect(
    result.hits.every((hit) => recordNodeAt(state.record, hit.target)?.id === hit.nodeId),
  ).toBe(true);
  expect(searchRecord(state.record, { query: '한국' }).total).toBe(2);
  expect(searchRecord(state.record, { query: 'NEEDLE', caseSensitive: true }).total).toBe(1);
  expect(searchRecord(state.record, { query: '', properties: ['C'] }).total).toBe(3);
  expect(searchRecord(state.record, { query: 'needle', gameIndex: 1 }).total).toBe(1);
  expect(searchRecord(state.record, { query: 'needle', offset: 1, limit: 2 })).toMatchObject({
    total: 4,
    hasMore: true,
    offset: 1,
    limit: 2,
  });
  expect(searchRecord(state.record, { query: 'needle', offset: 99 }).hits).toEqual([]);
  expect(searchRecord(state.record, { query: '[.*]' }).total).toBe(0);
  expect(controller.getState()).toBe(state);
  expect(Object.isFrozen(result.hits[0]!.target.path)).toBe(true);
  expect(Object.isFrozen(result.hits[0]!.properties)).toBe(true);
});

test('search validates budgets and traverses deep linear records without recursion or replay', () => {
  expect(() =>
    searchRecord({ games: [createSgfNode('big', { C: ['x'.repeat(8_388_609)] })] }, { query: 'x' }),
  ).toThrow(RangeError);
  const controller = new RecordController({ sgf: `(;SZ[5]${';B[aa]'.repeat(4000)};C[late])` });
  const record = controller.getState().record;
  const result = searchRecord(record, { query: 'late' });
  expect(result.hits[0]!.target.path.length).toBe(4001);
  expect(result.hits[0]!.moveNumber).toBe(4000);
  for (const options of [
    null,
    { query: 'x', limit: 101 },
    { query: 'x', offset: -1 },
    { query: 'x', properties: [] },
    { query: 'x', properties: ['C', 'C'] },
    { query: 'x', properties: ['c'] },
    { query: 'x', properties: Array(1) },
    { query: 'x', gameIndex: 2 },
    { query: 'x', unknown: true },
  ])
    expect(() => searchRecord(record, options as never)).toThrow(TypeError);
  expect(() =>
    searchRecord(record, { query: '', properties: ['B'], offset: 3950, limit: 50 }),
  ).toThrow(RangeError);
  expect(searchRecord(record, { query: '', properties: ['B'], offset: 3950, limit: 1 }).total).toBe(
    4000,
  );
});

test('comment previews are immutable and applying a cross-game batch emits once and preserves selection/export/rules', () => {
  const controller = new RecordController({
    sgf: String.raw`(;SZ[5]C[root]XX[a\:b];B[aa](;W[bb]C[first])(;W[cc]C[other]))(;SZ[9]C[second])`,
  });
  const initial = controller.getState();
  const first = recordNodeAt(initial.record, { gameIndex: 0, path: [0, 0] })!;
  const untouched = recordNodeAt(initial.record, { gameIndex: 0, path: [0, 1] })!;
  const second = initial.record.games[1]!;
  controller.goTo(first.id);
  const before = controller.getState();
  const ticket = controller.prepareExport();
  let notifications = 0;
  const dispose = controller.subscribe(() => notifications++);
  notifications = 0;
  const preview = controller.previewComments([
    { nodeId: first.id, text: 'new\r\n한국\tline', expectedText: 'first' },
    { nodeId: second.id, text: '', expectedText: 'second' },
  ]);
  expect(preview.ok).toBe(true);
  if (!preview.ok) throw Error(preview.reason);
  expect(preview.preview.edits).toEqual([
    { nodeId: first.id, before: 'first', after: 'new\n한국 line' },
    { nodeId: second.id, before: 'second', after: '' },
  ]);
  expect(Object.isFrozen(preview.preview)).toBe(true);
  expect(Object.isFrozen(preview.preview.edits[0])).toBe(true);
  expect(recordNodeAt(preview.preview.record, { gameIndex: 0, path: [0, 1] })).toBe(untouched);
  expect(controller.getState()).toBe(before);
  expect(notifications).toBe(0);
  controller.goTo(untouched.id); // Browsing does not stale a content preview.
  notifications = 0;
  expect(controller.applyComments(preview.preview)).toEqual({ ok: true });
  expect(notifications).toBe(1);
  expect(controller.getState().node.id).toBe(untouched.id);
  expect(controller.getState().dirty).toBe(true);
  expect(controller.getState().recordGeneration).toBe(before.recordGeneration);
  expect(controller.createCheckpoint().baselineSgf).toBe(ticket.text);
  expect(controller.prepareExport().text).toContain(String.raw`XX[a\:b]`);
  expect(controller.applyComments(preview.preview)).toEqual({ ok: false, reason: 'stale-preview' });
  expect(controller.undo()).toEqual({ ok: true });
  expect(controller.getState().record).toBe(initial.record);
  expect(controller.getState().dirty).toBe(false);
  expect(controller.getState().node.id).toBe(untouched.id);
  expect(controller.redo()).toEqual({ ok: true });
  expect(controller.inspectNode(first.id)!.node.properties.C).toEqual(['new\n한국 line']);
  expect(controller.getState().record.games[1]!.properties.C).toBeUndefined();
  dispose();
});

test('batch refusal and no-op preserve snapshots, active groups, redo and export tickets', () => {
  const controller = new RecordController({
    sgf: '(;SZ[5]C[base];B[aa]C[child])',
    limits: { maxValueLength: 12 },
  });
  const root = controller.getState().node;
  const child = root.children[0]!;
  const end = controller.beginEditGroup();
  controller.setComment('one');
  const before = controller.getState();
  const ticket = controller.prepareExport();
  for (const [changes, reason] of [
    [
      [
        { nodeId: root.id, text: 'changed' },
        { nodeId: 'missing', text: 'bad' },
      ],
      'node-not-found',
    ],
    [
      [
        { nodeId: root.id, text: 'a' },
        { nodeId: root.id, text: 'b' },
      ],
      'invalid-edit',
    ],
    [[{ nodeId: root.id, text: 'a', expectedText: 'base' }], 'stale-preview'],
    [
      [
        { nodeId: root.id, text: 'a' },
        { nodeId: child.id, text: 'x'.repeat(13) },
      ],
      'limit',
    ],
    [Array(1), 'invalid-edit'],
    [[{ nodeId: root.id, text: 'x', unexpected: true }], 'invalid-edit'],
  ] as const) {
    expect(controller.setComments(changes as never)).toMatchObject({ ok: false, reason });
    expect(controller.getState()).toBe(before);
  }
  expect(controller.setComments([{ nodeId: root.id, text: 'one' }])).toEqual({ ok: true });
  expect(controller.getState()).toBe(before);
  expect(controller.acknowledgeExport(ticket.id)).toEqual({ ok: true });
  controller.setComment('two');
  end();
  controller.undo();
  expect(controller.getState().node.properties.C).toEqual(['base']);
  const undone = controller.getState();
  expect(controller.setComments([])).toEqual({ ok: true });
  expect(controller.getState()).toBe(undone);
  expect(controller.getState().canRedo).toBe(true);
});

test('preview ownership/content freshness prevent stale or forged candidates from changing live state', () => {
  const first = new RecordController({ sgf: '(;C[base])' });
  const second = new RecordController({ sgf: '(;C[base])' });
  const result = first.previewComments([{ nodeId: first.getState().node.id, text: 'new' }]);
  if (!result.ok) throw Error(result.reason);
  expect(second.applyComments(result.preview)).toEqual({ ok: false, reason: 'invalid-edit' });
  expect(first.applyComments({ ...result.preview })).toEqual({ ok: false, reason: 'invalid-edit' });
  first.setComment('intervening');
  const state = first.getState();
  expect(first.applyComments(result.preview)).toEqual({ ok: false, reason: 'stale-preview' });
  expect(first.getState()).toBe(state);
  first.loadSgf('(;C[replacement])', { discardChanges: true });
  expect(first.applyComments(result.preview)).toEqual({ ok: false, reason: 'stale-preview' });
  first.dispose();
  expect(() => first.applyComments(result.preview)).toThrow('disposed');
});

test('deep multi-target batch rebuilds ancestors iteratively and rejects count/aggregate bounds atomically', () => {
  const controller = new RecordController({ sgf: `(;SZ[5]${';B[aa]'.repeat(4000)};C[late])` });
  const initial = controller.getState();
  const late = searchRecord(initial.record, { query: 'late' }).hits[0]!;
  expect(
    controller.setComments([
      { nodeId: late.nodeId, text: 'changed' },
      { nodeId: initial.node.id, text: 'root' },
    ]),
  ).toEqual({ ok: true });
  expect(
    searchRecord(controller.getState().record, { query: 'changed' }).hits[0]!.target.path.length,
  ).toBe(4001);
  expect(controller.getState().node.id).toBe(initial.node.id);
  controller.undo();
  expect(controller.getState().record).toBe(initial.record);
  expect(
    controller.setComments(
      Array.from({ length: 257 }, (_, index) => ({ nodeId: `n${index}`, text: 'x' })),
    ),
  ).toEqual({ ok: false, reason: 'limit' });
  const ids = searchRecord(initial.record, { query: '', properties: ['B'], limit: 20 }).hits.map(
    (hit) => hit.nodeId,
  );
  expect(
    controller.setComments(ids.map((nodeId) => ({ nodeId, text: 'x'.repeat(60_000) }))),
  ).toEqual({ ok: false, reason: 'limit' });
  expect(controller.getState().record).toBe(initial.record);
});
