import { expect, test, spyOn } from 'bun:test';
import { diagnoseAutomation, executeAutomation } from '../src/automation.js';
import { RecordController } from '../src/controller.js';

const base = { schemaVersion: 'banora.automation/v1', kind: 'record', size: 5 } as const;
const sequence = (value: ReturnType<typeof diagnoseAutomation>) =>
  value.diagnostics.events.map((event) => [event.operation, event.status]);

test('diagnostic execution retains actual completed work and failure index without authored output', () => {
  const request = {
    ...base,
    sgf: '(;SZ[5]PB[PRIVATE PLAYER]C[PRIVATE NOTE])',
    stateKey: 'PRIVATE KEY',
    includeTree: true,
    operations: [
      { op: 'search', query: 'PRIVATE QUERY' },
      { op: 'comment', text: 'PRIVATE EDIT' },
      { op: 'play', point: { x: 0, y: 0 } },
      { op: 'play', point: { x: 0, y: 0 } },
      { op: 'comment', text: 'NEVER REACHED' },
    ],
  };
  const original = JSON.stringify(request);
  const report = diagnoseAutomation(request, { runtime: 'node', runtimeMajor: 24 });
  expect(report.ok).toBe(false);
  expect(report.operationIndex).toBe(3);
  expect(sequence(report)).toEqual([
    ['import', 'success'],
    ['search', 'success'],
    ['edit', 'success'],
    ['edit', 'success'],
    ['edit', 'failure'],
  ]);
  expect(report.diagnostics.events.at(-1)?.failure).toEqual({
    domain: 'controller',
    code: 'occupied',
    recovery: 'choose-position',
    retryable: false,
  });
  expect(JSON.stringify(report)).not.toMatch(
    /PRIVATE|NEVER REACHED|sgf|snapshot|properties|message|stack|stateKey|query/,
  );
  expect(Object.keys(report)).toEqual(['schemaVersion', 'ok', 'operationIndex', 'diagnostics']);
  expect(Object.isFrozen(report)).toBe(true);
  expect(JSON.stringify(request)).toBe(original);
  const normal = executeAutomation(request);
  expect(normal.ok).toBe(false);
  if (!normal.ok) expect(normal.error.operationIndex).toBe(report.operationIndex);
});

test('diagnostic execution covers successful navigation, batching, scoring and checkpoint restore', () => {
  const report = diagnoseAutomation({
    ...base,
    sgf: '(;SZ[5];B[aa]C[old])',
    selection: { gameIndex: 0, path: [0] },
    includeCheckpoint: true,
    operations: [
      { op: 'comment-batch', changes: [{ target: { gameIndex: 0, path: [0] }, text: 'new' }] },
      { op: 'undo' },
      { op: 'redo' },
      { op: 'legal-points' },
      { op: 'score', profile: 'japanese-territory' },
    ],
  });
  expect(report.ok).toBe(true);
  expect(sequence(report)).toEqual([
    ['import', 'success'],
    ['navigate', 'success'],
    ['batch', 'success'],
    ['edit', 'success'],
    ['edit', 'success'],
    ['search', 'success'],
    ['scoring', 'success'],
    ['export', 'success'],
    ['checkpoint', 'success'],
  ]);
  const saved = executeAutomation({ ...base, includeCheckpoint: true });
  if (!saved.ok || saved.kind !== 'record') throw Error('Fixture failed');
  expect(
    sequence(
      diagnoseAutomation({
        schemaVersion: base.schemaVersion,
        kind: base.kind,
        checkpoint: saved.checkpoint,
      }),
    ),
  ).toEqual([
    ['import', 'success'],
    ['restore', 'success'],
    ['export', 'success'],
  ]);
  const score = diagnoseAutomation({ ...base, operations: [{ op: 'score', profile: 'aga-area' }] });
  expect(score.ok).toBe(false);
  expect(score.diagnostics.events.at(-1)?.failure).toEqual({
    domain: 'scoring',
    code: 'profile-mismatch',
    recovery: 'review-changes',
    retryable: false,
  });
});

test('schema, parser and adversarial input failures produce safe evidence', () => {
  const malformed = diagnoseAutomation({ ...base, PRIVATE_FIELD: 'PRIVATE CONTENT' });
  expect(malformed.diagnostics.events[0]?.failure?.code).toBe('invalid-request');
  const parser = diagnoseAutomation({ ...base, sgf: 'PRIVATE MALFORMED SGF' });
  expect(parser.ok).toBe(false);
  expect(parser.diagnostics.events[0]?.failure?.code).toBe('invalid-input');
  const trap = new Proxy(
    {},
    {
      ownKeys() {
        throw Error('PRIVATE PATH /secret');
      },
    },
  );
  expect(() => executeAutomation(trap)).not.toThrow();
  const trapped = diagnoseAutomation(trap);
  expect(trapped.ok).toBe(false);
  expect(JSON.stringify([malformed, parser, trapped])).not.toContain('PRIVATE');
  expect(sequence(trapped)).toEqual([['import', 'failure']]);
  const invalidEnvironment = { runtime: 'node', rawVersion: 'PRIVATE' } as never;
  expect(() => diagnoseAutomation(trap, invalidEnvironment)).toThrow();
  let readMessage = 0;
  const exception = Object.defineProperty(new Error(), 'message', {
    get() {
      readMessage++;
      throw Error('PRIVATE EXCEPTION');
    },
  });
  const hostile = new Proxy(
    {},
    {
      ownKeys() {
        throw exception;
      },
    },
  );
  expect(diagnoseAutomation(hostile).ok).toBe(false);
  expect(readMessage).toBe(0);
  expect(() => executeAutomation(hostile)).not.toThrow();
});

test('diagnostics executes SDK actions once and validates environment before actions', () => {
  const action = spyOn(RecordController.prototype, 'setComment');
  try {
    const request = { ...base, operations: [{ op: 'comment', text: 'PRIVATE' }] };
    expect(() => diagnoseAutomation(request, { raw: 'PRIVATE' } as never)).toThrow();
    expect(action).not.toHaveBeenCalled();
    expect(diagnoseAutomation(request).ok).toBe(true);
    expect(action).toHaveBeenCalledTimes(1);
  } finally {
    action.mockRestore();
  }
});

test('request limits expose the first failed operation and report retention is bounded', () => {
  const limited = diagnoseAutomation({
    ...base,
    operations: Array.from({ length: 9 }, () => ({ op: 'search', query: '' })),
  });
  expect(limited.ok).toBe(false);
  expect(limited.operationIndex).toBe(8);
  expect(limited.diagnostics.events.at(-1)?.failure?.code).toBe('limit');
  const maximum = diagnoseAutomation({
    ...base,
    includeCheckpoint: true,
    operations: Array.from({ length: 256 }, () => ({ op: 'comment', text: 'private' })),
  });
  expect(maximum.ok).toBe(true);
  expect(maximum.diagnostics.events).toHaveLength(256);
  expect(maximum.diagnostics.dropped).toBe(3);
  expect(maximum.diagnostics.events[0]?.id).toBe('operation-4');
  expect(maximum.diagnostics.events.at(-1)?.operation).toBe('checkpoint');
  expect(maximum.diagnostics.summary.reduce((n, row) => n + row.success, 0)).toBe(256);
  expect(maximum.diagnostics.summary.every((row) => row.timed === 0)).toBe(true);
});

test('snapshot diagnostics validate data while returning no display state', () => {
  const report = diagnoseAutomation({
    schemaVersion: base.schemaVersion,
    kind: 'snapshot',
    state: { key: 'PRIVATE', width: 2, height: 2, stones: ['black', null, null, 'white'] },
  });
  expect(report.ok).toBe(true);
  expect(sequence(report)).toEqual([['import', 'success']]);
  expect(JSON.stringify(report)).not.toMatch(/PRIVATE|stones|snapshot/);
});

test('schema validation precedes edits and tool limits precede stale or missing targets', () => {
  const action = spyOn(RecordController.prototype, 'setComment');
  try {
    const malformed = executeAutomation({
      ...base,
      operations: [{ op: 'comment', text: 'never applied' }, { op: 'unknown' }],
    });
    expect(malformed.ok).toBe(false);
    if (!malformed.ok) expect(malformed.error.code).toBe('invalid-request');
    expect(action).not.toHaveBeenCalled();
    const request = {
      ...base,
      operations: [
        ...Array.from({ length: 8 }, () => ({ op: 'search', query: '' })),
        {
          op: 'comment-batch',
          expectedSgf: '(;SZ[9])',
          changes: [{ target: { gameIndex: 0, path: [999] }, text: 'missing' }],
        },
        { op: 'comment', text: 'never reached' },
      ],
    };
    const limited = executeAutomation(request);
    expect(limited.ok).toBe(false);
    if (!limited.ok)
      expect(limited.error).toEqual({
        code: 'command-failed',
        message: 'Record tools exceed the per-request 8-call budget.',
        operationIndex: 8,
        reason: 'limit',
      });
    const report = diagnoseAutomation(request);
    expect(sequence(report)).toEqual([
      ['import', 'success'],
      ...Array.from({ length: 8 }, () => ['search' as const, 'success' as const]),
      ['batch', 'failure'],
    ]);
    expect(action).not.toHaveBeenCalled();
  } finally {
    action.mockRestore();
  }
});

test('comment batch reports stale input before missing targets and stops later edits', () => {
  const action = spyOn(RecordController.prototype, 'setComment');
  try {
    for (const [expectedSgf, reason] of [
      ['(;SZ[9])', 'stale-preview'],
      [undefined, 'node-not-found'],
    ] as const) {
      const result = executeAutomation({
        ...base,
        operations: [
          {
            op: 'comment-batch',
            ...(expectedSgf === undefined ? {} : { expectedSgf }),
            changes: [{ target: { gameIndex: 0, path: [999] }, text: 'missing' }],
          },
          { op: 'comment', text: 'never reached' },
        ],
      });
      expect(result.ok).toBe(false);
      if (!result.ok)
        expect(result.error).toEqual({
          code: 'command-failed',
          message: 'Operation 0 (comment-batch) failed.',
          operationIndex: 0,
          reason,
        });
    }
    expect(action).not.toHaveBeenCalled();
  } finally {
    action.mockRestore();
  }
});

test('checkpoint exceptions have no stale operation index and always dispose the controller', () => {
  const checkpoint = spyOn(RecordController.prototype, 'createCheckpoint').mockImplementation(
    () => {
      throw Error('PRIVATE CHECKPOINT PATH');
    },
  );
  const dispose = spyOn(RecordController.prototype, 'dispose');
  try {
    const request = {
      ...base,
      includeCheckpoint: true,
      operations: [{ op: 'comment', text: 'PRIVATE' }],
    };
    const normal = executeAutomation(request);
    expect(normal.ok).toBe(false);
    if (!normal.ok) {
      expect(normal.error.code).toBe('invalid-input');
      expect(normal.error).not.toHaveProperty('operationIndex');
    }
    const report = diagnoseAutomation(request);
    expect(report.ok).toBe(false);
    expect(report).not.toHaveProperty('operationIndex');
    expect(sequence(report)).toEqual([
      ['import', 'success'],
      ['edit', 'success'],
      ['export', 'success'],
      ['checkpoint', 'failure'],
    ]);
    expect(JSON.stringify(report)).not.toContain('PRIVATE');
    expect(checkpoint).toHaveBeenCalledTimes(2);
    expect(dispose).toHaveBeenCalledTimes(2);
  } finally {
    checkpoint.mockRestore();
    dispose.mockRestore();
  }
});
