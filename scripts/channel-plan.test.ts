import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { channelOptions, channelPlan } from './channel-plan.js';
import {
  inventory,
  RELEASE_CHECKS,
  RELEASE_PACKAGES,
  RELEASE_PACKAGE_NAMES,
} from './release-artifacts.js';
import { registryHealth, registryTargetHealth } from './registry-health.js';
import type { RegistryHealthIO } from './registry-health.js';

async function fixture() {
  await mkdir('.tmp', { recursive: true });
  const root = await mkdtemp(resolve('.tmp/channel-plan-test-'));
  const bundle = resolve(root, 'bundle');
  await mkdir(resolve(bundle, 'packages'), { recursive: true });
  for (const name of RELEASE_PACKAGES)
    await writeFile(
      resolve(bundle, `packages/${name}.tgz`),
      `Authored ${name} hash fixture; not an SDK package.`,
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
  const manifest = {
    schemaVersion: 'banora.release/v1',
    state: 'prepared',
    source: { commit: 'a'.repeat(40), tree: 'b'.repeat(40) },
    tools: { bun: '1.4.2', node: '24.14.0' },
    packages: RELEASE_PACKAGES.map((name) => ({
      name: RELEASE_PACKAGE_NAMES[name],
      version: '0.1.0-dev.0',
      archive: `packages/${name}.tgz`,
    })),
    files: await inventory(bundle),
    checks: RELEASE_CHECKS,
  };
  await writeFile(resolve(bundle, 'manifest.json'), JSON.stringify(manifest));
  const request = {
    bundle,
    sourceCommit: manifest.source.commit,
    manifestSha256: createHash('sha256')
      .update(await readFile(resolve(bundle, 'manifest.json')))
      .digest('hex'),
    tag: 'dev',
    execute: false,
    expectedCurrentVersion: '0.1.0-dev.1',
  };
  const calls: string[][] = [];
  // Registry fixture integrity comes from authored bytes, independently of the preflight.
  const entries = await Promise.all(
    manifest.packages.map(async (item) => ({
      name: item.name,
      version: item.version,
      versions: ['0.0.0-stage', '0.1.0-dev.0', '0.1.0-dev.1'],
      dist: {
        integrity:
          'sha512-' +
          createHash('sha512')
            .update(await readFile(resolve(bundle, item.archive)))
            .digest('base64'),
        tarball: `https://registry.npmjs.org/${item.name}/-/${item.name.split('/')[1]}-${item.version}.tgz`,
      },
      'dist-tags': { dev: request.expectedCurrentVersion },
    })),
  );
  const run = (argv: readonly string[]) => {
    calls.push([...argv]);
    const entry = entries.find((item) => `${item.name}@${item.version}` === argv[2]);
    if (!entry || argv[0] !== 'npm' || argv[1] !== 'view')
      throw Error('Unexpected write/foreign lookup');
    return { status: 0, stdout: JSON.stringify(entry) };
  };
  return { root, bundle, request, entries, run, calls };
}

test('whole-family channel preflight binds bytes, checks twice and distinguishes rollback from no change', async () => {
  const f = await fixture();
  const original = await readFile(resolve(f.bundle, 'manifest.json'));
  const plan = await channelPlan(f.root, f.request, f.run);
  expect(plan.operation).toBe('rollback-plan');
  expect(plan.observations).toBe(2);
  expect(f.calls).toHaveLength(10);
  expect(plan.olderCommonVersions).toEqual(['0.1.0-dev.0']);
  expect(plan.packages.map((item) => item.name)).toEqual(Object.values(RELEASE_PACKAGE_NAMES));
  expect(
    plan.packages.every(
      (item) =>
        item.changeArgv[1] === 'dist-tag' && item.changeArgv[3] === `${item.name}@0.1.0-dev.0`,
    ),
  ).toBe(true);
  expect(await readFile(resolve(f.bundle, 'manifest.json'))).toEqual(original);
  for (const item of f.entries) item['dist-tags'].dev = '0.1.0-dev.0';
  const noop = await channelPlan(
    f.root,
    { ...f.request, expectedCurrentVersion: '0.1.0-dev.0' },
    f.run,
  );
  expect(noop.operation).toBe('no-change');
  expect(noop.packages.every((item) => item.changeArgv.length === 0)).toBe(true);
  expect(noop.olderCommonVersions).toEqual([]);
});

// Each independent failure case keeps its own bundle and Bun's default timeout.
for (const [kind, code, reads] of [
  ['mixed', 'channel-drift', 3],
  ['integrity', 'channel-integrity', 3],
  ['malformed', 'channel-metadata', 1],
  ['oversized', 'channel-metadata', 1],
  ['transport', 'channel-metadata', 1],
  ['changed', 'channel-drift', 10],
  ['tamper', 'integrity', 10],
  ['deprecated', 'channel-target', 1],
  ['url', 'channel-metadata', 1],
  ['identity', 'channel-metadata', 1],
  ['missing', 'channel-metadata', 1],
  ['status', 'channel-metadata', 1],
] as const) {
  test(`channel plan rejects ${kind} without producing change commands`, async () => {
    const f = await fixture();
    const run = (argv: readonly string[], cwd: string) => {
      const result = f.run(argv);
      if (kind === 'status') return { status: 404, stdout: 'Private provider body' };
      if (kind === 'deprecated')
        return {
          status: 0,
          stdout: JSON.stringify({
            ...JSON.parse(result.stdout),
            deprecated: 'Authored deprecated target',
          }),
        };
      if (kind === 'identity')
        return {
          status: 0,
          stdout: JSON.stringify({ ...JSON.parse(result.stdout), name: '@foreign/package' }),
        };
      if (kind === 'url') {
        const value = JSON.parse(result.stdout);
        value.dist.tarball = 'https://foreign.invalid/package.tgz';
        return { status: 0, stdout: JSON.stringify(value) };
      }
      if (kind === 'missing')
        return {
          status: 0,
          stdout: JSON.stringify({ ...JSON.parse(result.stdout), versions: ['0.1.0-dev.0'] }),
        };
      if (kind === 'transport') throw Error('Private provider body must never be reported');
      if (kind === 'malformed') return { status: 0, stdout: 'Private provider body' };
      if (kind === 'oversized') return { status: 0, stdout: 'x'.repeat(1024 * 1024 + 1) };
      if (kind === 'mixed') f.entries[2]!['dist-tags'].dev = '0.1.0-dev.2';
      if (kind === 'integrity') f.entries[2]!.dist.integrity = 'wrong';
      if (kind === 'changed' && f.calls.length === 5) f.entries[2]!.versions.push('0.1.0-alpha.0');
      if (kind === 'tamper' && f.calls.length === 10) {
        writeFileSync(resolve(cwd, 'packages/sdk.tgz'), 'Changed bytes');
      }
      return result;
    };
    await expect(channelPlan(f.root, f.request, run)).rejects.toMatchObject({ code });
    expect(f.calls).toHaveLength(reads);
    expect(f.calls.every((argv) => argv[1] === 'view')).toBe(true);
  });
}

test('invalid versions, forward changes, placeholders and execute flags fail before provider reads', async () => {
  const f = await fixture();
  for (const version of [
    '0.0.0-stage',
    '01.0.0',
    '0.1.0-dev.01',
    '0.1.0+meta',
    '*',
    '0.1.0-dev.0;echo',
    '0.0.1',
  ]) {
    await expect(
      channelPlan(f.root, { ...f.request, expectedCurrentVersion: version }, f.run),
    ).rejects.toThrow();
  }
  await expect(channelPlan(f.root, { ...f.request, execute: true }, f.run)).rejects.toThrow(
    'usage',
  );
  expect(f.calls).toHaveLength(0);
  const base = [
    '--bundle',
    f.bundle,
    '--manifest-sha256',
    f.request.manifestSha256,
    '--source-commit',
    f.request.sourceCommit,
    '--tag',
    'dev',
  ];
  expect(
    channelOptions([...base, '--expected-current-version', '0.1.0-dev.10']).expectedCurrentVersion,
  ).toBe('0.1.0-dev.10');
  for (const args of [
    base,
    [...base, '--execute'],
    [...base, '--execute', 'true'],
    [
      ...base,
      '--expected-current-version',
      '0.1.0-dev.1',
      '--expected-current-version',
      '0.1.0-dev.1',
    ],
  ])
    expect(() => channelOptions(args)).toThrow('usage');
});

async function targetFixture() {
  const f = await fixture();
  const downloads: string[] = [];
  const checks: { args: string[]; label: string }[] = [];
  const io: RegistryHealthIO = {
    run: f.run,
    async download(url, destination, bytes) {
      expect(f.calls).toHaveLength(15);
      const index = f.entries.findIndex((entry) => entry.dist.tarball === url);
      expect(index).toBeGreaterThanOrEqual(0);
      const archive = resolve(f.bundle, `packages/${RELEASE_PACKAGES[index]}.tgz`);
      expect((await readFile(archive)).length).toBe(bytes);
      downloads.push(url);
      await copyFile(archive, destination);
    },
    async check(args, label) {
      checks.push({ args, label });
    },
  };
  return { ...f, io, downloads, checks };
}

test('target health installs reviewed older bytes without moving the channel or weakening publication health', async () => {
  const f = await targetFixture();
  const before = await inventory(f.bundle);
  const health = await registryTargetHealth(f.root, f.request, f.io);
  expect(health.operation).toBe('registry-target-check');
  expect(health.expectedCurrentVersion).toBe('0.1.0-dev.1');
  expect(health.targetVersion).toBe('0.1.0-dev.0');
  expect(health.preflightObservations).toBe(2);
  expect(health.packages.every((item) => item.version === health.targetVersion)).toBe(true);
  expect(health.checks).toEqual(['registry-sdk', 'registry-cli', 'registry-adapters']);
  expect(f.downloads).toHaveLength(5);
  expect(f.calls).toHaveLength(20);
  expect(f.calls.every((args) => args[1] === 'view')).toBe(true);
  expect(f.entries.every((entry) => entry['dist-tags'].dev === health.expectedCurrentVersion)).toBe(
    true,
  );
  expect(
    f.checks.every((check) => check.args[1] === '--release-bundle' && check.args[2] !== f.bundle),
  ).toBe(true);
  expect(await inventory(f.bundle)).toEqual(before);

  const ordinary = await targetFixture();
  await expect(registryHealth(ordinary.root, ordinary.request, ordinary.io)).rejects.toMatchObject({
    code: 'registry-channel',
  });
  expect(ordinary.downloads).toEqual([]);
  expect(ordinary.checks).toEqual([]);
});

test('target health rejects drift and deprecation before downloads and after consumer checks', async () => {
  for (const phase of ['before-download', 'after-consumers'] as const)
    for (const problem of ['tag', 'deprecated'] as const) {
      const f = await targetFixture();
      const run: RegistryHealthIO['run'] = (argv) => {
        const result = f.run(argv);
        const boundary = phase === 'before-download' ? 10 : 15;
        if (f.calls.length <= boundary) return result;
        const value = JSON.parse(result.stdout);
        if (problem === 'tag') value['dist-tags'].dev = '0.1.0-dev.0';
        else value.deprecated = 'Authored deprecated target fixture';
        return { ...result, stdout: JSON.stringify(value) };
      };
      await expect(registryTargetHealth(f.root, f.request, { ...f.io, run })).rejects.toMatchObject(
        {
          code: problem === 'tag' ? 'registry-channel' : 'registry-target',
          ...(phase === 'after-consumers'
            ? {
                lastCheck: 'registry-confirmation',
                completed: Object.values(RELEASE_PACKAGE_NAMES),
              }
            : {}),
        },
      );
      expect(f.downloads).toHaveLength(phase === 'after-consumers' ? 5 : 0);
      expect(f.checks).toHaveLength(phase === 'after-consumers' ? 3 : 0);
    }
  const rejected = await targetFixture();
  await expect(
    registryTargetHealth(rejected.root, { ...rejected.request, execute: true }, rejected.io),
  ).rejects.toMatchObject({ code: 'usage' });
  expect(rejected.calls).toEqual([]);
});

test('actual release discovery and rejected channel/target requests keep the fixed JSON envelope without invoking npm', async () => {
  const env = { ...process.env, PATH: '' };
  const help = Bun.spawnSync([process.execPath, 'scripts/release.ts', '--help'], {
    env,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  expect(help.exitCode).toBe(0);
  expect(
    JSON.parse(help.stdout.toString()).commands.some((entry: string) =>
      entry.startsWith('channel-plan '),
    ),
  ).toBe(true);
  expect(
    JSON.parse(help.stdout.toString()).commands.some((entry: string) =>
      entry.startsWith('registry-target-check '),
    ),
  ).toBe(true);
  for (const command of ['channel-plan', 'registry-target-check'])
    for (const args of [
      ['--execute'],
      ['--expected-current-version', '0.0.0-stage'],
      ['--unknown', 'Private input'],
    ]) {
      const result = Bun.spawnSync([process.execPath, 'scripts/release.ts', command, ...args], {
        env,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(result.exitCode).toBe(1);
      expect(JSON.parse(result.stdout.toString())).toEqual({
        schemaVersion: 'banora.release-command/v1',
        ok: false,
        error: { code: 'usage' },
      });
      expect(result.stdout.toString()).not.toContain('Private input');
      expect(result.stderr.length).toBe(0);
    }
  const f = await fixture();
  const failed = Bun.spawnSync(
    [
      process.execPath,
      'scripts/release.ts',
      'channel-plan',
      '--bundle',
      f.bundle,
      '--manifest-sha256',
      f.request.manifestSha256,
      '--source-commit',
      f.request.sourceCommit,
      '--tag',
      'dev',
      '--expected-current-version',
      f.request.expectedCurrentVersion,
    ],
    { env, stdout: 'pipe', stderr: 'pipe' },
  );
  expect(failed.exitCode).toBe(1);
  expect(JSON.parse(failed.stdout.toString())).toEqual({
    schemaVersion: 'banora.release-command/v1',
    ok: false,
    error: { code: 'channel-metadata' },
  });
});
