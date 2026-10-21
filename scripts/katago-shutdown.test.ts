import { expect, test } from 'bun:test';
import { stopEngineProcess } from '../examples/katago-cli/shutdown.js';

function fixture(onKill?: () => void) {
  const calls: string[] = [];
  const child = {
    stdin: { end: () => calls.push('eof'), destroy: () => calls.push('stdin-closed') },
    stdout: { destroy: () => calls.push('stdout-closed') },
    stderr: { destroy: () => calls.push('stderr-closed') },
    kill(signal: 'SIGKILL') {
      calls.push(signal);
      onKill?.();
      return true;
    },
    unref() {
      calls.push('unref');
    },
  };
  return { calls, child };
}
const never = new Promise<never>(() => {});

test('engine shutdown accepts normal exit and does not close input after an already completed stop', async () => {
  let flush!: () => void;
  const flushed = new Promise<void>((resolve) => {
    flush = resolve;
  });
  const { child, calls } = fixture();
  await stopEngineProcess(child, Promise.resolve(), flushed, () => calls.push('closing'), 10, 10);
  flush();
  await Promise.resolve();
  expect(calls).toEqual([]);
});

test('engine shutdown sends EOF after queued writes and releases its termination timer on normal exit', async () => {
  const { child, calls } = fixture();
  await stopEngineProcess(
    child,
    Promise.resolve(),
    Promise.resolve(),
    () => calls.push('closing'),
    10,
    10,
  );
  expect(calls).toEqual(['closing', 'eof']);
});

test('blocked writes still reach SIGKILL and release inherited pipes before confirmed exit', async () => {
  let exit!: () => void;
  const exited = new Promise<void>((resolve) => {
    exit = resolve;
  });
  const { child, calls } = fixture(() => exit());
  await stopEngineProcess(child, exited, never, () => calls.push('closing'), 10, 10);
  expect(calls).toEqual(['closing', 'stdin-closed', 'SIGKILL', 'stdout-closed', 'stderr-closed']);
});

test('missing exit confirmation rejects safely and releases the host process reference', async () => {
  const { child, calls } = fixture();
  await expect(
    stopEngineProcess(child, never, never, () => calls.push('closing'), 10, 10),
  ).rejects.toThrow('Engine exit could not be confirmed after forced termination');
  expect(calls).toEqual([
    'closing',
    'stdin-closed',
    'SIGKILL',
    'stdout-closed',
    'stderr-closed',
    'unref',
  ]);
});

test('kill failure releases streams without exposing raw engine/process errors', async () => {
  const { child, calls } = fixture(() => {
    throw Error('private engine path');
  });
  await expect(
    stopEngineProcess(child, never, never, () => calls.push('closing'), 10, 10),
  ).rejects.toThrow('Engine exit could not be confirmed after forced termination');
  expect(calls).toEqual([
    'closing',
    'stdin-closed',
    'SIGKILL',
    'unref',
    'stdout-closed',
    'stderr-closed',
  ]);
});
