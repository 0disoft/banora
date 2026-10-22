import { expect, spyOn, test } from 'bun:test';
import { RecordController } from '../src/controller.js';
import { createRecordPlayback } from '../src/playback.js';
import { TestScheduler } from '../../../scripts/test-scheduler.js';

test('playback intervals validate atomically and disposed players release borrowed controllers', () => {
  const controller = new RecordController({ sgf: '(;SZ[9];B[aa])' });
  const playback = createRecordPlayback(controller);
  expect(playback.getState().intervalMs).toBe(1000);
  for (const value of [499, 5001, NaN, Infinity, -Infinity, 500.5])
    expect(() => playback.setInterval(value)).toThrow();
  expect(playback.getState().intervalMs).toBe(1000);
  playback.setInterval(5000);
  expect(playback.getState().intervalMs).toBe(5000);
  playback.dispose();
  playback.dispose();
  expect(() => playback.play()).toThrow();
  expect(controller.next().ok).toBe(true);
  controller.dispose();
});
test('scheduled replay ends at the leaf, preserves SGF/dirty state and follows a selected variation', () => {
  const controller = new RecordController({ sgf: '(;SZ[9]XX[keep];B[aa](;W[bb])(;W[cc];B[dd]))' });
  controller.next();
  controller.next(1);
  const before = controller.prepareExport().text;
  const scheduler = new TestScheduler();
  const playback = createRecordPlayback(controller, { intervalMs: 500, scheduler });
  try {
    playback.play();
    expect(controller.getState().position.moveNumber).toBe(2);
    scheduler.advance(499);
    expect(controller.getState().position.moveNumber).toBe(2);
    scheduler.advance(1);
    expect(controller.getState().node.properties.B).toEqual(['dd']);
    expect(playback.getState()).toEqual({ playing: false, intervalMs: 500, canPlay: false });
    expect(controller.getState().dirty).toBe(false);
    expect(controller.prepareExport().text).toBe(before);
    expect(scheduler.pending).toBe(0);
  } finally {
    playback.dispose();
    controller.dispose();
  }
});
test('manual navigation, edits and record replacement pause; disposal cancels future steps', () => {
  const controller = new RecordController({ sgf: '(;SZ[9];B[aa];W[bb];B[cc])' });
  const scheduler = new TestScheduler();
  const playback = createRecordPlayback(controller, { intervalMs: 500, scheduler });
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
  scheduler.advance(600);
  expect(scheduler.pending).toBe(0);
  expect(controller.getState().position.moveNumber).toBe(0);
  controller.dispose();
});
test('a reentrant host navigation during an automatic step is not mistaken for replay', () => {
  const controller = new RecordController({ sgf: '(;SZ[9];B[aa];W[bb])' });
  const scheduler = new TestScheduler();
  const playback = createRecordPlayback(controller, { intervalMs: 500, scheduler });
  const stop = controller.subscribe((state) => {
    if (state.position.moveNumber === 1) controller.previous();
  });
  try {
    playback.play();
    scheduler.advance(600);
    expect(controller.getState().position.moveNumber).toBe(0);
    expect(playback.getState().playing).toBe(false);
  } finally {
    stop();
    playback.dispose();
    controller.dispose();
  }
});

test('notification failures cannot strand replay, suppress other listeners or retain failed subscriptions', () => {
  const controller = new RecordController({ sgf: '(;SZ[9];B[aa];W[bb])' });
  const scheduler = new TestScheduler();
  const playback = createRecordPlayback(controller, { intervalMs: 500, scheduler });
  const logs = spyOn(console, 'error').mockImplementation(() => {});
  let failedInitialCalls = 0;
  try {
    expect(() =>
      playback.subscribe(() => {
        failedInitialCalls++;
        throw Error('private initial exception');
      }),
    ).toThrow();
    playback.subscribe((state) => {
      if (state.playing) throw Error('private notification exception');
    });
    const states: boolean[] = [];
    playback.subscribe((state) => states.push(state.playing));
    playback.play();
    expect(scheduler.pending).toBe(1);
    scheduler.advance(1000);
    expect(controller.getState().position.moveNumber).toBe(2);
    expect(playback.getState().playing).toBe(false);
    expect(states).toContain(true);
    expect(states.at(-1)).toBe(false);
    expect(failedInitialCalls).toBe(1);
    expect(logs.mock.calls.length).toBeGreaterThan(0);
    expect(
      logs.mock.calls.every(
        (call) => call.length === 1 && call[0] === 'Banora playback listener failed',
      ),
    ).toBe(true);
  } finally {
    logs.mockRestore();
    playback.dispose();
    controller.dispose();
  }
});

test('interval changes reset the deadline and abort prevents further play without disposing the controller', () => {
  for (const preaborted of [false, true]) {
    const controller = new RecordController({ sgf: '(;SZ[9];B[aa];W[bb])' });
    const scheduler = new TestScheduler();
    const abort = new AbortController();
    if (preaborted) abort.abort();
    const playback = createRecordPlayback(controller, {
      intervalMs: 500,
      scheduler,
      signal: abort.signal,
    });
    try {
      playback.play();
      if (!preaborted) {
        scheduler.advance(499);
        playback.setInterval(5000);
        scheduler.advance(4999);
        expect(controller.getState().position.moveNumber).toBe(0);
        scheduler.advance(1);
        expect(controller.getState().position.moveNumber).toBe(1);
        abort.abort();
      }
      playback.play();
      expect(playback.getState().playing).toBe(false);
      expect(scheduler.pending).toBe(0);
      scheduler.advance(5001);
      expect(controller.getState().position.moveNumber).toBe(preaborted ? 0 : 1);
      expect(controller.next().ok).toBe(true);
    } finally {
      playback.dispose();
      controller.dispose();
    }
  }
});
