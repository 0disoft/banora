import { expect, spyOn, test } from 'bun:test';
import { RecordController } from '../src/controller.js';
import * as runtime from '../src/record-runtime.js';
import { stoneAt } from '../src/core.js';
import type { SgfNode } from '../src/sgf.js';
import type { Position } from '../src/core.js';

function leaf(node: SgfNode): SgfNode {
  while (node.children.length) node = node.children[0]!;
  return node;
}

test('alternating deep inspections retain completed positions without replay or navigation', () => {
  const tail = ';W[];B[]'.repeat(999) + ';W[]';
  const controller = new RecordController({ sgf: `(;SZ[19](;B[aa]${tail})(;B[ss]${tail}))` });
  const root = controller.getState();
  const ids = root.node.children.map((node) => leaf(node).id);
  const positions = ids.map((id) => controller.inspectNode(id)!.position);
  let notifications = 0;
  controller.subscribe(() => notifications++);
  const replay = spyOn(runtime, 'applyRecordNode');
  try {
    for (let i = 0; i < 4; i++) {
      for (let index = 0; index < ids.length; index++) {
        const inspected = controller.inspectNode(ids[index]!)!;
        expect(inspected.position).toBe(positions[index]!);
        expect(inspected.path.length).toBe(2001);
      }
    }
    expect(replay.mock.calls.length).toBe(0);
    expect(controller.getState()).toBe(root);
    expect(notifications).toBe(1);
    expect(stoneAt(positions[0]!, { x: 0, y: 0 })).toBe('black');
    expect(stoneAt(positions[1]!, { x: 0, y: 0 })).toBe(null);
    expect(stoneAt(positions[1]!, { x: 18, y: 18 })).toBe('black');
  } finally {
    replay.mockRestore();
    controller.dispose();
  }
});

test('alternating warm inspections reuse frozen paths without re-reading ancestors', () => {
  const tail = ';W[];B[]'.repeat(999) + ';W[]';
  const controller = new RecordController({ sgf: `(;SZ[19](;B[aa]${tail})(;B[ss]${tail}))` });
  const root = controller.getState();
  const ids = root.node.children.map((node) => leaf(node).id);
  const snapshots = ids.map((id) => controller.inspectNode(id)!);
  const get = Map.prototype.get;
  let parentReads = 0;
  const probe = spyOn(Map.prototype, 'get').mockImplementation(function (
    this: Map<unknown, unknown>,
    key,
  ) {
    const value = get.call(this, key);
    if (value === null || typeof value === 'string') parentReads++;
    return value;
  });
  try {
    for (let i = 0; i < 4; i++)
      for (let index = 0; index < ids.length; index++) {
        const state = controller.inspectNode(ids[index]!)!;
        expect(state.path).toBe(snapshots[index]!.path);
        expect(state.position).toBe(snapshots[index]!.position);
        expect(Object.isFrozen(state.path)).toBe(true);
      }
    expect(parentReads).toBe(0);
    expect(controller.getState()).toBe(root);
    expect(root.canUndo).toBe(false);
  } finally {
    probe.mockRestore();
    controller.dispose();
  }
});

test('position caches share the 128-entry budget and release all entries on disposal', () => {
  const controller = new RecordController({ sgf: '(;SZ[9]' + ';B[];W[]'.repeat(200) + ')' });
  const maps = new Set<Map<string, Position>>();
  let requested: Map<string, { position: Position; path: readonly string[] }> | undefined;
  const set = Map.prototype.set;
  const probe = spyOn(Map.prototype, 'set').mockImplementation(function (
    this: Map<unknown, unknown>,
    key,
    value,
  ) {
    const position =
      value && typeof value === 'object' && 'position' in value ? value.position : value;
    if (position !== value)
      requested = this as Map<string, { position: Position; path: readonly string[] }>;
    if (position && typeof position === 'object' && 'board' in position && 'moveNumber' in position)
      maps.add(this as Map<string, Position>);
    return set.call(this, key, value);
  });
  try {
    for (let i = 0; i < 400; i++) {
      expect(controller.next().ok).toBe(true);
      expect([...maps].reduce((sum, map) => sum + map.size, 0)).toBeLessThanOrEqual(128);
    }
    expect(maps.size).toBeGreaterThan(0);
    expect(requested!.size).toBe(8);
    expect([...requested!.values()].every((entry) => Object.isFrozen(entry.path))).toBe(true);
    controller.dispose();
    expect([...maps].every((map) => map.size === 0)).toBe(true);
  } finally {
    probe.mockRestore();
    controller.dispose();
  }
});

test('completed paths follow the existing eight-entry recency eviction order', () => {
  const controller = new RecordController({ sgf: `(;SZ[9]${'(;B[];W[])'.repeat(9)})` });
  const ids = controller.getState().node.children.map((node) => leaf(node).id);
  const paths = ids.slice(0, 8).map((id) => controller.inspectNode(id)!.path);
  expect(controller.inspectNode(ids[0]!)!.path).toBe(paths[0]!); // Refresh the oldest entry.
  controller.inspectNode(ids[8]!); // Evict endpoint 1, retaining endpoint 0.
  expect(controller.inspectNode(ids[0]!)!.path).toBe(paths[0]!);
  for (let index = 2; index < 8; index++)
    expect(controller.inspectNode(ids[index]!)!.path).toBe(paths[index]!);
  const evicted = controller.inspectNode(ids[1]!)!;
  expect(evicted.path).toEqual(paths[1]!);
  expect(evicted.path).not.toBe(paths[1]!);
  controller.dispose();
});

test('cached paths retain comment freshness and cannot survive replacement topology', () => {
  const controller = new RecordController({ sgf: '(;SZ[5];B[];W[])(;SZ[9];B[])' });
  const root = controller.getState();
  const id = leaf(root.node).id;
  const before = controller.inspectNode(id)!;
  expect(controller.loadSgf('broken')).toMatchObject({ ok: false });
  expect(controller.inspectNode(id)!.path).toBe(before.path);
  expect(controller.setComments([{ nodeId: id, text: 'fresh' }]).ok).toBe(true);
  const commented = controller.inspectNode(id)!;
  expect(commented.path).toBe(before.path);
  expect(commented.position).toBe(before.position);
  expect(commented.node.properties.C).toEqual(['fresh']);
  expect(before.node.properties.C).toBeUndefined();
  expect(controller.undo().ok).toBe(true);
  expect(controller.inspectNode(id)!.path).toEqual(before.path);
  expect(controller.redo().ok).toBe(true);
  expect(controller.inspectNode(id)!.node.properties.C).toEqual(['fresh']);
  expect(controller.loadSgf('(;SZ[5](;B[])(;W[]))(;SZ[9];B[])', { discardChanges: true }).ok).toBe(
    true,
  );
  const imported = controller.inspectNode(id)!;
  expect(imported.path).toEqual([root.node.id, id]);
  expect(imported.path).not.toBe(before.path);
  expect(before.path).toHaveLength(3);
  expect(controller.removeBranch(id).ok).toBe(true);
  expect(controller.inspectNode(id)).toBeNull();
  expect(controller.undo().ok).toBe(true);
  expect(controller.inspectNode(id)!.path).toEqual(imported.path);
  expect(imported.path).toHaveLength(2);
  controller.dispose();
  expect(() => controller.inspectNode(id)).toThrow('disposed');
});

test('completed positions are invalidated by edits, Undo, Redo and same-ID imports', () => {
  const source = '(;SZ[9]AB[aa];W[bb];B[dd])';
  const controller = new RecordController({ sgf: source });
  const root = controller.getState();
  const id = leaf(root.node).id;
  const before = controller.inspectNode(id)!.position;
  expect(controller.setSetup([{ x: 0, y: 0, color: null }]).ok).toBe(true);
  const changed = controller.inspectNode(id)!.position;
  expect(changed).not.toBe(before);
  expect(stoneAt(changed, { x: 0, y: 0 })).toBe(null);
  expect(controller.undo().ok).toBe(true);
  expect(stoneAt(controller.inspectNode(id)!.position, { x: 0, y: 0 })).toBe('black');
  expect(controller.redo().ok).toBe(true);
  expect(stoneAt(controller.inspectNode(id)!.position, { x: 0, y: 0 })).toBe(null);
  expect(controller.loadSgf(source.replace('AB[aa]', 'AB[cc]'), { discardChanges: true }).ok).toBe(
    true,
  );
  const imported = controller.inspectNode(id)!.position;
  expect(stoneAt(imported, { x: 0, y: 0 })).toBe(null);
  expect(stoneAt(imported, { x: 2, y: 2 })).toBe('black');
  expect(controller.goTo(id).ok).toBe(true);
  expect(controller.setComment('new comment').ok).toBe(true);
  expect(controller.getState().position).toBe(imported);
  expect(controller.getState().node.properties.C).toEqual(['new comment']);
  controller.dispose();
});

test('checkpoint rule replacement cannot reuse completed positions with previous rules', () => {
  const controller = new RecordController({ sgf: '(;SZ[9];B[aa];W[bb])' });
  const id = leaf(controller.getState().node).id;
  const before = controller.inspectNode(id)!.position;
  const checkpoint = controller.createCheckpoint();
  expect(
    controller.loadCheckpoint({
      ...checkpoint,
      rules: { ...checkpoint.rules, ko: 'situational-superko' },
    }).ok,
  ).toBe(true);
  const restored = controller.inspectNode(id)!.position;
  expect(restored).not.toBe(before);
  expect(restored.rules.ko).toBe('situational-superko');
  expect(stoneAt(restored, { x: 0, y: 0 })).toBe('black');
  controller.dispose();
});
