import { expect } from 'bun:test';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  inventory,
  RELEASE_CHECKS,
  RELEASE_PACKAGES,
  RELEASE_PACKAGE_NAMES,
} from './release-artifacts.js';
import type { ReleaseManifest } from './release-artifacts.js';
import { publishRelease } from './publication.js';
import type { PublicationIO } from './publication.js';
import type { RegistryHealthIO } from './registry-health.js';

// Test-only factories: every call owns a fresh root and fresh mutable state.
export async function fixture(prepared = false) {
  await mkdir('.tmp', { recursive: true });
  const root = await mkdtemp(resolve('.tmp/release-test-'));
  const bundle = resolve(root, 'bundle');
  await mkdir(resolve(bundle, 'packages'), { recursive: true });
  for (const name of RELEASE_PACKAGES)
    await writeFile(
      resolve(bundle, `packages/${name}.tgz`),
      `Authored ${name} integrity fixture, not an executable package.`,
    );
  await mkdir(resolve(bundle, 'examples/studio'), { recursive: true });
  await writeFile(
    resolve(bundle, 'examples/studio/index.html'),
    '<html>Authored integrity fixture</html>',
  );
  await mkdir(resolve(bundle, 'browser-sdk'));
  await writeFile(
    resolve(bundle, 'browser-sdk/banora.global.js'),
    '/* Authored integrity fixture */',
  );
  const manifest: ReleaseManifest = {
    schemaVersion: 'banora.release/v1',
    state: prepared ? 'prepared' : 'candidate',
    source: { commit: 'a'.repeat(40), tree: 'b'.repeat(40) },
    tools: { bun: '1.4.2', node: '24.14.0' },
    packages: RELEASE_PACKAGES.map((name) => ({
      name: RELEASE_PACKAGE_NAMES[name],
      version: '0.1.0-dev.0',
      archive: `packages/${name}.tgz`,
    })),
    files: await inventory(bundle),
    checks: prepared ? RELEASE_CHECKS : [],
  };
  await writeFile(resolve(bundle, 'manifest.json'), JSON.stringify(manifest));
  return { root, bundle, manifest };
}

export async function publisherFixture() {
  const value = await fixture(true);
  // File-presence fixture only, in an isolated test root; never the repository policy.
  await writeFile(resolve(value.root, 'SECURITY.md'), 'Authored isolated policy gate fixture.\n');
  const request = {
    bundle: value.bundle,
    sourceCommit: value.manifest.source.commit,
    manifestSha256: createHash('sha256')
      .update(await readFile(resolve(value.bundle, 'manifest.json')))
      .digest('hex'),
    tag: 'dev',
    execute: true,
  };
  const preview = await publishRelease(value.root, { ...request, execute: false });
  if (preview.operation !== 'preview') throw Error('Expected preview fixture');
  const packages = preview.packages;
  const published = new Set<string>();
  const calls: { argv: readonly string[]; cwd: string }[] = [];
  const io: PublicationIO = {
    wait: async () => {},
    context: {
      githubActions: true,
      repository: '0disoft/banora',
      ref: 'refs/heads/main',
      event: 'workflow_dispatch',
      workflowRef: '0disoft/banora/.github/workflows/publish.yml@refs/heads/main',
      sourceCommit: request.sourceCommit,
      publicRepository: true,
      environment: 'npm-release',
      oidcAvailable: true,
      staticTokenPresent: false,
    },
    run(argv, cwd) {
      calls.push({ argv, cwd });
      if (argv[1] === '--version') return { status: 0, stdout: '11.21.0\n' };
      if (argv[1] === 'publish') {
        const item = packages.find((item) => './' + item.archive === argv[2])!;
        published.add(item.name);
        return { status: 0, stdout: '' };
      }
      if (argv[3] === 'dist.integrity') {
        const item = packages.find((item) => `${item.name}@${item.version}` === argv[2])!;
        return { status: 0, stdout: JSON.stringify(item.registryIntegrity) };
      }
      const item = packages.find((item) => item.name === argv[2])!;
      return {
        status: 0,
        stdout: JSON.stringify({
          name: item.name,
          versions: published.has(item.name) ? ['0.0.0-stage', item.version] : ['0.0.0-stage'],
          'dist-tags': { dev: published.has(item.name) ? item.version : '0.0.0-stage' },
        }),
      };
    },
  };
  return { ...value, request, io, calls, packages, published };
}

export async function registryFixture() {
  const { root, bundle, manifest } = await fixture(true);
  const request = {
    bundle,
    manifestSha256: createHash('sha256')
      .update(await readFile(resolve(bundle, 'manifest.json')))
      .digest('hex'),
    sourceCommit: manifest.source.commit,
    tag: 'dev',
    execute: false,
  };
  const plan = await publishRelease(root, request);
  if (plan.operation !== 'preview') throw Error('Expected preview fixture');
  const calls: { argv: readonly string[]; cwd: string }[] = [];
  const checks: { args: string[]; label: string }[] = [],
    downloads: string[] = [];
  // Authored metadata and copied integrity bytes; these fixtures do not simulate npm ownership or executable archives.
  const io: RegistryHealthIO = {
    run(argv, cwd) {
      calls.push({ argv, cwd });
      const item = plan.packages.find((item) => `${item.name}@${item.version}` === argv[2]);
      if (argv[0] !== 'npm' || argv[1] !== 'view' || !item)
        throw Error('Unexpected fixture command');
      return {
        status: 0,
        stdout: JSON.stringify({
          name: item.name,
          version: item.version,
          dist: {
            integrity: item.registryIntegrity,
            tarball: `https://registry.npmjs.org/${item.name}/-/${item.name.split('/')[1]}-${item.version}.tgz`,
          },
          'dist-tags': { dev: item.version },
        }),
      };
    },
    async download(url, destination, bytes) {
      expect(calls.length).toBe(5);
      const item = plan.packages.find((item) =>
        url.includes(`/${item.name.split('/')[1]}-${item.version}.tgz`),
      )!;
      expect(bytes).toBe(manifest.files.find((file) => file.path === item.archive)!.bytes);
      downloads.push(url);
      await copyFile(resolve(bundle, item.archive), destination);
    },
    async check(args, label) {
      checks.push({ args, label });
    },
  };
  return { root, bundle, manifest, request, io, calls, checks, downloads };
}
