import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
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
import { parsePublicationRequest, publishRelease, PublicationError } from './publication.js';
import type { PublicationIO } from './publication.js';

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
  expect(failure?.completed).toEqual([
    { name: packages[0]!.name, version: packages[0]!.version, state: 'published' },
  ]);
  expect(failure?.attempted).toEqual({ name: packages[1]!.name, version: packages[1]!.version });
  expect(calls.filter((item) => item.argv[1] === 'publish')).toHaveLength(2);
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
  }
});
