import { expect, test } from 'bun:test';
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
