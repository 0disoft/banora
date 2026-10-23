import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { verifyRelease } from './release-artifacts.js';
import {
  parsePublicationRequest,
  publishRelease,
  PublicationError,
  npmFailureCode,
} from './publication.js';
import type { PublicationIO } from './publication.js';
import { publisherFixture } from './release-test-fixtures.js';

test('actual publication preview binds reviewed source/hash without commands or mutations and uses explicit local tarball paths', async () => {
  const { root, bundle, request, io, calls } = await publisherFixture();
  const original = await readFile(resolve(bundle, 'manifest.json'));
  const preview = await publishRelease(root, { ...request, execute: false }, io);
  if (preview.operation !== 'preview') throw Error('Expected offline preview');
  expect(preview.operation).toBe('preview');
  expect(calls).toEqual([]);
  expect(preview.packages[0]!.publishArgv[2]).toBe('./packages/sdk.tgz');
  const processResult = Bun.spawnSync(
    [
      process.execPath,
      'scripts/release.ts',
      'publish',
      '--bundle',
      bundle,
      '--manifest-sha256',
      request.manifestSha256,
      '--source-commit',
      request.sourceCommit,
      '--tag',
      'dev',
    ],
    { stdout: 'pipe', stderr: 'pipe', timeout: 5000 },
  );
  expect(processResult.exitCode).toBe(0);
  expect(JSON.parse(processResult.stdout.toString()).publication.operation).toBe('preview');
  expect(processResult.stderr.toString()).toBe('');
  await expect(
    publishRelease(root, { ...request, sourceCommit: 'c'.repeat(40) }, io),
  ).rejects.toThrow('integrity');
  await expect(
    publishRelease(root, { ...request, manifestSha256: 'c'.repeat(64) }, io),
  ).rejects.toThrow('integrity');
  expect(calls).toEqual([]);
  expect(await readFile(resolve(bundle, 'manifest.json'))).toEqual(original);
  expect(() => parsePublicationRequest(['--bundle', bundle, '--execute', '--execute'])).toThrow(
    'usage',
  );
});

test('simulated registry execution checks all versions before writes, resumes matching versions and preserves original bytes', async () => {
  const { root, bundle, request, io, calls, packages, published } = await publisherFixture();
  published.add(packages[0]!.name);
  const original = await readFile(resolve(bundle, 'packages/sdk.tgz'));
  const result = await publishRelease(root, request, io);
  if (result.operation !== 'published') throw Error('Expected simulated completion');
  expect(result.operation).toBe('published');
  expect(result.packages[0]!.state).toBe('already-published');
  const writes = calls.filter((item) => item.argv[1] === 'publish');
  expect(writes.map((item) => item.argv[2])).toEqual(
    packages.slice(1).map((item) => './' + item.archive),
  );
  expect([
    ...new Set(
      calls
        .slice(0, calls.indexOf(writes[0]!))
        .filter((item) => item.argv[3] === 'name')
        .map((item) => item.argv[2]),
    ),
  ]).toEqual(packages.map((item) => item.name));
  expect(
    writes.every((item) => item.argv.includes('--ignore-scripts') && item.cwd !== bundle),
  ).toBe(true);
  expect(await readFile(resolve(bundle, 'packages/sdk.tgz'))).toEqual(original);
  expect(await readFile(resolve(writes[0]!.cwd, 'packages/sdk.tgz'))).toEqual(original);
  expect((await verifyRelease(writes[0]!.cwd)).manifest.source.commit).toBe(request.sourceCommit);
});

test('authority, registry errors and mismatched existing bytes stop simulated publication before any upload', async () => {
  const { root, request, io, calls, packages, published } = await publisherFixture();
  await expect(
    publishRelease(root, request, { ...io, context: { ...io.context, publicRepository: false } }),
  ).rejects.toThrow('authority');
  expect(calls).toEqual([]);
  for (const failure of ['registry', 'version-conflict', 'channel-conflict'] as const) {
    published.clear();
    calls.length = 0;
    if (failure !== 'registry') published.add(packages[2]!.name);
    const broken: PublicationIO = {
      ...io,
      run(argv, cwd) {
        if (argv[1] === 'view' && failure === 'registry')
          return { status: 1, stdout: 'Authored private backend detail' };
        if (argv[3] === 'dist.integrity' && failure === 'version-conflict')
          return { status: 0, stdout: JSON.stringify('sha512-conflicting-bytes') };
        const result = io.run(argv, cwd);
        if (argv[3] === 'name' && argv[2] === packages[2]!.name && failure === 'channel-conflict') {
          const value = JSON.parse(result.stdout);
          value['dist-tags'].dev = '0.0.0-stage';
          return { status: 0, stdout: JSON.stringify(value) };
        }
        return result;
      },
    };
    try {
      await publishRelease(root, request, broken);
      throw Error('Expected rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(PublicationError);
      expect((error as PublicationError).code).toBe(failure);
      expect((error as Error).message).not.toContain('Authored private backend detail');
    }
    expect(calls.some((item) => item.argv[1] === 'publish')).toBe(false);
  }
});

test('an uncertain simulated upload stops subsequent packages and reports confirmed progress without retry', async () => {
  const { root, request, io, calls, packages } = await publisherFixture();
  const failing: PublicationIO = {
    ...io,
    run(argv, cwd) {
      const result = io.run(argv, cwd);
      return argv[1] === 'publish' && argv[2] === './packages/cli.tgz'
        ? { status: null, stdout: '' }
        : result;
    },
  };
  let failure: PublicationError | undefined;
  try {
    await publishRelease(root, request, failing);
  } catch (error) {
    if (error instanceof PublicationError) failure = error;
    else throw error;
  }
  expect(failure?.code).toBe('publication-uncertain');
  expect(failure?.lastCheck).toBe('npm-upload');
  expect(failure?.npmExitStatus).toBeNull();
  expect(failure?.completed).toEqual([
    { name: packages[0]!.name, version: packages[0]!.version, state: 'published' },
  ]);
  expect(failure?.attempted).toEqual({ name: packages[1]!.name, version: packages[1]!.version });
  expect(calls.filter((item) => item.argv[1] === 'publish')).toHaveLength(2);
});

test('publication failure receipts retain only recognized npm codes and stop after one attempted upload', async () => {
  expect(npmFailureCode('npm error code E422\nnpm error private provider detail')).toBe('E422');
  expect(npmFailureCode('npm ERR! code E403\nprivate provider detail')).toBe('E403');
  expect(npmFailureCode('npm error code PRIVATE_DETAIL')).toBe('unknown');
  expect(npmFailureCode('npm error code E422', 'ETIMEDOUT')).toBe('ETIMEDOUT');
  expect(npmFailureCode('npm error code E422', 'private path')).toBe('unknown');
  expect(npmFailureCode('x'.repeat(1024 * 1024) + '\nnpm error code E422')).toBe('unknown');
  const { root, request, io, calls } = await publisherFixture();
  const failing: PublicationIO = {
    ...io,
    run(argv, cwd) {
      if (argv[1] !== 'publish') return io.run(argv, cwd);
      calls.push({ argv, cwd });
      return { status: 1, stdout: 'Private provider detail', npmCode: 'E422' };
    },
  };
  await expect(publishRelease(root, request, failing)).rejects.toMatchObject({
    code: 'publication-uncertain',
    completed: [],
    npmCode: 'E422',
    lastCheck: 'npm-upload',
    npmExitStatus: 1,
  });
  expect(calls.filter((call) => call.argv[1] === 'publish')).toHaveLength(1);
  const error = new PublicationError(
    'publication-uncertain',
    [],
    undefined,
    'Private provider detail',
  );
  expect(error.npmCode).toBe('unknown');
  expect(JSON.stringify(error)).not.toContain('Private provider detail');
});

test('a successful upload process with inconclusive metadata records the exact check without retry', async () => {
  const { root, request, io, calls, published } = await publisherFixture();
  const failing: PublicationIO = {
    ...io,
    run(argv, cwd) {
      const result = io.run(argv, cwd);
      if (argv[1] === 'publish') published.clear();
      return result;
    },
  };
  await expect(publishRelease(root, request, failing)).rejects.toMatchObject({
    code: 'publication-uncertain',
    completed: [],
    lastCheck: 'registry-version',
    npmExitStatus: 0,
  });
  expect(calls.filter((call) => call.argv[1] === 'publish')).toHaveLength(1);
});

test('publication revalidates cached registry metadata immediately after successful uploads', async () => {
  const { root, request, io, calls } = await publisherFixture();
  const cache = new Map<string, { status: number | null; stdout: string }>();
  const cached: PublicationIO = {
    ...io,
    run(argv, cwd) {
      const fresh = io.run(argv, cwd);
      if (argv[1] !== 'view' || argv[3] !== 'name') return fresh;
      const key = argv[2]!;
      const result = !argv.includes('--prefer-online') && cache.has(key) ? cache.get(key)! : fresh;
      cache.set(key, result);
      return result;
    },
  };
  const result = await publishRelease(root, request, cached);
  expect(result.packages).toHaveLength(5);
  expect(calls.filter((call) => call.argv[1] === 'publish')).toHaveLength(5);
  expect(
    calls
      .filter((call) => call.argv[1] === 'view')
      .every((call) => call.argv.includes('--prefer-online')),
  ).toBe(true);
});

test('post-upload propagation only repeats bounded reads and never retries an upload', async () => {
  const { root, request, io, calls, packages, published } = await publisherFixture();
  const stale = new Map<string, number>();
  const waits: number[] = [];
  const delayed: PublicationIO = {
    ...io,
    wait: async (ms) => {
      waits.push(ms);
    },
    run(argv, cwd) {
      const result = io.run(argv, cwd);
      if (argv[1] === 'view' && argv[3] === 'name' && published.has(argv[2]!)) {
        const count = stale.get(argv[2]!) ?? 0;
        stale.set(argv[2]!, count + 1);
        if (count < 7)
          return {
            status: 0,
            stdout: JSON.stringify({
              name: argv[2],
              versions: ['0.0.0-stage'],
              'dist-tags': { latest: '0.0.0-stage' },
            }),
          };
      }
      return result;
    },
  };
  expect((await publishRelease(root, request, delayed)).packages).toHaveLength(5);
  expect(waits).toEqual(Array(35).fill(10_000));
  expect(calls.filter((call) => call.argv[1] === 'publish')).toHaveLength(5);
  published.clear();
  waits.length = 0;
  calls.length = 0;
  stale.clear();
  const missing: PublicationIO = {
    ...delayed,
    run(argv, cwd) {
      const result = io.run(argv, cwd);
      if (argv[1] === 'publish') published.clear();
      return result;
    },
  };
  await expect(publishRelease(root, request, missing)).rejects.toMatchObject({
    code: 'publication-uncertain',
    lastCheck: 'registry-version',
    completed: [],
    attempted: { name: packages[0]!.name, version: packages[0]!.version },
  });
  expect(waits).toEqual(Array(18).fill(10_000));
  expect(calls.filter((call) => call.argv[1] === 'publish')).toHaveLength(1);
  published.clear();
  waits.length = 0;
  calls.length = 0;
  let elapsed = 0;
  let uploaded = false;
  const slow: PublicationIO = {
    ...missing,
    now: () => elapsed,
    run(argv, cwd) {
      const result = missing.run(argv, cwd);
      if (argv[1] === 'publish') uploaded = true;
      if (uploaded && argv[1] === 'view' && argv[3] === 'name') elapsed += 100_000;
      return result;
    },
  };
  await expect(publishRelease(root, request, slow)).rejects.toMatchObject({
    code: 'publication-uncertain',
    lastCheck: 'registry-version',
    completed: [],
  });
  expect(waits).toEqual([10_000]);
  expect(calls.filter((call) => call.argv[1] === 'publish')).toHaveLength(1);
});

test('publication uses asynchronous reads but retains serial uploads and per-package post-checks', async () => {
  const f = await publisherFixture();
  let active = 0,
    peak = 0;
  const result = await publishRelease(f.root, f.request, {
    ...f.io,
    run(argv, cwd) {
      expect(argv[1]).not.toBe('view');
      expect(active).toBe(0);
      return f.io.run(argv, cwd);
    },
    async read(argv, cwd) {
      peak = Math.max(peak, ++active);
      const response = f.io.run(argv, cwd);
      await Promise.resolve();
      active--;
      return response;
    },
  });
  expect(result.packages).toHaveLength(5);
  expect(f.calls.filter((call) => call.argv[1] === 'publish')).toHaveLength(5);
  expect(peak).toBe(2);
  expect(active).toBe(0);
});
