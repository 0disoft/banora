import { expect, test } from 'bun:test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { RELEASE_PACKAGES, RELEASE_PACKAGE_NAMES, verifyRelease } from './release-artifacts.js';
import { publicationOptions, publicationPlan } from './publication-plan.js';
import { fixture } from './release-test-fixtures.js';

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
