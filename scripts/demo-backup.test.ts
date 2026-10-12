import { expect, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  backupHash,
  createDemoBackup,
  demoBackupBytes,
  draftBackupAssets,
  parseDemoBackup,
} from './demo-backup-contract.js';
import { backupCaptureContext, demoBackupRequest, restoreDraftBackup } from './demo-backup.js';

const source = 'a'.repeat(40),
  run = '12345';
async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), 'banora-demo-backup-'));
  await mkdir(resolve(root, 'studio'));
  await writeFile(resolve(root, 'studio/index.html'), '<main>Preserved authored fixture</main>');
  await writeFile(
    resolve(root, 'banora-build.json'),
    JSON.stringify({
      schemaVersion: 'banora.demo-build/v1',
      sourceCommit: source,
      sourceRunId: run,
    }),
  );
  const directory = resolve(root, 'archive');
  await mkdir(directory);
  const path = resolve(directory, 'artifact.tar');
  const packed = spawnSync(
    'tar',
    ['--format=ustar', '-cf', path, '-C', root, './studio/index.html', './banora-build.json'],
    { timeout: 5000, windowsHide: true },
  );
  expect(packed.status).toBe(0);
  const tar = await readFile(path),
    manifest = createDemoBackup(tar, source, run),
    bytes = demoBackupBytes(manifest),
    hash = backupHash(bytes);
  const release = {
    id: 88,
    url: 'https://api.github.com/repos/0disoft/banora/releases/88',
    draft: true,
    prerelease: true,
    published_at: null,
    target_commitish: source,
    tag_name: `demo-backup-${run}`,
    assets: [
      {
        id: 91,
        name: 'artifact.tar',
        url: 'https://api.github.com/repos/0disoft/banora/releases/assets/91',
        state: 'uploaded',
        digest: `sha256:${manifest.tarSha256}`,
        size: tar.length,
      },
      {
        id: 92,
        name: 'demo-manifest.json',
        url: 'https://api.github.com/repos/0disoft/banora/releases/assets/92',
        state: 'uploaded',
        digest: `sha256:${hash}`,
        size: bytes.length,
      },
    ],
  };
  return { root, directory, path, tar, manifest, bytes, hash, release };
}

test('backup manifests bind the original embedded build identity and strict bounded schema', async () => {
  const f = await fixture();
  try {
    expect(parseDemoBackup(f.bytes)).toEqual(f.manifest);
    expect(f.manifest.tarSha256).toBe(backupHash(f.tar));
    expect(() => createDemoBackup(f.tar, 'b'.repeat(40), run)).toThrow();
    expect(() => createDemoBackup(f.tar, source, '999')).toThrow();
    const missing = Buffer.from(f.tar);
    const position = missing.indexOf(Buffer.from('banora-build.json'));
    missing[position] = 120;
    expect(() => createDemoBackup(missing, source, run)).toThrow();
    for (const invalid of [
      { ...f.manifest, unexpected: 1 },
      { ...f.manifest, schemaVersion: 'future' },
      { ...f.manifest, tarBytes: 0 },
      { ...f.manifest, tarBytes: 64 * 1024 * 1024 + 1 },
      { ...f.manifest, sourceRunId: '../other' },
      { ...f.manifest, tarSha256: 'invalid' },
    ]) {
      expect(() => parseDemoBackup(Buffer.from(JSON.stringify(invalid)))).toThrow();
    }
    expect(() => parseDemoBackup(Buffer.alloc(4097))).toThrow();
    expect(() => parseDemoBackup(new Uint8Array([255]))).toThrow();
    expect(await readFile(f.path)).toEqual(f.tar);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('draft selection rejects published, foreign, changed and ambiguous asset metadata', async () => {
  const f = await fixture();
  try {
    expect(draftBackupAssets(f.release, '88', f.manifest, f.hash)).toEqual({
      manifest: { id: '92', bytes: f.bytes.length },
      tar: { id: '91', bytes: f.tar.length },
    });
    for (const mutate of [
      (r: typeof f.release) => {
        r.draft = false;
      },
      (r: typeof f.release) => {
        r.prerelease = false;
      },
      (r: typeof f.release) => {
        r.target_commitish = 'b'.repeat(40);
      },
      (r: typeof f.release) => {
        r.tag_name = 'v1.0.0';
      },
      (r: typeof f.release) => {
        r.url = 'https://api.github.com/repos/other/repo/releases/88';
      },
      (r: typeof f.release) => {
        r.assets.push({ ...r.assets[0]! });
      },
      (r: typeof f.release) => {
        r.assets[0]!.size++;
      },
      (r: typeof f.release) => {
        r.assets[0]!.digest = `sha256:${'f'.repeat(64)}`;
      },
      (r: typeof f.release) => {
        r.assets[1]!.url = 'https://other.test/92';
      },
      (r: typeof f.release) => {
        r.assets[1]!.state = 'new';
      },
      (r: typeof f.release) => {
        r.assets[1]!.name = 'artifact.tar';
      },
    ]) {
      const altered = structuredClone(f.release);
      mutate(altered);
      expect(() => draftBackupAssets(altered, '88', f.manifest, f.hash)).toThrow();
    }
    expect(() =>
      draftBackupAssets(
        { ...f.release, published_at: '2026-10-12T00:00:00Z' },
        '88',
        f.manifest,
        f.hash,
      ),
    ).toThrow();
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('restoration reads only release assets, preserves exact tar bytes and rejects altered data before staging', async () => {
  const f = await fixture();
  let staged: string | undefined;
  try {
    await mkdir('.artifacts', { recursive: true });
    const endpoints: string[] = [];
    const reader = {
      metadata: (endpoint: string) => {
        endpoints.push(endpoint);
        expect(endpoint).toBe('releases/88');
        return f.release;
      },
      download: (id: string, bytes: number) => {
        const data = id === '92' ? f.bytes : f.tar;
        expect(data.length).toBe(bytes);
        return data;
      },
    };
    const result = await restoreDraftBackup('88', f.hash, reader);
    staged = resolve(result.directory);
    expect(
      staged.startsWith(resolve('.artifacts/demo-backups') + '\\') ||
        staged.startsWith(resolve('.artifacts/demo-backups') + '/'),
    ).toBe(true);
    expect(result.sourceCommit).toBe(source);
    expect(await readFile(resolve(staged, 'artifact.tar'))).toEqual(f.tar);
    expect(endpoints).toEqual(['releases/88', 'releases/88', 'releases/88']);
    await expect(restoreDraftBackup('../other', f.hash, reader)).rejects.toThrow('usage');
    await expect(restoreDraftBackup('88', 'bad', reader)).rejects.toThrow('usage');
    await expect(
      restoreDraftBackup('88', f.hash, { ...reader, download: () => Buffer.alloc(1) }),
    ).rejects.toThrow('manifest');
    await expect(
      restoreDraftBackup('88', f.hash, {
        ...reader,
        download: (id) => (id === '92' ? f.bytes : Buffer.alloc(f.tar.length)),
      }),
    ).rejects.toThrow('archive');
    await expect(
      restoreDraftBackup('88', f.hash, {
        ...reader,
        metadata: () => ({ ...f.release, draft: false }),
      }),
    ).rejects.toThrow('metadata');
    expect(await readFile(f.path)).toEqual(f.tar);
  } finally {
    if (staged) await rm(staged, { recursive: true, force: true });
    await rm(f.root, { recursive: true, force: true });
  }
});

test('offline plan never needs provider access and execution refuses forged or unrelated workflow context', async () => {
  const f = await fixture();
  try {
    const args = [
      '--directory',
      f.directory,
      '--sha256',
      f.manifest.tarSha256,
      '--source-commit',
      source,
      '--run-id',
      run,
    ];
    const child = spawnSync(process.execPath, ['scripts/demo-backup.ts', 'plan', ...args], {
      env: { ...process.env, PATH: '', GITHUB_OUTPUT: '' },
      encoding: 'utf8',
      timeout: 5000,
      windowsHide: true,
    });
    expect(child.status).toBe(0);
    expect(JSON.parse(child.stdout)).toMatchObject({
      ok: true,
      operation: 'plan',
      manifestSha256: f.hash,
    });
    expect(() => demoBackupRequest(['plan', ...args, '--execute'])).toThrow('usage');
    expect(() =>
      demoBackupRequest([
        'restore',
        '--release-id',
        '88',
        '--manifest-sha256',
        f.hash,
        '--release-id',
        '89',
      ]),
    ).toThrow('usage');
    const env = {
      GITHUB_REPOSITORY: '0disoft/banora',
      GITHUB_REF: 'refs/heads/main',
      GITHUB_EVENT_NAME: 'workflow_dispatch',
      GITHUB_SHA: source,
      GITHUB_RUN_ID: run,
      BANORA_REPOSITORY_PUBLIC: 'true',
      BANORA_BACKUP_JOB: 'archive',
      GH_TOKEN: 'fixture-authority-marker',
    };
    expect(() => backupCaptureContext(source, run, env)).not.toThrow();
    for (const key of [
      'GITHUB_REPOSITORY',
      'GITHUB_REF',
      'GITHUB_SHA',
      'GITHUB_RUN_ID',
      'BANORA_BACKUP_JOB',
      'GH_TOKEN',
      'BANORA_REPOSITORY_PUBLIC',
    ])
      expect(() => backupCaptureContext(source, run, { ...env, [key]: '' })).toThrow();
    const rejected = spawnSync(
      process.execPath,
      ['scripts/demo-backup.ts', 'capture', ...args, '--execute'],
      {
        env: { ...process.env, PATH: '', GITHUB_OUTPUT: '', GH_TOKEN: '', BANORA_BACKUP_JOB: '' },
        encoding: 'utf8',
        timeout: 5000,
        windowsHide: true,
      },
    );
    expect(rejected.status).toBe(1);
    expect(JSON.parse(rejected.stdout)).toEqual({
      schemaVersion: 'banora.demo-backup-command/v1',
      ok: false,
      code: 'context',
    });
    expect(await readFile(f.path)).toEqual(f.tar);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
