import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { artifactParent, ReleaseError } from './release-artifacts.js';

const sha = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const hash = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const objectId = (value: unknown): value is string =>
  typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value);
const keys = (value: unknown, names: string[]): value is Record<string, unknown> =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).length === names.length &&
  names.every((name) => Object.hasOwn(value, name));
interface SourceBackup {
  schemaVersion: 'banora.source-backup/v1';
  source: { commit: string; tree: string };
  refs: { count: number; sha256: string };
  bundle: { bytes: number; sha256: string };
}
type SourceStage =
  | 'backup-workspace'
  | 'backup-setup'
  | 'backup-source'
  | 'backup-bundle'
  | 'backup-final-source'
  | 'backup-manifest'
  | 'recovery-workspace'
  | 'recovery-input'
  | 'recovery-setup'
  | 'recovery-mirror'
  | 'recovery-objects'
  | 'recovery-bundle'
  | 'recovery-identity'
  | 'recovery-checkout'
  | 'recovery-checkout-verification'
  | 'recovery-original'
  | 'recovery-receipt';

type GitFailureReason = 'unavailable' | 'timeout' | 'exit' | 'failed';

class GitExecutionError extends ReleaseError {
  constructor(readonly reason: GitFailureReason) {
    super('check');
  }
}

export class SourceOperationError extends ReleaseError {
  constructor(
    code: ReleaseError['code'],
    readonly stage: SourceStage,
    readonly reason?: GitFailureReason,
  ) {
    super(code);
  }
}

const bundleLimit = 64 * 1024 * 1024;
async function workspace(root: string) {
  let metadata;
  try {
    metadata = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  } catch {
    throw new ReleaseError('source');
  }
  if (metadata.name !== 'banora-workspace' || metadata.private !== true)
    throw new ReleaseError('source');
}
async function regular(path: string, directory: boolean) {
  const info = await lstat(path);
  if (info.isSymbolicLink()) throw new ReleaseError('linked');
  if (directory ? !info.isDirectory() : !info.isFile()) throw new ReleaseError('io');
  return info;
}
async function gitRunner(directory: string) {
  const config = resolve(directory, 'empty.gitconfig'),
    hooks = resolve(directory, 'hooks');
  await writeFile(config, '', { flag: 'wx' });
  await mkdir(hooks);
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      ['path', 'systemroot', 'windir', 'temp', 'tmp', 'pathext'].includes(key.toLowerCase()),
    ),
  );
  Object.assign(environment, {
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: config,
    GIT_ALLOW_PROTOCOL: 'file',
    GIT_NO_LAZY_FETCH: '1',
    GIT_NO_REPLACE_OBJECTS: '1',
  });
  return (cwd: string, args: string[]) => {
    const result = spawnSync(
      'git',
      [
        '-c',
        `core.hooksPath=${hooks}`,
        '-c',
        'core.autocrlf=false',
        '-c',
        'core.fsmonitor=false',
        '-c',
        'submodule.recurse=false',
        ...args,
      ],
      {
        cwd,
        encoding: 'utf8',
        env: environment,
        timeout: 60_000,
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
        shell: false,
      },
    );
    if (result.error || result.status !== 0) {
      const code = result.error && 'code' in result.error ? result.error.code : undefined;
      const reason: GitFailureReason = result.error
        ? code === 'ENOENT'
          ? 'unavailable'
          : code === 'ETIMEDOUT'
            ? 'timeout'
            : 'failed'
        : typeof result.status === 'number' && result.status > 0
          ? 'exit'
          : 'failed';
      throw new GitExecutionError(reason);
    }
    return result.stdout.trim();
  };
}
function refs(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean).sort();
  if (
    !lines.length ||
    lines.length > 4096 ||
    lines.some((line) => !/^(?:[a-f0-9]{40}|[a-f0-9]{64}) refs\/\S+$/.test(line))
  )
    throw new ReleaseError('source');
  return { count: lines.length, sha256: sha(lines.join('\n')) };
}
async function bundleBytes(path: string) {
  const info = await regular(path, false);
  if (info.size < 128 || info.size > bundleLimit) throw new ReleaseError('integrity');
  const bytes = await readFile(path);
  if (bytes.length !== info.size) throw new ReleaseError('integrity');
  return { bytes: bytes.length, sha256: sha(bytes) };
}
export function sourceRecoveryOptions(args: readonly string[]) {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]!,
      value = args[index + 1];
    if (
      !['--backup', '--manifest-sha256', '--source-commit'].includes(flag) ||
      values.has(flag) ||
      !value ||
      value.startsWith('--')
    )
      throw new ReleaseError('usage');
    values.set(flag, value);
  }
  const backup = values.get('--backup'),
    manifestSha256 = values.get('--manifest-sha256'),
    sourceCommit = values.get('--source-commit');
  if (!backup || !hash(manifestSha256) || !objectId(sourceCommit)) throw new ReleaseError('usage');
  return { backup, manifestSha256, sourceCommit };
}
async function reviewed(request: ReturnType<typeof sourceRecoveryOptions>) {
  const directory = resolve(request.backup);
  await regular(directory, true);
  if (
    JSON.stringify((await readdir(directory)).sort()) !==
    JSON.stringify(['manifest.json', 'source.bundle'])
  )
    throw new ReleaseError('manifest');
  const manifestPath = resolve(directory, 'manifest.json');
  if ((await regular(manifestPath, false)).size > 4096) throw new ReleaseError('manifest');
  const bytes = await readFile(manifestPath);
  if (sha(bytes) !== request.manifestSha256) throw new ReleaseError('integrity');
  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new ReleaseError('manifest');
  }
  if (
    !keys(input, ['schemaVersion', 'source', 'refs', 'bundle']) ||
    input.schemaVersion !== 'banora.source-backup/v1' ||
    !keys(input.source, ['commit', 'tree']) ||
    !objectId(input.source.commit) ||
    !objectId(input.source.tree) ||
    input.source.commit !== request.sourceCommit ||
    !keys(input.refs, ['count', 'sha256']) ||
    !Number.isSafeInteger(input.refs.count) ||
    Number(input.refs.count) < 1 ||
    Number(input.refs.count) > 4096 ||
    !hash(input.refs.sha256) ||
    !keys(input.bundle, ['bytes', 'sha256']) ||
    !Number.isSafeInteger(input.bundle.bytes) ||
    Number(input.bundle.bytes) < 128 ||
    Number(input.bundle.bytes) > bundleLimit ||
    !hash(input.bundle.sha256)
  )
    throw new ReleaseError('manifest');
  const manifest = input as unknown as SourceBackup;
  if (
    JSON.stringify(await bundleBytes(resolve(directory, 'source.bundle'))) !==
    JSON.stringify(manifest.bundle)
  )
    throw new ReleaseError('integrity');
  return { directory, manifest };
}

/** Preserve tracked history/refs only; no credentials, untracked work, dependencies or remote writes. */
export async function sourceBackup(root: string) {
  let stage: SourceStage = 'backup-workspace';
  try {
    await workspace(root);
    stage = 'backup-setup';
    await mkdir(resolve(root, '.tmp'), { recursive: true });
    const scratch = await mkdtemp(resolve(root, '.tmp/source-backup-'));
    const git = await gitRunner(scratch);
    stage = 'backup-source';
    if (git(root, ['status', '--porcelain'])) throw new ReleaseError('source');
    // Batch only the initial observation; capture still ends with fresh guards below.
    const identity = git(root, [
      'rev-parse',
      '--is-shallow-repository',
      'HEAD',
      'HEAD^{tree}',
    ]).split(/\r?\n/);
    const [shallow, commit, tree] = identity;
    if (identity.length !== 3 || shallow !== 'false' || !objectId(commit) || !objectId(tree))
      throw new ReleaseError('source');
    const source = { commit, tree };
    const originalRefs = refs(git(root, ['show-ref']));
    stage = 'backup-bundle';
    const directory = await mkdtemp(resolve(await artifactParent(root, 'releases'), 'source-'));
    const path = resolve(directory, 'source.bundle');
    git(root, ['bundle', 'create', path, '--all', 'HEAD']);
    const manifest: SourceBackup = {
      schemaVersion: 'banora.source-backup/v1',
      source,
      refs: originalRefs,
      bundle: await bundleBytes(path),
    };
    stage = 'backup-final-source';
    if (
      git(root, ['status', '--porcelain']) ||
      source.commit !== git(root, ['rev-parse', 'HEAD']) ||
      JSON.stringify(refs(git(root, ['show-ref']))) !== JSON.stringify(originalRefs)
    )
      throw new ReleaseError('source');
    stage = 'backup-manifest';
    const bytes = JSON.stringify(manifest, null, 2) + '\n';
    await writeFile(resolve(directory, 'manifest.json'), bytes, { flag: 'wx' });
    return {
      backup: relative(root, directory).replaceAll('\\', '/'),
      manifestSha256: sha(bytes),
      ...manifest,
      scope:
        'Tracked source/history/refs only. Independently retain this backup and prepared release artifacts; capture is not a successful restore or provider account recovery.',
    };
  } catch (error) {
    throw new SourceOperationError(
      error instanceof ReleaseError ? error.code : 'io',
      stage,
      error instanceof GitExecutionError ? error.reason : undefined,
    );
  }
}

/** Mirror and materialize a reviewed backup using local Git only; never change the active checkout. */
export async function sourceRecovery(
  root: string,
  request: ReturnType<typeof sourceRecoveryOptions>,
) {
  let stage: SourceStage = 'recovery-workspace';
  try {
    await workspace(root);
    stage = 'recovery-input';
    const original = await reviewed(request);
    stage = 'recovery-setup';
    const directory = await mkdtemp(resolve(await artifactParent(root, 'restores'), 'source-'));
    const git = await gitRunner(directory);
    const mirror = resolve(directory, 'mirror.git'),
      checkout = resolve(directory, 'checkout');
    stage = 'recovery-mirror';
    git(root, ['clone', '--mirror', '--', resolve(original.directory, 'source.bundle'), mirror]);
    stage = 'recovery-objects';
    git(mirror, ['fsck', '--full', '--strict']);
    stage = 'recovery-bundle';
    git(mirror, ['bundle', 'verify', resolve(original.directory, 'source.bundle')]);
    stage = 'recovery-identity';
    if (
      git(mirror, ['rev-parse', `${request.sourceCommit}^{tree}`]) !==
        original.manifest.source.tree ||
      JSON.stringify(refs(git(mirror, ['show-ref']))) !== JSON.stringify(original.manifest.refs)
    )
      throw new ReleaseError('integrity');
    stage = 'recovery-checkout';
    git(mirror, ['worktree', 'add', '--detach', checkout, request.sourceCommit]);
    stage = 'recovery-checkout-verification';
    // Porcelain v2 reports the checkout commit and changes in the same observation.
    const status = git(checkout, ['status', '--porcelain=v2', '--branch']).split(/\r?\n/);
    const heads = status.filter((line) => line.startsWith('# branch.oid '));
    if (
      heads.length !== 1 ||
      heads[0] !== `# branch.oid ${request.sourceCommit}` ||
      status.some((line) => !line.startsWith('# '))
    )
      throw new ReleaseError('integrity');
    const trackedFiles = git(checkout, ['ls-files', '-z']).split('\0').filter(Boolean).length;
    stage = 'recovery-original';
    await reviewed(request);
    stage = 'recovery-receipt';
    const receipt = {
      schemaVersion: 'banora.source-recovery/v1',
      ok: true,
      createdAt: new Date().toISOString(),
      source: original.manifest.source,
      refs: original.manifest.refs,
      bundle: original.manifest.bundle,
      manifestSha256: request.manifestSha256,
      restored: relative(root, checkout).replaceAll('\\', '/'),
      trackedFiles,
      completed: [
        'offline-mirror',
        'complete-object-check',
        'bundle-verification',
        'exact-refs-and-tree',
        'clean-source-checkout',
        'original-preservation',
      ],
      scope:
        'Local file-only Git protocols and isolated config/hooks. No GitHub/npm access, dependency installation, build, release/channel mutation, credential recovery or user storage migration.',
    };
    await writeFile(
      resolve(directory, 'source-recovery.json'),
      JSON.stringify(receipt, null, 2) + '\n',
      { flag: 'wx' },
    );
    return receipt;
  } catch (error) {
    throw new SourceOperationError(
      error instanceof ReleaseError ? error.code : 'io',
      stage,
      error instanceof GitExecutionError ? error.reason : undefined,
    );
  }
}
