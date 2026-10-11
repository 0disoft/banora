import { createHash } from 'node:crypto';
import { createReadStream, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { readFile, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { publicationPlan } from './publication-plan.js';
import { restoreRelease, verifyRelease, ReleaseError } from './release-artifacts.js';

export interface PublicationRequest {
  readonly bundle: string;
  readonly manifestSha256: string;
  readonly sourceCommit: string;
  readonly tag: string;
  readonly execute: boolean;
}
interface PackageResult {
  readonly name: string;
  readonly version: string;
  readonly state: 'published' | 'already-published';
}
export class PublicationError extends Error {
  constructor(
    readonly code:
      | 'authority'
      | 'registry'
      | 'version-conflict'
      | 'channel-conflict'
      | 'publication-uncertain',
    readonly completed: readonly PackageResult[] = [],
    readonly attempted?: { name: string; version: string },
  ) {
    super(`Publication: ${code}.`);
  }
}
export function parsePublicationRequest(args: readonly string[]): PublicationRequest {
  const values = new Map<string, string>();
  let execute = false;
  for (let index = 0; index < args.length; index++) {
    const flag = args[index]!;
    if (flag === '--execute' && !execute) {
      execute = true;
      continue;
    }
    const value = args[++index];
    if (
      !['--bundle', '--manifest-sha256', '--source-commit', '--tag'].includes(flag) ||
      values.has(flag) ||
      !value ||
      value.startsWith('--')
    )
      throw new ReleaseError('usage');
    values.set(flag, value);
  }
  const bundle = values.get('--bundle'),
    manifestSha256 = values.get('--manifest-sha256'),
    sourceCommit = values.get('--source-commit'),
    tag = values.get('--tag');
  if (
    !bundle ||
    !manifestSha256 ||
    !/^[a-f0-9]{64}$/.test(manifestSha256) ||
    !sourceCommit ||
    !/^[a-f0-9]{40}$/.test(sourceCommit) ||
    !tag
  )
    throw new ReleaseError('usage');
  return { bundle, manifestSha256, sourceCommit, tag, execute };
}
export function publicationContext(env: NodeJS.ProcessEnv = process.env) {
  return {
    githubActions: env.GITHUB_ACTIONS === 'true',
    repository: env.GITHUB_REPOSITORY,
    ref: env.GITHUB_REF,
    event: env.GITHUB_EVENT_NAME,
    workflowRef: env.GITHUB_WORKFLOW_REF,
    sourceCommit: env.GITHUB_SHA,
    publicRepository: env.BANORA_REPOSITORY_PUBLIC === 'true',
    environment: env.BANORA_PUBLISH_ENVIRONMENT,
    oidcAvailable: Boolean(env.ACTIONS_ID_TOKEN_REQUEST_URL && env.ACTIONS_ID_TOKEN_REQUEST_TOKEN),
    staticTokenPresent: Boolean(env.NODE_AUTH_TOKEN || env.NPM_TOKEN),
  };
}
export interface PublicationIO {
  readonly context: ReturnType<typeof publicationContext>;
  run(argv: readonly string[], cwd: string): { status: number | null; stdout: string };
}
function productionIO(root: string): PublicationIO {
  let configDirectory: string | undefined;
  return {
    get context() {
      return publicationContext();
    },
    run(argv, cwd) {
      if (!configDirectory) {
        mkdirSync(resolve(root, '.tmp'), { recursive: true });
        configDirectory = mkdtempSync(resolve(root, '.tmp/npm-publication-'));
        for (const file of ['user.npmrc', 'global.npmrc'])
          writeFileSync(resolve(configDirectory, file), '', { flag: 'wx', mode: 0o600 });
      }
      const env = Object.fromEntries(
        Object.entries(process.env).filter(
          ([key]) =>
            !key.toLowerCase().startsWith('npm_config_') &&
            !['npm_token', 'node_auth_token'].includes(key.toLowerCase()),
        ),
      );
      const result = spawnSync(argv[0]!, argv.slice(1), {
        cwd,
        encoding: 'utf8',
        shell: false,
        timeout: argv[1] === 'publish' ? 180_000 : 30_000,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
        env: {
          ...env,
          NPM_CONFIG_USERCONFIG: resolve(configDirectory, 'user.npmrc'),
          NPM_CONFIG_GLOBALCONFIG: resolve(configDirectory, 'global.npmrc'),
          NPM_CONFIG_LOGLEVEL: 'error',
        },
      });
      return { status: result.status, stdout: result.stdout ?? '' };
    },
  };
}
function json(text: string): unknown {
  if (Buffer.byteLength(text) > 1024 * 1024) throw new PublicationError('registry');
  try {
    return JSON.parse(text);
  } catch {
    throw new PublicationError('registry');
  }
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
export async function publishRelease(
  root: string,
  request: PublicationRequest,
  io: PublicationIO = productionIO(root),
) {
  const approved = await verifyRelease(resolve(request.bundle));
  const approvedBytes = await readFile(resolve(approved.directory, 'manifest.json'));
  if (
    createHash('sha256').update(approvedBytes).digest('hex') !== request.manifestSha256 ||
    JSON.stringify(JSON.parse(approvedBytes.toString('utf8'))) !== JSON.stringify(approved.manifest)
  )
    throw new ReleaseError('integrity');
  const plan = await publicationPlan(root, request.bundle, {
    workflow: 'publish.yml',
    environment: 'npm-release',
    tag: request.tag,
  });
  if (plan.manifestSha256 !== request.manifestSha256 || plan.source.commit !== request.sourceCommit)
    throw new ReleaseError('integrity');
  const archives = await Promise.all(
    plan.packages.map(async (item) => {
      const sha256 = createHash('sha256'),
        sha512 = createHash('sha512');
      for await (const bytes of createReadStream(resolve(approved.directory, item.archive))) {
        sha256.update(bytes);
        sha512.update(bytes);
      }
      if (sha256.digest('hex') !== item.sha256) throw new ReleaseError('integrity');
      return { ...item, registryIntegrity: 'sha512-' + sha512.digest('base64') };
    }),
  );
  if (!request.execute)
    return {
      schemaVersion: 'banora.publication/v1',
      operation: 'preview' as const,
      source: plan.source,
      manifestSha256: plan.manifestSha256,
      tag: plan.tag,
      packages: archives,
      scope: 'Reviewed-byte binding only. No registry requests, commands, writes or publication.',
    };
  const context = io.context;
  if (
    !context.githubActions ||
    context.repository !== '0disoft/banora' ||
    context.ref !== 'refs/heads/main' ||
    context.event !== 'workflow_dispatch' ||
    context.workflowRef !== '0disoft/banora/.github/workflows/publish.yml@refs/heads/main' ||
    context.sourceCommit !== request.sourceCommit ||
    !context.publicRepository ||
    context.environment !== 'npm-release' ||
    !context.oidcAvailable ||
    context.staticTokenPresent
  )
    throw new PublicationError('authority');
  const policy = await lstat(resolve(root, 'SECURITY.md')).catch(() => undefined);
  if (!policy?.isFile() || policy.isSymbolicLink()) throw new PublicationError('authority');
  const run = (argv: readonly string[], cwd: string) => {
    try {
      return io.run(argv, cwd);
    } catch {
      throw new PublicationError('registry');
    }
  };
  const npm = run(['npm', '--version'], root);
  const match = /^(\d+)\.(\d+)\.(\d+)\s*$/.exec(npm.stdout);
  if (
    npm.status !== 0 ||
    !match ||
    Number(match[1]) !== 11 ||
    Number(match[2]) < 5 ||
    (Number(match[2]) === 5 && Number(match[3]) < 1)
  )
    throw new PublicationError('authority');
  const snapshot = resolve(root, await restoreRelease(root, request.bundle));
  // Restaging normalizes manifest formatting; preserve every original manifest field and inventory.
  if (
    JSON.stringify((await verifyRelease(snapshot)).manifest) !== JSON.stringify(approved.manifest)
  )
    throw new ReleaseError('integrity');
  const command = (argv: readonly string[]) => run(argv, snapshot);
  const metadata = (name: string) => {
    const read = command([
      'npm',
      'view',
      name,
      'name',
      'versions',
      'dist-tags',
      '--json',
      '--registry',
      plan.registry,
    ]);
    if (read.status !== 0) throw new PublicationError('registry'); // A 404 or authorization/transport failure is never absence.
    const value = json(read.stdout);
    if (
      !object(value) ||
      value.name !== name ||
      !Array.isArray(value.versions) ||
      value.versions.length > 10000 ||
      !value.versions.every((item) => typeof item === 'string') ||
      !object(value['dist-tags'])
    )
      throw new PublicationError('registry');
    return { versions: value.versions as string[], tags: value['dist-tags'] };
  };
  const integrity = (name: string, version: string) => {
    const read = command([
      'npm',
      'view',
      `${name}@${version}`,
      'dist.integrity',
      '--json',
      '--registry',
      plan.registry,
    ]);
    if (read.status !== 0) throw new PublicationError('registry');
    return json(read.stdout);
  };
  // Validate every existing identity/version before the first irreversible upload.
  const existing = archives.map((item) => {
    const current = metadata(item.name),
      present = current.versions.includes(item.version);
    if (present && integrity(item.name, item.version) !== item.registryIntegrity)
      throw new PublicationError('version-conflict');
    if (present && current.tags[plan.tag] !== item.version)
      throw new PublicationError('channel-conflict');
    return present;
  });
  const completed: PackageResult[] = [];
  for (const [index, item] of archives.entries()) {
    let attempted = false;
    try {
      await verifyRelease(snapshot);
      if (!existing[index]) {
        attempted = true;
        const uploaded = command(item.publishArgv);
        if (uploaded.status !== 0) throw new PublicationError('publication-uncertain');
      }
      const observed = metadata(item.name);
      if (
        !observed.versions.includes(item.version) ||
        integrity(item.name, item.version) !== item.registryIntegrity ||
        observed.tags[plan.tag] !== item.version
      )
        throw new PublicationError('publication-uncertain');
      completed.push({
        name: item.name,
        version: item.version,
        state: existing[index] ? 'already-published' : 'published',
      });
    } catch (error) {
      throw new PublicationError(
        attempted
          ? 'publication-uncertain'
          : error instanceof PublicationError
            ? error.code
            : 'registry',
        [...completed],
        attempted ? { name: item.name, version: item.version } : undefined,
      );
    }
  }
  return {
    schemaVersion: 'banora.publication/v1',
    operation: 'published' as const,
    source: plan.source,
    manifestSha256: plan.manifestSha256,
    tag: plan.tag,
    packages: completed,
    scope:
      'Exact reviewed tarballs and registry integrity/channel checks. Fresh installed-consumer health and live rollback remain separate.',
  };
}
