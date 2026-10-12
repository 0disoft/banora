import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  recoveryRequest,
  recoveryCandidate,
  recoveryWorkflowContext,
  verifyDemoArchive,
} from './demo-recovery.js';

const source = 'a'.repeat(40),
  digest = `sha256:${'b'.repeat(64)}`;
const args = [
  'candidate',
  '--run-id',
  '123',
  '--artifact-id',
  '456',
  '--source-commit',
  source,
  '--archive-digest',
  digest,
];
const request = recoveryRequest(args);
if (request.action !== 'candidate') throw Error('fixture');
const run = {
  id: 123,
  status: 'completed',
  conclusion: 'success',
  path: '.github/workflows/pages.yml',
  event: 'workflow_dispatch',
  head_branch: 'main',
  head_sha: source,
  repository: { full_name: '0disoft/banora', private: false },
  head_repository: { full_name: '0disoft/banora' },
};
const listing = {
  total_count: 1,
  artifacts: [
    {
      id: 456,
      name: 'github-pages',
      digest,
      expired: false,
      expires_at: '2099-01-01T00:00:00Z',
      size_in_bytes: 100,
      workflow_run: { id: 123, head_sha: source, head_branch: 'main' },
    },
  ],
};
const jobs = {
  jobs: ['build', 'deploy'].map((name) => ({ name, status: 'completed', conclusion: 'success' })),
};

test('recovery requires the reviewed successful original public main deployment and immutable retained artifact', () => {
  expect(recoveryCandidate(request, run, listing, jobs).artifactId).toBe('456');
  for (const patch of [
    { id: 124 },
    { conclusion: 'failure' },
    { status: 'in_progress' },
    { path: '.github/workflows/publish.yml' },
    { event: 'push' },
    { head_branch: 'feature' },
    { head_sha: 'c'.repeat(40) },
    { repository: { full_name: '0disoft/banora', private: true } },
    { head_repository: { full_name: 'other/banora' } },
  ])
    expect(() => recoveryCandidate(request, { ...run, ...patch }, listing, jobs)).toThrow();
  for (const patch of [
    { id: 457 },
    { name: 'other' },
    { digest: `sha256:${'c'.repeat(64)}` },
    { expired: true },
    { expires_at: '2000-01-01T00:00:00Z' },
    { expires_at: 'invalid' },
    { size_in_bytes: 0 },
    { size_in_bytes: 64 * 1024 * 1024 + 1 },
    { workflow_run: { id: 123, head_sha: 'c'.repeat(40), head_branch: 'main' } },
  ])
    expect(() =>
      recoveryCandidate(
        request,
        run,
        { ...listing, artifacts: [{ ...listing.artifacts[0], ...patch }] },
        jobs,
      ),
    ).toThrow();
  expect(() =>
    recoveryCandidate(request, run, { total_count: 2, artifacts: listing.artifacts }, jobs),
  ).toThrow();
  expect(() =>
    recoveryCandidate(request, run, listing, { jobs: [{ name: 'deploy', conclusion: 'success' }] }),
  ).toThrow();
  expect(() =>
    recoveryCandidate(request, run, listing, {
      jobs: jobs.jobs.map((job) => ({ ...job, conclusion: 'skipped' })),
    }),
  ).toThrow();
});

test('ambiguous inputs and nonmanual Actions output contexts fail before reads or writes', () => {
  for (const changed of [
    [...args, '--execute'],
    [...args, '--run-id', '123'],
    args.map((value) => (value === '123' ? '../123' : value)),
    args.map((value) => (value === digest ? 'b'.repeat(64) : value)),
    [],
  ])
    expect(() => recoveryRequest(changed)).toThrow();
  const env = {
    GITHUB_REPOSITORY: '0disoft/banora',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    BANORA_REPOSITORY_PUBLIC: 'true',
    GITHUB_SHA: source,
  };
  expect(() => recoveryWorkflowContext(env)).not.toThrow();
  for (const key of Object.keys(env))
    expect(() => recoveryWorkflowContext({ ...env, [key]: '' })).toThrow();
  const child = spawnSync(process.execPath, ['scripts/demo-recovery.ts', ...args, '--execute'], {
    encoding: 'utf8',
    timeout: 5000,
    windowsHide: true,
    env: { ...process.env, PATH: '' },
  });
  expect(child.status).toBe(1);
  expect(JSON.parse(child.stdout)).toEqual({
    schemaVersion: 'banora.demo-recovery/v1',
    ok: false,
    code: 'usage',
  });
});

test('original tar is hash-checked without extraction or mutation; corrupt, extra and linked inputs fail', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'banora-demo-recovery-'));
  const tar = resolve(root, 'artifact.tar'),
    bytes = Buffer.from('original authored archive fixture');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  try {
    await writeFile(tar, bytes);
    expect(await verifyDemoArchive(root, sha256)).toEqual({
      tarSha256: sha256,
      bytes: bytes.length,
    });
    await expect(verifyDemoArchive(root, 'c'.repeat(64))).rejects.toThrow();
    expect(await readFile(tar)).toEqual(bytes);
    await writeFile(resolve(root, 'unexpected'), 'extra');
    await expect(verifyDemoArchive(root, sha256)).rejects.toThrow();
    await rm(resolve(root, 'unexpected'));
    await writeFile(tar, Buffer.alloc(0));
    await expect(verifyDemoArchive(root, sha256)).rejects.toThrow();
    await rm(tar);
    await symlink(tar, tar);
    await expect(verifyDemoArchive(root, sha256)).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
