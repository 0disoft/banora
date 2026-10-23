import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, lstat, mkdtemp, open } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  artifactParent,
  restoreRelease,
  verifyRelease,
  ReleaseError,
} from './release-artifacts.js';
import { publicRegistryIO, publishRelease } from './publication.js';
import type { PublicationIO, PublicationRequest } from './publication.js';
import { runReleaseCheck } from './release-check.js';
import { channelPlan } from './channel-plan.js';
import { registryReadSequence } from './registry-read.js';
import type { RegistryRead, RegistryReadResult } from './registry-read.js';

export class RegistryHealthError extends Error {
  constructor(
    readonly code:
      | 'registry-metadata'
      | 'registry-channel'
      | 'registry-target'
      | 'registry-integrity'
      | 'registry-download'
      | 'registry-consumer',
    readonly completed: readonly string[] = [],
    readonly lastCheck?: string,
  ) {
    super(`Registry health: ${code}.`);
  }
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
/** Fresh credential-free HTTPS, bounded by the reviewed archive length and deadline. */
export async function downloadRegistryArchive(
  url: string,
  destination: string,
  bytes: number,
  fetcher: (url: string, init: RequestInit) => Promise<Response> = fetch,
) {
  const address = new URL(url);
  if (
    address.protocol !== 'https:' ||
    address.hostname !== 'registry.npmjs.org' ||
    address.port ||
    address.username ||
    address.password ||
    address.search ||
    address.hash ||
    !Number.isSafeInteger(bytes) ||
    bytes < 1 ||
    bytes > 64 * 1024 * 1024
  )
    throw new RegistryHealthError('registry-download');
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 60_000);
  let file: Awaited<ReturnType<typeof open>> | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let failed = false;
  try {
    const response = await fetcher(address.href, {
      redirect: 'error',
      cache: 'no-store',
      signal: abort.signal,
    });
    // Own the body before any response/header/destination refusal needs cleanup.
    reader = response.body?.getReader();
    if (response.status !== 200 || !reader) throw new RegistryHealthError('registry-download');
    const length = response.headers.get('content-length');
    if (length !== null && (!/^\d+$/.test(length) || Number(length) !== bytes))
      throw new RegistryHealthError('registry-download');
    file = await open(destination, 'wx', 0o600);
    let total = 0;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > bytes) throw new RegistryHealthError('registry-download');
      // FileHandle.write may accept fewer bytes; writeFile drains each supplied chunk fully.
      await file.writeFile(chunk.value);
    }
    if (total !== bytes) throw new RegistryHealthError('registry-download');
  } catch {
    failed = true;
  } finally {
    clearTimeout(timer);
    abort.abort();
    try {
      // Transport cancellation may never settle; it must not prevent closing our file.
      if (reader) {
        void reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
    } catch {
      failed = true;
    }
    try {
      await file?.close();
    } catch {
      failed = true;
    }
  }
  if (failed) throw new RegistryHealthError('registry-download');
}
export interface RegistryHealthIO {
  run: PublicationIO['run'];
  read?: RegistryRead;
  download(url: string, destination: string, bytes: number): Promise<void>;
  check(args: string[], label: string): Promise<void>;
}
function registryIO(root: string): RegistryHealthIO {
  const registry = publicRegistryIO(root);
  return {
    run: registry.run,
    read: registry.read,
    download: downloadRegistryArchive,
    check: (args, label) => runReleaseCheck(root, args, label),
  };
}
export async function registryHealth(
  root: string,
  request: PublicationRequest,
  io: RegistryHealthIO = registryIO(root),
) {
  return checkRegistry(root, request, io);
}
/** Install reviewed rollback-target bytes while preserving the current channel. */
export async function registryTargetHealth(
  root: string,
  request: Parameters<typeof channelPlan>[1],
  io: RegistryHealthIO = registryIO(root),
) {
  const preflight = await channelPlan(root, request, io);
  const health = await checkRegistry(root, request, io, preflight.expectedCurrentVersion);
  return {
    ...health,
    operation: 'registry-target-check',
    expectedCurrentVersion: preflight.expectedCurrentVersion,
    targetVersion: preflight.targetVersion,
    preflightObservations: preflight.observations,
    scope:
      'Fresh reviewed target downloads and independent installed consumers, with unchanged expected current tags checked before and after installation. No publish, tag change, deployment switch or live rollback.',
  };
}
async function checkRegistry(
  root: string,
  request: PublicationRequest,
  io: RegistryHealthIO,
  expectedCurrentVersion?: string,
) {
  if (request.execute) throw new ReleaseError('usage');
  const plan = await publishRelease(root, request);
  if (plan.operation !== 'preview') throw new ReleaseError('usage');
  const original = await verifyRelease(resolve(request.bundle));
  if (JSON.stringify(plan.source) !== JSON.stringify(original.manifest.source))
    throw new ReleaseError('integrity');
  const archiveDirectory = await mkdtemp(
    resolve(await artifactParent(root, 'restores'), 'registry-download-'),
  );
  const argv = (item: (typeof plan.packages)[number]) => [
    'npm',
    'view',
    `${item.name}@${item.version}`,
    'name',
    'version',
    'dist',
    'dist-tags',
    ...(expectedCurrentVersion ? ['deprecated'] : []),
    '--json',
    '--registry',
    'https://registry.npmjs.org/',
    '--prefer-online',
  ];
  const metadata = (item: (typeof plan.packages)[number], read: RegistryReadResult) => {
    let value: unknown;
    try {
      if (read.status !== 0 || Buffer.byteLength(read.stdout) > 1024 * 1024)
        throw new RegistryHealthError('registry-metadata');
      value = JSON.parse(read.stdout);
    } catch {
      throw new RegistryHealthError('registry-metadata');
    }
    const tarball = `https://registry.npmjs.org/${item.name}/-/${item.name.split('/')[1]}-${item.version}.tgz`;
    if (
      !object(value) ||
      value.name !== item.name ||
      value.version !== item.version ||
      !object(value.dist) ||
      value.dist.tarball !== tarball ||
      !object(value['dist-tags'])
    )
      throw new RegistryHealthError('registry-metadata');
    if (value.dist.integrity !== item.registryIntegrity)
      throw new RegistryHealthError('registry-integrity');
    if (value['dist-tags'][plan.tag] !== (expectedCurrentVersion ?? item.version))
      throw new RegistryHealthError('registry-channel');
    if (
      expectedCurrentVersion &&
      value.deprecated !== undefined &&
      (typeof value.deprecated !== 'string' || value.deprecated.length > 0)
    )
      throw new RegistryHealthError('registry-target');
    return tarball;
  };
  // Check the entire family before downloading or executing its packages.
  const observe = async () => {
    const urls: string[] = [];
    for await (const { item, result } of registryReadSequence(
      plan.packages,
      io,
      argv,
      archiveDirectory,
    ))
      urls.push(metadata(item, result));
    return urls;
  };
  const urls = await observe();
  const downloads: string[] = [],
    completed: string[] = [];
  for (const [index, item] of plan.packages.entries()) {
    const target = resolve(archiveDirectory, `archive-${index}.tgz`);
    const expected = original.manifest.files.find((file) => file.path === item.archive)!;
    try {
      await io.download(urls[index]!, target, expected.bytes);
    } catch {
      throw new RegistryHealthError('registry-download', [...completed]);
    }
    const info = await lstat(target).catch(() => undefined);
    if (!info?.isFile() || info.isSymbolicLink() || info.size !== expected.bytes)
      throw new RegistryHealthError('registry-integrity', [...completed]);
    const sha256 = createHash('sha256'),
      sha512 = createHash('sha512');
    for await (const chunk of createReadStream(target)) {
      sha256.update(chunk);
      sha512.update(chunk);
    }
    if (
      sha256.digest('hex') !== expected.sha256 ||
      'sha512-' + sha512.digest('base64') !== item.registryIntegrity
    )
      throw new RegistryHealthError('registry-integrity', [...completed]);
    downloads.push(target);
    completed.push(item.name);
  }
  const restaged = resolve(root, await restoreRelease(root, request.bundle));
  if (
    JSON.stringify((await verifyRelease(restaged)).manifest) !== JSON.stringify(original.manifest)
  )
    throw new ReleaseError('integrity');
  // Only the exclusive copy is replaced with independently downloaded, hash-identical registry bytes.
  for (const [index, item] of plan.packages.entries())
    await copyFile(downloads[index]!, resolve(restaged, item.archive));
  await verifyRelease(restaged);
  const checks: string[] = [];
  for (const [script, label] of [
    ['packed-consumer', 'registry-sdk'],
    ['packed-cli', 'registry-cli'],
    ['packed-adapters', 'registry-adapters'],
  ] as const) {
    try {
      await io.check([`scripts/${script}.ts`, '--release-bundle', restaged], label);
    } catch {
      throw new RegistryHealthError('registry-consumer', [...completed], label);
    }
    await verifyRelease(restaged);
    checks.push(label);
  }
  try {
    await observe();
  } // A channel change during installs is not a passing release health check.
  catch (error) {
    throw new RegistryHealthError(
      error instanceof RegistryHealthError ? error.code : 'registry-metadata',
      [...completed],
      'registry-confirmation',
    );
  }
  await verifyRelease(original.directory);
  return {
    schemaVersion: 'banora.registry-health/v1',
    operation: 'registry-check',
    source: plan.source,
    manifestSha256: plan.manifestSha256,
    registry: 'https://registry.npmjs.org/',
    tag: plan.tag,
    packages: plan.packages.map((item) => ({
      name: item.name,
      version: item.version,
      sha256: item.sha256,
      registryIntegrity: item.registryIntegrity,
    })),
    checks,
    scope:
      'Fresh bounded registry downloads, exact reviewed bytes and independent SDK/CLI/framework installed consumers. No publish, tag change, deployment switch or live rollback.',
  };
}
