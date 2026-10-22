import { expect, test } from 'bun:test';
import { EventEmitter } from 'node:events';
import type { spawn } from 'node:child_process';
import { RecordController } from '@0disoft/banora/controller';
import { AnalysisSession } from '@0disoft/banora/analysis';
import { startLocalKataGo } from '../examples/katago-cli/process.js';
import { EngineWriter, ENGINE_WRITE_LIMITS } from '../examples/katago-cli/writer.js';

const query = (id: string, padding = '') => JSON.stringify({ id, padding });
const terminate = (id: string) =>
  JSON.stringify({ id: `terminate-${id}`, action: 'terminate', terminateId: id });
const tick = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

function processFixture(closeOnEnd = true) {
  const calls: string[] = [];
  const lines: string[] = [];
  const callbacks: ((error?: Error) => void)[] = [];
  const child = new EventEmitter();
  const process = Object.assign(child, {
    stdin: Object.assign(new EventEmitter(), {
      write(line: string, _encoding: string, callback: (error?: Error) => void) {
        lines.push(line);
        callbacks.push(callback);
        return false;
      },
      end() {
        calls.push('eof');
        if (closeOnEnd) child.emit('close', 0, null);
      },
      destroy() {
        calls.push('stdin-closed');
      },
    }),
    stdout: Object.assign(new EventEmitter(), {
      destroy() {
        calls.push('stdout-closed');
      },
    }),
    stderr: Object.assign(new EventEmitter(), {
      destroy() {
        calls.push('stderr-closed');
      },
    }),
    kill(signal: string) {
      calls.push(signal);
      child.emit('close', null, signal);
      return true;
    },
    unref() {
      calls.push('unref');
    },
  });
  const engine = startLocalKataGo(
    {
      binary: 'fixture',
      model: 'fixture',
      config: 'fixture',
      cwd: 'fixture',
      perspective: 'black',
    },
    { spawn: (() => process) as unknown as typeof spawn, graceMs: 10, confirmationMs: 10 },
  );
  return { engine, process, calls, lines, callbacks };
}

test('cancelled unsent queries are removed under backpressure without terminating another query', async () => {
  const { engine, lines, callbacks } = processFixture();
  const controller = new RecordController({ size: 5 });
  const session = new AnalysisSession(controller, engine.provider, {
    profile: 'japanese-territory',
  });
  try {
    for (let i = 0; i < 100; i++) {
      const pending = session.request({ maxVisits: 1 });
      session.cancel();
      expect(await pending).toMatchObject({ ok: false, reason: 'cancelled' });
    }
    expect(lines).toHaveLength(1);
    callbacks.shift()!();
    await tick();
    expect(lines).toHaveLength(2);
    const first = JSON.parse(lines[0]!);
    expect(JSON.parse(lines[1]!)).toMatchObject({ action: 'terminate', terminateId: first.id });
    callbacks.shift()!();
    await tick();
    expect(lines).toHaveLength(2);
  } finally {
    session.dispose();
    controller.dispose();
    await engine.stop();
  }
});

test('writer counts the in-flight entry and releases capacity after cancelled queued work', async () => {
  const writer = new EngineWriter(
    () => new Promise(() => {}),
    () => {},
  );
  const pending: Promise<unknown>[] = [];
  try {
    for (let i = 0; i < ENGINE_WRITE_LIMITS.entries; i++)
      pending.push(writer.sendLine(query(String(i))).catch(() => {}));
    await expect(writer.sendLine(query('overflow'))).rejects.toThrow('capacity');
    await writer.sendLine(terminate('1'));
    pending.push(writer.sendLine(query('replacement')).catch(() => {}));
    await expect(writer.sendLine(query('still-full'))).rejects.toThrow('capacity');
  } finally {
    writer.close();
    await Promise.all(pending);
    await writer.idle();
  }
});

test('cancelling one queued query preserves another caller and FIFO completion', async () => {
  const lines: string[] = [];
  const callbacks: (() => void)[] = [];
  const writer = new EngineWriter(
    (line) => {
      lines.push(line);
      return new Promise((resolve) => callbacks.push(resolve));
    },
    () => {},
  );
  const active = writer.sendLine(query('active'));
  const cancelled = writer.sendLine(query('cancelled'));
  const kept = writer.sendLine(query('kept'));
  let idle = false;
  const drained = writer.idle().then(() => {
    idle = true;
  });
  try {
    await writer.sendLine(terminate('cancelled'));
    await cancelled;
    expect(idle).toBe(false);
    callbacks.shift()!();
    await active;
    expect(lines.map((line) => JSON.parse(line).id)).toEqual(['active', 'kept']);
    expect(idle).toBe(false);
    callbacks.shift()!();
    await kept;
    await drained;
    expect(idle).toBe(true);
  } finally {
    writer.close();
  }
});

test('writer enforces its exact UTF-8 byte limit including LF and returns capacity after cancellation', async () => {
  const writer = new EngineWriter(
    () => new Promise(() => {}),
    () => {},
  );
  const first = query('active', '한');
  const overhead = Buffer.byteLength(first) + 1 + Buffer.byteLength(query('queued')) + 1;
  const second = query('queued', 'x'.repeat(ENGINE_WRITE_LIMITS.bytes - overhead));
  const pending = [writer.sendLine(first).catch(() => {}), writer.sendLine(second).catch(() => {})];
  try {
    await expect(writer.sendLine(query('over-byte-limit'))).rejects.toThrow('capacity');
    await writer.sendLine(terminate('queued'));
    pending.push(writer.sendLine(query('replacement')).catch(() => {}));
  } finally {
    writer.close();
    await Promise.all(pending);
  }
});

test('a full queue that cannot admit an active query termination fails closed', async () => {
  let failures = 0;
  const writer = new EngineWriter(
    () => new Promise(() => {}),
    () => {
      failures++;
    },
  );
  const pending = Array.from({ length: ENGINE_WRITE_LIMITS.entries }, (_, index) =>
    writer.sendLine(query(String(index))).catch((error) => error.message),
  );
  await expect(writer.sendLine(terminate('0'))).rejects.toThrow('capacity');
  expect(failures).toBe(1);
  expect(
    (await Promise.all(pending)).every((message) => message === 'Engine writer is closed'),
  ).toBe(true);
  await writer.idle();
  await expect(writer.sendLine(query('later'))).rejects.toThrow('closed');
});

test('write failure rejects all queued work with fixed errors and closes admission', async () => {
  let reject!: (error: Error) => void;
  let failures = 0;
  const writer = new EngineWriter(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
    () => {
      failures++;
    },
  );
  const first = writer.sendLine(query('active')).catch((error) => error.message);
  const second = writer.sendLine(query('queued')).catch((error) => error.message);
  reject(new Error('PRIVATE PATH'));
  expect(await first).toBe('Engine writer is closed');
  expect(await second).toBe('Engine writer is closed');
  expect(failures).toBe(1);
  await expect(writer.sendLine(query('later'))).rejects.toThrow('closed');
  await writer.idle();
});

for (const event of [
  'stdout-eof',
  'stdin-error',
  'stdout-error',
  'stderr-error',
  'spawn-error',
] as const)
  test(`${event} automatically shuts down the process and shares the explicit stop lease`, async () => {
    const { engine, process, calls } = processFixture(false);
    if (event === 'stdout-eof') process.stdout.emit('end');
    else if (event === 'spawn-error') process.emit('error', new Error('PRIVATE PATH'));
    else
      process[event.split('-')[0] as 'stdin' | 'stdout' | 'stderr'].emit(
        'error',
        new Error('PRIVATE PATH'),
      );
    await tick();
    const stopping = engine.stop();
    expect(engine.stop()).toBe(stopping);
    await stopping;
    expect(calls.filter((call) => call === 'eof')).toHaveLength(1);
    expect(calls.filter((call) => call === 'SIGKILL')).toHaveLength(1);
    expect(calls).toContain('stdout-closed');
    expect(calls).toContain('stderr-closed');
  });

test('write callback errors trigger automatic engine cleanup and pending analysis failure', async () => {
  const { engine, callbacks, calls } = processFixture();
  const controller = new RecordController({ size: 5 });
  const session = new AnalysisSession(controller, engine.provider, {
    profile: 'japanese-territory',
  });
  try {
    const pending = session.request({ maxVisits: 1 });
    callbacks.shift()!(new Error('PRIVATE WRITE PATH'));
    expect(await pending).toMatchObject({ ok: false, reason: 'provider' });
    await tick();
    await engine.stop();
    expect(calls).toEqual(['eof']);
  } finally {
    session.dispose();
    controller.dispose();
    await engine.stop();
  }
});

test('explicit stop rejects new analysis before the next microtask', async () => {
  const { engine, lines } = processFixture();
  const controller = new RecordController({ size: 5 });
  const session = new AnalysisSession(controller, engine.provider, {
    profile: 'japanese-territory',
  });
  try {
    const stopping = engine.stop();
    const pending = session.request({ maxVisits: 1 });
    expect(lines).toHaveLength(0);
    expect(await pending).toMatchObject({ ok: false, reason: 'disposed' });
    await stopping;
  } finally {
    session.dispose();
    controller.dispose();
    await engine.stop();
  }
});
