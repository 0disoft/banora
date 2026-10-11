import { expect, test } from 'bun:test';
import { RecordController } from '../src/controller.js';
import { createRecordPlayback } from '../src/playback.js';

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
test('playback intervals validate atomically and disposed players release borrowed controllers', () => {
  const controller = new RecordController({ sgf: '(;SZ[9];B[aa])' });
  const playback = createRecordPlayback(controller);
  expect(playback.getState().intervalMs).toBe(1000);
  for (const value of [499, 5001, NaN, 500.5]) expect(() => playback.setInterval(value)).toThrow();
  expect(playback.getState().intervalMs).toBe(1000);
  playback.setInterval(5000);
  expect(playback.getState().intervalMs).toBe(5000);
  playback.dispose();
  playback.dispose();
  expect(() => playback.play()).toThrow();
  expect(controller.next().ok).toBe(true);
  controller.dispose();
});
test('actual timed replay ends at the leaf, preserves SGF/dirty state and follows a selected variation', async () => {
  const controller = new RecordController({ sgf: '(;SZ[9]XX[keep];B[aa](;W[bb])(;W[cc];B[dd]))' });
  controller.next();
  controller.next(1);
  const before = controller.prepareExport().text;
  const playback = createRecordPlayback(controller, { intervalMs: 500 });
  try {
    playback.play();
    expect(controller.getState().position.moveNumber).toBe(2);
    await wait(650);
    expect(controller.getState().node.properties.B).toEqual(['dd']);
    expect(playback.getState()).toEqual({ playing: false, intervalMs: 500, canPlay: false });
    expect(controller.getState().dirty).toBe(false);
    expect(controller.prepareExport().text).toBe(before);
  } finally {
    playback.dispose();
    controller.dispose();
  }
});
test('manual navigation, edits and record replacement pause; disposal cancels future steps', async () => {
  const controller = new RecordController({ sgf: '(;SZ[9];B[aa];W[bb];B[cc])' });
  const playback = createRecordPlayback(controller, { intervalMs: 500 });
  playback.play();
  controller.next();
  expect(playback.getState().playing).toBe(false);
  playback.play();
  controller.setComment('manual edit');
  expect(playback.getState().playing).toBe(false);
  playback.play();
  controller.loadSgf('(;SZ[9];B[dd];W[ee])', { discardChanges: true });
  expect(playback.getState().playing).toBe(false);
  playback.play();
  playback.dispose();
  await wait(600);
  expect(controller.getState().position.moveNumber).toBe(0);
  controller.dispose();
});
test('a reentrant host navigation during an automatic step is not mistaken for replay', async () => {
  const controller = new RecordController({ sgf: '(;SZ[9];B[aa];W[bb])' });
  const playback = createRecordPlayback(controller, { intervalMs: 500 });
  const stop = controller.subscribe((state) => {
    if (state.position.moveNumber === 1) controller.previous();
  });
  try {
    playback.play();
    await wait(600);
    expect(controller.getState().position.moveNumber).toBe(0);
    expect(playback.getState().playing).toBe(false);
  } finally {
    stop();
    playback.dispose();
    controller.dispose();
  }
});
