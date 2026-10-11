import { createReadStream, constants } from 'node:fs';
import { copyFile, lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const RELEASE_PACKAGES = ['sdk', 'cli', 'react', 'vue', 'svelte'] as const;
export const RELEASE_PACKAGE_NAMES = {
  sdk: '@0disoft/banora',
  cli: '@0disoft/banora-cli',
  react: '@0disoft/banora-react',
  vue: '@0disoft/banora-vue',
  svelte: '@0disoft/banora-svelte',
} as const;
export const RELEASE_CHECKS = [
  'check',
  'security-files',
  'security-deps',
  'sdk-archive',
  'cli-archive',
  'adapter-archives',
  'browser-bundle',
  'starter-archive',
  'recovery-drill',
] as const;
export interface ReleaseFile {
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
}
export interface ReleaseManifest {
  readonly schemaVersion: 'banora.release/v1';
  readonly state: 'candidate' | 'prepared';
  readonly source: { readonly commit: string; readonly tree: string };
  readonly tools: { readonly bun: string; readonly node: string };
  readonly packages: readonly {
    readonly name: string;
    readonly version: string;
    readonly archive: string;
  }[];
  readonly files: readonly ReleaseFile[];
  readonly checks: readonly (typeof RELEASE_CHECKS)[number][];
}
export class ReleaseError extends Error {
  constructor(
    readonly code:
      | 'usage'
      | 'source'
      | 'manifest'
      | 'integrity'
      | 'linked'
      | 'exists'
      | 'check'
      | 'io',
  ) {
    super(`Release: ${code}.`);
  }
}
const commit = (value: unknown): value is string =>
  typeof value === 'string' && /^(?:[a-f\d]{40}|[a-f\d]{64})$/.test(value);
const plain = (value: unknown, keys: readonly string[]): value is Record<string, unknown> =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));
function safePath(path: unknown): path is string {
  return (
    typeof path === 'string' &&
    path.length <= 500 &&
    /^[\w./-]+$/.test(path) &&
    !path.startsWith('/') &&
    !path.split('/').some((part) => !part || part === '.' || part === '..') &&
    (RELEASE_PACKAGES.some((name) => path === `packages/${name}.tgz`) ||
      path.startsWith('browser-sdk/') ||
      path.startsWith('examples/'))
  );
}
export function isReleaseManifest(input: unknown): input is ReleaseManifest {
  try {
    if (
      !plain(input, ['schemaVersion', 'state', 'source', 'tools', 'packages', 'files', 'checks']) ||
      input.schemaVersion !== 'banora.release/v1' ||
      !['candidate', 'prepared'].includes(input.state as string) ||
      !plain(input.source, ['commit', 'tree']) ||
      !commit(input.source.commit) ||
      !commit(input.source.tree) ||
      !plain(input.tools, ['bun', 'node']) ||
      typeof input.tools.bun !== 'string' ||
      !/^1\.\d+\.\d+$/.test(input.tools.bun) ||
      typeof input.tools.node !== 'string' ||
      !/^24\.\d+\.\d+$/.test(input.tools.node) ||
      !Array.isArray(input.packages) ||
      input.packages.length !== RELEASE_PACKAGES.length ||
      !Array.isArray(input.files) ||
      input.files.length < 7 ||
      input.files.length > 4096 ||
      !Array.isArray(input.checks)
    )
      return false;
    const packages = input.packages;
    // Retained pre-rename bundles remain verifiable/restorable without rewriting bytes.
    const legacy = packages[0]?.name === '@banora/sdk';
    if (
      !RELEASE_PACKAGES.every((name, index) => {
        const item: unknown = packages[index];
        return (
          plain(item, ['name', 'version', 'archive']) &&
          item.name === (legacy ? `@banora/${name}` : RELEASE_PACKAGE_NAMES[name]) &&
          item.archive === `packages/${name}.tgz` &&
          typeof item.version === 'string' &&
          /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(item.version) &&
          item.version === packages[0].version
        );
      })
    )
      return false;
    const paths = new Set<string>();
    let total = 0;
    for (const file of input.files) {
      if (
        !plain(file, ['path', 'bytes', 'sha256']) ||
        !safePath(file.path) ||
        paths.has(file.path) ||
        !Number.isSafeInteger(file.bytes) ||
        (file.bytes as number) < 0 ||
        (file.bytes as number) > 64 * 1024 * 1024 ||
        typeof file.sha256 !== 'string' ||
        !/^[a-f\d]{64}$/.test(file.sha256)
      )
        return false;
      paths.add(file.path);
      total += file.bytes as number;
    }
    if (
      total > 512 * 1024 * 1024 ||
      !RELEASE_PACKAGES.every((name) => paths.has(`packages/${name}.tgz`)) ||
      !paths.has('examples/studio/index.html') ||
      !paths.has('browser-sdk/banora.global.js')
    )
      return false;
    const checks = input.checks;
    return input.state === 'candidate'
      ? checks.length === 0
      : checks.length === RELEASE_CHECKS.length &&
          RELEASE_CHECKS.every((name, index) => checks[index] === name);
  } catch {
    return false;
  }
}
async function regular(path: string, directory: boolean): Promise<void> {
  const info = await lstat(path);
  if (info.isSymbolicLink()) throw new ReleaseError('linked');
  if (directory ? !info.isDirectory() : !info.isFile()) throw new ReleaseError('io');
}
export async function inventory(directory: string): Promise<ReleaseFile[]> {
  await regular(directory, true);
  const files: ReleaseFile[] = [];
  let total = 0;
  async function walk(prefix: string): Promise<void> {
    for (const entry of await readdir(resolve(directory, prefix), { withFileTypes: true })) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) throw new ReleaseError('linked');
      if (entry.isDirectory()) {
        if (
          path !== 'packages' &&
          path !== 'browser-sdk' &&
          path !== 'examples' &&
          !safePath(`${path}/entry`)
        )
          throw new ReleaseError('integrity');
        await walk(path);
      } else if (entry.isFile() && path !== 'manifest.json') {
        if (!safePath(path) || files.length >= 4096) throw new ReleaseError('integrity');
        await regular(resolve(directory, path), false);
        const info = await lstat(resolve(directory, path));
        if (info.size > 64 * 1024 * 1024 || (total += info.size) > 512 * 1024 * 1024)
          throw new ReleaseError('integrity');
        const hash = createHash('sha256');
        for await (const chunk of createReadStream(resolve(directory, path))) hash.update(chunk);
        files.push({ path, bytes: info.size, sha256: hash.digest('hex') });
      } else if (!entry.isFile()) throw new ReleaseError('integrity');
    }
  }
  await walk('');
  return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
export async function verifyRelease(directory: string, allowCandidate = false) {
  await regular(directory, true);
  const manifestPath = resolve(directory, 'manifest.json');
  await regular(manifestPath, false);
  if ((await lstat(manifestPath)).size > 2 * 1024 * 1024) throw new ReleaseError('manifest');
  let value: unknown;
  try {
    value = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    throw new ReleaseError('manifest');
  }
  if (!isReleaseManifest(value) || (!allowCandidate && value.state !== 'prepared'))
    throw new ReleaseError('manifest');
  const actual = await inventory(directory);
  const expected = value.files
    .map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new ReleaseError('integrity');
  return { directory: await realpath(directory), manifest: value };
}
/** Repository-generated retained artifacts, kept outside the normal .tmp cleanup targets. */
export async function artifactParent(root: string, kind: 'releases' | 'restores') {
  const workspace = await realpath(root);
  const base = resolve(workspace, '.artifacts');
  for (const directory of [base, resolve(base, kind)]) {
    await mkdir(directory).catch((error) => {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    });
    await regular(directory, true);
    if (!(await realpath(directory)).startsWith(workspace + sep)) throw new ReleaseError('linked');
  }
  return resolve(base, kind);
}
export async function copyTree(source: string, destination: string) {
  await regular(source, true);
  await mkdir(destination);
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new ReleaseError('linked');
    const from = resolve(source, entry.name),
      to = resolve(destination, entry.name);
    if (entry.isDirectory()) await copyTree(from, to);
    else {
      await regular(from, false);
      await copyFile(from, to, constants.COPYFILE_EXCL);
    }
  }
}
export async function restoreRelease(root: string, directory: string) {
  const original = await verifyRelease(directory);
  const destination = resolve(
    await artifactParent(root, 'restores'),
    `${original.manifest.source.commit.slice(0, 12)}-${randomUUID()}`,
  );
  await mkdir(destination);
  for (const file of original.manifest.files) {
    const target = resolve(destination, file.path);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(resolve(original.directory, file.path), target, constants.COPYFILE_EXCL);
  }
  await writeFile(
    resolve(destination, 'manifest.json'),
    JSON.stringify(original.manifest, null, 2) + '\n',
    { flag: 'wx' },
  );
  await verifyRelease(original.directory); // Do not silently copy a concurrently changed source.
  await verifyRelease(destination);
  return relative(root, destination).replaceAll('\\', '/');
}
/** Explicit trusted release test input; hash verification does not authenticate a bundle's author. */
export async function releaseInput(): Promise<string | undefined> {
  const args = process.argv.slice(2),
    index = args.indexOf('--release-bundle');
  if (index < 0) return undefined;
  if (
    args.lastIndexOf('--release-bundle') !== index ||
    !args[index + 1] ||
    args[index + 1]!.startsWith('--')
  )
    throw new ReleaseError('usage');
  return (await verifyRelease(resolve(args[index + 1]!), true)).directory;
}
