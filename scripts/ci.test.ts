import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { planChecks, commandsFor, changedPaths } from './ci.js';
import { secretSignals, workflowSignals } from './security.js';
import metadata from '../package.json';

test('CI routes documentation cheaply, combines focused changes and falls back safely for unknown or missing diffs', () => {
  expect(planChecks(['README.md', 'docs/sdk/public-api.md']).mode).toBe('docs');
  expect(commandsFor(planChecks(['README.md'])).some((command) => command.includes('check'))).toBe(
    false,
  );
  expect(
    planChecks(['packages/sdk/src/analysis.ts', 'packages/sdk/src/playback.ts']).browser,
  ).toEqual(['--analysis-only', '--playback-only']);
  expect(planChecks(['packages/sdk/src/controller.ts']).browser).toEqual(['all']);
  expect(planChecks(['scripts/tree-navigation-scenario.js']).browser).toEqual(['--tree-only']);
  expect(planChecks(['scripts/browser-performance-scenario.js']).browser).toEqual([
    '--performance-only',
  ]);
  expect(commandsFor(planChecks(['scripts/browser-performance-scenario.js']))).toContainEqual([
    'scripts/browser-smoke.ts',
    '--performance-only',
  ]);
  expect(planChecks(['scripts/accessibility-scenario.js']).browser).toEqual([
    '--accessibility-only',
  ]);
  expect(
    planChecks(['examples/studio/diagnostics.ts', 'scripts/support-scenario.js']).browser,
  ).toEqual(['--support-only']);
  expect(
    planChecks(['examples/studio/search-controls.ts', 'scripts/search-scenario.js']).browser,
  ).toEqual(['--search-only']);
  expect(
    planChecks([
      'examples/studio/preferences.ts',
      'examples/studio/preference-controls.ts',
      'scripts/preferences-scenario.js',
    ]).browser,
  ).toEqual(['--preferences-only']);
  expect(
    planChecks(['examples/studio/draft-store.ts', 'scripts/recovery-scenario.js']).browser,
  ).toEqual(['--recovery-only']);
  expect(
    planChecks(['examples/studio/recovery-controls.ts', 'examples/ui-korean.ts']).browser,
  ).toEqual(['--locale-only', '--recovery-only']);
  expect(planChecks(['packages/vue/src/index.ts']).adapters).toBe(true);
  expect(planChecks(['scripts/operations.ts', 'scripts/operations.test.ts']).browser).toEqual([]);
  expect(planChecks(['scripts/performance.ts', 'scripts/performance.test.ts']).browser).toEqual([]);
  expect(planChecks(['scripts/starter-scenario.js'])).toMatchObject({ starter: true, browser: [] });
  expect(planChecks(['scripts/packed-adapters.ts'])).toMatchObject({ adapters: true, browser: [] });
  expect(planChecks(['.github/workflows/ci.yml'])).toMatchObject({
    adapters: true,
    starter: true,
    browser: ['all'],
  });
  expect(planChecks(['bun.lock'])).toMatchObject({
    audit: true,
    starter: true,
    adapters: true,
    browser: ['all'],
  });
  expect(planChecks(null).browser).toEqual(['all']);
  expect(planChecks([]).browser).toEqual(['all']);
  expect(changedPaths('--invalid-option')).toBe(null);
  expect(changedPaths('0000000000000000000000000000000000000000')).toBe(null);
  for (const paths of [null, ['README.md'], ['packages/sdk/src/analysis.ts'], ['bun.lock']])
    for (const command of commandsFor(planChecks(paths)))
      if (command[0] === 'run') expect(Object.hasOwn(metadata.scripts, command[1]!)).toBe(true);
});

test('manual candidate preparation keeps read-only authority and selects code verification without hiding mixed runtime changes', async () => {
  const path = '.github/workflows/prepare-release.yml';
  const isolated = planChecks([path, 'scripts/release.ts', 'scripts/publication-plan.ts']);
  expect(isolated).toEqual({
    mode: 'code',
    browser: [],
    adapters: false,
    starter: false,
    audit: false,
  });
  expect(commandsFor(isolated)).toContainEqual(['run', 'check']);
  expect(commandsFor(isolated)).toContainEqual(['run', 'security:files']);
  expect(planChecks([path, 'packages/sdk/src/controller.ts']).browser).toEqual(['all']);
  expect(planChecks([path, 'packages/sdk/package.json']).audit).toBe(true);
  expect(planChecks(['.github/workflows/unknown.yml']).browser).toEqual(['all']);
  const workflow = Bun.YAML.parse(await readFile(path, 'utf8')) as {
    on: Record<string, unknown>;
    jobs: {
      prepare: {
        if: string;
        'timeout-minutes': number;
        steps: { run?: string; uses?: string; with?: Record<string, unknown> }[];
      };
    };
  };
  expect(Object.keys(workflow.on)).toEqual(['workflow_dispatch']);
  expect(workflowSignals(workflow)).toEqual([]);
  const job = workflow.jobs.prepare;
  expect(job.if).toContain("github.ref == 'refs/heads/main'");
  expect(job['timeout-minutes']).toBeLessThanOrEqual(20);
  expect(job.steps.some((step: { run?: string }) => step.run === 'bun run release prepare')).toBe(
    true,
  );
  const upload = job.steps.find(
    (step: { uses?: string }) => step.uses === 'actions/upload-artifact@v7',
  );
  expect(upload?.with?.path).toBe('.artifacts/releases/${{ github.sha }}/');
  expect(upload?.with?.overwrite).toBe(false);
  expect(upload?.with?.['retention-days']).toBe(14);
  expect(upload?.with?.['if-no-files-found']).toBe('error');
});
test('manual Pages deployment confines reviewed write authority to the deployment job', async () => {
  const path = '.github/workflows/pages.yml';
  type Job = { if: string; permissions?: Record<string, string>; steps: { run?: string }[] };
  const workflow = Bun.YAML.parse(await readFile(path, 'utf8')) as {
    on: Record<string, unknown>;
    jobs: {
      build: Job;
      deploy: Job & {
        needs: string;
        environment: { name: string };
        permissions: Record<string, string>;
      };
    };
  };
  expect(workflowSignals(workflow, path)).toEqual([]);
  expect(Object.keys(workflow.on)).toEqual(['workflow_dispatch']);
  expect(workflow.jobs.deploy.needs).toBe('build');
  expect(workflow.jobs.deploy.environment.name).toBe('github-pages');
  expect(
    workflow.jobs.build.steps.some(
      (step: { run?: string }) => step.run === 'bun run build:examples',
    ),
  ).toBe(true);
  expect(planChecks([path])).toEqual({
    mode: 'code',
    browser: [],
    adapters: false,
    starter: false,
    audit: false,
  });
  expect(planChecks([path, 'packages/sdk/src/controller.ts']).browser).toEqual(['all']);
  expect(workflowSignals(workflow, '.github/workflows/other.yml')).toContain(
    'write workflow permission requires a reviewed policy change',
  );
  for (const mutate of [
    (copy: typeof workflow) => {
      copy.jobs.deploy.permissions.contents = 'write';
    },
    (copy: typeof workflow) => {
      copy.jobs.build.permissions = { 'id-token': 'write' };
    },
    (copy: typeof workflow) => {
      copy.jobs.deploy.if = 'true';
    },
    (copy: typeof workflow) => {
      copy.jobs.deploy.environment.name = 'npm-release';
    },
    (copy: typeof workflow) => {
      copy.on.push = {};
    },
    (copy: typeof workflow) => {
      copy.jobs.deploy.steps.push({ run: 'npm publish' });
    },
  ]) {
    const copy = structuredClone(workflow);
    mutate(copy);
    expect(workflowSignals(copy, path)).toContain('Pages workflow differs from reviewed policy');
  }
});

test('security signals identify credential headers/files and dangerous workflow permissions without returning content', async () => {
  expect(secretSignals('.env', 'plain setting')).toEqual(['private configuration file']);
  expect(secretSignals('.env.example', 'PUBLIC_URL=http://127.0.0.1')).toBeEmpty();
  expect(secretSignals('example.txt', ['-----BEGIN', 'PRIVATE KEY-----'].join(' '))).toEqual([
    'private key marker',
  ]);
  expect(secretSignals('.npmrc', '//registry.npmjs.org/:_authToken=${NPM_TOKEN}')).toBeEmpty();
  expect(workflowSignals({ on: 'pull_request_target', permissions: 'write-all' })).toHaveLength(2);
  expect(
    workflowSignals({
      on: { pull_request: {} },
      permissions: { contents: 'read' },
      jobs: { check: { permissions: { contents: 'write' } } },
    }),
  ).toContain('write workflow permission requires a reviewed policy change');
  const workflow = Bun.YAML.parse(await readFile('.github/workflows/ci.yml', 'utf8'));
  expect(workflowSignals(workflow)).toBeEmpty();
  expect(
    workflowSignals({
      on: 'push',
      permissions: { contents: 'read' },
      env: { AUTH: '${{ secrets.AUTH }}' },
    }),
  ).toContain('secret injection requires a reviewed workflow policy change');
});
