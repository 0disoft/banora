import { expect, test } from 'bun:test';
import { syntheticReview, measure } from './performance.js';
import { RecordController } from '@0disoft/banora/controller';

test('authored workload follows legal opening/pass transitions and preserves its declared move count', () => {
  for (const count of [1, 300, 5000]) {
    const editor = new RecordController({ sgf: syntheticReview(count) });
    try {
      let last = editor.getState().node;
      while (last.children[0]) last = last.children[0];
      expect(editor.goTo(last.id).ok).toBe(true);
      expect(editor.getState().position.moveNumber).toBe(count);
      expect(editor.getState().position.width).toBe(19);
      expect(editor.getState().dirty).toBe(false);
    } finally {
      editor.dispose();
    }
  }
  expect(() => syntheticReview(5001)).toThrow();
  expect(() => syntheticReview(1.5)).toThrow();
});

test('measurement runs fresh warm/sample harnesses, verifies results and releases failed work', () => {
  let setups = 0,
    runs = 0,
    verified = 0,
    disposed = 0;
  const result = measure('sample', 2, () => {
    setups++;
    return {
      run() {
        runs++;
      },
      verify() {
        verified++;
      },
      dispose() {
        disposed++;
      },
    };
  });
  expect([setups, runs, verified, disposed]).toEqual([6, 6, 6, 6]);
  expect(result.samplesMs).toHaveLength(5);
  expect(result.minMs <= result.medianMs && result.medianMs <= result.maxMs).toBe(true);
  expect(result.samplesMs.every((time) => Number.isFinite(time) && time >= 0)).toBe(true);
  expect(() =>
    measure('failure', 1, () => ({
      run() {},
      verify() {
        throw Error('Correctness failure');
      },
      dispose() {
        disposed++;
      },
    })),
  ).toThrow('Correctness failure');
  expect(disposed).toBe(7);
});
