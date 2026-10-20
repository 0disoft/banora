import { expect, test } from 'bun:test';
import { RecordController } from '../src/controller.js';
import { buildCommentBatch } from '../src/comment-batch.js';
import { parseSgf, serializeSgf } from '../src/sgf.js';
import type { SgfLimits } from '../src/sgf.js';
import { semanticRecord } from '../src/record-runtime.js';

const source = '(;SZ[9]XX[o\\:t][keep](;B[aa]C[a\\\nb])(;B[bb]))(;SZ[9];W[cc])';

test('single and batch comments agree with full candidate validation at strict limits', () => {
  const imported = parseSgf(source);
  if (!imported.ok) throw Error('Invalid fixture');
  const bytes = new TextEncoder().encode(serializeSgf(imported.record)).length;
  const limits: Partial<SgfLimits>[] = [
    { maxValueLength: 5 },
    { maxValueLength: 12, maxNodes: 6, maxDepth: 2 },
    { maxBytes: bytes + 14 },
    { maxBytes: bytes + 5, maxValueLength: 8, maxNodes: 6, maxDepth: 2 },
  ];
  for (const options of limits)
    for (const batch of [false, true]) {
      const controller = new RecordController({ sgf: source, limits: options });
      try {
        const root = controller.getState().node;
        // First establish canonical export validity, then exercise reused validation.
        expect(controller.setComment('w').ok).toBe(true);
        for (const text of [
          'a',
          '\\'.repeat(3),
          ']'.repeat(7),
          '한🙂',
          'ab',
          '',
          'a\nb',
          'x'.repeat(18),
        ]) {
          const before = controller.getState();
          const changes = batch
            ? [
                { nodeId: root.id, text },
                { nodeId: root.children[0]!.id, text },
                { nodeId: before.record.games[1]!.children[0]!.id, text },
              ]
            : [{ nodeId: root.id, text }];
          const preview = buildCommentBatch(before.record, changes);
          const full = parseSgf(serializeSgf(preview.record), options);
          const expected = preview.edits.length === 0 || full.ok;
          const result = batch ? controller.setComments(changes) : controller.setComment(text);
          expect(result.ok).toBe(expected);
          if (expected) {
            expect(semanticRecord(controller.getState().record)).toBe(
              semanticRecord(preview.record),
            );
            const reopened = parseSgf(serializeSgf(controller.getState().record), options);
            expect(reopened.ok).toBe(true);
          } else {
            expect(result).toMatchObject({ ok: false, reason: 'limit' });
            expect(controller.getState()).toBe(before);
          }
        }
      } finally {
        controller.dispose();
      }
    }
});

test('first comment validates canonical headers even when imported raw values fit', () => {
  for (const batch of [false, true]) {
    const controller = new RecordController({ sgf: '(;SZ[9])', limits: { maxValueLength: 4 } });
    try {
      const before = controller.getState();
      const result = batch
        ? controller.setComments([{ nodeId: before.node.id, text: 'a' }])
        : controller.setComment('a');
      expect(result).toMatchObject({
        ok: false,
        reason: 'limit',
        diagnostics: [{ code: 'limit' }],
      });
      expect(controller.getState()).toBe(before);
      expect(before.canUndo).toBe(false);
    } finally {
      controller.dispose();
    }
  }
});

test('comment validation retains raw C escapes, immutable previews and one-step Undo', () => {
  const controller = new RecordController({ sgf: '(;C[a\\\nb](;B[aa])(;B[bb]))(;C[other])' });
  try {
    const original = controller.getState();
    expect(controller.setComment('changed').ok).toBe(true);
    const warm = controller.getState();
    const result = controller.previewComments([
      { nodeId: warm.node.id, text: 'ab' },
      { nodeId: warm.record.games[1]!.id, text: '한글 ] \\' },
    ]);
    if (!result.ok) throw Error('Preview rejected');
    expect(controller.getState()).toBe(warm);
    expect(controller.applyComments(result.preview).ok).toBe(true);
    const text = serializeSgf(controller.getState().record);
    expect(text).toContain('C[a\\\nb]');
    expect(original.node.properties.C).toEqual(['ab']);
    expect(warm.node.properties.C).toEqual(['changed']);
    expect(controller.undo().ok).toBe(true);
    expect(controller.getState().record).toBe(warm.record);
    expect(controller.redo().ok).toBe(true);
    expect(controller.getState().record).toBe(result.preview.record);
    expect(parseSgf(text).ok).toBe(true);
  } finally {
    controller.dispose();
  }
});

test('structural edits still enforce depth and node limits after comment validation', () => {
  const controller = new RecordController({
    sgf: '(;SZ[9];B[aa])',
    limits: { maxNodes: 3, maxDepth: 1 },
  });
  try {
    expect(controller.setComment('w').ok).toBe(true);
    const before = controller.getState();
    expect(controller.play({ x: 1, y: 1 })).toMatchObject({ ok: false, reason: 'limit' });
    expect(controller.getState()).toBe(before);
    expect(controller.next().ok).toBe(true);
    expect(controller.play({ x: 1, y: 1 }).ok).toBe(true);
    expect(controller.setComment('another').ok).toBe(true);
    const full = controller.getState();
    expect(controller.play({ x: 2, y: 2 })).toMatchObject({ ok: false, reason: 'limit' });
    expect(controller.getState()).toBe(full);
  } finally {
    controller.dispose();
  }
});

test('UTF-8 byte boundaries remain exact and refusal retains history and export tickets', () => {
  const original = '(;SZ[9])';
  const parsed = parseSgf('(;SZ[9]C[한🙂])');
  if (!parsed.ok) throw Error('Invalid fixture');
  const maxBytes = new TextEncoder().encode(serializeSgf(parsed.record)).length;
  const controller = new RecordController({ sgf: original, limits: { maxBytes } });
  try {
    const end = controller.beginEditGroup();
    expect(controller.setComment('w').ok).toBe(true);
    expect(controller.setComment('한🙂').ok).toBe(true);
    const before = controller.getState(),
      ticket = controller.prepareExport();
    let notifications = 0;
    const unsubscribe = controller.subscribe(() => notifications++);
    notifications = 0;
    for (const batch of [false, true]) {
      const result = batch
        ? controller.setComments([{ nodeId: before.node.id, text: '한🙂x' }])
        : controller.setComment('한🙂x');
      expect(result).toMatchObject({
        ok: false,
        reason: 'limit',
        diagnostics: [{ code: 'limit' }],
      });
      expect(controller.getState()).toBe(before);
      expect(notifications).toBe(0);
    }
    expect(controller.acknowledgeExport(ticket.id).ok).toBe(true);
    end();
    expect(controller.undo().ok).toBe(true);
    expect(controller.getState().node.properties.C).toBeUndefined();
    expect(controller.redo().ok).toBe(true);
    expect(controller.getState().dirty).toBe(false);
    unsubscribe();
  } finally {
    controller.dispose();
  }
});

test('import and checkpoint replacement cannot reuse proof from a different record', () => {
  const controller = new RecordController({ sgf: '(;SZ[9])', limits: { maxValueLength: 5 } });
  try {
    expect(controller.setComment('w').ok).toBe(true);
    expect(controller.setComment('again').ok).toBe(true);
    const checkpoint = controller.createCheckpoint();
    expect(controller.loadSgf('(;SZ[9]XX[new];B[aa])', { discardChanges: true }).ok).toBe(true);
    expect(controller.setComment('new').ok).toBe(true);
    const before = controller.getState();
    expect(controller.setComment('\\'.repeat(3))).toMatchObject({ ok: false, reason: 'limit' });
    expect(controller.getState()).toBe(before);
    expect(controller.loadCheckpoint(checkpoint, { discardChanges: true }).ok).toBe(true);
    expect(controller.setComment('fresh').ok).toBe(true);
    expect(controller.setComment('\\'.repeat(3))).toMatchObject({ ok: false, reason: 'limit' });
    expect(controller.getState().node.properties.C).toEqual(['fresh']);
  } finally {
    controller.dispose();
  }
});
