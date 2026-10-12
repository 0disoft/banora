import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  artifactParent,
  RELEASE_PACKAGE_NAMES,
  ReleaseError,
  verifyRelease,
} from './release-artifacts.js';
import { publicRegistryIO } from './publication.js';
import type { RecordCheckpoint } from '@0disoft/banora/checkpoint';
import type { executeAutomation } from '@0disoft/banora/automation';

interface ProbeResult {
  ok: boolean;
  checkpoint: RecordCheckpoint;
  state: { snapshot: unknown } & Record<string, unknown>;
}

interface ReviewedInput {
  bundle: string;
  manifestSha256: string;
  sourceCommit: string;
}
export function recoveryOptions(args: readonly string[]) {
  const values = new Map<string, string>();
  const fields = ['bundle', 'manifest-sha256', 'source-commit'];
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]!,
      value = args[index + 1];
    if (
      !['current', 'target'].some(
        (prefix) =>
          fields.includes(flag.slice(prefix.length + 3)) && flag.startsWith(`--${prefix}-`),
      ) ||
      values.has(flag) ||
      !value ||
      value.startsWith('--')
    )
      throw new ReleaseError('usage');
    values.set(flag, value);
  }
  const input = (prefix: string): ReviewedInput => {
    const bundle = values.get(`--${prefix}-bundle`),
      manifestSha256 = values.get(`--${prefix}-manifest-sha256`),
      sourceCommit = values.get(`--${prefix}-source-commit`);
    if (
      !bundle ||
      !manifestSha256 ||
      !/^[a-f0-9]{64}$/.test(manifestSha256) ||
      !sourceCommit ||
      !/^[a-f0-9]{40}$/.test(sourceCommit)
    )
      throw new ReleaseError('usage');
    return { bundle, manifestSha256, sourceCommit };
  };
  return { current: input('current'), target: input('target') };
}
export class ConsumerRecoveryError extends Error {
  constructor(
    readonly code: 'recovery-target' | 'recovery-install' | 'recovery-consumer',
    readonly completed: readonly string[] = [],
  ) {
    super(`Consumer recovery: ${code}.`);
  }
}
const digest = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
async function reviewed(input: ReviewedInput) {
  const verified = await verifyRelease(resolve(input.bundle));
  if (
    digest(await readFile(resolve(verified.directory, 'manifest.json'))) !== input.manifestSha256 ||
    verified.manifest.source.commit !== input.sourceCommit
  )
    throw new ReleaseError('integrity');
  if (
    verified.manifest.packages.some(
      (item) => !Object.values(RELEASE_PACKAGE_NAMES).some((name) => name === item.name),
    )
  )
    throw new ReleaseError('manifest');
  return {
    ...verified,
    version: verified.manifest.packages[0]!.version,
    manifestSha256: input.manifestSha256,
  };
}

/** Authored portable-data drill on reviewed executables; never edits a host or npm tag. */
export async function consumerRecovery(root: string, request: ReturnType<typeof recoveryOptions>) {
  const current = await reviewed(request.current),
    target = await reviewed(request.target);
  if (
    !Bun.semver.satisfies(current.version, current.version) ||
    !Bun.semver.satisfies(target.version, target.version) ||
    current.version === '0.0.0-stage' ||
    target.version === '0.0.0-stage' ||
    Bun.semver.order(target.version, current.version) >= 0
  )
    throw new ConsumerRecoveryError('recovery-target');
  const directory = await mkdtemp(
    resolve(await artifactParent(root, 'restores'), 'consumer-recovery-'),
  );
  const run = publicRegistryIO(root).run;
  const completed: string[] = [];
  const probe = await readFile(resolve(root, 'scripts/consumer-recovery-probe.js'));
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      ['path', 'systemroot', 'windir', 'temp', 'tmp', 'pathext'].includes(key.toLowerCase()),
    ),
  );
  const execute = <T>(cwd: string, argv: string[], input?: string, expectedExit = 0): T => {
    const result = spawnSync('node', argv, {
      cwd,
      input,
      encoding: 'utf8',
      shell: false,
      windowsHide: true,
      timeout: 15_000,
      maxBuffer: 1024 * 1024,
      env: environment,
    });
    if (
      result.status !== expectedExit ||
      result.error ||
      result.stderr ||
      result.stdout.trim().split('\n').length !== 1
    )
      throw new ConsumerRecoveryError('recovery-consumer', [...completed]);
    try {
      return JSON.parse(result.stdout) as T;
    } catch {
      throw new ConsumerRecoveryError('recovery-consumer', [...completed]);
    }
  };
  const install = async (label: string, bundle: typeof current) => {
    const cwd = resolve(directory, label);
    await mkdir(cwd);
    for (const key of ['sdk', 'cli'] as const) {
      const archive = `packages/${key}.tgz`;
      const destination = resolve(cwd, `${key}.tgz`);
      await copyFile(resolve(bundle.directory, archive), destination, constants.COPYFILE_EXCL);
      if (
        digest(await readFile(destination)) !==
        bundle.manifest.files.find((file) => file.path === archive)!.sha256
      )
        throw new ReleaseError('integrity');
    }
    await writeFile(
      resolve(cwd, 'package.json'),
      JSON.stringify({
        private: true,
        type: 'module',
        dependencies: { '@0disoft/banora': './sdk.tgz', '@0disoft/banora-cli': './cli.tgz' },
      }),
      { flag: 'wx' },
    );
    await writeFile(resolve(cwd, 'probe.mjs'), probe, { flag: 'wx' });
    const installed = run(
      [
        'npm',
        'install',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        '--registry',
        'https://registry.npmjs.org/',
      ],
      cwd,
    );
    if (installed.status !== 0) throw new ConsumerRecoveryError('recovery-install', [...completed]);
    for (const key of ['sdk', 'cli'] as const) {
      const metadata = JSON.parse(
        await readFile(
          resolve(cwd, 'node_modules', RELEASE_PACKAGE_NAMES[key], 'package.json'),
          'utf8',
        ),
      );
      if (metadata.name !== RELEASE_PACKAGE_NAMES[key] || metadata.version !== bundle.version)
        throw new ConsumerRecoveryError('recovery-install', [...completed]);
    }
    const version = execute<{ ok: boolean; version: string }>(cwd, [
      'node_modules/@0disoft/banora-cli/dist/main.js',
      '--version',
    ]);
    if (!version.ok || version.version !== bundle.version)
      throw new ConsumerRecoveryError('recovery-install', [...completed]);
    completed.push(`${label}-installed`);
    return cwd;
  };
  const fresh = await install('current', current),
    previous = await install('target', target);
  const authored = execute<ProbeResult>(fresh, ['probe.mjs', 'create']);
  if (!authored.ok) throw new ConsumerRecoveryError('recovery-consumer', [...completed]);
  const checkpoint = JSON.stringify(authored.checkpoint);
  const saved = resolve(directory, 'authored-checkpoint.json');
  await writeFile(saved, checkpoint, { flag: 'wx', mode: 0o600 });
  const fingerprint = JSON.stringify(authored.state);
  const check = (value: boolean) => {
    if (!value) throw new ConsumerRecoveryError('recovery-consumer', [...completed]);
  };
  let nextCheckpoint = checkpoint;
  for (const [label, cwd] of [
    ['current', fresh],
    ['target', previous],
    ['return-current', fresh],
  ] as const) {
    const recovered = execute<ProbeResult>(cwd, ['probe.mjs', 'restore'], nextCheckpoint);
    check(
      recovered.ok &&
        JSON.stringify(recovered.checkpoint) === checkpoint &&
        JSON.stringify(recovered.state) === fingerprint,
    );
    const response = execute<ReturnType<typeof executeAutomation>>(
      cwd,
      ['node_modules/@0disoft/banora-cli/dist/main.js', 'run'],
      JSON.stringify({
        schemaVersion: 'banora.automation/v1',
        kind: 'record',
        checkpoint: recovered.checkpoint,
        includeCheckpoint: true,
      }),
    );
    if (!response.ok || response.kind !== 'record')
      throw new ConsumerRecoveryError('recovery-consumer', [...completed]);
    check(
      JSON.stringify(response.checkpoint) === checkpoint &&
        !response.history.canUndo &&
        response.history.dirty &&
        response.sgf === authored.checkpoint.sgf &&
        JSON.stringify(response.snapshot) === JSON.stringify(authored.state.snapshot) &&
        JSON.stringify(response.selection) === JSON.stringify(authored.checkpoint.selection),
    );
    check(
      JSON.stringify(response.rules) === JSON.stringify(authored.state.rules) &&
        JSON.stringify(response.passPrisoners) === JSON.stringify(authored.state.passPrisoners) &&
        response.consecutivePasses === authored.state.consecutivePasses,
    );
    nextCheckpoint = JSON.stringify(response.checkpoint);
    const future = execute<{ ok: boolean; error: { code: string } }>(
      cwd,
      ['node_modules/@0disoft/banora-cli/dist/main.js', 'run'],
      JSON.stringify({
        schemaVersion: 'banora.automation/v1',
        kind: 'record',
        checkpoint: { ...recovered.checkpoint, schemaVersion: 'banora.checkpoint/v99' },
      }),
      3,
    );
    check(future.ok === false && future.error.code === 'invalid-request');
    completed.push(`${label}-portable-recovery`);
  }
  check(digest(await readFile(saved)) === digest(checkpoint));
  check(
    digest(await readFile(resolve(root, 'scripts/consumer-recovery-probe.js'))) === digest(probe),
  );
  for (const input of [request.current, request.target]) await reviewed(input);
  const identity = (bundle: typeof current) => ({
    source: bundle.manifest.source,
    version: bundle.version,
    manifestSha256: bundle.manifestSha256,
    packages: bundle.manifest.packages
      .filter(
        (item) =>
          item.name === RELEASE_PACKAGE_NAMES.sdk || item.name === RELEASE_PACKAGE_NAMES.cli,
      )
      .map((item) => ({
        name: item.name,
        version: item.version,
        sha256: bundle.manifest.files.find((file) => file.path === item.archive)!.sha256,
      })),
  });
  return {
    schemaVersion: 'banora.consumer-recovery/v1',
    operation: 'consumer-recovery-check',
    current: identity(current),
    target: identity(target),
    completed,
    checkpointSha256: digest(checkpoint),
    stateSha256: digest(fingerprint),
    probeSha256: digest(probe),
    scope:
      'Actual independently installed Node SDK/CLI current-to-previous-to-current portable-data recovery on authored fixtures. No registry tag change, host deployment, IndexedDB downgrade, user data, disk durability or unknown future-schema compatibility.',
  };
}
