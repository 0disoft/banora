import { expect, spyOn, test } from 'bun:test';
import { recordBoardBinding } from '../src/board-record.js';
import { RecordController } from '../src/controller.js';
import * as numbering from '../src/record-numbers.js';

test('deep comment edits and their Undo/Redo reuse isolated numbers without replaying nodes', () => {
  const controller = new RecordController({
    sgf: '(;SZ[19];B[aa];W[bb]' + ';B[];W[]'.repeat(2500) + ')',
  });
  const count = spyOn(numbering, 'numberNode');
  try {
    let last = controller.getState().node;
    while (last.children[0]) last = last.children[0];
    controller.goTo(last.id);
    const binding = recordBoardBinding(controller, false);
    const original = binding.getState();
    const expected = [...original.numbers()];
    expect(count).toHaveBeenCalledTimes(5003);
    expect(expected).toEqual([
      [0, 1],
      [20, 2],
    ]);
    (original.numbers() as Map<number, number>).set(99, 999);
    for (const text of ['comment a', 'comment ab']) {
      count.mockClear();
      expect(controller.setComment(text).ok).toBe(true);
      expect([...binding.getState().numbers()]).toEqual(expected);
      expect(count).toHaveBeenCalledTimes(0);
    }
    for (const action of [() => controller.undo(), () => controller.redo()]) {
      count.mockClear();
      expect(action().ok).toBe(true);
      expect([...binding.getState().numbers()]).toEqual(expected);
      expect(count).toHaveBeenCalledTimes(0);
    }
    expect(original.numbers().get(99)).toBe(999);
    controller.previous();
    binding.getState().numbers();
    count.mockClear();
    controller.next();
    expect([...binding.getState().numbers()]).toEqual(expected);
    expect(count).toHaveBeenCalledTimes(1);
  } finally {
    count.mockRestore();
    controller.dispose();
  }
});

test('batch comments retain direct-child reuse across replaced nodes, branches and delayed frames', () => {
  const controller = new RecordController({
    sgf: '(;SZ[9];B[aa](;W[bb]MN[10];B[])(;W[cc];B[dd]))(;SZ[52];B[tt])',
  });
  const count = spyOn(numbering, 'numberNode');
  try {
    const root = controller.getState().node;
    const black = root.children[0]!;
    const left = black.children[0]!;
    const right = black.children[1]!;
    controller.goTo(black.id);
    const binding = recordBoardBinding(controller, false);
    binding.getState().numbers();
    const delayed = binding.inspectNode(left.children[0]!.id)!;
    expect(
      controller.setComments([
        { nodeId: root.id, text: 'root' },
        { nodeId: left.id, text: 'left' },
        { nodeId: right.id, text: 'right' },
        { nodeId: controller.getState().record.games[1]!.id, text: 'other game' },
      ]).ok,
    ).toBe(true);
    count.mockClear();
    expect([...binding.getState().numbers()]).toEqual([[0, 1]]);
    expect(count).toHaveBeenCalledTimes(0);
    controller.next();
    count.mockClear();
    expect([...binding.getState().numbers()]).toEqual([
      [0, 1],
      [10, 10],
    ]);
    expect(count).toHaveBeenCalledTimes(1);
    controller.goTo(right.id);
    expect([...binding.getState().numbers()]).toEqual([
      [0, 1],
      [20, 2],
    ]);
    controller.goTo(controller.getState().record.games[1]!.children[0]!.id);
    expect([...binding.getState().numbers()]).toEqual([[1007, 1]]);
    expect([...delayed.numbers()]).toEqual([
      [0, 1],
      [10, 10],
    ]);
    expect(controller.undo().ok).toBe(true);
    expect(controller.getState().record.games[0]!.properties.C).toBeUndefined();
    expect(controller.getState().record.games[1]!.properties.C).toBeUndefined();
  } finally {
    count.mockRestore();
    controller.dispose();
  }
});

test('non-comment edits and imports with identical board/node IDs cannot inherit numbering', () => {
  const controller = new RecordController({ sgf: '(;SZ[9];B[aa]MN[10])' });
  const count = spyOn(numbering, 'numberNode');
  try {
    controller.next();
    const binding = recordBoardBinding(controller, false);
    const oldNodeId = controller.getState().node.id;
    const oldBoard = controller.getState().position.board;
    expect([...binding.getState().numbers()]).toEqual([[0, 10]]);
    controller.setMoveAssessment('good');
    count.mockClear();
    expect([...binding.getState().numbers()]).toEqual([[0, 10]]);
    expect(count).toHaveBeenCalledTimes(2);
    controller.undo();
    count.mockClear();
    expect([...binding.getState().numbers()]).toEqual([[0, 10]]);
    expect(count).toHaveBeenCalledTimes(2);
    expect(controller.loadSgf('(;SZ[9];B[aa]MN[42])', { discardChanges: true }).ok).toBe(true);
    controller.next();
    expect(controller.getState().node.id).toBe(oldNodeId);
    expect(controller.getState().position.board).toEqual(oldBoard);
    count.mockClear();
    expect([...binding.getState().numbers()]).toEqual([[0, 42]]);
    expect(count).toHaveBeenCalledTimes(2);
    expect(controller.setSetup([{ x: 0, y: 0, color: null }]).ok).toBe(true);
    expect([...binding.getState().numbers()]).toEqual([]);
  } finally {
    count.mockRestore();
    controller.dispose();
  }
});

test('previewed, stale and foreign comment batches preserve validated numbering boundaries', () => {
  const controller = new RecordController({ sgf: '(;SZ[9];B[aa]MN[10])' });
  const other = new RecordController({ sgf: '(;SZ[9];B[aa]MN[42])' });
  try {
    controller.next();
    const binding = recordBoardBinding(controller, false);
    const before = binding.getState();
    const preview = controller.previewComments([
      { nodeId: controller.getState().node.id, text: 'x' },
    ]);
    if (!preview.ok) throw Error('Invalid fixture');
    expect(binding.getState()).toBe(before);
    expect(other.applyComments(preview.preview)).toMatchObject({
      ok: false,
      reason: 'invalid-edit',
    });
    controller.setComment('newer');
    expect(controller.applyComments(preview.preview)).toMatchObject({
      ok: false,
      reason: 'stale-preview',
    });
    expect([...binding.getState().numbers()]).toEqual([[0, 10]]);
    expect([...before.numbers()]).toEqual([[0, 10]]);
    expect(controller.getState().node.properties.C).toEqual(['newer']);
  } finally {
    controller.dispose();
    other.dispose();
  }
});
