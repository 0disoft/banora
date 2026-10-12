import { createHash } from 'node:crypto';
import { appendFile, lstat, open, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const archiveLimit = 64 * 1024 * 1024;
const id = (value: string) => /^[1-9]\d{0,19}$/.test(value);
const sha = (value: string) => /^[a-f0-9]{64}$/.test(value);
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export function recoveryRequest(args: readonly string[]) {
  const [action, ...options] = args;
  const keys =
    action === 'candidate'
      ? ['--run-id', '--artifact-id', '--source-commit', '--archive-digest']
      : action === 'archive'
        ? ['--directory', '--sha256']
        : [];
  const values = new Map<string, string>();
  if (!keys.length || options.length !== keys.length * 2) throw Error('usage');
  for (let index = 0; index < options.length; index += 2) {
    const key = options[index]!,
      value = options[index + 1]!;
    if (!keys.includes(key) || values.has(key) || !value || value.startsWith('--'))
      throw Error('usage');
    values.set(key, value);
  }
  if (action === 'archive') {
    const directory = values.get('--directory')!,
      sha256 = values.get('--sha256')!;
    if (!sha(sha256) || directory.includes('\0')) throw Error('usage');
    return { action, directory, sha256 } as const;
  }
  const runId = values.get('--run-id')!,
    artifactId = values.get('--artifact-id')!;
  const sourceCommit = values.get('--source-commit')!,
    archiveDigest = values.get('--archive-digest')!;
  if (
    !id(runId) ||
    !id(artifactId) ||
    !/^[a-f0-9]{40}$/.test(sourceCommit) ||
    !/^sha256:[a-f0-9]{64}$/.test(archiveDigest)
  )
    throw Error('usage');
  return { action: 'candidate', runId, artifactId, sourceCommit, archiveDigest } as const;
}

export function recoveryCandidate(
  request: Extract<ReturnType<typeof recoveryRequest>, { action: 'candidate' }>,
  run: unknown,
  listing: unknown,
  jobs: unknown,
  now = Date.now(),
) {
  if (
    !object(run) ||
    String(run.id) !== request.runId ||
    run.status !== 'completed' ||
    run.conclusion !== 'success' ||
    run.path !== '.github/workflows/pages.yml' ||
    run.event !== 'workflow_dispatch' ||
    run.head_branch !== 'main' ||
    run.head_sha !== request.sourceCommit ||
    !object(run.repository) ||
    run.repository.full_name !== '0disoft/banora' ||
    run.repository.private !== false ||
    !object(run.head_repository) ||
    run.head_repository.full_name !== '0disoft/banora'
  )
    throw Error('candidate');
  if (!object(jobs) || !Array.isArray(jobs.jobs)) throw Error('candidate');
  const deployedJobs = jobs.jobs;
  if (
    !['build', 'deploy'].every(
      (name) =>
        deployedJobs.filter(
          (job: unknown) =>
            object(job) &&
            job.name === name &&
            job.status === 'completed' &&
            job.conclusion === 'success',
        ).length === 1,
    )
  )
    throw Error('candidate');
  if (
    !object(listing) ||
    listing.total_count !== 1 ||
    !Array.isArray(listing.artifacts) ||
    listing.artifacts.length !== 1 ||
    !object(listing.artifacts[0])
  )
    throw Error('candidate');
  const artifact = listing.artifacts[0];
  if (
    !Number.isSafeInteger(artifact.id) ||
    Number(artifact.id) < 1 ||
    String(artifact.id) !== request.artifactId ||
    artifact.name !== 'github-pages' ||
    artifact.digest !== request.archiveDigest ||
    artifact.expired !== false ||
    typeof artifact.expires_at !== 'string' ||
    !Number.isFinite(Date.parse(artifact.expires_at)) ||
    Date.parse(artifact.expires_at) <= now ||
    !Number.isSafeInteger(artifact.size_in_bytes) ||
    Number(artifact.size_in_bytes) < 1 ||
    Number(artifact.size_in_bytes) > archiveLimit ||
    !object(artifact.workflow_run) ||
    String(artifact.workflow_run.id) !== request.runId ||
    artifact.workflow_run.head_sha !== request.sourceCommit ||
    artifact.workflow_run.head_branch !== 'main'
  )
    throw Error('candidate');
  return {
    sourceCommit: request.sourceCommit,
    sourceRunId: request.runId,
    artifactId: request.artifactId,
    archiveDigest: request.archiveDigest,
    expiresAt: artifact.expires_at,
  };
}

/** Inspect only the original tar; never extract or execute its content. */
export async function verifyDemoArchive(directory: string, sha256: string) {
  if (!sha(sha256)) throw Error('archive');
  const root = resolve(directory);
  for (let path = root; ; path = dirname(path)) {
    const info = await lstat(path);
    if (!info.isDirectory() || info.isSymbolicLink()) throw Error('archive');
    if (path === dirname(path)) break;
  }
  const names = await readdir(root);
  if (names.length !== 1 || names[0] !== 'artifact.tar') throw Error('archive');
  const path = resolve(root, 'artifact.tar'),
    before = await lstat(path);
  if (!before.isFile() || before.isSymbolicLink() || before.size < 1 || before.size > archiveLimit)
    throw Error('archive');
  const file = await open(path, 'r');
  try {
    const opened = await file.stat();
    if (
      !opened.isFile() ||
      opened.ino !== before.ino ||
      opened.dev !== before.dev ||
      opened.size !== before.size
    )
      throw Error('archive');
    const hash = createHash('sha256');
    let bytes = 0;
    for await (const chunk of file.createReadStream({ autoClose: false })) {
      bytes += chunk.length;
      if (bytes > before.size) throw Error('archive');
      hash.update(chunk);
    }
    const after = await lstat(path);
    if (
      bytes !== before.size ||
      after.isSymbolicLink() ||
      after.ino !== before.ino ||
      after.dev !== before.dev ||
      after.size !== before.size ||
      hash.digest('hex') !== sha256
    )
      throw Error('archive');
    return { tarSha256: sha256, bytes };
  } finally {
    await file.close();
  }
}

export function recoveryWorkflowContext(env: NodeJS.ProcessEnv) {
  if (
    env.GITHUB_REPOSITORY !== '0disoft/banora' ||
    env.GITHUB_REF !== 'refs/heads/main' ||
    env.GITHUB_EVENT_NAME !== 'workflow_dispatch' ||
    env.BANORA_REPOSITORY_PUBLIC !== 'true' ||
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '')
  )
    throw Error('context');
}

if (import.meta.main) {
  let code = 'usage';
  try {
    const request = recoveryRequest(process.argv.slice(2));
    if (process.env.GITHUB_OUTPUT) {
      code = 'context';
      recoveryWorkflowContext(process.env);
    }
    code = request.action;
    let result;
    if (request.action === 'archive') {
      result = await verifyDemoArchive(request.directory, request.sha256);
    } else {
      const read = (endpoint: string) => {
        const response = spawnSync('gh', ['api', `repos/0disoft/banora/${endpoint}`], {
          encoding: 'utf8',
          timeout: 30_000,
          maxBuffer: 1024 * 1024,
          shell: false,
          windowsHide: true,
        });
        if (response.status !== 0) throw Error('candidate');
        return JSON.parse(response.stdout) as unknown;
      };
      const path = `actions/runs/${request.runId}`;
      result = recoveryCandidate(
        request,
        read(path),
        read(path + '/artifacts?per_page=2'),
        read(path + '/jobs?filter=latest&per_page=100'),
      );
      if (process.env.GITHUB_OUTPUT)
        await appendFile(process.env.GITHUB_OUTPUT, `artifact_id=${result.artifactId}\n`);
    }
    console.log(
      JSON.stringify({
        schemaVersion: 'banora.demo-recovery/v1',
        ok: true,
        operation: request.action,
        ...result,
      }),
    );
  } catch {
    console.log(JSON.stringify({ schemaVersion: 'banora.demo-recovery/v1', ok: false, code }));
    process.exitCode = 1;
  }
}
