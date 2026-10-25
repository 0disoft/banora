import { expect, spyOn, test } from 'bun:test';
import { RecordController } from '@0disoft/banora';
import { recordParent } from '../examples/studio/record-parent.js';

test('promotion parent follows the selected game and branch, including root boundaries', () => {
  const controller = new RecordController({
    sgf: '(;SZ[9](;B[aa];W[bb])(;B[cc];W[dd]))(;SZ[13];B[ee])',
  });
  try {
    const roots = controller.getState().record.games;
    expect(recordParent(controller.getState())).toBeUndefined();
    for (const parent of roots[0]!.children) {
      controller.goTo(parent.children[0]!.id);
      expect(recordParent(controller.getState())).toBe(parent);
    }
    controller.goTo(roots[1]!.children[0]!.id);
    expect(recordParent(controller.getState())).toBe(roots[1]);
    controller.goTo(roots[1]!.id);
    expect(recordParent(controller.getState())).toBeUndefined();
  } finally {
    controller.dispose();
  }
});

test('promotion parent never visits unrelated descendants or replays the controller', () => {
  const controller = new RecordController({ sgf: '(;SZ[9](;B[aa];W[bb])(;B[cc];W[dd]))' });
  const root = controller.getState().record.games[0]!;
  const parent = root.children[0]!;
  controller.goTo(parent.children[0]!.id);
  const state = controller.getState();
  const guarded = {
    ...state,
    record: {
      games: [
        {
          ...root,
          children: [
            parent,
            {
              ...root.children[1]!,
              get children(): never {
                throw Error('Unrelated descendants were visited');
              },
            },
          ],
        },
      ],
    },
  };
  const inspect = spyOn(controller, 'inspectNode').mockImplementation(() => {
    throw Error('Unexpected board replay');
  });
  try {
    expect(recordParent(guarded)).toBe(parent);
    expect(controller.getState()).toBe(state);
    expect(state.dirty).toBe(false);
    expect(state.canUndo).toBe(false);
  } finally {
    inspect.mockRestore();
    controller.dispose();
  }
  expect(recordParent(guarded)).toBe(parent);
});

test('promotion parent uses the current immutable record after edits, undo and branch reorder', () => {
  const controller = new RecordController({ sgf: '(;SZ[9](;B[aa];W[bb])(;B[cc]))' });
  try {
    const parent = controller.getState().record.games[0]!.children[0]!;
    const selected = parent.children[0]!.id;
    controller.goTo(parent.id);
    controller.setComment('Updated parent');
    controller.goTo(selected);
    expect(recordParent(controller.getState())?.properties.C).toEqual(['Updated parent']);
    controller.undo();
    controller.goTo(selected);
    expect(recordParent(controller.getState())).toBe(parent);
    controller.reorderBranch(parent.id, 1);
    expect(recordParent(controller.getState())).toBe(parent);
    expect(controller.getState().record.games[0]!.children[1]).toBe(parent);
  } finally {
    controller.dispose();
  }
});

test('promotion parent handles a deep linear record iteratively', () => {
  const controller = new RecordController({ sgf: '(;SZ[9]' + ';B[];W[]'.repeat(5000) + ')' });
  try {
    let node = controller.getState().record.games[0]!,
      parent = node;
    while (node.children.length) {
      parent = node;
      node = node.children[0]!;
    }
    controller.goTo(node.id);
    expect(recordParent(controller.getState())).toBe(parent);
    expect(controller.getState().path.length).toBe(10001);
  } finally {
    controller.dispose();
  }
});
