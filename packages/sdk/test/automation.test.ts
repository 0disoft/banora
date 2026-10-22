import { expect, test } from 'bun:test';
import { executeAutomation, AUTOMATION_SCHEMA } from '../src/automation.js';

test('comment preview and apply return independent locations without freezing caller input or response', () => {
  for (const previewOnly of [true, false]) {
    const target = { gameIndex: 0, path: [0] };
    const request = {
      schemaVersion: 'banora.automation/v1',
      kind: 'record',
      sgf: '(;SZ[9];B[aa]C[old])',
      operations: [{ op: 'comment-batch', previewOnly, changes: [{ target, text: 'new' }] }],
    };
    const original = JSON.stringify(request);
    const result = executeAutomation(request);
    if (!result.ok || result.kind !== 'record') throw Error('Expected record response');
    const entry = result.results[0] as {
      value: { applied: boolean; edits: { target: { gameIndex: number; path: number[] } }[] };
    };
    const returned = entry.value.edits[0]!.target;
    expect(entry.value.applied).toBe(!previewOnly);
    expect(JSON.stringify(request)).toBe(original);
    expect(returned).toEqual(target);
    expect(returned).not.toBe(target);
    expect(returned.path).not.toBe(target.path);
    target.path[0] = 3;
    target.gameIndex = 1;
    expect(returned).toEqual({ gameIndex: 0, path: [0] });
    returned.path.push(2);
    returned.gameIndex = 2;
    expect(target).toEqual({ gameIndex: 1, path: [3] });
  }
});

test('comment responses also own locations supplied through frozen request data', () => {
  const target = Object.freeze({ gameIndex: 0, path: Object.freeze([0]) });
  const request = Object.freeze({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    sgf: '(;SZ[9];B[aa])',
    operations: Object.freeze([
      Object.freeze({
        op: 'comment-batch',
        previewOnly: true,
        changes: Object.freeze([Object.freeze({ target, text: 'new' })]),
      }),
    ]),
  });
  const result = executeAutomation(request);
  if (!result.ok || result.kind !== 'record') throw Error('Expected record response');
  const entry = result.results[0] as { value: { edits: { target: { path: number[] } }[] } };
  entry.value.edits[0]!.target.path.push(1);
  expect(target.path).toEqual([0]);
  expect(entry.value.edits[0]!.target.path).toEqual([0, 1]);
});

test('automation discovers whole-record search and portable comment previews without changing the document', () => {
  const sgf =
    '(;SZ[5]C[root]XX[keep];B[aa](;W[bb]C[first target])(;W[cc]C[second target]))(;SZ[9]C[another target])';
  const base = executeAutomation({ schemaVersion: 'banora.automation/v1', kind: 'record', sgf });
  const result = executeAutomation({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    sgf,
    operations: [
      { op: 'search', query: 'TARGET', properties: ['C'], limit: 2 },
      {
        op: 'comment-batch',
        previewOnly: true,
        changes: [
          { target: { gameIndex: 0, path: [0, 1] }, text: 'edited', expectedText: 'second target' },
          { target: { gameIndex: 1, path: [] }, text: '', expectedText: 'another target' },
        ],
      },
    ],
  });
  expect(JSON.stringify(AUTOMATION_SCHEMA)).toContain('comment-batch');
  expect(JSON.stringify(AUTOMATION_SCHEMA)).toContain('caseSensitive');
  if (!result.ok || result.kind !== 'record' || !base.ok || base.kind !== 'record')
    throw Error('Automation failed');
  expect(result.sgf).toBe(base.sgf);
  expect(result.history).toEqual({ dirty: false, canUndo: false, canRedo: false });
  expect(result.selection).toEqual({ gameIndex: 0, path: [] });
  expect(result.results).toEqual([
    {
      operationIndex: 0,
      op: 'search',
      value: {
        total: 3,
        offset: 0,
        limit: 2,
        hasMore: true,
        hits: [
          expect.objectContaining({ target: { gameIndex: 0, path: [0, 0] }, moveNumber: 2 }),
          expect.objectContaining({ target: { gameIndex: 0, path: [0, 1] }, moveNumber: 2 }),
        ],
      },
    },
    {
      operationIndex: 1,
      op: 'comment-batch',
      value: {
        applied: false,
        edits: [
          { target: { gameIndex: 0, path: [0, 1] }, before: 'second target', after: 'edited' },
          { target: { gameIndex: 1, path: [] }, before: 'another target', after: '' },
        ],
      },
    },
  ]);
});

test('automation applies multi-game comments once, preserves selection and supports whole-batch Undo/Redo', () => {
  const oldSource = executeAutomation({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    sgf: '(;C[same]XX[old])',
  });
  if (!oldSource.ok || oldSource.kind !== 'record') throw Error('Source fixture failed');
  expect(
    executeAutomation({
      schemaVersion: 'banora.automation/v1',
      kind: 'record',
      sgf: '(;C[same]XX[new])',
      operations: [
        {
          op: 'comment-batch',
          changes: [{ target: { gameIndex: 0, path: [] }, text: 'new' }],
          expectedSgf: oldSource.sgf,
        },
      ],
    }),
  ).toMatchObject({ ok: false, error: { reason: 'stale-preview' } });
  const sgf = '(;SZ[5]C[root];B[aa]C[branch])(;SZ[9]C[second])';
  const operations = [
    {
      op: 'comment-batch',
      changes: [
        { target: { gameIndex: 0, path: [0] }, text: 'changed', expectedText: 'branch' },
        { target: { gameIndex: 1, path: [] }, text: 'changed', expectedText: 'second' },
      ],
    },
    { op: 'undo' },
  ];
  const undone = executeAutomation({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    sgf,
    selection: { gameIndex: 0, path: [0] },
    operations,
  });
  if (!undone.ok || undone.kind !== 'record') throw Error('Undo failed');
  expect(undone.selected.properties.C).toEqual(['branch']);
  expect(undone.history).toEqual({ dirty: false, canUndo: false, canRedo: true });
  const redone = executeAutomation({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    sgf,
    selection: { gameIndex: 0, path: [0] },
    operations: [...operations, { op: 'redo' }, { op: 'search', query: 'changed' }],
  });
  if (!redone.ok || redone.kind !== 'record') throw Error('Redo failed');
  expect(redone.selection).toEqual({ gameIndex: 0, path: [0] });
  expect(redone.snapshot.stones[0]).toBe('black');
  expect(redone.results[1]).toMatchObject({ op: 'search', value: { total: 2 } });
});

test('record-tool requests reject malformed/stale/missing/duplicate inputs and repeated work without partial output', () => {
  for (const operation of [
    { op: 'search', query: 'x', properties: [] },
    { op: 'search', query: 'x', properties: ['c'] },
    { op: 'search', query: 'x', properties: ['C', 'C'] },
    { op: 'search', query: 'x', limit: 101 },
    {
      op: 'comment-batch',
      changes: [{ target: { gameIndex: 0, path: [] }, text: 'x', unknown: true }],
    },
  ]) {
    const result = executeAutomation({
      schemaVersion: 'banora.automation/v1',
      kind: 'record',
      operations: [operation],
    });
    expect(result).toMatchObject({ ok: false, error: { code: 'invalid-request' } });
  }
  for (const [changes, reason] of [
    [
      [{ target: { gameIndex: 0, path: [] }, text: 'x', expectedText: 'not-current' }],
      'stale-preview',
    ],
    [[{ target: { gameIndex: 0, path: [99] }, text: 'x' }], 'node-not-found'],
    [
      [
        { target: { gameIndex: 0, path: [] }, text: 'x' },
        { target: { gameIndex: 0, path: [] }, text: 'y' },
      ],
      'invalid-edit',
    ],
  ]) {
    const result = executeAutomation({
      schemaVersion: 'banora.automation/v1',
      kind: 'record',
      operations: [
        { op: 'comment', text: 'earlier edit' },
        { op: 'comment-batch', changes },
      ],
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'command-failed', operationIndex: 1, reason },
    });
    expect('sgf' in result).toBe(false);
  }
  const operations = Array.from({ length: 8 }, () => ({ op: 'search', query: '' }));
  expect(
    executeAutomation({ schemaVersion: 'banora.automation/v1', kind: 'record', operations }).ok,
  ).toBe(true);
  const result = executeAutomation({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    operations: [...operations, { op: 'comment-batch', changes: [] }],
  });
  expect(result).toMatchObject({ ok: false, error: { operationIndex: 8, reason: 'limit' } });
  expect('sgf' in result).toBe(false);
});

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

test('automation resumes returned locations past move 128 and navigates long branches', () => {
  const sgf = '(;SZ[5]XX[keep]' + ';B[];W[]'.repeat(177) + '(;B[aa])(;B[bb]))';
  const first = executeAutomation({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    sgf,
    operations: Array.from({ length: 130 }, () => ({ op: 'next' })),
  });
  if (!first.ok || first.kind !== 'record') throw Error('Expected long replay result');
  expect(first.selection.path).toHaveLength(130);
  const reopened = executeAutomation({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    sgf: first.sgf,
    selection: first.selection,
    operations: [
      { op: 'goto', target: { gameIndex: 0, path: [...Array(354).fill(0), 1] } },
      { op: 'comment', text: 'Reviewed late branch' },
    ],
  });
  expect(reopened.ok).toBe(true);
  if (!reopened.ok || reopened.kind !== 'record') throw Error('Expected resumed record');
  expect(reopened.snapshot.moveNumber).toBe(355);
  expect(reopened.snapshot.stones[6]).toBe('black');
  expect(reopened.selected.properties.C).toEqual(['Reviewed late branch']);
  expect(reopened.selection.path).toEqual([...Array(354).fill(0), 1]);
  expect(reopened.sgf).toContain('XX[keep]');
  const retained = executeAutomation({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    sgf: reopened.sgf,
    selection: reopened.selection,
  });
  expect(retained.ok && retained.snapshot.stones).toEqual(reopened.snapshot.stones);
});

test('automation locator limits follow total SGF nodes rather than variation nesting', () => {
  for (const length of [49_999, 50_000]) {
    const result = executeAutomation({
      schemaVersion: 'banora.automation/v1',
      kind: 'record',
      selection: { gameIndex: 0, path: Array(length).fill(0) },
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error.code).toBe(length === 49_999 ? 'command-failed' : 'invalid-request');
    expect('sgf' in result).toBe(false);
  }
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
