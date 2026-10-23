import { expect, test } from 'bun:test';
import { mkdir, readFile, symlink, truncate, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  inventory,
  isReleaseManifest,
  RELEASE_PACKAGES,
  restoreRelease,
  verifyRelease,
} from './release-artifacts.js';
import type { ReleaseManifest } from './release-artifacts.js';
import { releaseSource, runReleaseCheck } from './release.js';
import { fixture } from './release-test-fixtures.js';

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

test('release size guards still reject oversized payloads and a valid JSON manifest before content verification', async () => {
  const { bundle } = await fixture(true);
  const archive = resolve(bundle, 'packages/sdk.tgz');
  const manifest = resolve(bundle, 'manifest.json');
  const originalArchive = await readFile(archive);
  const originalManifest = await readFile(manifest);
  try {
    await truncate(archive, 64 * 1024 * 1024 + 1);
    await expect(inventory(bundle)).rejects.toMatchObject({ code: 'integrity' });
    await writeFile(archive, originalArchive);
    const padded =
      originalManifest.toString() + ' '.repeat(2 * 1024 * 1024 + 1 - originalManifest.length);
    expect(JSON.parse(padded)).toEqual(JSON.parse(originalManifest.toString()));
    await writeFile(manifest, padded);
    await expect(verifyRelease(bundle)).rejects.toMatchObject({ code: 'manifest' });
  } finally {
    await writeFile(archive, originalArchive);
    await writeFile(manifest, originalManifest);
  }
  expect((await verifyRelease(bundle)).manifest.state).toBe('prepared');
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
