import { expect, test } from 'bun:test';
import { RecordController } from '../src/controller.js';
import { buildCommentBatch } from '../src/comment-batch.js';
import { indexRecord, refreshCommentIndex } from '../src/record-runtime.js';
import { parseSgf, serializeSgf } from '../src/sgf.js';

const source =
  '(;SZ[9]C[root];B[aa](;W[bb]C[left];B[cc])(;W[dd];B[ee]))(;SZ[13];B[ff];W[gg]C[other])';

test('comment index refresh agrees with complete indexing across roots and nested branches', () => {
  const parsed = parseSgf(source);
  if (!parsed.ok) throw Error('Invalid fixture');
  let record = parsed.record;
  const index = indexRecord(record),
    parents = index.parents,
    games = index.games;
  const root = record.games[0]!,
    left = root.children[0]!.children[0]!;
  const other = record.games[1]!.children[0]!.children[0]!;
  const unchanged = root.children[0]!.children[1]!;
  for (const text of ['updated', '', 'root', 'another']) {
    const previous = record;
    record = buildCommentBatch(record, [
      { nodeId: root.id, text },
      { nodeId: left.id, text },
      { nodeId: other.id, text },
    ]).record;
    refreshCommentIndex(index, record);
    const complete = indexRecord(record);
    expect(index.nodes.size).toBe(complete.nodes.size);
    for (const [id, node] of complete.nodes) expect(index.nodes.get(id)).toBe(node);
    expect(index.parents).toBe(parents);
    expect(index.games).toBe(games);
    expect([...index.parents]).toEqual([...complete.parents]);
    expect([...index.games]).toEqual([...complete.games]);
    expect(index.nodes.get(unchanged.id)).toBe(unchanged);
    expect(previous.games[0]).not.toBe(record.games[0]);
  }
  expect(parsed.record.games[0]!.properties.C).toEqual(['root']);
  expect(parsed.record.games[1]!.children[0]!.children[0]!.properties.C).toEqual(['other']);
});

test('comment commits keep navigation and immutable snapshots current through batches, history and structural edits', () => {
  const controller = new RecordController({ sgf: source });
  try {
    const original = controller.getState();
    const root = original.node,
      fork = root.children[0]!;
    const left = fork.children[0]!,
      right = fork.children[1]!;
    const other = original.record.games[1]!.children[0]!.children[0]!;
    expect(controller.goTo(left.id).ok).toBe(true);
    const before = controller.getState();
    const result = controller.previewComments([
      { nodeId: root.id, text: 'new root' },
      { nodeId: fork.id, text: 'fork comment' },
      { nodeId: right.id, text: 'sibling comment' },
      { nodeId: other.id, text: 'second game' },
    ]);
    if (!result.ok) throw Error('Preview refused');
    expect(controller.getState()).toBe(before);
    expect(controller.applyComments(result.preview).ok).toBe(true);
    const updated = controller.getState().record;
    expect(controller.getState().node).toBe(left);
    expect(controller.previous().ok).toBe(true);
    expect(controller.getState().node).toBe(updated.games[0]!.children[0]!);
    expect(controller.getState().node.properties.C).toEqual(['fork comment']);
    expect(controller.next(1).ok).toBe(true);
    expect(controller.getState().node.properties.C).toEqual(['sibling comment']);
    expect(controller.setComment('single edit').ok).toBe(true);
    expect(controller.getState().node.properties.C).toEqual(['single edit']);
    expect(controller.goTo(other.id).ok).toBe(true);
    expect(controller.getState().gameIndex).toBe(1);
    expect(controller.getState().node.properties.C).toEqual(['second game']);
    expect(controller.undo().ok).toBe(true);
    expect(controller.getState().record).toBe(updated);
    expect(controller.undo().ok).toBe(true);
    expect(controller.getState().record).toBe(original.record);
    expect(controller.getState().dirty).toBe(false);
    expect(controller.redo().ok).toBe(true);
    expect(controller.getState().record).toBe(updated);
    expect(controller.goTo(right.id).ok).toBe(true);
    expect(controller.play({ x: 6, y: 6 }).ok).toBe(true);
    expect(controller.getState().node.properties.B).toEqual(['gg']);
    expect(controller.setComment('new branch').ok).toBe(true);
    expect(controller.previous().ok).toBe(true);
    expect(
      controller.getState().node.children.some((child) => child.properties.C?.[0] === 'new branch'),
    ).toBe(true);
    expect(serializeSgf(original.record)).toContain('C[root]');
    expect(original.node.children[0]!.properties.C).toBeUndefined();
    expect(parseSgf(serializeSgf(controller.getState().record)).ok).toBe(true);
  } finally {
    controller.dispose();
  }
});
