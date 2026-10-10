import { expect, test } from 'bun:test';
import { executeAutomation, AUTOMATION_SCHEMA } from '../src/automation.js';

test('automation exposes discoverable JSON commands and rejects malformed batches before edits', () => {
  expect(JSON.stringify(AUTOMATION_SCHEMA)).toContain('reorder-branch');
  expect(Object.isFrozen(AUTOMATION_SCHEMA.oneOf[0])).toBe(true);
  for (const operations of [
    [{ op: 'shell', command: 'echo bad' }],
    [{ op: 'play', point: { x: 0.5, y: 1 } }],
    [{ op: 'comment', text: 'x', unexpected: true }],
    Array(257).fill({ op: 'undo' }),
  ]) {
    const result = executeAutomation({
      schemaVersion: 'banora.automation/v1',
      kind: 'record',
      operations,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid-request');
    expect('sgf' in result).toBe(false);
  }
});
test('record batches preserve unknown SGF and expose logical state, portable locations, history and legal points', () => {
  const result = executeAutomation({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    sgf: '(;SZ[5]XX[keep];B[aa](;W[bb])(;W[cc]))',
    selection: { gameIndex: 0, path: [0, 1] },
    includeTree: true,
    operations: [
      { op: 'comment', text: 'LLM 日本' },
      { op: 'marker', point: { x: 3, y: 3 }, kind: 'label', label: 'A:B' },
      { op: 'undo' },
      { op: 'redo' },
      { op: 'legal-points' },
    ],
  });
  expect(result.ok).toBe(true);
  if (!result.ok || result.kind !== 'record') throw Error('Expected record result');
  expect(result.selection.path).toEqual([0, 1]);
  expect(result.snapshot.stones[12]).toBe('white');
  expect(result.snapshot.markers[0]?.label).toBe('A:B');
  expect(result.sgf).toContain('XX[keep]');
  expect(result.sgf).toContain('LLM 日本');
  expect(result.history.dirty).toBe(true);
  expect(result.results).toHaveLength(1);
  const reopened = executeAutomation({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    sgf: result.sgf,
    selection: result.selection,
  });
  expect(reopened.ok && reopened.snapshot.stones).toEqual(result.snapshot.stones);
});
test('illegal moves abort a whole isolated batch and never expose partial output', () => {
  const request = {
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    size: 5,
    operations: [
      { op: 'comment', text: 'must not commit' },
      { op: 'play', point: { x: 0, y: 0 } },
      { op: 'play', point: { x: 0, y: 0 } },
    ],
  };
  const before = JSON.stringify(request),
    result = executeAutomation(request);
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.reason).toBe('occupied');
    expect(result.error.operationIndex).toBe(2);
  }
  expect('sgf' in result).toBe(false);
  expect(JSON.stringify(request)).toBe(before);
});
test('setup, ink, branch changes and scoring share existing controller and rule authority', () => {
  const result = executeAutomation({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    size: 5,
    profile: 'tromp-taylor',
    operations: [
      { op: 'setup', stones: [{ x: 0, y: 0, color: 'black' }], toPlay: 'white' },
      {
        op: 'stroke',
        points: [
          { x: 1.2, y: 1 },
          { x: 2.3, y: 2 },
        ],
        color: '#123456',
        width: 0.5,
      },
      { op: 'play', point: { x: 1, y: 1 } },
      { op: 'previous' },
      { op: 'play', point: { x: 2, y: 2 } },
      { op: 'reorder-branch', target: { gameIndex: 0, path: [1] }, index: 0 },
      { op: 'goto', target: { gameIndex: 0, path: [] } },
      { op: 'remove-branch', target: { gameIndex: 0, path: [1] } },
      { op: 'next' },
      { op: 'score', profile: 'tromp-taylor', komi: 6.5 },
    ],
  });
  expect(result.ok).toBe(true);
  if (!result.ok || result.kind !== 'record') throw Error('Expected record result');
  expect(result.rules.ko).toBe('positional-superko');
  expect(result.snapshot.stones[12]).toBe('white');
  expect(result.results).toHaveLength(1);
  expect(result.sgf).toContain('BPN[');
  expect(result.sgf).not.toContain('W[bb]');
});
test('external snapshots normalize without replay or changing input ownership', () => {
  const state = {
    key: 'external/revision',
    width: 2,
    height: 3,
    stones: Array(6).fill(null),
    visiblePoints: [{ x: 0, y: 0 }],
  };
  const result = executeAutomation({
    schemaVersion: 'banora.automation/v1',
    kind: 'snapshot',
    state,
  });
  expect(result.ok).toBe(true);
  expect('rules' in result).toBe(false);
  state.stones[0] = 'black';
  expect(result.ok && result.snapshot.stones[0]).toBe(null);
  expect(
    executeAutomation({
      schemaVersion: 'banora.automation/v1',
      kind: 'snapshot',
      state: { ...state, width: 1 },
    }).ok,
  ).toBe(false);
});

test('repeated legal-point queries stop at the batch computation budget', () => {
  const result = executeAutomation({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    size: 9,
    operations: Array(102).fill({ op: 'legal-points' }),
  });
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.reason).toBe('limit');
    expect(result.error.operationIndex).toBe(101);
  }
  expect('sgf' in result).toBe(false);
});
