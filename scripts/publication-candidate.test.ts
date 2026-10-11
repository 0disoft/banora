import { expect, test } from 'bun:test';
import {
  candidateRequest,
  validateCandidate,
  validatePublicationEnvironment,
} from './publication-candidate.js';
import { workflowSignals } from './security.js';
import { planChecks } from './ci.js';

const sourceCommit = 'a'.repeat(40),
  manifestSha256 = 'b'.repeat(64);
const environment = {
  BANORA_PREPARE_RUN_ID: '42',
  BANORA_APPROVED_SOURCE: sourceCommit,
  BANORA_APPROVED_MANIFEST: manifestSha256,
  BANORA_APPROVED_TAG: 'dev',
  GITHUB_REPOSITORY: '0disoft/banora',
  GITHUB_REF: 'refs/heads/main',
  GITHUB_SHA: sourceCommit,
  GITHUB_EVENT_NAME: 'workflow_dispatch',
};
function fixture() {
  return {
    run: {
      id: 42,
      status: 'completed',
      conclusion: 'success',
      path: '.github/workflows/prepare-release.yml',
      event: 'workflow_dispatch',
      head_branch: 'main',
      head_sha: sourceCommit,
      run_attempt: 1,
      repository: { full_name: '0disoft/banora' },
      head_repository: { full_name: '0disoft/banora' },
    },
    listing: {
      total_count: 1,
      artifacts: [
        {
          id: 51,
          name: `banora-candidate-${sourceCommit}-42-1`,
          expired: false,
          expires_at: '2099-01-01T00:00:00Z',
          size_in_bytes: 100,
          digest: 'sha256:' + 'c'.repeat(64),
          workflow_run: { id: 42, head_sha: sourceCommit },
        },
      ],
    },
  };
}
test('manual candidate input refuses stale sources and provider metadata refuses wrong, failed or expired artifacts', () => {
  const request = candidateRequest(environment),
    { run, listing } = fixture();
  expect(validateCandidate(request, run, listing)).toEqual({
    artifactId: '51',
    archiveDigest: 'sha256:' + 'c'.repeat(64),
    sourceCommit,
  });
  for (const change of [
    { BANORA_PREPARE_RUN_ID: '../42' },
    { BANORA_PREPARE_RUN_ID: '--help' },
    { BANORA_APPROVED_SOURCE: 'c'.repeat(40) },
    { BANORA_APPROVED_MANIFEST: 'INVALID' },
    { GITHUB_REF: 'refs/heads/feature' },
    { GITHUB_EVENT_NAME: 'pull_request' },
    { GITHUB_REPOSITORY: 'someone/banora' },
  ])
    expect(() => candidateRequest({ ...environment, ...change })).toThrow();
  for (const change of [
    { status: 'in_progress' },
    { conclusion: 'failure' },
    { path: '.github/workflows/ci.yml' },
    { head_sha: 'd'.repeat(40) },
    { run_attempt: 2 },
    { head_repository: { full_name: 'someone/banora' } },
    { event: 'push' },
    { head_branch: 'feature' },
    { id: 43 },
  ])
    expect(() => validateCandidate(request, { ...run, ...change }, listing)).toThrow();
  for (const change of [
    { expired: true },
    { expires_at: '2020-01-01T00:00:00Z' },
    { expires_at: 'invalid' },
    { name: 'unreviewed-candidate' },
    { digest: 'INVALID' },
    { id: -1 },
    { size_in_bytes: 0 },
    { size_in_bytes: 129 * 1024 * 1024 },
    { workflow_run: { id: 43, head_sha: sourceCommit } },
  ])
    expect(() =>
      validateCandidate(request, run, {
        ...listing,
        artifacts: [{ ...listing.artifacts[0], ...change }],
      }),
    ).toThrow();
  expect(() =>
    validateCandidate(request, run, { total_count: 2, artifacts: listing.artifacts }),
  ).toThrow();
  expect(() => validateCandidate(request, run, { total_count: 0, artifacts: [] })).toThrow();
});

test('explicit publication refuses private source and an absent or unprotected approval environment', () => {
  expect(() => candidateRequest({ ...environment, BANORA_EXECUTE: 'true' })).toThrow();
  expect(() => candidateRequest({ ...environment, BANORA_EXECUTE: 'yes' })).toThrow();
  expect(
    candidateRequest({ ...environment, BANORA_EXECUTE: 'true', BANORA_REPOSITORY_PUBLIC: 'true' })
      .execute,
  ).toBe(true);
  // Authored provider-response fixture only; no actual account or reviewer is configured by a test.
  const protectedEnvironment = {
    name: 'npm-release',
    protection_rules: [
      {
        type: 'required_reviewers',
        prevent_self_review: false,
        reviewers: [{ type: 'User', reviewer: { id: 7 } }],
      },
    ],
  };
  expect(() => validatePublicationEnvironment(protectedEnvironment)).not.toThrow();
  for (const value of [
    undefined,
    {},
    { name: 'npm-release', protection_rules: [] },
    { ...protectedEnvironment, name: 'unprotected' },
    { name: 'npm-release', protection_rules: [{ type: 'required_reviewers', reviewers: [] }] },
    {
      name: 'npm-release',
      protection_rules: [
        { type: 'required_reviewers', reviewers: [{ type: 'User', reviewer: { id: -1 } }] },
      ],
    },
    { name: 'npm-release', protection_rules: [{ type: 'wait_timer', wait_timer: 30 }] },
  ])
    expect(() => validatePublicationEnvironment(value)).toThrow();
});

interface Step {
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
  env?: Record<string, string>;
}
interface Workflow {
  on: { workflow_dispatch: { inputs: Record<string, { default?: unknown; type: string }> } };
  permissions: Record<string, string>;
  env: Record<string, string>;
  jobs: Record<
    string,
    {
      if: string;
      environment?: string;
      permissions?: Record<string, string>;
      needs?: string | string[];
      'runs-on': string;
      steps: Step[];
    }
  >;
}
test('only the fully reviewed manual publication workflow receives job-scoped OIDC and drift fails closed', async () => {
  const path = '.github/workflows/publish.yml';
  const workflow = Bun.YAML.parse(await Bun.file(path).text()) as Workflow;
  expect(workflowSignals(workflow, path)).toEqual([]);
  expect(workflowSignals(workflow)).toContain(
    'write workflow permission requires a reviewed policy change',
  );
  expect(workflowSignals(workflow, '.github/workflows/other.yml')).toContain(
    'write workflow permission requires a reviewed policy change',
  );
  expect(Object.keys(workflow.on)).toEqual(['workflow_dispatch']);
  expect(workflow.on.workflow_dispatch.inputs.execute?.default).toBe(false);
  expect(workflow.jobs.preview?.permissions?.['id-token']).toBeUndefined();
  expect(workflow.jobs.publish?.environment).toBe('npm-release');
  expect(workflow.jobs.health?.permissions).toEqual({ contents: 'read', actions: 'read' });
  expect(workflow.jobs.health?.needs).toEqual(['preview', 'publish']);
  expect(workflow.jobs.health?.if).toContain("needs.publish.result == 'success'");
  const healthCommand = workflow.jobs.health?.steps.find((step) =>
    step.run?.includes('registry-check'),
  )?.run;
  expect(healthCommand).toContain('--manifest-sha256 "$BANORA_APPROVED_MANIFEST"');
  expect(healthCommand).not.toContain('--execute');
  const changes: ((value: Workflow) => void)[] = [
    (value) => {
      value.jobs.health!.permissions!['id-token'] = 'write';
    },
    (value) => {
      value.jobs.health!.if = 'always()';
    },
    (value) => {
      value.on.workflow_dispatch.inputs.execute!.default = true;
    },
    (value) => {
      value.jobs.publish!.if = 'always()';
    },
    (value) => {
      value.jobs.publish!.environment = 'unprotected';
    },
    (value) => {
      value.jobs.publish!['runs-on'] = 'self-hosted';
    },
    (value) => {
      value.permissions['id-token'] = 'write';
    },
    (value) => {
      value.jobs.preview!.permissions = { 'id-token': 'write' };
    },
    (value) => {
      value.jobs.publish!.steps.push({ run: 'npm publish --access public' });
    },
    (value) => {
      value.jobs.publish!.steps[0]!.with!['persist-credentials'] = true;
    },
    (value) => {
      value.jobs.publish!.permissions!.contents = 'write';
    },
    (value) => {
      value.env.BANORA_APPROVED_SOURCE = '${{ github.sha }}';
    },
    (value) => {
      value.jobs.publish!.steps[3]!.with!['run-id'] = '43';
    },
  ];
  for (const change of changes) {
    const edited = structuredClone(workflow);
    change(edited);
    expect(workflowSignals(edited, path)).toContain(
      'publication workflow differs from reviewed policy',
    );
    expect(workflowSignals(edited, path)).toContain(
      'write workflow permission requires a reviewed policy change',
    );
  }
  expect(planChecks([path, 'scripts/publication-candidate.ts'])).toEqual({
    mode: 'code',
    browser: [],
    adapters: false,
    starter: false,
    audit: false,
  });
  expect(planChecks([path, 'packages/sdk/src/controller.ts']).browser).toEqual(['all']);
  expect(planChecks([path, 'bun.lock']).audit).toBe(true);
});
