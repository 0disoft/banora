import { appendFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { readDemoTar, regularDemoDirectory, demoArchiveLimit } from './demo-archive.js';
import { recoveryWorkflowContext, verifyDemoArchive } from './demo-recovery.js';
import {
  backupHash,
  backupId,
  backupSha,
  backupSource,
  backupObject,
  createDemoBackup,
  demoBackupBytes,
  draftBackupAssets,
  parseDemoBackup,
} from './demo-backup-contract.js';

export function demoBackupRequest(args: readonly string[]) {
  const [action, ...options] = args;
  const keys =
    action === 'restore'
      ? ['--release-id', '--manifest-sha256']
      : ['plan', 'capture'].includes(action ?? '')
        ? ['--directory', '--sha256', '--source-commit', '--run-id']
        : [];
  const values = new Map<string, string>();
  let execute = false;
  for (let i = 0; i < options.length; i++) {
    const key = options[i]!;
    if (key === '--execute' && action === 'capture' && !execute) {
      execute = true;
      continue;
    }
    const value = options[++i];
    if (
      !keys.includes(key) ||
      values.has(key) ||
      !value ||
      value.startsWith('--') ||
      value.includes('\0')
    )
      throw Error('usage');
    values.set(key, value);
  }
  if (!keys.length || values.size !== keys.length) throw Error('usage');
  if (action === 'restore') {
    const releaseId = values.get('--release-id')!,
      manifestSha256 = values.get('--manifest-sha256')!;
    if (!backupId(releaseId) || !backupSha(manifestSha256)) throw Error('usage');
    return { action, releaseId, manifestSha256 } as const;
  }
  const directory = values.get('--directory')!,
    tarSha256 = values.get('--sha256')!,
    sourceCommit = values.get('--source-commit')!,
    sourceRunId = values.get('--run-id')!;
  if (!backupSha(tarSha256) || !backupSource(sourceCommit) || !backupId(sourceRunId))
    throw Error('usage');
  return {
    action: action as 'plan' | 'capture',
    directory,
    tarSha256,
    sourceCommit,
    sourceRunId,
    execute,
  };
}

export function backupCaptureContext(
  sourceCommit: string,
  sourceRunId: string,
  env: NodeJS.ProcessEnv,
) {
  recoveryWorkflowContext(env);
  if (
    env.BANORA_BACKUP_JOB !== 'archive' ||
    env.GITHUB_SHA !== sourceCommit ||
    env.GITHUB_RUN_ID !== sourceRunId ||
    !env.GH_TOKEN
  )
    throw Error('context');
}

function gh(args: string[], limit = 1024 * 1024, timeout = 30000): Buffer {
  const child = spawnSync('gh', args, {
    encoding: 'buffer',
    timeout,
    maxBuffer: limit,
    windowsHide: true,
    shell: false,
  });
  if (child.status !== 0) throw Error('provider');
  return child.stdout;
}
const api = (endpoint: string) =>
  JSON.parse(
    gh(['api', '--hostname', 'github.com', `repos/0disoft/banora/${endpoint}`]).toString('utf8'),
  ) as unknown;
const asset = (id: string, bytes: number) => {
  const output = gh(
    [
      'api',
      '--hostname',
      'github.com',
      '-H',
      'Accept: application/octet-stream',
      `repos/0disoft/banora/releases/assets/${id}`,
    ],
    bytes + 1,
    120000,
  );
  if (output.length !== bytes) throw Error('download');
  return output;
};
async function stage() {
  await regularDemoDirectory(resolve('.artifacts'));
  await mkdir('.artifacts/demo-backups').catch((error: unknown) => {
    if (!backupObject(error) || error.code !== 'EEXIST') throw error;
  });
  await regularDemoDirectory(resolve('.artifacts/demo-backups'));
  return mkdtemp(resolve('.artifacts/demo-backups', 'backup-'));
}

interface BackupReader {
  metadata: (endpoint: string) => unknown;
  download: (id: string, bytes: number) => Uint8Array;
}
export async function restoreDraftBackup(
  releaseId: string,
  manifestSha256: string,
  reader: BackupReader = { metadata: api, download: asset },
) {
  if (!backupId(releaseId) || !backupSha(manifestSha256)) throw Error('usage');
  const release = reader.metadata(`releases/${releaseId}`);
  if (!backupObject(release) || !Array.isArray(release.assets)) throw Error('metadata');
  const manifests = release.assets.filter(
    (item: unknown) => backupObject(item) && item.name === 'demo-manifest.json',
  );
  if (manifests.length !== 1 || !backupObject(manifests[0])) throw Error('metadata');
  const candidate = manifests[0];
  if (
    !Number.isSafeInteger(candidate.id) ||
    Number(candidate.id) < 1 ||
    candidate.state !== 'uploaded' ||
    candidate.digest !== `sha256:${manifestSha256}` ||
    !Number.isSafeInteger(candidate.size) ||
    Number(candidate.size) < 1 ||
    Number(candidate.size) > 4096
  )
    throw Error('metadata');
  const bytes = reader.download(String(candidate.id), Number(candidate.size));
  if (bytes.byteLength !== candidate.size || backupHash(bytes) !== manifestSha256)
    throw Error('manifest');
  const manifest = parseDemoBackup(bytes),
    bound = draftBackupAssets(release, releaseId, manifest, manifestSha256);
  const tar = reader.download(bound.tar.id, bound.tar.bytes);
  if (
    tar.byteLength !== bound.tar.bytes ||
    tar.byteLength > demoArchiveLimit ||
    backupHash(tar) !== manifest.tarSha256
  )
    throw Error('archive');
  createDemoBackup(tar, manifest.sourceCommit, manifest.sourceRunId);
  draftBackupAssets(reader.metadata(`releases/${releaseId}`), releaseId, manifest, manifestSha256);
  const directory = await stage();
  await writeFile(resolve(directory, 'artifact.tar'), tar, { flag: 'wx' });
  await verifyDemoArchive(directory, manifest.tarSha256);
  draftBackupAssets(reader.metadata(`releases/${releaseId}`), releaseId, manifest, manifestSha256);
  return {
    releaseId,
    manifestSha256,
    sourceCommit: manifest.sourceCommit,
    sourceRunId: manifest.sourceRunId,
    tarSha256: manifest.tarSha256,
    directory: relative(process.cwd(), directory).replaceAll('\\', '/'),
  };
}

if (import.meta.main) {
  let phase = 'usage';
  let createdReleaseId: string | undefined;
  try {
    const request = demoBackupRequest(process.argv.slice(2));
    let result;
    if (request.action === 'restore') {
      if (process.env.GITHUB_OUTPUT) recoveryWorkflowContext(process.env);
      phase = 'restore';
      result = await restoreDraftBackup(request.releaseId, request.manifestSha256);
      if (process.env.GITHUB_OUTPUT) {
        recoveryWorkflowContext(process.env);
        await appendFile(
          process.env.GITHUB_OUTPUT,
          `directory=${result.directory}\ntar_sha256=${result.tarSha256}\n`,
        );
      }
    } else {
      phase = 'archive';
      await verifyDemoArchive(request.directory, request.tarSha256);
      const tar = await readDemoTar(resolve(request.directory, 'artifact.tar'));
      const manifest = createDemoBackup(tar, request.sourceCommit, request.sourceRunId);
      if (manifest.tarSha256 !== request.tarSha256) throw Error('archive');
      const manifestBytes = demoBackupBytes(manifest),
        manifestSha256 = backupHash(manifestBytes);
      const tag = `demo-backup-${manifest.sourceRunId}`;
      result = { draftTag: tag, manifestSha256, ...manifest };
      if (request.action === 'capture' && request.execute) {
        phase = 'context';
        backupCaptureContext(request.sourceCommit, request.sourceRunId, process.env);
        phase = 'preflight';
        const releases = api('releases?per_page=100');
        if (
          !Array.isArray(releases) ||
          releases.length >= 100 ||
          releases.some((release: unknown) => backupObject(release) && release.tag_name === tag)
        )
          throw Error('conflict');
        const directory = await stage();
        await writeFile(resolve(directory, 'artifact.tar'), tar, { flag: 'wx' });
        await writeFile(resolve(directory, 'demo-manifest.json'), manifestBytes, { flag: 'wx' });
        const body = {
          tag_name: tag,
          target_commitish: manifest.sourceCommit,
          draft: true,
          prerelease: true,
          make_latest: 'false',
          name: `Demo recovery backup ${manifest.sourceRunId}`,
          body: 'Maintainer-only static demo recovery copy. Not an SDK release. Preserve original asset bytes and independently review the manifest hash before restoration.',
        };
        await writeFile(resolve(directory, 'release.json'), JSON.stringify(body), { flag: 'wx' });
        phase = 'create';
        const created: unknown = JSON.parse(
          gh([
            'api',
            '--hostname',
            'github.com',
            'repos/0disoft/banora/releases',
            '--method',
            'POST',
            '--input',
            resolve(directory, 'release.json'),
          ]).toString('utf8'),
        );
        if (
          !backupObject(created) ||
          !Number.isSafeInteger(created.id) ||
          Number(created.id) < 1 ||
          created.draft !== true
        )
          throw Error('provider');
        const releaseId = String(created.id);
        createdReleaseId = releaseId;
        phase = 'upload';
        gh(
          [
            'release',
            'upload',
            tag,
            resolve(directory, 'artifact.tar'),
            resolve(directory, 'demo-manifest.json'),
            '--repo',
            'https://github.com/0disoft/banora',
          ],
          1024 * 1024,
          120000,
        );
        phase = 'confirm';
        draftBackupAssets(api(`releases/${releaseId}`), releaseId, manifest, manifestSha256);
        await verifyDemoArchive(request.directory, request.tarSha256);
        result = { ...result, releaseId };
      }
    }
    console.log(
      JSON.stringify({
        ok: true,
        operation: request.action,
        ...result,
        schemaVersion: 'banora.demo-backup-command/v1',
      }),
    );
  } catch {
    console.log(
      JSON.stringify({
        schemaVersion: 'banora.demo-backup-command/v1',
        ok: false,
        code: phase,
        ...(createdReleaseId ? { releaseId: createdReleaseId } : {}),
      }),
    );
    process.exitCode = 1;
  }
}
