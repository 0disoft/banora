import { expect, spyOn, test } from 'bun:test';
import { RecordController } from '../src/controller.js';
import * as checkpointApi from '../src/checkpoint.js';
import type { RecordCheckpoint } from '../src/checkpoint.js';
import * as runtime from '../src/record-runtime.js';

function checkpoint(moves = 240): RecordCheckpoint {
  const sgf =
    '(;SZ[19]' + Array.from({ length: moves }, (_, i) => (i % 2 ? ';W[]' : ';B[]')).join('') + ')';
  return {
    schemaVersion: 'banora.checkpoint/v1',
    sgf,
    baselineSgf: sgf,
    selection: { gameIndex: 0, path: Array(moves).fill(0) },
    rules: { ko: 'situational-superko', suicide: 'forbid', passStones: true },
  };
}

test('restoration replays once and retains the same bounded tail for backward navigation', () => {
  const controller = new RecordController();
  const spy = spyOn(runtime, 'applyRecordNode');
  try {
    expect(controller.loadCheckpoint(checkpoint())).toEqual({ ok: true });
    expect(spy.mock.calls).toHaveLength(241);
    expect(controller.getState().position.moveNumber).toBe(240);
    expect(controller.getState().position.passPrisoners).toEqual({ black: 120, white: 120 });
    spy.mockClear();
    for (let i = 0; i < 119; i++) expect(controller.previous().ok).toBe(true);
    expect(spy.mock.calls).toHaveLength(0);
    expect(controller.getState().position.moveNumber).toBe(121);
    expect(controller.previous().ok).toBe(true);
    expect(spy.mock.calls).toHaveLength(121); // Depth 120 is outside the 120-position window.
    expect(controller.getState().position.moveNumber).toBe(120);
  } finally {
    spy.mockRestore();
    controller.dispose();
  }
});

test('unsaved and invalid recovery never adopts prepared positions or changes live state', () => {
  const controller = new RecordController({ sgf: '(;SZ[9];B[aa])' });
  controller.next();
  controller.setComment('keep');
  const before = controller.getState();
  const ticket = controller.prepareExport();
  const spy = spyOn(runtime, 'applyRecordNode');
  try {
    expect(controller.loadCheckpoint(checkpoint())).toEqual({
      ok: false,
      reason: 'unsaved-changes',
    });
    expect(spy.mock.calls).toHaveLength(241); // Validation still precedes the dirty guard.
    expect(controller.getState()).toBe(before);
    expect(controller.loadCheckpoint({ ...checkpoint(), sgf: 'bad' })).toMatchObject({
      ok: false,
      reason: 'invalid-checkpoint',
    });
    expect(controller.getState()).toBe(before);
    spy.mockClear();
    expect(controller.previous().ok).toBe(true);
    expect(controller.next().ok).toBe(true);
    expect(spy.mock.calls).toHaveLength(0);
    expect(controller.getState().position).toBe(before.position);
    expect(controller.acknowledgeExport(ticket.id)).toEqual({ ok: true });
  } finally {
    spy.mockRestore();
    controller.dispose();
  }
});

test('a replay failure discards the partially prepared cache before any replacement', () => {
  const controller = new RecordController({ sgf: '(;SZ[9];B[aa])' });
  controller.next();
  const before = controller.getState();
  const apply = runtime.applyRecordNode;
  let calls = 0;
  const spy = spyOn(runtime, 'applyRecordNode').mockImplementation((position, node) => {
    if (++calls === 4) throw new Error('injected transition failure');
    return apply(position, node);
  });
  try {
    expect(controller.loadCheckpoint(checkpoint())).toMatchObject({
      ok: false,
      reason: 'invalid-checkpoint',
    });
    expect(controller.getState()).toBe(before);
    expect(controller.previous().ok).toBe(true);
    expect(controller.next().ok).toBe(true);
    expect(controller.getState().position).toBe(before.position);
    expect(calls).toBe(4);
  } finally {
    spy.mockRestore();
    controller.dispose();
  }
});

test('the public parser retains its exports and response shape without internal positions', () => {
  expect(Object.keys(checkpointApi).sort()).toEqual(['CHECKPOINT_SCHEMA', 'parseRecordCheckpoint']);
  const result = checkpointApi.parseRecordCheckpoint(checkpoint(0));
  expect(result.ok).toBe(true);
  expect(Object.keys(result).sort()).toEqual(['baseline', 'node', 'ok', 'record', 'value']);
  const controller = new RecordController();
  try {
    expect(controller.loadCheckpoint(checkpoint(0))).toEqual({ ok: true });
    expect(controller.getState().position.moveNumber).toBe(0);
    expect(controller.getState().position.repetitionHistory?.size).toBe(1);
  } finally {
    controller.dispose();
  }
});
