import { expect, test } from 'bun:test';
import { RecordController } from '@0disoft/banora';
import { applySetupPoint } from '../examples/studio/setup-editing.js';

test('unchanged point tools preserve a move node, clean state and Undo history', () => {
  const controller = new RecordController({ sgf: '(;SZ[9];B[aa])' });
  controller.next();
  const before = controller.getState();
  expect(applySetupPoint(controller, { x: 1, y: 1 }, null)).toBeUndefined();
  expect(applySetupPoint(controller, { x: 0, y: 0 }, 'black')).toBeUndefined();
  expect(controller.getState()).toBe(before);
  expect(before.canUndo).toBe(false);
});

test('identical plain setup children are reused without merging authored alternatives', () => {
  const controller = new RecordController({ sgf: '(;SZ[9];B[aa](;AE[aa])(;AE[aa]C[keep]))' });
  controller.next();
  const before = controller.getState();
  const action = applySetupPoint(controller, { x: 0, y: 0 }, null);
  expect(action?.result.ok).toBe(true);
  expect(action?.operation).toBe('navigate');
  expect(controller.getState().node.id).toBe(before.node.children[0]!.id);
  expect(controller.getState().record).toBe(before.record);
  expect(controller.getState().canUndo).toBe(false);
  const authored = new RecordController({ sgf: '(;SZ[9];B[aa];AE[aa]N[Authored]C[keep])' });
  authored.next();
  expect(applySetupPoint(authored, { x: 0, y: 0 }, null)?.operation).toBe('edit');
  expect(authored.getState().record.games[0]!.children[0]!.children).toHaveLength(2);
  expect(authored.getState().record.games[0]!.children[0]!.children[0]!.properties.C).toEqual([
    'keep',
  ]);
});

test('consecutive real setup changes reuse one node and round-trip with per-edit Undo', () => {
  const controller = new RecordController({ sgf: '(;SZ[9]AB[aa][bb];W[cc])' });
  controller.next();
  const original = controller.getState().node.id;
  applySetupPoint(controller, { x: 2, y: 2 }, null);
  const setupId = controller.getState().node.id;
  applySetupPoint(controller, { x: 1, y: 1 }, null);
  expect(controller.getState().node.id).toBe(setupId);
  expect(controller.getState().node.properties.AE).toEqual(['bb', 'cc']);
  const reopened = new RecordController({ sgf: controller.prepareExport().text });
  reopened.next();
  reopened.next();
  expect(reopened.getState().position.board).toEqual(controller.getState().position.board);
  controller.undo();
  expect(controller.getState().node.properties.AE).toEqual(['cc']);
  controller.undo();
  expect(controller.getState().node.id).toBe(original);
  expect(controller.getState().dirty).toBe(false);
});
