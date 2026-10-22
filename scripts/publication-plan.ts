import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  RELEASE_PACKAGE_NAMES,
  RELEASE_PACKAGES,
  ReleaseError,
  verifyRelease,
} from './release-artifacts.js';

interface PublicationOptions {
  readonly workflow: string;
  readonly environment?: string;
  readonly tag?: string;
}

/** Parse explicit pairs; never interpret values as shell text or execute a command. */
export function publicationOptions(args: readonly string[]) {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]!,
      value = args[index + 1];
    if (
      !['--bundle', '--workflow', '--environment', '--tag'].includes(flag) ||
      values.has(flag) ||
      !value ||
      value.startsWith('--')
    )
      throw new ReleaseError('usage');
    values.set(flag, value);
  }
  const bundle = values.get('--bundle'),
    workflow = values.get('--workflow');
  if (!bundle || !workflow) throw new ReleaseError('usage');
  return {
    bundle,
    options: {
      workflow,
      ...(values.has('--environment') ? { environment: values.get('--environment')! } : {}),
      ...(values.has('--tag') ? { tag: values.get('--tag')! } : {}),
    },
  };
}

/** Offline handoff for reviewed bytes, not authentication, approval or publication. */
export async function publicationPlan(root: string, bundle: string, options: PublicationOptions) {
  if (
    !/^[a-zA-Z\d][a-zA-Z\d._-]{0,79}\.ya?ml$/.test(options.workflow) ||
    (options.environment !== undefined &&
      (!/^[\w][\w .-]{0,99}$/.test(options.environment) ||
        options.environment.trim() !== options.environment)) ||
    (options.tag !== undefined &&
      !['latest', 'next', 'dev', 'alpha', 'beta', 'rc'].includes(options.tag))
  )
    throw new ReleaseError('usage');
  const verified = await verifyRelease(resolve(bundle));
  if (
    !RELEASE_PACKAGES.every(
      (key, index) => verified.manifest.packages[index]!.name === RELEASE_PACKAGE_NAMES[key],
    )
  )
    throw new ReleaseError('manifest');
  const version = verified.manifest.packages[0]!.version;
  const prerelease = version.includes('-');
  const label = prerelease ? version.slice(version.indexOf('-') + 1).split('.')[0] : undefined;
  const tag =
    options.tag ??
    (prerelease
      ? ['dev', 'alpha', 'beta', 'rc'].includes(label ?? '')
        ? label!
        : 'next'
      : 'latest');
  if (prerelease && tag === 'latest') throw new ReleaseError('usage');
  const manifestBytes = await readFile(resolve(verified.directory, 'manifest.json'));
  if (
    JSON.stringify(JSON.parse(manifestBytes.toString('utf8'))) !== JSON.stringify(verified.manifest)
  )
    throw new ReleaseError('integrity');
  let workflowFileExists = false;
  try {
    const info = await lstat(resolve(root, '.github/workflows', options.workflow));
    workflowFileExists = info.isFile() && !info.isSymbolicLink();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const registry = 'https://registry.npmjs.org/';
  return {
    schemaVersion: 'banora.publication-plan/v1',
    operation: 'plan-only',
    source: verified.manifest.source,
    manifestSha256: createHash('sha256').update(manifestBytes).digest('hex'),
    version,
    registry,
    tag,
    workflowFileExists,
    trustedPublisher: {
      provider: 'github-actions',
      organizationOrUser: '0disoft',
      repository: 'banora',
      workflowFilename: options.workflow,
      ...(options.environment ? { environmentName: options.environment } : {}),
      allowDirectPublish: true,
    },
    commandWorkingDirectory: 'verified-bundle',
    packages: verified.manifest.packages.map((item) => ({
      name: item.name,
      version: item.version,
      archive: item.archive,
      sha256: verified.manifest.files.find((file) => file.path === item.archive)!.sha256,
      inspectArgv: [
        'npm',
        'view',
        `${item.name}@${item.version}`,
        'dist.integrity',
        '--json',
        '--registry',
        registry,
      ],
      publishArgv: [
        'npm',
        'publish',
        `./${item.archive}`,
        '--ignore-scripts',
        '--access',
        'public',
        '--tag',
        tag,
        '--registry',
        registry,
        '--provenance',
        '--fetch-retries=0',
      ],
    })),
    prerequisites: [
      'Owner approval of source, version, destination, private-report channel and publication.',
      'Reviewed public repository/workflow and GitHub-hosted runner with job-scoped id-token: write.',
      'Matching trusted publisher for each package, including direct-publish permission and optional environment.',
      'Node 24.x and npm 11.5.1 or later; local npm whoami is not an OIDC permission check.',
      'Stop on registry errors or a conflicting existing version; verify registry integrity and installed consumers before continuing.',
    ],
    scope:
      'No network, child commands, credentials, configuration writes or publication. Unsigned hashes do not authenticate provenance. Workflow presence does not establish permissions or behavior.',
  };
}
