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
