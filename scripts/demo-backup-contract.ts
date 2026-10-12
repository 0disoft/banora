import { createHash } from 'node:crypto';
import { demoArchiveLimit, demoInventory } from './demo-archive.js';

export const backupSha = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export const backupId = (value: unknown): value is string =>
  typeof value === 'string' && /^[1-9]\d{0,19}$/.test(value);
export const backupSource = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
export const backupObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
export const backupHash = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
export interface DemoBackupManifest {
  readonly schemaVersion: 'banora.demo-backup/v1';
  readonly sourceCommit: string;
  readonly sourceRunId: string;
  readonly tarSha256: string;
  readonly tarBytes: number;
}
const manifestKeys = [
  'schemaVersion',
  'sourceCommit',
  'sourceRunId',
  'tarBytes',
  'tarSha256',
].sort();
export function parseDemoBackup(bytes: Uint8Array): DemoBackupManifest {
  if (!bytes.byteLength || bytes.byteLength > 4096) throw Error('manifest');
  const input: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (
    !backupObject(input) ||
    JSON.stringify(Object.keys(input).sort()) !== JSON.stringify(manifestKeys) ||
    input.schemaVersion !== 'banora.demo-backup/v1' ||
    !backupSource(input.sourceCommit) ||
    !backupId(input.sourceRunId) ||
    !backupSha(input.tarSha256) ||
    !Number.isSafeInteger(input.tarBytes) ||
    Number(input.tarBytes) < 1024 ||
    Number(input.tarBytes) > demoArchiveLimit
  )
    throw Error('manifest');
  return input as unknown as DemoBackupManifest;
}

export function createDemoBackup(
  tar: Uint8Array,
  sourceCommit: string,
  sourceRunId: string,
): DemoBackupManifest {
  if (!backupSource(sourceCommit) || !backupId(sourceRunId)) throw Error('manifest');
  let identity: unknown;
  const inventory = demoInventory(tar, (name, bytes) => {
    if (name !== 'banora-build.json') return;
    if (bytes.byteLength > 4096) throw Error('manifest');
    identity = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  });
  if (
    !backupObject(identity) ||
    identity.schemaVersion !== 'banora.demo-build/v1' ||
    identity.sourceCommit !== sourceCommit ||
    identity.sourceRunId !== sourceRunId
  )
    throw Error('manifest');
  return {
    schemaVersion: 'banora.demo-backup/v1',
    sourceCommit,
    sourceRunId,
    tarSha256: inventory.tarSha256,
    tarBytes: inventory.tarBytes,
  };
}
export const demoBackupBytes = (manifest: DemoBackupManifest) =>
  Buffer.from(JSON.stringify(manifest) + '\n', 'utf8');

export function draftBackupAssets(
  release: unknown,
  releaseId: string,
  manifest: DemoBackupManifest,
  manifestSha256: string,
) {
  if (
    !backupId(releaseId) ||
    !backupSha(manifestSha256) ||
    !backupObject(release) ||
    String(release.id) !== releaseId ||
    release.url !== `https://api.github.com/repos/0disoft/banora/releases/${releaseId}` ||
    release.draft !== true ||
    release.prerelease !== true ||
    release.published_at !== null ||
    release.target_commitish !== manifest.sourceCommit ||
    release.tag_name !== `demo-backup-${manifest.sourceRunId}` ||
    !Array.isArray(release.assets) ||
    release.assets.length !== 2
  )
    throw Error('metadata');
  const assets = release.assets;
  const selected = (name: string, digest: string, size?: number) => {
    const matching = assets.filter((asset: unknown) => backupObject(asset) && asset.name === name);
    if (matching.length !== 1 || !backupObject(matching[0])) throw Error('metadata');
    const asset = matching[0];
    if (
      !Number.isSafeInteger(asset.id) ||
      Number(asset.id) < 1 ||
      asset.state !== 'uploaded' ||
      asset.url !== `https://api.github.com/repos/0disoft/banora/releases/assets/${asset.id}` ||
      asset.digest !== `sha256:${digest}` ||
      !Number.isSafeInteger(asset.size) ||
      Number(asset.size) < 1 ||
      (size !== undefined ? asset.size !== size : Number(asset.size) > 4096)
    )
      throw Error('metadata');
    return { id: String(asset.id), bytes: Number(asset.size) };
  };
  return {
    manifest: selected('demo-manifest.json', manifestSha256),
    tar: selected('artifact.tar', manifest.tarSha256, manifest.tarBytes),
  };
}
