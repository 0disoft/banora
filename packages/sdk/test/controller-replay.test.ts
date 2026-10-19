import { expect, test } from 'bun:test';
import { RecordController } from '../src/controller.js';
import type { ControllerState } from '../src/controller.js';
import { recordNodeAt, serializeSgf } from '../src/sgf.js';

function expectColdReplay(state: ControllerState): void {
  let node = state.record.games[state.gameIndex]!;
  const path = state.path.slice(1).map((id) => {
    const index = node.children.findIndex((child) => child.id === id);
    node = node.children[index]!;
    return index;
  });
  const fresh = new RecordController({
    sgf: serializeSgf(state.record),
    rules: state.position.rules,
  });
  try {
    const target = recordNodeAt(fresh.getState().record, { gameIndex: state.gameIndex, path })!;
    expect(fresh.goTo(target.id).ok).toBe(true);
    expect(state.position).toEqual(fresh.getState().position);
    expect(fresh.getState().node.properties).toMatchObject(state.node.properties);
    expect(Object.isFrozen(state.path)).toBe(true);
  } finally {
    fresh.dispose();
  }
}

test('warm and evicted controller replay preserves captures, passes, setup, move overrides and collection branches', () => {
  const sgf =
    '(;SZ[5]PL[B]AB[aa][bb][cc]AW[ab][ba];B[ca];W[];B[];W[dd]MN[50]' +
    ';C[Review position]'.repeat(180) +
    '(;B[ee]TR[ee])(;AE[bb]PL[W]MN[100];W[]))(;SZ[9]AB[hh];W[])';
  const controller = new RecordController({
    sgf,
    rules: { ko: 'situational-superko', suicide: 'forbid', passStones: true },
  });
  try {
    const original = controller.getState();
    const longPath = Array(184).fill(0);
    const targets = [
      [],
      [0],
      [0, 0],
      [0, 0, 0],
      [0, 0, 0, 0],
      longPath,
      [...longPath, 0],
      [...longPath, 1],
    ];
    let notifications = 0;
    const unsubscribe = controller.subscribe(() => notifications++);
    for (const path of targets) {
      const node = recordNodeAt(original.record, { gameIndex: 0, path })!;
      expect(node).toBeDefined();
      const inspected = controller.inspectNode(node.id)!;
      expectColdReplay(inspected);
      if (path.length === 1) expect(inspected.position.captures.black).toBe(1);
      if (path.length === 3)
        expect(inspected.position.passPrisoners).toEqual({ black: 1, white: 1 });
      if (path.length === 4) expect(inspected.position.moveNumber).toBe(50);
    }
    const other = recordNodeAt(original.record, { gameIndex: 1, path: [0] })!;
    expectColdReplay(controller.inspectNode(other.id)!);
    expect(controller.getState()).toBe(original);
    expect(notifications).toBe(1);
    unsubscribe();
    const tail = recordNodeAt(original.record, { gameIndex: 0, path: [...longPath, 1] })!;
    expect(controller.goTo(tail.id).ok).toBe(true);
    const held = controller.getState();
    expect(held.position.moveNumber).toBe(100);
    expect(controller.previous().ok && controller.next(1).ok).toBe(true);
    expectColdReplay(controller.getState());
    expect(held.position.moveNumber).toBe(100);
    expect(held.path).toEqual(controller.getState().path);
    expect(controller.getState().dirty).toBe(false);
  } finally {
    controller.dispose();
  }
});

test('cached positions cannot survive setup edits, Undo, import or checkpoint policy replacement', () => {
  const controller = new RecordController({ sgf: '(;SZ[5]AB[aa];B[bb];W[])' });
  try {
    controller.next();
    controller.next();
    expectColdReplay(controller.getState());
    expect(controller.setComment('keep warmed history').ok).toBe(true);
    const root = controller.getState().record.games[0]!.id;
    controller.goTo(root);
    expect(controller.setSetup([{ x: 2, y: 2, color: 'white' }], 'black').ok).toBe(true);
    controller.next();
    controller.next();
    expectColdReplay(controller.getState());
    expect(controller.getState().position.board[12]).toBe('white');
    expect(controller.undo().ok).toBe(true);
    expectColdReplay(controller.getState());
    const restored = new RecordController({
      sgf: '(;SZ[9];B[];W[])',
      rules: { ko: 'positional-superko', passStones: true },
    });
    restored.next();
    restored.next();
    const checkpoint = restored.createCheckpoint();
    restored.dispose();
    expect(controller.loadCheckpoint(checkpoint, { discardChanges: true }).ok).toBe(true);
    expectColdReplay(controller.getState());
    expect(controller.getState().position.passPrisoners).toEqual({ black: 1, white: 1 });
    expect(controller.loadSgf('(;SZ[13]PL[W];W[aa])').ok).toBe(true);
    controller.next();
    expectColdReplay(controller.getState());
    expect(controller.getState().position.width).toBe(13);
    expect(controller.getState().position.board[0]).toBe('white');
  } finally {
    controller.dispose();
  }
});

test('single and cross-game batch comments retain bounded warm positions without changing replay history', () => {
  const controller = new RecordController({
    sgf: '(;SZ[5]AB[aa];B[bb]' + ';W[];B[]'.repeat(300) + ')(;SZ[9];W[hh])',
    rules: { ko: 'situational-superko', passStones: true },
  });
  try {
    const root = controller.getState().record.games[0]!;
    let tail = root;
    while (tail.children[0]) tail = tail.children[0];
    const other = controller.getState().record.games[1]!.children[0]!;
    expect(controller.goTo(tail.id).ok).toBe(true);
    const before = controller.getState();
    const otherPosition = controller.inspectNode(other.id)!.position;
    controller.beginEditGroup();
    expect(controller.setComment('first').ok).toBe(true);
    expect(controller.getState().position).toBe(before.position);
    expect(controller.setComment('final').ok).toBe(true);
    controller.endEditGroup();
    expect(controller.getState().position).toBe(before.position);
    expect(before.node.properties.C).toBeUndefined();
    expect(
      controller.setComments([
        { nodeId: root.id, text: 'root comment' },
        { nodeId: tail.id, text: 'tail batch' },
        { nodeId: other.id, text: 'other game' },
      ]).ok,
    ).toBe(true);
    expect(controller.getState().position).toBe(before.position);
    expect(controller.inspectNode(other.id)!.position).toBe(otherPosition);
    expectColdReplay(controller.getState());
    expectColdReplay(controller.inspectNode(other.id)!);
    expect(controller.undo().ok).toBe(true);
    expect(controller.getState().node.properties.C).toEqual(['final']);
    expectColdReplay(controller.getState());
    expect(controller.undo().ok).toBe(true);
    expect(controller.getState().dirty).toBe(false);
    expectColdReplay(controller.getState());
    expect(controller.redo().ok && controller.redo().ok).toBe(true);
    expect(controller.getState().node.properties.C).toEqual(['tail batch']);
    expectColdReplay(controller.getState());
  } finally {
    controller.dispose();
  }
});
