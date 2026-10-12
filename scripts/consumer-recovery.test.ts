import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { consumerRecovery, recoveryOptions } from './consumer-recovery.js';
import {
  inventory,
  RELEASE_CHECKS,
  RELEASE_PACKAGES,
  RELEASE_PACKAGE_NAMES,
} from './release-artifacts.js';

const hash = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const options = [
  '--current-bundle',
  'current',
  '--current-manifest-sha256',
  'a'.repeat(64),
  '--current-source-commit',
  'b'.repeat(40),
  '--target-bundle',
  'target',
  '--target-manifest-sha256',
  'c'.repeat(64),
  '--target-source-commit',
  'd'.repeat(40),
];
test('portable recovery binds both reviewed inputs and rejects mutation/ambiguous flags', () => {
  expect(recoveryOptions(options).target.sourceCommit).toBe('d'.repeat(40));
  for (const args of [
    [],
    options.slice(0, -1),
    [...options, '--execute'],
    [...options, '--tag', 'dev'],
    [...options, '--target-bundle', 'other'],
    options.map((value) => (value === 'a'.repeat(64) ? 'bad' : value)),
    options.map((value) => (value === 'b'.repeat(40) ? 'BAD' : value)),
  ])
    expect(() => recoveryOptions(args)).toThrow('usage');
});
async function fixture(version: string) {
  await mkdir('.tmp', { recursive: true });
  const root = await mkdtemp(resolve('.tmp/consumer-recovery-test-'));
  await mkdir(resolve(root, 'packages'));
  for (const key of RELEASE_PACKAGES)
    await writeFile(
      resolve(root, `packages/${key}.tgz`),
      `Authored integrity fixture ${key}; not executable.`,
    );
  await mkdir(resolve(root, 'examples/studio'), { recursive: true });
  await mkdir(resolve(root, 'browser-sdk'));
  await writeFile(resolve(root, 'examples/studio/index.html'), '<html>Authored fixture</html>');
  await writeFile(resolve(root, 'browser-sdk/banora.global.js'), '/* Authored fixture */');
  await writeFile(
    resolve(root, 'manifest.json'),
    JSON.stringify({
      schemaVersion: 'banora.release/v1',
      state: 'prepared',
      source: { commit: 'a'.repeat(40), tree: 'b'.repeat(40) },
      tools: { bun: '1.4.3', node: '24.21.0' },
      packages: RELEASE_PACKAGES.map((key) => ({
        name: RELEASE_PACKAGE_NAMES[key],
        version,
        archive: `packages/${key}.tgz`,
      })),
      files: await inventory(root),
      checks: RELEASE_CHECKS,
    }),
  );
  return {
    bundle: root,
    sourceCommit: 'a'.repeat(40),
    manifestSha256: hash(await readFile(resolve(root, 'manifest.json'))),
  };
}
test('bad bindings, changed archives and equal/forward targets stop before installs', async () => {
  const current = await fixture('0.1.0-dev.1'),
    target = await fixture('0.1.0-dev.0');
  const before = await readFile(resolve(target.bundle, 'packages/sdk.tgz'));
  await expect(
    consumerRecovery(process.cwd(), {
      current,
      target: { ...target, manifestSha256: '0'.repeat(64) },
    }),
  ).rejects.toThrow('integrity');
  await expect(
    consumerRecovery(process.cwd(), {
      current,
      target: { ...target, sourceCommit: '0'.repeat(40) },
    }),
  ).rejects.toThrow('integrity');
  await expect(consumerRecovery(process.cwd(), { current, target: current })).rejects.toThrow(
    'recovery-target',
  );
  await expect(
    consumerRecovery(process.cwd(), { current: target, target: current }),
  ).rejects.toThrow('recovery-target');
  expect(await readFile(resolve(target.bundle, 'packages/sdk.tgz'))).toEqual(before);
  await writeFile(resolve(target.bundle, 'packages/sdk.tgz'), 'changed');
  await expect(consumerRecovery(process.cwd(), { current, target })).rejects.toThrow('integrity');
});
test('root command discovery includes recovery and invalid use needs no subprocess PATH', () => {
  const help = Bun.spawnSync([process.execPath, 'scripts/release.ts', '--help'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  expect(help.exitCode).toBe(0);
  expect(
    JSON.parse(help.stdout.toString()).commands.some((value: string) =>
      value.startsWith('consumer-recovery-check '),
    ),
  ).toBe(true);
  const invalid = Bun.spawnSync(
    [process.execPath, 'scripts/release.ts', 'consumer-recovery-check', '--execute'],
    { env: { ...process.env, PATH: '' }, stdout: 'pipe', stderr: 'pipe' },
  );
  expect(invalid.exitCode).toBe(1);
  expect(invalid.stderr.toString()).toBe('');
  expect(JSON.parse(invalid.stdout.toString())).toEqual({
    schemaVersion: 'banora.release-command/v1',
    ok: false,
    error: { code: 'usage' },
  });
});
