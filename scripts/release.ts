import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { lstat, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import {
  artifactParent,
  copyTree,
  inventory,
  isReleaseManifest,
  RELEASE_CHECKS,
  RELEASE_PACKAGES,
  ReleaseError,
  restoreRelease,
  verifyRelease,
} from './release-artifacts.js';
import type { ReleaseManifest } from './release-artifacts.js';
import { runReleaseCheck } from './release-check.js';
export { runReleaseCheck } from './release-check.js';
import { publicationOptions, publicationPlan } from './publication-plan.js';
import { parsePublicationRequest, publishRelease, PublicationError } from './publication.js';
import { registryHealth, RegistryHealthError } from './registry-health.js';

function git(root: string, args: string[]) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 5000 });
  if (result.status !== 0) throw new ReleaseError('source');
  return result.stdout.trim();
}
export function releaseSource(root: string) {
  let metadata;
  try {
    metadata = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  } catch {
    throw new ReleaseError('source');
  }
  if (metadata.name !== 'banora-workspace' || metadata.private !== true)
    throw new ReleaseError('source');
  if (git(root, ['status', '--porcelain'])) throw new ReleaseError('source');
  return {
    commit: git(root, ['rev-parse', 'HEAD']),
    tree: git(root, ['rev-parse', 'HEAD^{tree}']),
  };
}
export async function prepareRelease(root: string) {
  const source = releaseSource(root);
  const directory = resolve(await artifactParent(root, 'releases'), source.commit);
  let existing = false;
  try {
    await lstat(directory);
    existing = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (existing) {
    const prior = await verifyRelease(directory, true);
    if (JSON.stringify(prior.manifest.source) !== JSON.stringify(source))
      throw new ReleaseError('source');
    if (prior.manifest.state === 'prepared') return { ...prior, reused: true };
  }
  await runReleaseCheck(root, ['run', 'check'], 'check');
  await runReleaseCheck(root, ['run', 'security:files'], 'security-files');
  await runReleaseCheck(root, ['run', 'security:deps'], 'security-deps');
  let manifest: ReleaseManifest;
  if (!existing) {
    await runReleaseCheck(root, ['run', 'build:examples'], 'build-examples');
    await mkdir(directory);
    await mkdir(resolve(directory, 'packages'));
    const packages = [];
    for (const name of RELEASE_PACKAGES) {
      const metadata = JSON.parse(
        await readFile(resolve(root, 'packages', name, 'package.json'), 'utf8'),
      );
      packages.push({
        name: metadata.name,
        version: metadata.version,
        archive: `packages/${name}.tgz`,
      });
      const packed = Bun.spawnSync(
        [
          process.execPath,
          'pm',
          'pack',
          '--filename',
          resolve(directory, `packages/${name}.tgz`),
          '--ignore-scripts',
        ],
        { cwd: resolve(root, 'packages', name), stdout: 'pipe', stderr: 'pipe' },
      );
      if (packed.exitCode !== 0) throw new ReleaseError('io');
    }
    await copyTree(resolve(root, 'packages/sdk/dist'), resolve(directory, 'browser-sdk'));
    await copyTree(resolve(root, 'dist/examples'), resolve(directory, 'examples'));
    const node = spawnSync('node', ['--version'], { encoding: 'utf8', timeout: 5000 });
    if (node.status !== 0) throw new ReleaseError('source');
    manifest = {
      schemaVersion: 'banora.release/v1',
      state: 'candidate',
      source,
      tools: { bun: Bun.version, node: node.stdout.trim().replace(/^v/, '') },
      packages,
      files: await inventory(directory),
      checks: [],
    };
    if (!isReleaseManifest(manifest)) throw new ReleaseError('manifest');
    await writeFile(resolve(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', {
      flag: 'wx',
    });
  } else manifest = (await verifyRelease(directory, true)).manifest;
  const bundle = ['--release-bundle', directory];
  for (const [script, label, args] of [
    ['packed-consumer', 'sdk-archive', []],
    ['packed-cli', 'cli-archive', []],
    ['packed-adapters', 'adapter-archives', []],
    ['browser-smoke', 'browser-bundle', []],
    ['packed-starter', 'starter-archive', ['--browser']],
  ] as const)
    await runReleaseCheck(root, [`scripts/${script}.ts`, ...args, ...bundle], label);
  await runReleaseCheck(root, ['run', 'ops', 'drill-recovery'], 'recovery-drill');
  if (JSON.stringify(releaseSource(root)) !== JSON.stringify(source))
    throw new ReleaseError('source');
  await verifyRelease(directory, true);
  const completed: ReleaseManifest = { ...manifest, state: 'prepared', checks: RELEASE_CHECKS };
  const temporary = resolve(directory, 'manifest.complete.json');
  await writeFile(temporary, JSON.stringify(completed, null, 2) + '\n', { flag: 'wx' });
  await rename(temporary, resolve(directory, 'manifest.json'));
  return { ...(await verifyRelease(directory)), reused: false };
}
if (import.meta.main) {
  const [action, ...args] = process.argv.slice(2),
    root = process.cwd();
  try {
    let result: unknown;
    if ((!action || action === '--help') && !args.length)
      result = {
        schemaVersion: 'banora.release-command/v1',
        ok: true,
        commands: [
          'prepare',
          'verify --bundle DIR',
          'restore --bundle DIR',
          'publication-plan --bundle DIR --workflow FILE [--environment NAME] [--tag TAG]',
          'publish --bundle DIR --manifest-sha256 HASH --source-commit SHA --tag TAG [--execute]',
          'registry-check --bundle DIR --manifest-sha256 HASH --source-commit SHA --tag TAG',
        ],
        scope:
          'Local preparation and offline preview by default. Explicit publish --execute requires the reviewed public GitHub OIDC job context; no host deployment or data migration.',
      };
    else if (action === 'prepare' && !args.length) {
      const prepared = await prepareRelease(root);
      result = {
        schemaVersion: 'banora.release-command/v1',
        ok: true,
        bundle: relative(root, prepared.directory).replaceAll('\\', '/'),
        source: prepared.manifest.source,
        version: prepared.manifest.packages[0]!.version,
        files: prepared.manifest.files.length,
        checks: prepared.manifest.checks,
        reused: prepared.reused,
      };
    } else if (action === 'publish') {
      result = {
        schemaVersion: 'banora.release-command/v1',
        ok: true,
        publication: await publishRelease(root, parsePublicationRequest(args)),
      };
    } else if (action === 'registry-check') {
      if (args.includes('--execute')) throw new ReleaseError('usage');
      result = {
        schemaVersion: 'banora.release-command/v1',
        ok: true,
        health: await registryHealth(root, parsePublicationRequest(args)),
      };
    } else if (action === 'publication-plan') {
      const parsed = publicationOptions(args);
      result = {
        schemaVersion: 'banora.release-command/v1',
        ok: true,
        plan: await publicationPlan(root, parsed.bundle, parsed.options),
      };
    } else if (
      (action === 'verify' || action === 'restore') &&
      args.length === 2 &&
      args[0] === '--bundle' &&
      args[1]
    ) {
      const checked = await verifyRelease(resolve(args[1]));
      result = {
        schemaVersion: 'banora.release-command/v1',
        ok: true,
        source: checked.manifest.source,
        files: checked.manifest.files.length,
        ...(action === 'restore'
          ? { restaged: await restoreRelease(root, checked.directory) }
          : {}),
        scope:
          'Unsigned manifest integrity; reviewed provenance and target deployment are separate responsibilities.',
      };
    } else throw new ReleaseError('usage');
    process.stdout.write(JSON.stringify(result) + '\n');
  } catch (error) {
    process.exitCode = 1;
    process.stdout.write(
      JSON.stringify({
        schemaVersion: 'banora.release-command/v1',
        ok: false,
        error: {
          code:
            error instanceof ReleaseError ||
            error instanceof PublicationError ||
            error instanceof RegistryHealthError
              ? error.code
              : 'io',
          ...(error instanceof RegistryHealthError
            ? {
                downloaded: error.completed,
                ...(error.lastCheck ? { lastCheck: error.lastCheck } : {}),
              }
            : {}),
          ...(error instanceof PublicationError
            ? {
                completed: error.completed,
                ...(error.attempted ? { attempted: error.attempted } : {}),
                ...(error.npmCode ? { npmCode: error.npmCode } : {}),
              }
            : {}),
        },
      }) + '\n',
    );
  }
}
