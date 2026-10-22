import { expect, spyOn, test } from 'bun:test';
import * as checkpoint from '@0disoft/banora/checkpoint';
import * as sdkCheckpoint from '../packages/sdk/src/checkpoint.js';
import { RecordController } from '../packages/sdk/src/controller.js';
import { prepareDraftRestore } from '../examples/studio/restore-input.js';

test('restore preparation parses once, owns input and retains final controller validation', () => {
  const source = new RecordController({ sgf: '(;SZ[9];B[aa])' });
  const target = new RecordController({ size: 5 });
  const limited = new RecordController({ size: 5, limits: { maxNodes: 1 } });
  source.next();
  source.setComment('pending');
  const input = JSON.parse(
    JSON.stringify({
      schemaVersion: 'banora.studio-draft/v1',
      id: 'draft',
      filename: 'review.sgf',
      revision: 1,
      updatedAt: 1,
      checkpoint: source.createCheckpoint(),
    }),
  );
  const prepareParser = spyOn(checkpoint, 'parseRecordCheckpoint');
  const finalParser = spyOn(sdkCheckpoint, 'parseRecordCheckpoint');
  try {
    const prepared = prepareDraftRestore(input);
    expect(prepareParser).toHaveBeenCalledTimes(1);
    expect(finalParser).toHaveBeenCalledTimes(0);
    expect(Object.isFrozen(prepared.checkpoint)).toBe(true);
    input.checkpoint.selection.path[0] = 999;
    input.checkpoint.rules.ko = 'none';
    input.checkpoint.sgf = '(;SZ[5])';
    expect(prepared.checkpoint.selection.path).toEqual([0]);
    expect(target.loadCheckpoint(prepared.checkpoint).ok).toBe(true);
    expect(finalParser).toHaveBeenCalledTimes(1);
    expect(prepareParser).toHaveBeenCalledTimes(1);
    expect(target.getState().node.properties.C).toEqual(['pending']);
    expect(target.getState().dirty).toBe(true);
    expect(target.getState().canUndo).toBe(false);
    const before = limited.getState();
    expect(limited.loadCheckpoint(prepared.checkpoint).ok).toBe(false);
    expect(limited.getState()).toBe(before);
    target.setComment('keep');
    const dirty = target.getState();
    expect(target.loadCheckpoint(prepared.checkpoint)).toEqual({
      ok: false,
      reason: 'unsaved-changes',
    });
    expect(target.getState()).toBe(dirty);
    target.undo();
    expect(target.getState().node.properties.C).toEqual(['pending']);
  } finally {
    prepareParser.mockRestore();
    finalParser.mockRestore();
    source.dispose();
    target.dispose();
    limited.dispose();
  }
});

test('invalid draft/checkpoint inputs are rejected before replacement approval', () => {
  const c = new RecordController();
  try {
    const valid = {
      schemaVersion: 'banora.studio-draft/v1',
      id: 'draft',
      filename: 'review.sgf',
      revision: 1,
      updatedAt: 1,
      checkpoint: c.createCheckpoint(),
    };
    for (const input of [
      null,
      {},
      { ...valid, filename: '../bad.sgf' },
      { ...valid, checkpoint: null },
      { ...valid, checkpoint: { ...valid.checkpoint, selection: { gameIndex: 0, path: [99] } } },
      { ...valid, checkpoint: { ...valid.checkpoint, sgf: '(;B[invalid])' } },
    ]) {
      expect(() => prepareDraftRestore(input)).toThrow('Draft storage: invalid.');
    }
  } finally {
    c.dispose();
  }
});
