import { expect, test } from 'bun:test';
import { buildCommentBatch, CommentBatchError } from '../src/comment-batch.js';
import type { CommentChange } from '../src/comment-batch.js';
import { RecordController } from '../src/controller.js';
import { indexRecord } from '../src/record-runtime.js';
import { parseSgf, serializeSgf } from '../src/sgf.js';

const source =
  '(;SZ[9]C[a\\\nb]XX[keep];B[aa](;W[bb]C[left];B[cc])(;W[dd];B[ee]))(;SZ[13]C[other];B[ff])';

test('indexed single previews match full traversal for every root, branch, normalization and refusal', () => {
  const parsed = parseSgf(source);
  if (!parsed.ok) throw Error('Invalid fixture');
  const record = parsed.record,
    index = indexRecord(record);
  const unchanged = serializeSgf(record);
  const plans: readonly CommentChange[][] = [
    [],
    [{ nodeId: 'missing', text: 'new' }],
    ...[...index.nodes.values()].flatMap((node) => [
      [{ nodeId: node.id, text: 'new\r\n한국\t]\\', expectedText: node.properties.C?.[0] ?? '' }],
      [{ nodeId: node.id, text: '' }],
      [{ nodeId: node.id, text: node.properties.C?.[0] ?? '' }],
      [{ nodeId: node.id, text: 'new', expectedText: 'wrong expected text' }],
    ]),
  ];
  for (const changes of plans) {
    const run = (indexed: boolean) => {
      try {
        return buildCommentBatch(record, changes, indexed ? index : undefined);
      } catch (error) {
        if (!(error instanceof CommentBatchError)) throw error;
        return error.reason;
      }
    };
    const full = run(false),
      indexed = run(true);
    if (typeof full === 'string') expect(indexed).toBe(full);
    else {
      if (typeof indexed === 'string') throw Error(indexed);
      expect(indexed.source).toBe(record);
      expect(indexed.edits).toEqual(full.edits);
      expect(serializeSgf(indexed.record)).toBe(serializeSgf(full.record));
      expect(Object.isFrozen(indexed.record)).toBe(true);
      expect(Object.isFrozen(indexed.edits)).toBe(true);
      if (full.record === record) expect(indexed.record).toBe(record);
      else {
        const complete = indexRecord(full.record),
          current = indexRecord(indexed.record);
        for (const [id, original] of index.nodes)
          if (complete.nodes.get(id) === original) expect(current.nodes.get(id)).toBe(original);
      }
    }
    expect(serializeSgf(record)).toBe(unchanged);
  }
});

test('indexed controller previews preserve the 50000-node work limit and rejection precedence', () => {
  const controller = new RecordController({
    sgf: `(;SZ[5]C[base]${';B[]'.repeat(50_000)})`,
    limits: { maxNodes: 50_001 },
  });
  try {
    const before = controller.getState();
    for (const changes of [
      [],
      [{ nodeId: before.node.id, text: 'new' }],
      [{ nodeId: 'missing', text: 'new' }],
    ]) {
      expect(controller.previewComments(changes)).toMatchObject({ ok: false, reason: 'limit' });
      expect(controller.getState()).toBe(before);
    }
    expect(
      controller.previewComments([{ nodeId: before.node.id, text: 'new', expectedText: 'stale' }]),
    ).toMatchObject({ ok: false, reason: 'stale-preview' });
    expect(controller.getState()).toBe(before);
    expect(before.canUndo).toBe(false);
    expect(before.dirty).toBe(false);
  } finally {
    controller.dispose();
  }
});
