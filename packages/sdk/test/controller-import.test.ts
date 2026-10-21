import { expect, spyOn, test } from 'bun:test';
import { RecordController } from '../src/controller.js';
import * as sgf from '../src/sgf.js';

test('prepared byte imports apply their immutable parsed record without decoding again', () => {
  const controller = new RecordController({ size: 5 });
  const bytes = new TextEncoder().encode('(;CA[UTF-8]SZ[9]XX[keep];B[aa]C[한글])');
  const decoder = spyOn(sgf, 'decodeSgf');
  try {
    const before = controller.getState();
    const prepared = controller.prepareImport(bytes, { locator: { gameIndex: 0, path: [0] } });
    expect(prepared.ok).toBe(true);
    expect(controller.getState()).toBe(before);
    expect(decoder).toHaveBeenCalledTimes(1);
    if (!prepared.ok) throw Error('Expected valid import');
    expect(Object.isFrozen(prepared.preview)).toBe(true);
    bytes.fill(0);
    expect(controller.applyImport(prepared.preview).ok).toBe(true);
    expect(decoder).toHaveBeenCalledTimes(1);
    expect(controller.getState().record).toBe(prepared.preview.record);
    expect(controller.getState().node.properties.C).toEqual(['한글']);
    expect(controller.getState().recordGeneration).toBe(before.recordGeneration + 1);
    expect(controller.getState().dirty).toBe(false);
  } finally {
    decoder.mockRestore();
    controller.dispose();
  }
});

test('import approval retains dirty guards and rejects forged, foreign, reused and superseded previews', () => {
  const controller = new RecordController({ size: 5 });
  const other = new RecordController({ size: 5 });
  try {
    controller.setComment('unsaved');
    const prepared = controller.prepareImport('(;SZ[9];B[aa])');
    if (!prepared.ok) throw Error('Expected valid import');
    const before = controller.getState();
    const ticket = controller.prepareExport();
    expect(controller.applyImport(prepared.preview)).toEqual({
      ok: false,
      reason: 'unsaved-changes',
    });
    expect(controller.getState()).toBe(before);
    expect(other.applyImport(prepared.preview, { discardChanges: true })).toEqual({
      ok: false,
      reason: 'stale-preview',
    });
    expect(controller.applyImport({ ...prepared.preview }, { discardChanges: true })).toEqual({
      ok: false,
      reason: 'stale-preview',
    });
    expect(controller.applyImport(prepared.preview, { discardChanges: true }).ok).toBe(true);
    expect(controller.getState().canUndo).toBe(false);
    expect(controller.acknowledgeExport(ticket.id).ok).toBe(false);
    expect(controller.applyImport(prepared.preview)).toEqual({
      ok: false,
      reason: 'stale-preview',
    });
    const superseded = controller.prepareImport('(;SZ[13])');
    if (!superseded.ok) throw Error('Expected valid import');
    const checkpoint = controller.createCheckpoint();
    expect(controller.loadCheckpoint(checkpoint).ok).toBe(true);
    const restored = controller.getState();
    expect(controller.applyImport(superseded.preview)).toEqual({
      ok: false,
      reason: 'stale-preview',
    });
    expect(controller.getState()).toBe(restored);
  } finally {
    controller.dispose();
    other.dispose();
  }
});

test('preparation keeps controller-specific input limits and locator checks before approval', () => {
  const controller = new RecordController({
    size: 9,
    limits: { maxNodes: 2, maxExpandedPoints: 3 },
  });
  try {
    const before = controller.getState();
    for (const input of ['(;SZ[9]TR[aa:bb])', '(;SZ[9];B[];W[])', '(;SZ[9]AB[aa]AW[aa])']) {
      expect(controller.prepareImport(input).ok).toBe(false);
      expect(controller.getState()).toBe(before);
    }
    expect(controller.prepareImport('(;SZ[9])', { locator: { gameIndex: 0, path: [0] } })).toEqual({
      ok: false,
      reason: 'node-not-found',
    });
    const prepared = controller.prepareImport('(;SZ[9]TR[aa:ca])');
    if (!prepared.ok) throw Error('Expected valid import');
    controller.dispose();
    expect(() => controller.applyImport(prepared.preview)).toThrow('disposed');
    expect(() => controller.prepareImport('(;SZ[9])')).toThrow('disposed');
  } finally {
    controller.dispose();
  }
});
