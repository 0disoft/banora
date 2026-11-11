import { expect, test } from 'bun:test';
import { RecordController } from '../src/controller.js';
import type { ControllerState } from '../src/controller.js';
import type { SgfNode } from '../src/sgf.js';
import { variationPathKey } from '../src/variations.js';

function fullKey(state: ControllerState): string {
  let node = state.record.games[state.gameIndex]!;
  const chosen: string[] = [];
  for (let i = 1; i < state.path.length; i++) {
    const id = state.path[i]!;
    if (node.children.length > 1) chosen.push(id);
    node = node.children.find((child) => child.id === id)!;
  }
  return chosen.join('/');
}

test('linear fork-key work stays linear and repeated frames do not read children', () => {
  const controller = new RecordController({ sgf: '(;SZ[9]' + ';B[];W[]'.repeat(500) + ')' });
  try {
    const nodes: SgfNode[] = [];
    for (let node: SgfNode | undefined = controller.getState().node; node; node = node.children[0])
      nodes.push(node);
    let reads = 0;
    let child: SgfNode | undefined;
    const observed = new Map<string, SgfNode>();
    for (let i = nodes.length - 1; i >= 0; i--) {
      const children = child ? [child] : [];
      child = {
        ...nodes[i]!,
        get children() {
          reads++;
          return children;
        },
      };
      observed.set(child.id, child);
    }
    const record = { games: [child!] };
    do {
      const state = controller.getState();
      const projected = { ...state, record, node: observed.get(state.node.id)! };
      expect(variationPathKey(projected)).toBe('');
      const before = reads;
      expect(variationPathKey(projected)).toBe('');
      expect(reads).toBe(before);
    } while (controller.next().ok);
    expect(reads).toBeLessThanOrEqual(2 * (nodes.length - 1));
  } finally {
    controller.dispose();
  }
});

test('fork keys match cold traversal across nested forks, old states, games and controllers', () => {
  const controller = new RecordController({
    sgf: '(;SZ[9];B[aa](;W[bb]MN[10];C[note](;B[];W[dd])(;B[ee];W[]))(;W[cc];B[ff]))(;SZ[13];B[ll])',
  });
  const other = new RecordController({ sgf: '(;SZ[9](;B[aa])(;B[bb]))' });
  try {
    const pending = [...controller.getState().record.games];
    const states: ControllerState[] = [];
    while (pending.length) {
      const node = pending.pop()!;
      controller.goTo(node.id);
      const state = controller.getState();
      expect(variationPathKey(state)).toBe(fullKey(state));
      expect(variationPathKey(state)).toBe(fullKey(state));
      states.push(state);
      pending.push(...[...node.children].reverse());
    }
    other.next();
    for (const state of states.reverse()) {
      expect(variationPathKey(other.getState())).toBe(fullKey(other.getState()));
      expect(variationPathKey(state)).toBe(fullKey(state));
    }
  } finally {
    controller.dispose();
    other.dispose();
  }
});

test('comment-only provenance retains keys but branch edits and same-ID imports invalidate them', () => {
  const controller = new RecordController({
    sgf: '(;SZ[9];B[aa](;W[bb];B[])(;W[cc];B[dd]))(;SZ[13];B[ll])',
  });
  let slices = 0;
  const current = () => {
    const state = controller.getState();
    return {
      ...state,
      path: new Proxy(state.path, {
        get(target, property, receiver) {
          if (property === 'slice') slices++;
          return Reflect.get(target, property, receiver);
        },
      }),
    };
  };
  const check = (expectedSlices: number) => {
    slices = 0;
    const state = current();
    expect(variationPathKey(state)).toBe(fullKey(state));
    expect(slices).toBe(expectedSlices);
  };
  try {
    controller.next();
    const black = controller.getState().node;
    check(1);
    expect(controller.setComments([{ nodeId: black.children[0]!.id, text: 'left' }]).ok).toBe(true);
    controller.next();
    check(0); // New child object, unchanged C-only topology.
    controller.next();
    check(0);
    expect(controller.setComment('current').ok).toBe(true);
    check(0);
    expect(
      controller.setComments([
        { nodeId: controller.getState().record.games[0]!.id, text: 'root' },
        { nodeId: controller.getState().record.games[1]!.id, text: 'other game' },
      ]).ok,
    ).toBe(true);
    check(0);
    expect(controller.undo().ok).toBe(true);
    check(0);
    expect(controller.redo().ok).toBe(true);
    check(0);
    expect(controller.removeBranch(black.children[1]!.id).ok).toBe(true);
    check(1);
    expect(variationPathKey(current())).toBe('');
    expect(controller.undo().ok).toBe(true);
    check(1);
    expect(controller.redo().ok).toBe(true);
    check(1);
    controller.goTo(black.id);
    check(1);
    expect(variationPathKey(current())).toBe('');
    expect(controller.loadSgf('(;SZ[9](;B[aa])(;B[bb]))', { discardChanges: true }).ok).toBe(true);
    controller.next();
    expect(controller.getState().node.id).toBe(black.id);
    check(1);
    expect(variationPathKey(current())).toBe(black.id);
  } finally {
    controller.dispose();
  }
});
