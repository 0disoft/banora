import { expect, spyOn, test } from 'bun:test';
import { executeAutomation } from '../src/automation.js';
import type { AutomationOperation } from '../src/automation.js';
import type { Point } from '../src/core.js';
import * as core from '../src/core.js';

const batch = (operations: readonly AutomationOperation[], sgf?: string) =>
  executeAutomation({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    size: 9,
    ...(sgf === undefined ? {} : { sgf }),
    operations,
  });
type LegalOutput = { operationIndex: number; op: 'legal-points'; points: Point[]; pass: boolean };
function rows(result: ReturnType<typeof batch>): LegalOutput[] {
  expect(result.ok).toBe(true);
  if (!result.ok || result.kind !== 'record') throw Error('Expected record');
  return result.results as LegalOutput[];
}

test('one batch reuses exact position legality while keeping row order and independent mutable outputs', () => {
  const operations: AutomationOperation[] = Array.from({ length: 100 }, () => ({
    op: 'legal-points',
  }));
  const play = spyOn(core, 'play');
  try {
    const output = rows(batch(operations));
    expect(play).toHaveBeenCalledTimes(81);
    expect(output).toHaveLength(100);
    const expected = Array.from({ length: 81 }, (_, index) => ({
      x: index % 9,
      y: Math.floor(index / 9),
    }));
    for (let index = 0; index < output.length; index++) {
      expect(output[index]).toEqual({
        operationIndex: index,
        op: 'legal-points',
        points: expected,
        pass: true,
      });
    }
    expect(output[0]!.points).not.toBe(output[1]!.points);
    expect(output[0]!.points[0]).not.toBe(output[1]!.points[0]);
    expect(Reflect.set(output[0]!.points[0]!, 'x', 8)).toBe(true);
    output[0]!.points.pop();
    expect(output[1]!.points).toEqual(expected);
    play.mockClear();
    expect(rows(batch([{ op: 'legal-points' }]))[0]!.points).toEqual(expected);
    expect(play).toHaveBeenCalledTimes(81);
  } finally {
    play.mockRestore();
  }
});

test('comment-only edits reuse legality without reusing output references', () => {
  const play = spyOn(core, 'play');
  try {
    const output = rows(
      batch([
        { op: 'legal-points' },
        { op: 'comment', text: 'No board change' },
        { op: 'legal-points' },
      ]),
    );
    expect(play).toHaveBeenCalledTimes(81);
    expect(output[1]!.operationIndex).toBe(2);
    expect(output[1]!.points).toEqual(output[0]!.points);
    expect(output[1]!.points).not.toBe(output[0]!.points);
  } finally {
    play.mockRestore();
  }
});

test('same board after pass uses the new turn and full rule state', () => {
  const output = rows(
    batch(
      [
        { op: 'legal-points' },
        { op: 'play', point: null },
        { op: 'legal-points' },
        { op: 'undo' },
        { op: 'legal-points' },
      ],
      '(;SZ[5]AB[cb][bc][dc][cd]PL[W])',
    ),
  );
  expect(output[0]!.points).not.toContainEqual({ x: 2, y: 2 });
  expect(output[1]!.points).toContainEqual({ x: 2, y: 2 });
  expect(output[2]!.points).toEqual(output[0]!.points);
});

test('memo hits still consume the original cell budget and preserve the failing operation', () => {
  const play = spyOn(core, 'play');
  try {
    const result = batch(Array.from({ length: 102 }, () => ({ op: 'legal-points' })));
    expect(result).toMatchObject({ ok: false, error: { reason: 'limit', operationIndex: 101 } });
    expect('sgf' in result).toBe(false);
    expect('results' in result).toBe(false);
    expect(play).toHaveBeenCalledTimes(81);
  } finally {
    play.mockRestore();
  }
});

test('failed request exposes no partial output and cannot populate the next request memo', () => {
  const failed = batch([
    { op: 'legal-points' },
    { op: 'play', point: { x: 0, y: 0 } },
    { op: 'legal-points' },
    { op: 'play', point: { x: 0, y: 0 } },
  ]);
  expect(failed.ok).toBe(false);
  expect('results' in failed).toBe(false);
  expect(rows(batch([{ op: 'legal-points' }]))[0]!.points).toHaveLength(81);
});
