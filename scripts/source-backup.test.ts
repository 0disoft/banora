import { beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import * as childProcess from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { sourceBackup, sourceRecovery, sourceRecoveryOptions } from './source-backup.js';

async function fixture() {
  await mkdir('.tmp', { recursive: true });
  const root = await mkdtemp(resolve('.tmp/source-backup-test-'));
  await mkdir(resolve(root, '.tmp/hooks'), { recursive: true });
  const config = resolve(root, '.tmp/empty.gitconfig');
  await writeFile(config, '');
  const git = (...args: string[]) => {
    const result = spawnSync(
      'git',
      [
        '-c',
        'user.name=Authored source fixture',
        '-c',
        'user.email=fixture@example.invalid',
        '-c',
        'commit.gpgsign=false',
        '-c',
        `core.hooksPath=${resolve(root, '.tmp/hooks')}`,
        ...args,
      ],
      {
        cwd: root,
        env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: config },
        encoding: 'utf8',
        timeout: 10_000,
        windowsHide: true,
      },
    );
    if (result.status !== 0) throw Error('Authored Git fixture failed.');
    return result.stdout.trim();
  };
  await writeFile(resolve(root, '.gitignore'), '.tmp/\n.artifacts/\n');
  await writeFile(
    resolve(root, 'package.json'),
    JSON.stringify({ name: 'banora-workspace', private: true }),
  );
  await writeFile(resolve(root, 'README.md'), 'Authored offline source recovery fixture.\n');
  git('init', '-b', 'main');
  git('add', '.');
  git('commit', '-m', 'Authored initial fixture');
  git('tag', '-a', 'v0.1.0', '-m', 'Authored tag');
  await writeFile(resolve(root, 'README.md'), 'Authored next source recovery fixture.\n');
  git('add', '.');
  git('commit', '-m', 'Authored next fixture');
  return { root, git };
}
describe('isolated authored Git source', () => {
  let source: Awaited<ReturnType<typeof fixture>>;

  // Preparation and the real backup/recovery each retain their own default deadline.
  // Every test gets fresh history and refs; mutation tests never share a repository.
  beforeEach(async () => {
    source = await fixture();
  });

  test('initial identity is batched while final source and ref checks stay fresh', async () => {
    const { root, git } = source;
    const expected = { commit: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}') };
    const observed = spyOn(childProcess, 'spawnSync');
    try {
      const backup = await sourceBackup(root);
      expect(backup.source).toEqual(expected);
      const commands = observed.mock.calls.map(([, args]) => {
        if (!Array.isArray(args)) throw Error('Expected authored Git arguments.');
        return args.slice(8);
      });
      expect(commands).toHaveLength(7);
      expect(commands.filter((args) => args[0] === 'rev-parse')).toEqual([
        ['rev-parse', '--is-shallow-repository', 'HEAD', 'HEAD^{tree}'],
        ['rev-parse', 'HEAD'],
      ]);
      expect(commands.filter((args) => args[0] === 'status')).toEqual([
        ['status', '--porcelain'],
        ['status', '--porcelain'],
      ]);
      expect(commands.filter((args) => args[0] === 'show-ref')).toEqual([
        ['show-ref'],
        ['show-ref'],
      ]);
    } finally {
      observed.mockRestore();
    }
  });

  test('a shallow source is rejected by the batched initial observation before capture', async () => {
    const { root, git } = source;
    await writeFile(resolve(root, '.git/shallow'), git('rev-parse', 'HEAD') + '\n');
    await expect(sourceBackup(root)).rejects.toMatchObject({ code: 'source' });
    await expect(readdir(resolve(root, '.artifacts/releases'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  test.each(['dirty', 'head', 'refs'] as const)(
    'capture rejects %s changes after the bundle is written',
    async (kind) => {
      const { root, git } = source;
      const head = git('rev-parse', 'HEAD');
      // A same-tree commit makes the worktree stay clean, so the HEAD guard must catch it.
      const value =
        kind === 'head'
          ? git('commit-tree', 'HEAD^{tree}', '-p', head, '-m', 'Authored concurrent commit') + '\n'
          : kind === 'refs'
            ? head + '\n'
            : 'Authored concurrent work.\n';
      const target =
        kind === 'dirty'
          ? resolve(root, 'README.md')
          : resolve(root, '.git/refs', kind === 'head' ? 'heads/main' : 'tags/concurrent');
      const execute = childProcess.spawnSync;
      const intercept = ((...args: Parameters<typeof execute>) => {
        const result = execute(...args);
        if (
          Array.isArray(args[1]) &&
          args[1].includes('bundle') &&
          args[1].includes('create') &&
          result.status === 0
        )
          writeFileSync(target, value);
        return result;
      }) as typeof execute;
      const observed = spyOn(childProcess, 'spawnSync').mockImplementation(intercept);
      try {
        await expect(sourceBackup(root)).rejects.toMatchObject({ code: 'source' });
      } finally {
        observed.mockRestore();
      }
      expect(await readFile(target, 'utf8')).toBe(value);
      const releases = resolve(root, '.artifacts/releases');
      const directories = await readdir(releases);
      expect(directories).toHaveLength(1);
      await expect(
        readFile(resolve(releases, directories[0]!, 'manifest.json')),
      ).rejects.toMatchObject({ code: 'ENOENT' });
    },
  );

  test('real Git backup restores exact history/refs and clean source without inheriting the original remote/config', async () => {
    const { root, git } = source;
    git('remote', 'add', 'origin', 'https://example.invalid/unused-source-fixture');
    git('config', 'credential.helper', 'unused-authored-helper');
    const originalConfig = await readFile(resolve(root, '.git/config'));
    const backup = await sourceBackup(root);
    const request = {
      backup: resolve(root, backup.backup),
      manifestSha256: backup.manifestSha256,
      sourceCommit: backup.source.commit,
    };
    const bytes = await readFile(resolve(request.backup, 'source.bundle'));
    const restored = await sourceRecovery(root, request);
    expect(restored.ok).toBe(true);
    expect(restored.refs).toEqual(backup.refs);
    expect(restored.source).toEqual(backup.source);
    expect(restored.trackedFiles).toBe(3);
    expect(restored.completed).toHaveLength(6);
    expect(await readFile(resolve(root, restored.restored, 'README.md'), 'utf8')).toBe(
      'Authored next source recovery fixture.\n',
    );
    expect(await readFile(resolve(request.backup, 'source.bundle'))).toEqual(bytes);
    expect(await readFile(resolve(root, '.git/config'))).toEqual(originalConfig);
    expect(JSON.stringify(restored)).not.toContain('example.invalid');
    expect(git('status', '--porcelain')).toBe('');
    const mirrorConfig = await readFile(
      resolve(root, restored.restored, '../mirror.git/config'),
      'utf8',
    );
    expect(mirrorConfig).not.toContain('unused-authored-helper');
    expect(mirrorConfig).not.toContain('https://');
  });
  test('dirty sources and modified, extra-file or wrongly reviewed backups are rejected without replacement', async () => {
    const { root } = source;
    const backup = await sourceBackup(root);
    const request = {
      backup: resolve(root, backup.backup),
      manifestSha256: backup.manifestSha256,
      sourceCommit: backup.source.commit,
    };
    await expect(
      sourceRecovery(root, { ...request, manifestSha256: '0'.repeat(64) }),
    ).rejects.toMatchObject({ code: 'integrity' });
    await expect(
      sourceRecovery(root, { ...request, sourceCommit: '0'.repeat(40) }),
    ).rejects.toMatchObject({ code: 'manifest' });
    await writeFile(resolve(request.backup, 'extra.txt'), 'Authored extra file');
    await expect(sourceRecovery(root, request)).rejects.toMatchObject({ code: 'manifest' });
    const fresh = await sourceBackup(root);
    const bundle = resolve(root, fresh.backup, 'source.bundle');
    const bytes = await readFile(bundle);
    await writeFile(bundle, Buffer.concat([bytes, Buffer.from('Authored corruption')]));
    await expect(
      sourceRecovery(root, {
        backup: resolve(root, fresh.backup),
        manifestSha256: fresh.manifestSha256,
        sourceCommit: fresh.source.commit,
      }),
    ).rejects.toMatchObject({ code: 'integrity' });
    expect(await readFile(bundle)).toEqual(
      Buffer.concat([bytes, Buffer.from('Authored corruption')]),
    );
    await writeFile(resolve(root, 'README.md'), 'Authored uncommitted work.\n');
    await expect(sourceBackup(root)).rejects.toMatchObject({ code: 'source' });
    expect(await readFile(resolve(root, 'README.md'), 'utf8')).toBe('Authored uncommitted work.\n');
    await writeFile(
      resolve(root, 'package.json'),
      JSON.stringify({ name: 'other-workspace', private: true }),
    );
    await expect(sourceRecovery(root, request)).rejects.toMatchObject({ code: 'source' });
  });
});

test('source recovery has strict discoverable arguments and fixed errors before Git or provider access', () => {
  const options = [
    '--backup',
    'backup',
    '--manifest-sha256',
    'a'.repeat(64),
    '--source-commit',
    'b'.repeat(40),
  ];
  expect(sourceRecoveryOptions(options).backup).toBe('backup');
  for (const args of [
    [],
    options.slice(0, -1),
    [...options, '--execute'],
    [...options, '--backup', 'other'],
    options.map((arg) => (arg === 'a'.repeat(64) ? 'invalid' : arg)),
  ])
    expect(() => sourceRecoveryOptions(args)).toThrow('usage');
  for (const args of [
    ['--help'],
    ['source-recovery-check', '--execute'],
    ['source-backup', '--publish'],
  ]) {
    const result = Bun.spawnSync([process.execPath, 'scripts/release.ts', ...args], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const output = JSON.parse(result.stdout.toString());
    if (args[0] === '--help') {
      expect(output.commands).toContain('source-backup');
      expect(output.commands).toContain(
        'source-recovery-check --backup DIR --manifest-sha256 HASH --source-commit SHA',
      );
    } else {
      expect(result.exitCode).toBe(1);
      expect(output.error).toEqual({ code: 'usage' });
      expect(result.stderr.toString()).toBe('');
    }
  }
});
