import { appendFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { parsePublicationRequest } from './publication.js';

/** Read-only Actions metadata binding. No download or npm authority is supplied here. */
export function candidateRequest(env: NodeJS.ProcessEnv = process.env) {
  const runId = env.BANORA_PREPARE_RUN_ID;
  if (!runId || !/^[1-9]\d{0,19}$/.test(runId)) throw Error('Invalid preparation run ID.');
  const request = parsePublicationRequest([
    '--bundle',
    '.artifacts/publication',
    '--manifest-sha256',
    env.BANORA_APPROVED_MANIFEST ?? '',
    '--source-commit',
    env.BANORA_APPROVED_SOURCE ?? '',
    '--tag',
    env.BANORA_APPROVED_TAG ?? '',
  ]);
  if (
    env.GITHUB_REPOSITORY !== '0disoft/banora' ||
    env.GITHUB_REF !== 'refs/heads/main' ||
    env.GITHUB_SHA !== request.sourceCommit ||
    env.GITHUB_EVENT_NAME !== 'workflow_dispatch'
  )
    throw Error('Preparation source must equal this manual main checkout.');
  const execute = env.BANORA_EXECUTE ?? 'false';
  if (
    !['true', 'false'].includes(execute) ||
    (execute === 'true' && env.BANORA_REPOSITORY_PUBLIC !== 'true')
  )
    throw Error('Explicit publication requires public source.');
  return { runId, sourceCommit: request.sourceCommit, execute: execute === 'true' };
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
export function validatePublicationEnvironment(value: unknown): void {
  if (
    !object(value) ||
    value.name !== 'npm-release' ||
    !Array.isArray(value.protection_rules) ||
    !value.protection_rules.some(
      (rule) =>
        object(rule) &&
        rule.type === 'required_reviewers' &&
        Array.isArray(rule.reviewers) &&
        rule.reviewers.length > 0 &&
        rule.reviewers.every(
          (reviewer) =>
            object(reviewer) &&
            ['User', 'Team'].includes(String(reviewer.type)) &&
            object(reviewer.reviewer) &&
            Number.isSafeInteger(reviewer.reviewer.id) &&
            Number(reviewer.reviewer.id) > 0,
        ),
    )
  )
    throw Error('npm-release must already have an actual required reviewer.');
}
export function validateCandidate(
  request: ReturnType<typeof candidateRequest>,
  run: unknown,
  listing: unknown,
  now = Date.now(),
) {
  if (
    !object(run) ||
    String(run.id) !== request.runId ||
    run.status !== 'completed' ||
    run.conclusion !== 'success' ||
    run.path !== '.github/workflows/prepare-release.yml' ||
    run.event !== 'workflow_dispatch' ||
    run.head_branch !== 'main' ||
    run.head_sha !== request.sourceCommit ||
    !Number.isSafeInteger(run.run_attempt) ||
    Number(run.run_attempt) < 1 ||
    !object(run.repository) ||
    run.repository.full_name !== '0disoft/banora' ||
    !object(run.head_repository) ||
    run.head_repository.full_name !== '0disoft/banora'
  )
    throw Error('Preparation run is not a successful matching main candidate.');
  if (
    !object(listing) ||
    listing.total_count !== 1 ||
    !Array.isArray(listing.artifacts) ||
    listing.artifacts.length !== 1 ||
    !object(listing.artifacts[0])
  )
    throw Error('Preparation must retain exactly one immutable candidate.');
  const artifact = listing.artifacts[0];
  if (
    !Number.isSafeInteger(artifact.id) ||
    Number(artifact.id) < 1 ||
    artifact.name !==
      `banora-candidate-${request.sourceCommit}-${request.runId}-${run.run_attempt}` ||
    artifact.expired !== false ||
    typeof artifact.expires_at !== 'string' ||
    !Number.isFinite(Date.parse(artifact.expires_at)) ||
    Date.parse(artifact.expires_at) <= now ||
    !Number.isSafeInteger(artifact.size_in_bytes) ||
    Number(artifact.size_in_bytes) < 1 ||
    Number(artifact.size_in_bytes) > 128 * 1024 * 1024 ||
    typeof artifact.digest !== 'string' ||
    !/^sha256:[a-f0-9]{64}$/.test(artifact.digest) ||
    !object(artifact.workflow_run) ||
    String(artifact.workflow_run.id) !== request.runId ||
    artifact.workflow_run.head_sha !== request.sourceCommit
  )
    throw Error('Candidate artifact identity, digest or retention is invalid.');
  return {
    artifactId: String(artifact.id),
    archiveDigest: artifact.digest,
    sourceCommit: request.sourceCommit,
  };
}
if (import.meta.main) {
  try {
    const request = candidateRequest();
    const checkout = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', timeout: 5000 });
    if (checkout.status !== 0 || checkout.stdout.trim() !== request.sourceCommit)
      throw Error('Checkout source differs from reviewed preparation.');
    const read = (endpoint: string) => {
      const result = spawnSync('gh', ['api', `repos/0disoft/banora/${endpoint}`], {
        encoding: 'utf8',
        timeout: 30_000,
        maxBuffer: 1024 * 1024,
        shell: false,
        windowsHide: true,
      });
      if (result.status !== 0) throw Error('Actions candidate metadata is unavailable.');
      return JSON.parse(result.stdout) as unknown;
    };
    if (request.execute) validatePublicationEnvironment(read('environments/npm-release'));
    const runPath = `actions/runs/${request.runId}`;
    const candidate = validateCandidate(
      request,
      read(runPath),
      read(runPath + '/artifacts?per_page=2'),
    );
    if (!process.env.GITHUB_OUTPUT) throw Error('Missing Actions output destination.');
    await appendFile(process.env.GITHUB_OUTPUT, `artifact_id=${candidate.artifactId}\n`);
    console.log(
      JSON.stringify({ schemaVersion: 'banora.publication-candidate/v1', ok: true, ...candidate }),
    );
  } catch {
    // Keep arbitrary registry/provider/source text out of diagnostics.
    console.log(
      JSON.stringify({
        schemaVersion: 'banora.publication-candidate/v1',
        ok: false,
        code: 'candidate-unavailable',
      }),
    );
    process.exitCode = 1;
  }
}
