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

test('position caches share the 128-entry budget and release all entries on disposal', () => {
  const controller = new RecordController({ sgf: '(;SZ[9]' + ';B[];W[]'.repeat(200) + ')' });
  const maps = new Set<Map<string, Position>>();
  const set = Map.prototype.set;
  const probe = spyOn(Map.prototype, 'set').mockImplementation(function (
    this: Map<unknown, unknown>,
    key,
    value,
  ) {
    if (value && typeof value === 'object' && 'board' in value && 'moveNumber' in value)
      maps.add(this as Map<string, Position>);
    return set.call(this, key, value);
  });
  try {
    for (let i = 0; i < 400; i++) {
      expect(controller.next().ok).toBe(true);
      expect([...maps].reduce((sum, map) => sum + map.size, 0)).toBeLessThanOrEqual(128);
    }
    expect(maps.size).toBeGreaterThan(0);
    controller.dispose();
    expect([...maps].every((map) => map.size === 0)).toBe(true);
  } finally {
    probe.mockRestore();
    controller.dispose();
  }
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
