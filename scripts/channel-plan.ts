import { publishRelease, parsePublicationRequest, publicRegistryIO } from './publication.js';
import type { PublicationRequest, PublicationIO } from './publication.js';
import { ReleaseError } from './release-artifacts.js';
import { resolve } from 'node:path';
import { registryReadSequence } from './registry-read.js';
import type { RegistryReadResult, RegistryReadSource } from './registry-read.js';

export class ChannelPlanError extends Error {
  constructor(
    readonly code: 'channel-metadata' | 'channel-drift' | 'channel-integrity' | 'channel-target',
  ) {
    super(`Channel plan: ${code}.`);
  }
}
interface ChannelRequest extends PublicationRequest {
  readonly expectedCurrentVersion: string;
}
function validVersion(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    value.length > 80 ||
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([A-Za-z\d-]+(?:\.[A-Za-z\d-]+)*))?$/.test(value)
  )
    return false;
  const pre = value.split('-').slice(1).join('-');
  if (pre.split('.').some((part) => /^\d+$/.test(part) && part.length > 1 && part.startsWith('0')))
    return false;
  return Bun.semver.satisfies(value, value);
}
export function channelOptions(args: readonly string[]): ChannelRequest {
  const core: string[] = [];
  let expectedCurrentVersion: string | undefined;
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]!,
      value = args[index + 1];
    if (!value || value.startsWith('--') || flag === '--execute') throw new ReleaseError('usage');
    if (flag === '--expected-current-version') {
      if (expectedCurrentVersion !== undefined) throw new ReleaseError('usage');
      expectedCurrentVersion = value;
    } else core.push(flag, value);
  }
  if (!validVersion(expectedCurrentVersion) || expectedCurrentVersion === '0.0.0-stage')
    throw new ReleaseError('usage');
  return { ...parsePublicationRequest(core), expectedCurrentVersion };
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Whole-family read-only preflight; a plan never retags, publishes or authenticates. */
export async function channelPlan(
  root: string,
  request: ChannelRequest,
  source: PublicationIO['run'] | RegistryReadSource = publicRegistryIO(root),
) {
  if (
    request.execute !== false ||
    !validVersion(request.expectedCurrentVersion) ||
    request.expectedCurrentVersion === '0.0.0-stage'
  )
    throw new ReleaseError('usage');
  const approved = await publishRelease(root, request);
  if (approved.operation !== 'preview') throw new ReleaseError('usage');
  const version = approved.packages[0]!.version;
  if (
    !validVersion(version) ||
    version === '0.0.0-stage' ||
    Bun.semver.order(version, request.expectedCurrentVersion) > 0
  )
    throw new ChannelPlanError('channel-target');
  const registry = 'https://registry.npmjs.org/';
  const argv = (item: (typeof approved.packages)[number]) => [
    'npm',
    'view',
    `${item.name}@${version}`,
    'name',
    'version',
    'versions',
    'dist',
    'dist-tags',
    'deprecated',
    '--json',
    '--prefer-online',
    '--registry',
    registry,
  ];
  const metadata = (item: (typeof approved.packages)[number], read: RegistryReadResult) => {
    let value: unknown;
    try {
      if (read.status !== 0 || Buffer.byteLength(read.stdout) > 1024 * 1024)
        throw new ChannelPlanError('channel-metadata');
      value = JSON.parse(read.stdout);
    } catch {
      throw new ChannelPlanError('channel-metadata');
    }
    const tarball = `${registry}${item.name}/-/${item.name.split('/')[1]}-${version}.tgz`;
    if (
      !object(value) ||
      value.name !== item.name ||
      value.version !== version ||
      !object(value.dist) ||
      value.dist.tarball !== tarball ||
      !object(value['dist-tags']) ||
      !Array.isArray(value.versions) ||
      value.versions.length > 10000 ||
      new Set(value.versions).size !== value.versions.length ||
      !value.versions.every((v) => typeof v === 'string' && v.length <= 80) ||
      !value.versions.includes(version) ||
      !value.versions.includes(request.expectedCurrentVersion)
    )
      throw new ChannelPlanError('channel-metadata');
    if (
      value.deprecated !== undefined &&
      (typeof value.deprecated !== 'string' || value.deprecated.length > 0)
    )
      throw new ChannelPlanError('channel-target');
    if (value.dist.integrity !== item.registryIntegrity)
      throw new ChannelPlanError('channel-integrity');
    if (value['dist-tags'][request.tag] !== request.expectedCurrentVersion)
      throw new ChannelPlanError('channel-drift');
    return {
      name: item.name,
      currentVersion: request.expectedCurrentVersion,
      targetVersion: version,
      registryIntegrity: item.registryIntegrity,
      tarball,
      olderCommonCandidates: value.versions
        .filter(
          (v) =>
            validVersion(v) &&
            v !== '0.0.0-stage' &&
            Bun.semver.order(v, request.expectedCurrentVersion) < 0,
        )
        .sort(Bun.semver.order),
    };
  };
  // Nothing is returned for execution until both complete observations agree.
  const observe = async () => {
    const results: ReturnType<typeof metadata>[] = [];
    const io = typeof source === 'function' ? { run: source } : source;
    for await (const { item, result } of registryReadSequence(
      approved.packages,
      io,
      argv,
      resolve(request.bundle),
    ))
      results.push(metadata(item, result));
    return results;
  };
  const first = await observe();
  const second = await observe();
  if (JSON.stringify(first) !== JSON.stringify(second)) throw new ChannelPlanError('channel-drift');
  const confirmed = await publishRelease(root, request);
  if (JSON.stringify(approved) !== JSON.stringify(confirmed))
    throw new ChannelPlanError('channel-integrity');
  const noop = version === request.expectedCurrentVersion;
  const versionIndexes = first.map((item) => new Set(item.olderCommonCandidates));
  // Filter the sorted first observation to retain its exact order and string matching.
  const olderCommonVersions = first[0]!.olderCommonCandidates.filter((v) =>
    versionIndexes.every((versions) => versions.has(v)),
  );
  return {
    schemaVersion: 'banora.channel-plan/v1',
    operation: noop ? 'no-change' : 'rollback-plan',
    source: approved.source,
    manifestSha256: approved.manifestSha256,
    registry,
    tag: request.tag,
    expectedCurrentVersion: request.expectedCurrentVersion,
    targetVersion: version,
    observations: 2,
    olderCommonVersions,
    packages: first.map(({ olderCommonCandidates: _versions, ...item }) => ({
      ...item,
      changeArgv: noop
        ? []
        : [
            'npm',
            'dist-tag',
            'add',
            `${item.name}@${version}`,
            request.tag,
            '--registry',
            registry,
          ],
    })),
    prerequisites: [
      'Review retained provenance and run fresh target-version installed-consumer health before changing any package.',
      'Recheck the entire selected channel immediately before mutation; this read-only plan is not compare-and-swap or a lock.',
      'Authorize a maintainer session or protected main-only OIDC dist-tag workflow independently; direct-publish permission is insufficient.',
      'OIDC dist-tag requires npm 11.21.0+ within major 11, or 12.2.0+ within major 12, and explicit per-package Allow npm dist-tag.',
      'Package tag writes are separate operations; stop on uncertain/partial results, inspect every package and do not automatically retry or unpublish.',
      'Verify every tag and a fresh complete-family installation afterward; existing installations, lockfiles and host data do not roll back.',
    ],
    scope:
      'Credential-free public registry reads and verified local bytes only; isolated empty npm config may be written locally. No retag/publish/install, permission change, host deployment, data downgrade or prior-version rollback proof. Older common versions are metadata observations, not reviewed or tested rollback candidates.',
  };
}
