import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { demoInventory, readDemoInventory } from './demo-archive.js';
import { checkDemoFiles, demoHealthRequest, reserveDemoReceipt } from './demo-health.js';

const content = Buffer.from('<main>Authored live health fixture</main>');
const sha = createHash('sha256').update(content).digest('hex');
const inventory = {
  tarSha256: 'b'.repeat(64),
  tarBytes: 10240,
  files: [{ name: 'studio/index.html', bytes: content.length, sha256: sha }],
};
const io = (respond: (url: string, options: RequestInit) => Promise<Response>) => {
  let time = 0;
  return {
    fetch: (url: string, options: RequestInit) =>
      url.includes('/banora-build.json')
        ? Promise.resolve(new Response(null, { status: 404 }))
        : respond(url, options),
    now: () => time,
    wait: async (milliseconds: number) => {
      time += milliseconds;
    },
  };
};
const fixChecksum = (tar: Buffer) => {
  tar.fill(32, 148, 156);
  const sum = [...tar.subarray(0, 512)].reduce((value, byte) => value + byte, 0);
  tar.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
};

function nearDeadline(fetch: ReturnType<typeof io>['fetch']) {
  let ticks = 0;
  return {
    now: () => (++ticks < 3 ? 0 : 119999),
    wait: async () => {},
    fetch,
  };
}

test('responses arriving after the deadline are cancelled without acquiring a reader or changing progress', async () => {
  for (const cancellation of ['resolved', 'rejected', 'pending'] as const) {
    let respond!: (response: Response) => void;
    let finishCancel!: () => void;
    const pendingCancel = new Promise<void>((resolve) => {
      finishCancel = resolve;
    });
    let cancelled = 0,
      pulls = 0;
    let acquired: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let signal: AbortSignal | undefined;
    const body = new ReadableStream<Uint8Array>(
      {
        pull() {
          pulls++;
        },
        cancel() {
          cancelled++;
          if (cancellation === 'rejected') throw Error('Authored private cancellation detail');
          if (cancellation === 'pending') return pendingCancel;
        },
      },
      { highWaterMark: 0 },
    );
    const getReader = body.getReader.bind(body);
    Object.defineProperty(body, 'getReader', { value: () => (acquired = getReader()) });
    const outcome = checkDemoFiles(
      inventory,
      nearDeadline((_url, init) => {
        signal = init.signal!;
        return new Promise<Response>((resolve) => {
          respond = resolve;
        });
      }),
    ).then(
      () => {
        throw Error('Unexpected health success');
      },
      (error: unknown) => error,
    );
    try {
      const failure = await outcome;
      expect(failure).toMatchObject({ code: 'deadline', checkedFiles: 0, attempts: 1 });
      expect(signal?.aborted).toBe(true);
      respond(new Response(body));
      await nextTurn();
      expect(cancelled).toBe(1);
      expect(pulls).toBe(0);
      expect(acquired).toBeUndefined();
      expect(body.locked).toBe(false);
      expect(await outcome).toBe(failure);
    } finally {
      finishCancel();
      if (acquired) {
        await acquired.cancel().catch(() => {});
        acquired.releaseLock();
      } else await body.cancel().catch(() => {});
    }
  }
});

test('response validation and expected absence cancel unread bodies without changing refusal codes or retries', async () => {
  for (const [status, headers, redirected, code] of [
    [403, {}, false, 'http'],
    [200, { 'content-length': '67108865' }, false, 'bound'],
    [200, { 'content-length': 'invalid' }, false, 'bound'],
    [200, {}, true, 'bound'],
  ] as const) {
    let cancelled = 0,
      calls = 0;
    const body = new ReadableStream<Uint8Array>(
      {
        cancel() {
          cancelled++;
        },
      },
      { highWaterMark: 0 },
    );
    const response = new Response(body, { status, headers });
    if (redirected) Object.defineProperty(response, 'redirected', { value: true });
    try {
      await expect(
        checkDemoFiles(
          inventory,
          io(async () => {
            calls++;
            return response;
          }),
        ),
      ).rejects.toMatchObject({ code, checkedFiles: 0, attempts: 1 });
      expect(cancelled).toBe(1);
      expect(body.locked).toBe(false);
      expect(calls).toBe(1);
    } finally {
      await body.cancel().catch(() => {});
    }
  }
  let cancelled = 0;
  const body = new ReadableStream<Uint8Array>(
    {
      cancel() {
        cancelled++;
      },
    },
    { highWaterMark: 0 },
  );
  try {
    const result = await checkDemoFiles(inventory, {
      now: () => 0,
      wait: async () => {},
      fetch: async (url) =>
        url.includes('/banora-build.json')
          ? new Response(body, { status: 404 })
          : new Response(content),
    });
    expect(result).toMatchObject({ checkedFiles: 1, attempts: 2, buildIdentityAbsent: true });
    expect(cancelled).toBe(1);
    expect(body.locked).toBe(false);
  } finally {
    await body.cancel().catch(() => {});
  }
});

test('deadline cleanup releases an active reader even while its cancellation is pending', async () => {
  let finishCancel!: () => void;
  const pendingCancel = new Promise<void>((resolve) => {
    finishCancel = resolve;
  });
  let cancelled = 0;
  let acquired: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const body = new ReadableStream<Uint8Array>(
    {
      cancel() {
        cancelled++;
        return pendingCancel;
      },
    },
    { highWaterMark: 0 },
  );
  const getReader = body.getReader.bind(body);
  Object.defineProperty(body, 'getReader', { value: () => (acquired = getReader()) });
  try {
    await expect(
      checkDemoFiles(
        inventory,
        nearDeadline(async () => new Response(body)),
      ),
    ).rejects.toMatchObject({ code: 'deadline', checkedFiles: 0, attempts: 1 });
    expect(acquired).toBeDefined();
    expect(cancelled).toBe(1);
    expect(body.locked).toBe(false);
  } finally {
    finishCancel();
    await acquired?.cancel().catch(() => {});
    acquired?.releaseLock();
  }
});

test('a real system tar yields exact static file bytes and rejects malformed names, links, checksums and truncation', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'banora-demo-health-'));
  try {
    await mkdir(resolve(root, 'studio'));
    await writeFile(resolve(root, 'studio/index.html'), content);
    const archive = resolve(root, 'site.tar');
    const packed = spawnSync(
      'tar',
      ['--format=ustar', '-cf', archive, '-C', root, './studio/index.html'],
      { timeout: 5000, windowsHide: true },
    );
    expect(packed.status).toBe(0);
    const bytes = await readFile(archive),
      parsed = await readDemoInventory(archive);
    expect(parsed.files).toEqual(inventory.files);
    expect(parsed.tarSha256).toBe(createHash('sha256').update(bytes).digest('hex'));
    for (const name of [
      '../secret',
      '/outside',
      'studio/../../secret',
      'studio//index.html',
      'https://other.test/x',
    ]) {
      const altered = Buffer.from(bytes);
      altered.fill(0, 0, 100);
      altered.write(name, 0);
      fixChecksum(altered);
      expect(() => demoInventory(altered)).toThrow();
    }
    for (const type of ['1', '2', 'x', 'g', 'L']) {
      const altered = Buffer.from(bytes);
      altered[156] = type.charCodeAt(0);
      fixChecksum(altered);
      expect(() => demoInventory(altered)).toThrow();
    }
    const corrupt = Buffer.from(bytes);
    corrupt[10] = corrupt[10]! ^ 1;
    expect(() => demoInventory(corrupt)).toThrow();
    expect(() => demoInventory(bytes.subarray(0, 512))).toThrow();
    expect(() => demoInventory(bytes.subarray(0, bytes.length - 1))).toThrow();
    const duplicate = Buffer.concat([bytes.subarray(0, 1024), bytes]);
    expect(() => demoInventory(duplicate)).toThrow();
    expect(await readFile(archive)).toEqual(bytes);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('exact live bytes use only the fixed public origin and bounded credential-free requests', async () => {
  const result = await checkDemoFiles(
    inventory,
    io(async (url, options) => {
      expect(new URL(url).origin).toBe('https://0disoft.github.io');
      expect(new URL(url).pathname).toBe('/banora/studio/index.html');
      expect(options.credentials).toBe('omit');
      expect(options.redirect).toBe('error');
      expect(options.cache).toBe('no-store');
      expect(options.headers).toBeUndefined();
      expect(options.signal).toBeInstanceOf(AbortSignal);
      return new Response(content);
    }),
  );
  expect(result).toEqual({
    tarSha256: inventory.tarSha256,
    checkedFiles: 1,
    htmlFiles: 1,
    attempts: 2,
    buildIdentityAbsent: true,
  });
});

test('read-only propagation retries are bounded, preserve progress and never expose provider text', async () => {
  let attempts = 0;
  const result = await checkDemoFiles(
    inventory,
    io(async () =>
      ++attempts === 1 ? new Response('stale', { status: 404 }) : new Response(content),
    ),
  );
  expect(result.attempts).toBe(3);
  const mixed = {
    ...inventory,
    files: [...inventory.files, { ...inventory.files[0]!, name: 'other.html' }],
  };
  try {
    await checkDemoFiles(
      mixed,
      io(async (url) =>
        url.includes('other.html')
          ? new Response(Buffer.alloc(content.length, 88))
          : new Response(content),
      ),
    );
    throw Error('expected rejection');
  } catch (error) {
    expect(error).toMatchObject({ code: 'content', checkedFiles: 1, attempts: 4 });
    expect(JSON.stringify(error)).not.toContain('other.html');
  }
  attempts = 0;
  await expect(
    checkDemoFiles(
      inventory,
      io(async () => {
        attempts++;
        throw Error('private token and path');
      }),
    ),
  ).rejects.toMatchObject({ code: 'transport', attempts: 3 });
  expect(attempts).toBe(3);
});

test('redirect/auth/oversized bodies stop immediately and hanging transport has a real deadline', async () => {
  for (const response of [
    new Response('denied', { status: 403 }),
    new Response(Buffer.alloc(content.length + 1)),
    new Response(content, { headers: { 'content-length': '67108865' } }),
    Response.redirect('https://other.test/'),
  ]) {
    let attempts = 0;
    await expect(
      checkDemoFiles(
        inventory,
        io(async () => {
          attempts++;
          return response;
        }),
      ),
    ).rejects.toBeDefined();
    expect(attempts).toBe(1);
  }
  let ticks = 0;
  await expect(
    checkDemoFiles(inventory, {
      now: () => (++ticks < 3 ? 0 : 119999),
      wait: async () => {},
      fetch: () => new Promise<Response>(() => {}),
    }),
  ).rejects.toMatchObject({ code: 'deadline', attempts: 1 });
});

test('malformed discovery and existing receipts fail without network or overwrite', async () => {
  await mkdir('.artifacts', { recursive: true });
  for (const args of [
    [],
    ['check', '--execute'],
    ['fingerprint', '--archive', 'file', '--archive', 'other'],
    ['check', '--directory', 'dir', '--sha256', 'b'.repeat(64), '--receipt', '../outside.json'],
  ])
    expect(() => demoHealthRequest(args)).toThrow();
  expect(
    demoHealthRequest(['check', '--directory', 'dir', '--sha256', 'b'.repeat(64)]).action,
  ).toBe('check');
  const filename = `.artifacts/demo-health-test-${process.pid}-${crypto.randomUUID()}.json`;
  const file = await reserveDemoReceipt(filename);
  try {
    await file.writeFile('preserved');
    await file.close();
    await expect(reserveDemoReceipt(filename)).rejects.toThrow();
    expect(await readFile(filename, 'utf8')).toBe('preserved');
    const invalid = spawnSync(process.execPath, ['scripts/demo-health.ts', 'check', '--execute'], {
      encoding: 'utf8',
      timeout: 5000,
      env: { ...process.env, PATH: '' },
      windowsHide: true,
    });
    expect(invalid.status).toBe(1);
    expect(JSON.parse(invalid.stdout)).toMatchObject({ ok: false, code: 'usage', checkedFiles: 0 });
  } finally {
    await rm(filename, { force: true });
  }
});

test('restored artifacts without a build receipt require its live absence', async () => {
  let attempts = 0;
  await expect(
    checkDemoFiles(inventory, {
      now: () => 0,
      wait: async () => {},
      fetch: async (url) => {
        attempts++;
        return url.includes('/banora-build.json')
          ? new Response('stale receipt')
          : new Response(content);
      },
    }),
  ).rejects.toMatchObject({ code: 'content', checkedFiles: 1, attempts: 4 });
  expect(attempts).toBe(4);
});
