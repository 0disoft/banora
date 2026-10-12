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
  expect(planChecks(['scripts/browser-zoom.ts', 'scripts/zoom-scenario.js']).browser).toEqual([
    '--zoom-only',
  ]);
  expect(planChecks(['scripts/browser-zoom.ts', 'packages/sdk/src/controller.ts']).browser).toEqual(
    ['all'],
  );
  expect(
    commandsFor(
      planChecks([
        'scripts/registry-health.ts',
        'scripts/channel-plan.test.ts',
        'scripts/consumer-recovery.ts',
        'scripts/consumer-recovery.test.ts',
        'scripts/consumer-recovery-probe.js',
        'scripts/package-compatibility.test.ts',
      ]),
    ),
  ).toEqual([
    ['run', 'check'],
    ['run', 'security:files'],
  ]);
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
    planChecks([
      'scripts/browser-memory-scenario.js',
      'scripts/browser-memory.ts',
      'scripts/browser-memory.test.ts',
    ]).browser,
  ).toEqual(['--memory-only']);
  expect(commandsFor(planChecks(['scripts/browser-memory.ts']))).toContainEqual([
    'scripts/browser-smoke.ts',
    '--memory-only',
  ]);
  expect(
    planChecks(['scripts/browser-memory.ts', 'packages/sdk/src/controller.ts']).browser,
  ).toEqual(['all']);
  expect(planChecks(['scripts/demo-recovery.ts', 'scripts/demo-recovery.test.ts']).browser).toEqual(
    [],
  );
  expect(
    planChecks(['scripts/demo-health.ts', 'scripts/demo-archive.ts', 'scripts/demo-health.test.ts'])
      .browser,
  ).toEqual([]);
  expect(
    planChecks(['scripts/demo-recovery.ts', 'packages/sdk/src/controller.ts']).browser,
  ).toEqual(['all']);
  expect(
    planChecks([
      'scripts/demo-backup.ts',
      'scripts/demo-backup-contract.ts',
      'scripts/demo-backup.test.ts',
    ]).browser,
  ).toEqual([]);
  expect(planChecks(['scripts/demo-backup.ts', 'packages/sdk/src/controller.ts']).browser).toEqual([
    'all',
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
  expect(planChecks(['scripts/channel-plan.ts', 'scripts/channel-plan.test.ts']).browser).toEqual(
    [],
  );
  expect(planChecks(['scripts/channel-plan.ts', 'packages/sdk/src/controller.ts']).browser).toEqual(
    ['all'],
  );
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
test('manual Pages deployment confines reviewed write authority to deployment and original draft capture/restore', async () => {
  const path = '.github/workflows/pages.yml';
  type Job = {
    if: string;
    permissions?: Record<string, string>;
    steps: {
      name?: string;
      run?: string;
      if?: string;
      uses?: string;
      with?: Record<string, unknown>;
    }[];
  };
  const workflow = Bun.YAML.parse(await readFile(path, 'utf8')) as {
    on: Record<string, unknown>;
    jobs: {
      build: Job & { needs: string };
      restore: Job & { permissions: Record<string, string> };
      health: Job & { needs: string[]; permissions: Record<string, string> };
      archive: Job & { needs: string[]; permissions: Record<string, string> };
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
  expect(workflow.jobs.health.needs).toEqual(['build', 'deploy']);
  expect(workflow.jobs.health.if).toContain("needs.deploy.result == 'success'");
  expect(workflow.jobs.health.permissions).toEqual({ contents: 'read', actions: 'read' });
  expect(workflow.jobs.archive.permissions).toEqual({ contents: 'write', actions: 'read' });
  expect(workflow.jobs.archive.needs).toEqual(['build', 'health']);
  expect(workflow.jobs.archive.if).toContain("needs.health.result == 'success'");
  expect(workflow.jobs.archive.if).toContain("inputs.recovery_backup_release_id == ''");
  expect(workflow.jobs.build.permissions).toBeUndefined();
  expect(workflow.jobs.build.needs).toBe('restore');
  expect(workflow.jobs.build.if).toContain("needs.restore.result == 'skipped'");
  expect(workflow.jobs.restore.permissions).toEqual({ contents: 'write' });
  expect(workflow.jobs.restore.if).toContain("inputs.recovery_run_id == ''");
  expect(workflow.jobs.restore.if).toContain("inputs.recovery_tar_sha256 == ''");
  expect(
    workflow.jobs.health.steps.find((step) => step.uses === 'actions/download-artifact@v8')?.with?.[
      'artifact-ids'
    ],
  ).toBe('${{ needs.build.outputs.artifact_id }}');
  expect(
    workflow.jobs.health.steps.find(
      (step) => step.name === 'Preserve successful or failed live health receipt',
    )?.if,
  ).toBe('always()');
  const recoveryDownload = workflow.jobs.build.steps.find(
    (step) => step.uses === 'actions/download-artifact@v8',
  );
  expect(recoveryDownload?.if).toBe("inputs.recovery_run_id != ''");
  expect(recoveryDownload?.with?.['artifact-ids']).toBe(
    '${{ steps.recovery.outputs.artifact_id }}',
  );
  expect(recoveryDownload?.with?.['run-id']).toBe('${{ inputs.recovery_run_id }}');
  expect(recoveryDownload?.with?.repository).toBe('0disoft/banora');
  const originalUpload = workflow.jobs.build.steps.find(
    (step) => step.name === 'Retain original verified tar for deployment',
  );
  expect(originalUpload?.with?.path).toBe('.artifacts/demo-recovery/artifact.tar');
  expect(originalUpload?.with?.['retention-days']).toBe(14);
  expect(originalUpload?.if).toBe("inputs.recovery_run_id != ''");
  expect(workflow.jobs.build.steps.find((step) => step.name === 'Build static examples')?.if).toBe(
    "inputs.recovery_run_id == '' && inputs.recovery_backup_release_id == ''",
  );
  const durableRestore = workflow.jobs.restore.steps.find(
    (step) => step.name === 'Restore reviewed draft backup without original Actions access',
  );
  expect(durableRestore?.run).toContain('bun scripts/demo-backup.ts restore');
  const guard = workflow.jobs.build.steps.findIndex(
    (step) => step.name === 'Reject incomplete or conflicting recovery selection',
  );
  expect(guard).toBeGreaterThan(0);
  expect(guard).toBeLessThan(
    workflow.jobs.build.steps.findIndex((step) => step.name === 'Install reviewed dependencies'),
  );
  expect(workflow.jobs.build.steps[guard]?.run).toContain(
    'test -z "$BANORA_BACKUP_RELEASE$BANORA_BACKUP_MANIFEST"',
  );
  expect(
    workflow.jobs.restore.steps.find(
      (step) => step.name === 'Retain verified draft tar for deployment',
    )?.with?.path,
  ).toBe('${{ steps.backup.outputs.directory }}/artifact.tar');
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
    (copy: typeof workflow) => {
      copy.jobs.health.permissions['id-token'] = 'write';
    },
    (copy: typeof workflow) => {
      copy.jobs.health.needs = ['build'];
    },
    (copy: typeof workflow) => {
      copy.jobs.archive.permissions['id-token'] = 'write';
    },
    (copy: typeof workflow) => {
      copy.jobs.archive.if = 'true';
    },
    (copy: typeof workflow) => {
      copy.jobs.restore.steps.find(
        (step) => step.name === 'Restore reviewed draft backup without original Actions access',
      )!.run = 'npm publish';
    },
    (copy: typeof workflow) => {
      copy.jobs.health.steps.find((step) => step.uses === 'actions/download-artifact@v8')!.with![
        'artifact-ids'
      ] = 'other';
    },
    (copy: typeof workflow) => {
      copy.jobs.build.steps.find((step) => step.uses === 'actions/download-artifact@v8')!.with![
        'run-id'
      ] = 'other';
    },
    (copy: typeof workflow) => {
      copy.jobs.build.steps.find(
        (step) => step.name === 'Verify original tar bytes without extraction',
      )!.if = 'false';
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
