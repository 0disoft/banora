import { expect, test } from 'bun:test';
import { DiagnosticJournal, describeDiagnosticFailure } from '../src/diagnostics.js';
import type { DiagnosticInput, DiagnosticEnvironment } from '../src/diagnostics.js';
import { RecordController } from '../src/controller.js';
import { parseSgf } from '../src/sgf.js';
import { runInNewContext } from 'node:vm';

test('actual SDK failures become safe local evidence without authored data or controller effects', () => {
  const privateText = 'Private player/path/comment';
  const controller = new RecordController({
    sgf: `(;SZ[5]PB[${privateText}]C[${privateText}];B[aa])`,
  });
  controller.next();
  const before = controller.getState();
  const journal = new DiagnosticJournal();
  const illegal = controller.play({ x: 0, y: 0 });
  expect(illegal.ok).toBe(false);
  if (illegal.ok) throw Error('Expected occupied move');
  const event = journal.record({
    operation: 'edit',
    status: 'failure',
    durationMs: 2.6,
    failure: describeDiagnosticFailure('controller', illegal.reason),
  });
  expect(event.failure).toEqual({
    domain: 'controller',
    code: 'occupied',
    recovery: 'choose-position',
    retryable: false,
  });
  const malformed = parseSgf('private invalid SGF');
  expect(malformed.ok).toBe(false);
  if (malformed.ok) throw Error('Expected invalid SGF');
  const wrongGame = parseSgf('(;GM[2])');
  if (wrongGame.ok) throw Error('Expected unsupported game');
  expect(describeDiagnosticFailure('sgf', wrongGame.diagnostics[0]!.code).recovery).toBe(
    'correct-input',
  );
  journal.record({
    operation: 'import',
    status: 'failure',
    failure: describeDiagnosticFailure('sgf', malformed.diagnostics[0]!.code),
  });
  const report = journal.createReport({
    runtime: 'node',
    runtimeMajor: 24,
    platform: 'windows',
    locale: 'ko',
  });
  expect(report.schemaVersion).toBe('banora.diagnostics/v1');
  expect(report.events[0]!.durationMs).toBe(3);
  expect(JSON.stringify(report)).not.toContain('Private');
  expect(JSON.stringify(report)).not.toContain('private invalid SGF');
  expect(controller.getState()).toBe(before);
  controller.dispose();
});

test('bounded reports summarize their retained window, preserve snapshots and clear without reusing IDs', () => {
  const journal = new DiagnosticJournal({ capacity: 2 });
  const first = journal.record({ operation: 'analysis', status: 'success', durationMs: 10 });
  const saved = journal.createReport();
  journal.record({ operation: 'analysis', status: 'cancelled', durationMs: 4 });
  const last = journal.record({
    operation: 'analysis',
    status: 'failure',
    durationMs: 8,
    failure: describeDiagnosticFailure('analysis', 'provider'),
  });
  const report = journal.createReport();
  expect(report.dropped).toBe(1);
  expect(report.events.map((e) => e.id)).toEqual(['operation-2', 'operation-3']);
  expect(report.summary).toEqual([
    {
      operation: 'analysis',
      success: 0,
      failure: 1,
      cancelled: 1,
      timed: 2,
      durationTotalMs: 12,
      durationMaxMs: 8,
    },
  ]);
  expect(saved.events).toEqual([first]);
  expect(saved.summary[0]!.success).toBe(1);
  expect(Object.isFrozen(last.failure)).toBe(true);
  expect(Object.isFrozen(report)).toBe(true);
  expect(Object.isFrozen(report.events)).toBe(true);
  expect(Object.isFrozen(report.environment)).toBe(true);
  expect(Object.isFrozen(report.summary[0])).toBe(true);
  // A host cannot expand the internal retention budget by shadowing a public getter.
  Object.defineProperty(journal, 'capacity', { value: 999999 });
  journal.record({ operation: 'search', status: 'success' });
  expect(journal.createReport().events).toHaveLength(2);
  expect(journal.createReport().capacity).toBe(2);
  journal.clear();
  expect(journal.createReport()).toMatchObject({ events: [], summary: [], dropped: 0 });
  expect(journal.record({ operation: 'search', status: 'success' }).id).toBe('operation-5');
  expect(report.events).toHaveLength(2);
});

test('unknown errors and forged advice are reduced to fixed codes, with no implicit coercion', () => {
  const explosive = {
    toString() {
      throw Error('Private secret');
    },
  };
  expect(describeDiagnosticFailure('io', explosive)).toEqual({
    domain: 'io',
    code: 'unknown',
    recovery: 'report',
    retryable: false,
  });
  for (const code of ['private token', '__proto__', 'constructor', Symbol('private')])
    expect(describeDiagnosticFailure('analysis', code).code).toBe('unknown');
  expect(() => describeDiagnosticFailure(explosive as never, 'code')).toThrow(
    'Invalid diagnostic domain.',
  );
  expect(describeDiagnosticFailure('storage', 'conflict').recovery).toBe('review-changes');
  expect(describeDiagnosticFailure('storage', 'quota').retryable).toBe(false);
  expect(describeDiagnosticFailure('analysis', 'busy').retryable).toBe(true);
  expect(describeDiagnosticFailure('analysis', 'stale').retryable).toBe(false);
  expect(describeDiagnosticFailure('controller', 'stale-preview').recovery).toBe('review-changes');
  const journal = new DiagnosticJournal();
  const crossRealm = runInNewContext("({operation:'import',status:'success'})") as DiagnosticInput;
  journal.record(crossRealm);
  expect(journal.createReport().events[0]!.status).toBe('success');
  journal.clear();
  journal.record({
    operation: 'export',
    status: 'failure',
    failure: { domain: 'io', code: 'private-path', recovery: 'retry', retryable: true },
  });
  expect(journal.createReport().events[0]!.failure).toEqual(
    describeDiagnosticFailure('io', 'unknown'),
  );
  expect(JSON.stringify(journal.createReport())).not.toContain('private-path');
});

test('invalid inputs fail atomically with fixed messages, including accessor/proxy errors and fingerprint fields', () => {
  const journal = new DiagnosticJournal();
  const first = journal.record({ operation: 'export', status: 'success' });
  const invalid: unknown[] = [
    null,
    [],
    { operation: 'private' },
    { operation: 'export', status: 'private' },
    { operation: 'export', status: 'success', message: 'private' },
    { operation: 'export', status: 'success', durationMs: NaN },
    { operation: 'export', status: 'success', durationMs: Infinity },
    { operation: 'export', status: 'success', durationMs: -1 },
    { operation: 'export', status: 'success', durationMs: 86400001 },
    { operation: 'export', status: 'success', failure: describeDiagnosticFailure('io', 'read') },
    { operation: 'export', status: 'failure' },
    {
      operation: 'export',
      status: 'failure',
      failure: { domain: 'io', code: 'read', message: 'private' },
    },
    {
      get operation() {
        throw Error('private');
      },
    },
    new Proxy(
      {},
      {
        ownKeys() {
          throw Error('private');
        },
      },
    ),
  ];
  for (const input of invalid) {
    try {
      journal.record(input as DiagnosticInput);
      throw Error('Unexpected acceptance');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain('private');
      expect((error as Error).message).not.toBe('Unexpected acceptance');
    }
    expect(journal.createReport().events).toEqual([first]);
  }
  for (const context of [
    { runtime: 'node', runtimeMajor: 0 },
    { runtimeMajor: 24 },
    { runtime: 'unknown', runtimeMajor: 24 },
    { runtime: 'browser', runtimeMajor: 1000 },
    { locale: 'private' },
    { platform: 'private' },
    { url: 'private' },
    { userAgent: 'private' },
    { sdkVersion: 'private' },
  ])
    expect(() => journal.createReport(context as DiagnosticEnvironment)).toThrow();
  for (const capacity of [0, 257, NaN, 1.5, Infinity])
    expect(() => new DiagnosticJournal({ capacity })).toThrow();
  expect(() => new DiagnosticJournal({ capacity: null } as never)).toThrow();
  expect(journal.record({ operation: 'export', status: 'success' }).id).toBe('operation-2');
});
