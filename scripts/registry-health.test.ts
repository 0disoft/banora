import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { inventory, RELEASE_PACKAGE_NAMES, verifyRelease } from './release-artifacts.js';
import { downloadRegistryArchive, registryHealth, RegistryHealthError } from './registry-health.js';
import { registryFixture } from './release-test-fixtures.js';

test('registry health asynchronous observations finish before download and after all consumer checks', async () => {
  const f = await registryFixture();
  let active = 0,
    peak = 0,
    finished = 0;
  const result = await registryHealth(f.root, f.request, {
    ...f.io,
    run() {
      throw Error('synchronous registry read is forbidden');
    },
    async read(argv, cwd) {
      if (f.calls.length === 5) expect(f.checks).toHaveLength(3);
      const response = f.io.run(argv, cwd);
      peak = Math.max(peak, ++active);
      await Promise.resolve();
      active--;
      finished++;
      return response;
    },
    async download(url, path, bytes) {
      expect(finished).toBe(5);
      await f.io.download(url, path, bytes);
    },
  });
  expect(result.packages).toHaveLength(5);
  expect(f.calls).toHaveLength(10);
  expect(peak).toBe(2);
  expect(active).toBe(0);
});

test('registry health binds all identities and downloaded bytes before isolated consumer checks and preserves original artifacts', async () => {
  const { root, bundle, request, io, calls, checks, downloads } = await registryFixture();
  const before = await inventory(bundle);
  const result = await registryHealth(root, request, io);
  expect(result.checks).toEqual(['registry-sdk', 'registry-cli', 'registry-adapters']);
  expect(result.packages.map((item) => item.name)).toEqual(Object.values(RELEASE_PACKAGE_NAMES));
  expect(downloads).toHaveLength(5);
  expect(calls).toHaveLength(10);
  expect(
    calls.every((call) => call.argv[1] === 'view' && call.argv.includes('--prefer-online')),
  ).toBe(true);
  expect(checks.map((check) => check.args[0])).toEqual([
    'scripts/packed-consumer.ts',
    'scripts/packed-cli.ts',
    'scripts/packed-adapters.ts',
  ]);
  expect(
    checks.every((check) => check.args[1] === '--release-bundle' && check.args[2] !== bundle),
  ).toBe(true);
  expect((await verifyRelease(checks[0]!.args[2]!)).manifest.source).toEqual(result.source);
  expect(await inventory(bundle)).toEqual(before);
  expect(await readFile(resolve(checks[0]!.args[2]!, 'packages/sdk.tgz'))).toEqual(
    await readFile(resolve(bundle, 'packages/sdk.tgz')),
  );
  const invalid = await registryFixture();
  await expect(
    registryHealth(
      invalid.root,
      { ...invalid.request, manifestSha256: '0'.repeat(64) },
      invalid.io,
    ),
  ).rejects.toThrow('integrity');
  expect(invalid.calls).toHaveLength(0);
  await expect(
    registryHealth(invalid.root, { ...invalid.request, execute: true }, invalid.io),
  ).rejects.toThrow('usage');
  const cli = Bun.spawnSync(
    [process.execPath, 'scripts/release.ts', 'registry-check', '--execute'],
    { stdout: 'pipe', stderr: 'pipe' },
  );
  expect(cli.exitCode).toBe(1);
  expect(JSON.parse(cli.stdout.toString()).error.code).toBe('usage');
  expect(cli.stderr.toString()).toBe('');
});

test('registry preflight rejects provider failures, unsafe URLs and late-package integrity or channel conflicts before any download', async () => {
  for (const failure of [
    'registry-metadata',
    'registry-integrity',
    'registry-channel',
    'unsafe-url',
  ] as const) {
    const fixture = await registryFixture(),
      read = fixture.io.run;
    const io = {
      ...fixture.io,
      run(argv: readonly string[], cwd: string) {
        const result = read(argv, cwd);
        if (fixture.calls.length !== 5) return result;
        if (failure === 'registry-metadata')
          return { status: 1, stdout: 'Authored provider failure detail.' };
        const value = JSON.parse(result.stdout);
        if (failure === 'registry-integrity') value.dist.integrity = 'sha512-mismatch';
        if (failure === 'registry-channel') value['dist-tags'].dev = '0.0.0-stage';
        if (failure === 'unsafe-url') value.dist.tarball = 'https://example.org/unreviewed.tgz';
        return { status: 0, stdout: JSON.stringify(value) };
      },
    };
    await expect(registryHealth(fixture.root, fixture.request, io)).rejects.toMatchObject({
      code: failure === 'unsafe-url' ? 'registry-metadata' : failure,
    });
    expect(fixture.downloads).toHaveLength(0);
    expect(fixture.checks).toHaveLength(0);
  }
});

test('registry health refuses corrupt downloads, stops on consumer failure and rechecks the channel after installing', async () => {
  const damaged = await registryFixture(),
    copy = damaged.io.download;
  await expect(
    registryHealth(damaged.root, damaged.request, {
      ...damaged.io,
      async download(url, destination, bytes) {
        await copy(url, destination, bytes);
        if (damaged.downloads.length === 3)
          await writeFile(destination, 'Authored corrupt download.');
      },
    }),
  ).rejects.toMatchObject({
    code: 'registry-integrity',
    completed: ['@0disoft/banora', '@0disoft/banora-cli'],
  });
  expect(damaged.checks).toHaveLength(0);
  const failed = await registryFixture(),
    check = failed.io.check;
  await expect(
    registryHealth(failed.root, failed.request, {
      ...failed.io,
      async check(args, label) {
        await check(args, label);
        if (label === 'registry-cli') throw Error('Authored consumer failure detail.');
      },
    }),
  ).rejects.toMatchObject({
    code: 'registry-consumer',
    lastCheck: 'registry-cli',
    completed: Object.values(RELEASE_PACKAGE_NAMES),
  });
  expect(failed.checks).toHaveLength(2);
  const changed = await registryFixture(),
    read = changed.io.run;
  await expect(
    registryHealth(changed.root, changed.request, {
      ...changed.io,
      run(argv, cwd) {
        const result = read(argv, cwd);
        if (changed.calls.length > 5) {
          const value = JSON.parse(result.stdout);
          value['dist-tags'].dev = '0.0.0-stage';
          return { ...result, stdout: JSON.stringify(value) };
        }
        return result;
      },
    }),
  ).rejects.toMatchObject({
    code: 'registry-channel',
    lastCheck: 'registry-confirmation',
    completed: Object.values(RELEASE_PACKAGE_NAMES),
  });
  expect(changed.checks).toHaveLength(3);
});

test('fresh HTTPS download bounds actual streamed bytes, denies redirects/foreign hosts and preserves existing destinations', async () => {
  await mkdir('.tmp', { recursive: true });
  const directory = await mkdtemp(resolve('.tmp/registry-stream-test-'));
  const address = 'https://registry.npmjs.org/@0disoft/banora/-/banora-0.1.0-dev.0.tgz';
  const destination = resolve(directory, 'archive.tgz');
  const fetcher = async (url: string, init: RequestInit) => {
    expect(url).toBe(address);
    expect(init.redirect).toBe('error');
    expect(init.cache).toBe('no-store');
    return new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2]));
          controller.enqueue(new Uint8Array([3, 4]));
          controller.close();
        },
      }),
      { headers: { 'content-length': '4' } },
    );
  };
  await downloadRegistryArchive(address, destination, 4, fetcher);
  expect(await readFile(destination)).toEqual(Buffer.from([1, 2, 3, 4]));
  await expect(downloadRegistryArchive(address, destination, 4, fetcher)).rejects.toBeInstanceOf(
    RegistryHealthError,
  );
  expect(await readFile(destination)).toEqual(Buffer.from([1, 2, 3, 4]));
  await expect(
    downloadRegistryArchive(
      'https://example.org/archive.tgz',
      resolve(directory, 'foreign.tgz'),
      4,
      fetcher,
    ),
  ).rejects.toMatchObject({ code: 'registry-download' });
  for (const [name, response] of [
    ['long', new Response(new Uint8Array([1, 2, 3, 4, 5]))],
    ['short', new Response(new Uint8Array([1, 2, 3]))],
    ['redirect', new Response(null, { status: 302 })],
    ['header', new Response(new Uint8Array([1, 2, 3, 4]), { headers: { 'content-length': '5' } })],
  ] as const)
    await expect(
      downloadRegistryArchive(address, resolve(directory, name + '.tgz'), 4, async () => response),
    ).rejects.toMatchObject({ code: 'registry-download' });
});
