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
    reads = 0;
    while (controller.previous().ok) {
      const state = controller.getState();
      const projected = { ...state, record, node: observed.get(state.node.id)! };
      expect(variationPathKey(projected)).toBe('');
      const before = reads;
      expect(variationPathKey(projected)).toBe('');
      expect(reads).toBe(before);
    }
    expect(reads).toBe(nodes.length - 1);
  } finally {
    controller.dispose();
  }
});

test('backward fork keys remove only the departed branch and preserve comment provenance and jump fallback', () => {
  const controller = new RecordController({
    sgf: '(;SZ[9];B[aa](;W[bb];C[note](;B[];W[dd])(;B[ee];W[]))(;W[cc];B[ff]))',
  });
  const leaves: string[] = [];
  const pending = [...controller.getState().record.games];
  while (pending.length) {
    const node = pending.pop()!;
    if (node.children.length) pending.push(...node.children);
    else leaves.push(node.id);
  }
  const check = (expectedSlices?: number) => {
    const state = controller.getState();
    let slices = 0;
    const projected = {
      ...state,
      path: new Proxy(state.path, {
        get(target, property, receiver) {
          if (property === 'slice') slices++;
          return Reflect.get(target, property, receiver);
        },
      }),
    };
    expect(variationPathKey(projected)).toBe(fullKey(state));
    if (expectedSlices !== undefined) expect(slices).toBe(expectedSlices);
  };
  try {
    for (const id of leaves) {
      expect(controller.goTo(id).ok).toBe(true);
      check();
      // The checkpoint still has the pre-comment child object during the parent step.
      expect(controller.setComment('leaf metadata').ok).toBe(true);
      while (controller.previous().ok) check(0);
      expect(variationPathKey(controller.getState())).toBe('');
    }
    const black = controller.getState().node.children[0]!;
    const nested = black.children[0]!.children[0]!.children[0]!;
    const unrelated = black.children[1]!.children[0]!;
    expect(controller.goTo(nested.id).ok).toBe(true);
    check();
    expect(controller.goTo(unrelated.id).ok).toBe(true);
    // Exactly one level shallower, but not the checkpoint's parent.
    check(1);
    expect(controller.previous().ok).toBe(true);
    check(0);
    expect(controller.next().ok).toBe(true);
    check(0);
  } finally {
    controller.dispose();
  }
});

test('backward fork keys verify the cached parent without scanning a wide sibling list', () => {
  const controller = new RecordController({
    sgf: '(;SZ[9];B[aa]' + '(;W[])'.repeat(1000) + ')',
  });
  try {
    const parent = controller.getState().node.children[0]!;
    const leaf = parent.children.at(-1)!;
    expect(controller.goTo(leaf.id).ok).toBe(true);
    expect(variationPathKey(controller.getState())).toBe(leaf.id);
    expect(controller.previous().ok).toBe(true);
    const state = controller.getState();
    let indexedReads = 0;
    const children = new Proxy(state.node.children, {
      get(target, property, receiver) {
        if (typeof property === 'string' && /^\d+$/.test(property)) indexedReads++;
        return Reflect.get(target, property, receiver);
      },
    });
    expect(variationPathKey({ ...state, node: { ...state.node, children } })).toBe('');
    expect(indexedReads).toBe(0);
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
