import { expect, test } from 'bun:test';
import { registryReadSequence, type RegistryReadSource } from './registry-read.js';
import { registryReadLimiter, registryReadProcess, RegistryReadError } from './registry-process.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test('two reads overlap but validation and subsequent waves remain in input order', async () => {
  const pending = Array.from({ length: 5 }, () => deferred<{ status: number; stdout: string }>());
  const started: number[] = [];
  let active = 0,
    peak = 0;
  const source: RegistryReadSource = {
    run() {
      throw Error('must use async read');
    },
    async read(argv) {
      const index = Number(argv[0]);
      started.push(index);
      peak = Math.max(peak, ++active);
      try {
        return await pending[index]!.promise;
      } finally {
        active--;
      }
    },
  };
  const iterator = registryReadSequence([0, 1, 2, 3, 4], source, (i) => [String(i)], '.');
  const first = iterator.next();
  expect(started).toEqual([0, 1]);
  pending[1]!.resolve({ status: 0, stdout: 'second' });
  let delivered = false;
  void first.then(() => {
    delivered = true;
  });
  await Promise.resolve();
  expect(delivered).toBe(false);
  pending[0]!.resolve({ status: 0, stdout: 'first' });
  expect((await first).value).toMatchObject({ item: 0, result: { stdout: 'first' } });
  expect((await iterator.next()).value).toMatchObject({ item: 1 });
  expect(started).toEqual([0, 1]);
  const third = iterator.next();
  expect(started).toEqual([0, 1, 2, 3]);
  pending[2]!.resolve({ status: 0, stdout: 'third' });
  pending[3]!.resolve({ status: 0, stdout: 'fourth' });
  await third;
  await iterator.next();
  const fifth = iterator.next();
  pending[4]!.resolve({ status: 0, stdout: 'fifth' });
  expect((await fifth).value).toMatchObject({ item: 4 });
  expect((await iterator.next()).done).toBe(true);
  expect(peak).toBe(2);
  expect(active).toBe(0);
});

test('validation refusal aborts and drains prefetched reads without starting a later wave', async () => {
  const started: string[] = [],
    stopped: string[] = [];
  const source: RegistryReadSource = {
    run() {
      throw Error('sync fallback is forbidden');
    },
    async read(argv, _cwd, signal) {
      started.push(argv[0]!);
      if (argv[0] === '0') return { status: 0, stdout: 'first invalid value' };
      return new Promise((_resolve, reject) =>
        signal!.addEventListener(
          'abort',
          () => {
            stopped.push(argv[0]!);
            reject(Error('private abort detail'));
          },
          { once: true },
        ),
      );
    },
  };
  await expect(
    (async () => {
      for await (const { item } of registryReadSequence(
        [0, 1, 2],
        source,
        (i) => [String(i)],
        '.',
      )) {
        expect(item).toBe(0);
        throw Error('first validation failure');
      }
    })(),
  ).rejects.toThrow('first validation failure');
  expect(started).toEqual(['0', '1']);
  expect(stopped).toEqual(['1']);
});

test('synchronous adapters retain serial refusal and transport failures retain fixed results', async () => {
  let calls = 0;
  await expect(
    (async () => {
      for await (const { result } of registryReadSequence(
        [0, 1],
        {
          run() {
            calls++;
            throw Error('private transport');
          },
        },
        () => [],
        '.',
      )) {
        expect(result).toEqual({ status: null, stdout: '' });
        throw Error('fixed validation failure');
      }
    })(),
  ).rejects.toThrow('fixed validation failure');
  expect(calls).toBe(1);
});

test('read admission bounds total processes and queue, supports queued cancellation and releases capacity', async () => {
  const limit = registryReadLimiter();
  const release = deferred<void>();
  let active = 0,
    peak = 0,
    started = 0;
  const operation = async () => {
    started++;
    peak = Math.max(peak, ++active);
    try {
      await release.promise;
      return started;
    } finally {
      active--;
    }
  };
  const initial = [limit(operation), limit(operation)];
  const abort = new AbortController();
  const cancelled = limit(operation, abort.signal);
  abort.abort();
  await expect(cancelled).rejects.toMatchObject({ code: 'cancelled' });
  const queued = Array.from({ length: 32 }, () => limit(operation));
  await expect(limit(operation)).rejects.toMatchObject({ code: 'busy' });
  expect(started).toBe(2);
  release.resolve();
  await Promise.all([...initial, ...queued]);
  expect(started).toBe(34);
  expect(peak).toBe(2);
  expect(active).toBe(0);
  expect(await limit(async () => 99)).toBe(99);
});

test('unconfirmed process exit closes read admission and settles queued callers', async () => {
  const limit = registryReadLimiter();
  const end = deferred<void>();
  const failed = limit(async () => {
    await end.promise;
    throw new RegistryReadError('unconfirmed');
  });
  const normal = limit(async () => {
    await end.promise;
    return 1;
  });
  const queued = limit(async () => 2);
  const outcomes = Promise.allSettled([failed, normal, queued]);
  end.resolve();
  const results = await outcomes;
  expect(results[0]).toMatchObject({ status: 'rejected', reason: { code: 'unconfirmed' } });
  expect(results[1]).toMatchObject({ status: 'fulfilled', value: 1 });
  expect(results[2]).toMatchObject({ status: 'rejected', reason: { code: 'busy' } });
  await expect(limit(async () => 3)).rejects.toMatchObject({ code: 'busy' });
});

test('actual asynchronous child drains private stderr, bounds output and preserves status', async () => {
  const npm = await registryReadProcess('npm', ['--version'], { timeoutMs: 5000 });
  expect(npm.status).toBe(0);
  expect(npm.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  const run = (code: string) =>
    registryReadProcess(process.execPath, ['-e', code], { timeoutMs: 5000 });
  expect(await run('console.error("private stderr"); console.log("public result");')).toEqual({
    status: 0,
    stdout: 'public result\n',
  });
  expect(await run('process.exit(7)')).toEqual({ status: 7, stdout: '' });
  expect((await run('process.stdout.write("a".repeat(1048576))')).stdout.length).toBe(1048576);
  await expect(run('process.stdout.write("a".repeat(1048577))')).rejects.toMatchObject({
    code: 'output',
  });
  await expect(run('process.stderr.write("a".repeat(1048577))')).rejects.toMatchObject({
    code: 'output',
  });
});

test('actual child timeout, active/pre cancellation and unavailable commands settle with fixed errors', async () => {
  await expect(
    registryReadProcess(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { timeoutMs: 30 }),
  ).rejects.toMatchObject({ code: 'timeout' });
  const controller = new AbortController();
  const pending = registryReadProcess(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {
    signal: controller.signal,
  });
  controller.abort(Error('private cancellation'));
  await expect(pending).rejects.toMatchObject({ code: 'cancelled' });
  await expect(
    registryReadProcess('not-a-banora-command', [], { signal: controller.signal }),
  ).rejects.toMatchObject({ code: 'cancelled' });
  await expect(registryReadProcess('not-a-banora-command', [], {})).rejects.toMatchObject({
    code: 'spawn',
  });
});
