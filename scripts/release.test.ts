import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  inventory,
  isReleaseManifest,
  RELEASE_CHECKS,
  RELEASE_PACKAGES,
  RELEASE_PACKAGE_NAMES,
  restoreRelease,
  verifyRelease,
} from './release-artifacts.js';
import type { ReleaseManifest } from './release-artifacts.js';
import { releaseSource, runReleaseCheck } from './release.js';
import { publicationOptions, publicationPlan } from './publication-plan.js';
import {
  parsePublicationRequest,
  publishRelease,
  PublicationError,
  publicRegistryIO,
  npmFailureCode,
} from './publication.js';
import type { PublicationIO } from './publication.js';
import { downloadRegistryArchive, registryHealth, RegistryHealthError } from './registry-health.js';
import type { RegistryHealthIO } from './registry-health.js';

async function fixture(prepared = false) {
  await mkdir('.tmp', { recursive: true });
  const root = await mkdtemp(resolve('.tmp/release-test-'));
  const bundle = resolve(root, 'bundle');
  await mkdir(resolve(bundle, 'packages'), { recursive: true });
  for (const name of RELEASE_PACKAGES)
    await writeFile(
      resolve(bundle, `packages/${name}.tgz`),
      `Authored ${name} integrity fixture, not an executable package.`,
    );
  await mkdir(resolve(bundle, 'examples/studio'), { recursive: true });
  await writeFile(
    resolve(bundle, 'examples/studio/index.html'),
    '<html>Authored integrity fixture</html>',
  );
  await mkdir(resolve(bundle, 'browser-sdk'));
  await writeFile(
    resolve(bundle, 'browser-sdk/banora.global.js'),
    '/* Authored integrity fixture */',
  );
  const manifest: ReleaseManifest = {
    schemaVersion: 'banora.release/v1',
    state: prepared ? 'prepared' : 'candidate',
    source: { commit: 'a'.repeat(40), tree: 'b'.repeat(40) },
    tools: { bun: '1.4.2', node: '24.14.0' },
    packages: RELEASE_PACKAGES.map((name) => ({
      name: RELEASE_PACKAGE_NAMES[name],
      version: '0.1.0-dev.0',
      archive: `packages/${name}.tgz`,
    })),
    files: await inventory(bundle),
    checks: prepared ? RELEASE_CHECKS : [],
  };
  await writeFile(resolve(bundle, 'manifest.json'), JSON.stringify(manifest));
  return { root, bundle, manifest };
}

async function publisherFixture() {
  const value = await fixture(true);
  // File-presence fixture only, in an isolated test root; never the repository policy.
  await writeFile(resolve(value.root, 'SECURITY.md'), 'Authored isolated policy gate fixture.\n');
  const request = {
    bundle: value.bundle,
    sourceCommit: value.manifest.source.commit,
    manifestSha256: createHash('sha256')
      .update(await readFile(resolve(value.bundle, 'manifest.json')))
      .digest('hex'),
    tag: 'dev',
    execute: true,
  };
  const preview = await publishRelease(value.root, { ...request, execute: false });
  if (preview.operation !== 'preview') throw Error('Expected preview fixture');
  const packages = preview.packages;
  const published = new Set<string>();
  const calls: { argv: readonly string[]; cwd: string }[] = [];
  const io: PublicationIO = {
    wait: async () => {},
    context: {
      githubActions: true,
      repository: '0disoft/banora',
      ref: 'refs/heads/main',
      event: 'workflow_dispatch',
      workflowRef: '0disoft/banora/.github/workflows/publish.yml@refs/heads/main',
      sourceCommit: request.sourceCommit,
      publicRepository: true,
      environment: 'npm-release',
      oidcAvailable: true,
      staticTokenPresent: false,
    },
    run(argv, cwd) {
      calls.push({ argv, cwd });
      if (argv[1] === '--version') return { status: 0, stdout: '11.21.0\n' };
      if (argv[1] === 'publish') {
        const item = packages.find((item) => './' + item.archive === argv[2])!;
        published.add(item.name);
        return { status: 0, stdout: '' };
      }
      if (argv[3] === 'dist.integrity') {
        const item = packages.find((item) => `${item.name}@${item.version}` === argv[2])!;
        return { status: 0, stdout: JSON.stringify(item.registryIntegrity) };
      }
      const item = packages.find((item) => item.name === argv[2])!;
      return {
        status: 0,
        stdout: JSON.stringify({
          name: item.name,
          versions: published.has(item.name) ? ['0.0.0-stage', item.version] : ['0.0.0-stage'],
          'dist-tags': { dev: published.has(item.name) ? item.version : '0.0.0-stage' },
        }),
      };
    },
  };
  return { ...value, request, io, calls, packages, published };
}

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

test('release schema rejects future, traversing, duplicate and incomplete evidence; candidate does not imply prepared', async () => {
  const { bundle, manifest } = await fixture();
  expect(isReleaseManifest(manifest)).toBe(true);
  expect((await verifyRelease(bundle, true)).manifest.state).toBe('candidate');
  await expect(verifyRelease(bundle)).rejects.toThrow('manifest');
  for (const value of [
    { ...manifest, schemaVersion: 'banora.release/future' },
    { ...manifest, state: 'prepared' },
    { ...manifest, extra: 'unknown' },
    { ...manifest, files: [...manifest.files, manifest.files[0]] },
    {
      ...manifest,
      files: manifest.files.map((file, index) =>
        index === 0 ? { ...file, path: '../outside' } : file,
      ),
    },
    {
      ...manifest,
      files: manifest.files.map((file, index) =>
        index === 0 ? { ...file, bytes: Infinity } : file,
      ),
    },
    { ...manifest, packages: manifest.packages.slice(1) },
  ])
    expect(isReleaseManifest(value)).toBe(false);
});
test('integrity verifies complete bytes and rejects extra or changed files without editing originals', async () => {
  const { bundle } = await fixture(true);
  expect((await verifyRelease(bundle)).manifest.state).toBe('prepared');
  const file = resolve(bundle, 'packages/sdk.tgz');
  const original = await readFile(file);
  await writeFile(file, 'Changed authored fixture');
  await expect(verifyRelease(bundle)).rejects.toThrow('integrity');
  await writeFile(file, original);
  await writeFile(resolve(bundle, 'examples/unexpected.js'), 'Unexpected fixture');
  await expect(verifyRelease(bundle)).rejects.toThrow('integrity');
  expect(await readFile(file)).toEqual(original);
});

test('retained legacy package identities stay verifiable and restorable but cannot mix with current identities', async () => {
  const { root, bundle, manifest } = await fixture(true);
  const legacy: ReleaseManifest = {
    ...manifest,
    packages: manifest.packages.map((item, index) => ({
      ...item,
      name: `@banora/${RELEASE_PACKAGES[index]}`,
    })),
  };
  await writeFile(resolve(bundle, 'manifest.json'), JSON.stringify(legacy));
  const originalManifest = await readFile(resolve(bundle, 'manifest.json'));
  expect((await verifyRelease(bundle)).manifest.packages).toEqual(legacy.packages);
  const restored = resolve(root, await restoreRelease(root, bundle));
  expect((await verifyRelease(restored)).manifest.packages).toEqual(legacy.packages);
  expect(await readFile(resolve(bundle, 'manifest.json'))).toEqual(originalManifest);
  for (const base of [manifest, legacy]) {
    const other = base === manifest ? legacy : manifest;
    for (let index = 0; index < RELEASE_PACKAGES.length; index++) {
      const packages = base.packages.map((item, i) => (i === index ? other.packages[i]! : item));
      expect(isReleaseManifest({ ...base, packages })).toBe(false);
    }
  }
});
test('release restaging copies verified immutable bytes, preserves source and rejects directory links', async () => {
  const { root, bundle, manifest } = await fixture(true);
  const original = await readFile(resolve(bundle, 'manifest.json'));
  const restored = resolve(root, await restoreRelease(root, bundle));
  expect(restored).not.toBe(bundle);
  expect((await verifyRelease(restored)).manifest.files).toEqual(manifest.files);
  expect(await readFile(resolve(bundle, 'manifest.json'))).toEqual(original);
  await writeFile(resolve(restored, 'packages/sdk.tgz'), 'Restaging modification');
  expect((await verifyRelease(bundle)).manifest.files).toEqual(manifest.files);
  const outside = resolve(root, 'outside');
  await mkdir(outside);
  await symlink(
    outside,
    resolve(bundle, 'examples/linked'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  await expect(verifyRelease(bundle)).rejects.toThrow('linked');
});
test('source gate checks the actual workspace/Git state and check execution fails/stops without raw log propagation', async () => {
  const { root } = await fixture();
  const initialized = Bun.spawnSync(['git', 'init', '--quiet', root], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  expect(initialized.exitCode).toBe(0);
  await writeFile(
    resolve(root, 'package.json'),
    JSON.stringify({ name: 'banora-workspace', private: true }),
  );
  expect(() => releaseSource(root)).toThrow('source');
  await expect(
    runReleaseCheck(process.cwd(), ['-e', 'process.exit(1)'], 'failure-fixture', 5000),
  ).rejects.toThrow('check');
  await expect(
    runReleaseCheck(process.cwd(), ['-e', 'setInterval(()=>{},1000)'], 'timeout-fixture', 100),
  ).rejects.toThrow('check');
  const child = Bun.spawnSync([process.execPath, 'scripts/release.ts', '--unknown'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  expect(child.exitCode).toBe(1);
  expect(child.stderr.toString()).toBe('');
  expect(JSON.parse(child.stdout.toString()).error.code).toBe('usage');
});

async function registryFixture() {
  const { root, bundle, manifest } = await fixture(true);
  const request = {
    bundle,
    manifestSha256: createHash('sha256')
      .update(await readFile(resolve(bundle, 'manifest.json')))
      .digest('hex'),
    sourceCommit: manifest.source.commit,
    tag: 'dev',
    execute: false,
  };
  const plan = await publishRelease(root, request);
  if (plan.operation !== 'preview') throw Error('Expected preview fixture');
  const calls: { argv: readonly string[]; cwd: string }[] = [];
  const checks: { args: string[]; label: string }[] = [],
    downloads: string[] = [];
  // Authored metadata and copied integrity bytes; these fixtures do not simulate npm ownership or executable archives.
  const io: RegistryHealthIO = {
    run(argv, cwd) {
      calls.push({ argv, cwd });
      const item = plan.packages.find((item) => `${item.name}@${item.version}` === argv[2]);
      if (argv[0] !== 'npm' || argv[1] !== 'view' || !item)
        throw Error('Unexpected fixture command');
      return {
        status: 0,
        stdout: JSON.stringify({
          name: item.name,
          version: item.version,
          dist: {
            integrity: item.registryIntegrity,
            tarball: `https://registry.npmjs.org/${item.name}/-/${item.name.split('/')[1]}-${item.version}.tgz`,
          },
          'dist-tags': { dev: item.version },
        }),
      };
    },
    async download(url, destination, bytes) {
      expect(calls.length).toBe(5);
      const item = plan.packages.find((item) =>
        url.includes(`/${item.name.split('/')[1]}-${item.version}.tgz`),
      )!;
      expect(bytes).toBe(manifest.files.find((file) => file.path === item.archive)!.bytes);
      downloads.push(url);
      await copyFile(resolve(bundle, item.archive), destination);
    },
    async check(args, label) {
      checks.push({ args, label });
    },
  };
  return { root, bundle, manifest, request, io, calls, checks, downloads };
}
test('actual npm configuration cannot inherit ancestor project settings or use a project npmrc in the isolated working directory', async () => {
  await mkdir('.tmp', { recursive: true });
  const root = await mkdtemp(resolve('.tmp/npm-config-isolation-')),
    child = resolve(root, 'isolated');
  await mkdir(child);
  await writeFile(
    resolve(root, 'package.json'),
    JSON.stringify({ name: 'authored-config-fixture', private: true }),
  );
  // Innocuous authored registry setting; no credential or private value is created.
  await writeFile(resolve(root, '.npmrc'), 'registry=https://example.org/\n');
  const io = publicRegistryIO(root),
    before = await readFile(resolve(root, '.npmrc'));
  const read = io.run(['npm', 'config', 'get', 'registry'], child);
  expect(read.status).toBe(0);
  expect(read.stdout.trim()).toBe('https://registry.npmjs.org/');
  const retryRead = io.run(
    ['npm', 'config', 'get', 'fetch-retries', '--fetch-retries=9', '--fetch-retries=0'],
    child,
  );
  expect(retryRead.status).toBe(0);
  expect(retryRead.stdout.trim()).toBe('0');
  await writeFile(resolve(child, '.npmrc'), 'registry=https://example.org/\n');
  expect(() => io.run(['npm', 'config', 'get', 'registry'], child)).toThrow('authority');
  expect(await readFile(resolve(root, '.npmrc'))).toEqual(before);
});

test('npm upload transport disables hidden retries while read configuration and uncertain failure handling remain separate', async () => {
  await mkdir('.tmp', { recursive: true });
  const root = await mkdtemp(resolve('.tmp/npm-write-once-'));
  const calls: { args: readonly string[]; timeout?: number; retries?: string }[] = [];
  const io = publicRegistryIO(root, (command, args, options) => {
    expect(command).toBe('npm');
    expect(options.shell).toBe(false);
    calls.push({ args, timeout: options.timeout, retries: options.env?.NPM_CONFIG_FETCH_RETRIES });
    return {
      pid: 0,
      output: [],
      stdout: '',
      stderr: 'npm error code ECONNRESET\n',
      status: 1,
      signal: null,
    };
  });
  const failure = io.run(['npm', 'publish', './authored.tgz', '--fetch-retries=9'], root);
  expect(failure).toEqual({ status: 1, stdout: '', npmCode: 'ECONNRESET' });
  expect(calls).toHaveLength(1);
  expect(calls[0]!.args.slice(-3)).toEqual(['--fetch-retries=0', '--prefix', root]);
  expect(calls[0]).toMatchObject({ timeout: 180_000, retries: '0' });
  io.run(['npm', 'view', '@0disoft/banora', '--json'], root);
  expect(calls).toHaveLength(2);
  expect(calls[1]).toMatchObject({ timeout: 30_000 });
  expect(calls[1]!.retries).toBeUndefined();
  expect(calls[1]!.args).not.toContain('--fetch-retries=0');
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

test('offline publication handoff works without external commands and preserves prepared bytes', async () => {
  const { root, bundle, manifest } = await fixture(true);
  const original = await readFile(resolve(bundle, 'manifest.json'));
  const plan = await publicationPlan(root, bundle, {
    workflow: 'publish.yml',
    environment: 'npm-release',
  });
  expect(plan.tag).toBe('dev');
  expect(plan.workflowFileExists).toBe(false);
  expect(plan.packages.map((item) => item.name)).toEqual(Object.values(RELEASE_PACKAGE_NAMES));
  expect(plan.trustedPublisher.environmentName).toBe('npm-release');
  expect(plan.packages.map((item) => item.sha256)).toEqual(
    manifest.packages.map(
      (item) => manifest.files.find((file) => file.path === item.archive)!.sha256,
    ),
  );
  const env = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key.toLowerCase() !== 'path'),
    ),
    PATH: '',
  };
  const command = Bun.spawnSync(
    [
      process.execPath,
      'scripts/release.ts',
      'publication-plan',
      '--bundle',
      bundle,
      '--workflow',
      'publish.yml',
    ],
    {
      env,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 5000,
    },
  );
  expect(command.exitCode).toBe(0);
  expect(command.stderr.toString()).toBe('');
  expect(JSON.parse(command.stdout.toString()).plan.operation).toBe('plan-only');
  expect(await readFile(resolve(bundle, 'manifest.json'))).toEqual(original);
  expect((await verifyRelease(bundle)).manifest.files).toEqual(manifest.files);
});

test('publication planning rejects unprepared, legacy and damaged bundles and unsafe channel or workflow selection', async () => {
  const candidate = await fixture();
  await expect(
    publicationPlan(candidate.root, candidate.bundle, { workflow: 'publish.yml' }),
  ).rejects.toThrow('manifest');
  const { root, bundle, manifest } = await fixture(true);
  for (const options of [
    { workflow: '../publish.yml' },
    { workflow: 'publish.yml', tag: 'latest' },
    { workflow: 'publish.yml', tag: '--force' },
    { workflow: 'publish.yml', environment: ' npm-release' },
  ])
    await expect(publicationPlan(root, bundle, options)).rejects.toThrow('usage');
  await writeFile(
    resolve(bundle, 'manifest.json'),
    JSON.stringify({
      ...manifest,
      packages: manifest.packages.map((item, index) => ({
        ...item,
        name: `@banora/${RELEASE_PACKAGES[index]}`,
      })),
    }),
  );
  await expect(publicationPlan(root, bundle, { workflow: 'publish.yml' })).rejects.toThrow(
    'manifest',
  );
  await writeFile(resolve(bundle, 'manifest.json'), JSON.stringify(manifest));
  await writeFile(resolve(bundle, 'packages/sdk.tgz'), 'Damaged authored package fixture');
  await expect(publicationPlan(root, bundle, { workflow: 'publish.yml' })).rejects.toThrow(
    'integrity',
  );
  for (const args of [
    [],
    ['--bundle', bundle],
    ['--bundle', bundle, '--workflow', 'publish.yml', '--publish'],
    ['--bundle', bundle, '--workflow', 'publish.yml', '--workflow', 'other.yml'],
  ])
    expect(() => publicationOptions(args)).toThrow('usage');
});

test('workflow presence is not publisher verification and stable/prerelease channels remain distinct', async () => {
  const { root, bundle, manifest } = await fixture(true);
  await mkdir(resolve(root, '.github/workflows'), { recursive: true });
  await writeFile(
    resolve(root, '.github/workflows/publish.yml'),
    'name: Authored non-publishing fixture\n',
  );
  for (const [version, tag] of [
    ['1.2.0', 'latest'],
    ['1.2.0-rc.1', 'rc'],
    ['1.2.0-dev-tools.1', 'next'],
  ] as const) {
    await writeFile(
      resolve(bundle, 'manifest.json'),
      JSON.stringify({
        ...manifest,
        packages: manifest.packages.map((item) => ({ ...item, version })),
      }),
    );
    const plan = await publicationPlan(root, bundle, { workflow: 'publish.yml' });
    expect(plan.tag).toBe(tag);
    expect(plan.workflowFileExists).toBe(true);
    expect(plan.prerequisites).toContain(
      'Matching trusted publisher for each package, including direct-publish permission and optional environment.',
    );
    expect(plan.packages[0]!.publishArgv).toContain('--ignore-scripts');
    expect(plan.packages.every((item) => item.publishArgv.includes('--fetch-retries=0'))).toBe(
      true,
    );
  }
});
