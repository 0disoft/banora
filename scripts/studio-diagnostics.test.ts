import { expect, test } from 'bun:test';
import { StudioDiagnostics } from '../examples/studio/diagnostics.js';
import { describeDiagnosticFailure } from '@0disoft/banora/diagnostics';

test('Studio consent epochs exclude operations started off or completed after clear/disable/disposal', () => {
  let time = 0,
    reads = 0;
  const diagnostics = new StudioDiagnostics(() => {
    reads++;
    return time;
  });
  const off = diagnostics.begin('import');
  expect(reads).toBe(0);
  expect(diagnostics.record({ operation: 'edit', status: 'success' })).toBeUndefined();
  diagnostics.setEnabled(true);
  off({ status: 'success' });
  expect(diagnostics.createReport('en').events).toHaveLength(0);
  const active = diagnostics.begin('import');
  time = 23.4;
  active({ status: 'success' });
  active({ status: 'success' });
  expect(diagnostics.createReport('en').events).toHaveLength(1);
  expect(diagnostics.createReport('en').events[0]!.durationMs).toBe(23);
  const cleared = diagnostics.begin('backup');
  diagnostics.clear();
  cleared({ status: 'success' });
  expect(diagnostics.createReport('en').events).toHaveLength(0);
  const old = diagnostics.begin('restore');
  diagnostics.setEnabled(false);
  diagnostics.setEnabled(true);
  old({ status: 'failure', failure: describeDiagnosticFailure('storage', 'conflict') });
  expect(diagnostics.createReport('en').events).toHaveLength(0);
  const pending = diagnostics.begin('import');
  diagnostics.dispose();
  pending({ status: 'success' });
  expect(diagnostics.enabled).toBe(false);
  expect(diagnostics.createReport('en').events).toHaveLength(0);
});

test('optional clocks and inspection listeners cannot block host operations or retain unsafe data', () => {
  const diagnostics = new StudioDiagnostics(() => {
    throw Error('private clock');
  });
  diagnostics.setEnabled(true);
  diagnostics.subscribe(() => {
    throw Error('private UI');
  });
  const completed = diagnostics.begin('import');
  expect(
    completed({ status: 'failure', failure: describeDiagnosticFailure('sgf', 'syntax') }),
  ).toBe('operation-1');
  const report = diagnostics.createReport('ko');
  expect(report.environment).toEqual({ runtime: 'browser', locale: 'ko' });
  expect(report.events[0]).not.toHaveProperty('durationMs');
  expect(JSON.stringify(report)).not.toContain('private');
  diagnostics.setEnabled(false);
  expect(diagnostics.createReport('ko').events).toHaveLength(0);
});
