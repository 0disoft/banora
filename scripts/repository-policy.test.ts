import { expect, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, symlink, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { clean, supportedVersion } from './development.js';
import { inspectSource } from './repository-policy.js';

test('source boundary gate rejects static, dynamic, CommonJS and indirect renderer dependencies', () => {
  for (const code of [
    "import { mountBoard } from './board.js'; export { mountBoard };",
    "export * from './viewer.js';",
    "export const load = () => import('./analysis-view.js');",
    "export const renderer = require('./board-surface.js');",
    "export const engine = require('node:child_process');",
    "import React from 'react'; export { React };",
  ])
    expect(inspectSource('packages/sdk/src/controller.ts', code).errors.length).toBeGreaterThan(0);
  expect(
    inspectSource('packages/sdk/src/core.ts', "export * from './controller.js';").errors,
  ).not.toBeEmpty();
  expect(
    inspectSource('packages/sdk/src/new-module.ts', 'export const answer = 1;').errors,
  ).not.toBeEmpty();
  expect(
    inspectSource('packages/sdk/src/hidden/browser.ts', 'export const answer = 1;').errors,
  ).not.toBeEmpty();
  expect(
    inspectSource(
      'packages/sdk/src/controller.ts',
      "// import('./board.js')\nexport * from './sgf.js';",
    ).errors,
  ).toBeEmpty();
  expect(
    inspectSource(
      'packages/cli/src/main.ts',
      "#!/usr/bin/env node\nexport * from '@banora/sdk/automation';",
    ).errors,
  ).toBeEmpty();
});
test('consumer gate rejects SDK source bypass and unrelated frameworks; size is a review candidate', () => {
  for (const [file, source] of [
    ['examples/studio/main.ts', "export * from '../../packages/sdk/src/controller.ts';"],
    ['packages/react/src/index.ts', "export * from '@banora/sdk/dist/core.js';"],
    ['packages/vue/src/index.ts', "export * from 'react';"],
    [
      'packages/svelte/src/Board.svelte',
      '<script lang="ts">import { h } from "vue"; export { h };</script>',
    ],
  ])
    expect(inspectSource(file!, source!).errors).not.toBeEmpty();
  expect(
    inspectSource(
      'packages/react/src/index.ts',
      "export * from '@banora/sdk/board'; export * from 'react';",
    ).errors,
  ).toBeEmpty();
  const large = inspectSource('scripts/large.ts', `// ${'x'.repeat(41 * 1024)}\n`);
  expect(large.errors).toBeEmpty();
  expect(large.warnings).toHaveLength(1);
});
test('tool majors accept stable updates and reject a different major, prerelease or unbounded alias', () => {
  for (const version of ['24.0.0', 'v24.14.0', '24.99.1\n'])
    expect(supportedVersion(version, 24)).toBe(true);
  for (const version of ['23.9.0', '25.0.0', '24.0.0-rc.1', 'latest', '24'])
    expect(supportedVersion(version, 24)).toBe(false);
});
test('cleanup previews only artifacts and validates linked targets before any deletion', async () => {
  await mkdir(join(process.cwd(), '.tmp'), { recursive: true });
  const root = await mkdtemp(join(process.cwd(), '.tmp/cleanup-')),
    outside = await mkdtemp(join(process.cwd(), '.tmp/cleanup-outside-'));
  try {
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'banora-workspace' }));
    await mkdir(join(root, 'dist'));
    await writeFile(join(root, 'dist/artifact.txt'), 'generated');
    await writeFile(join(root, 'record.sgf'), '(;SZ[9])');
    await mkdir(join(root, 'node_modules'));
    expect(await clean(root, false)).toEqual(['dist']);
    expect(await readFile(join(root, 'dist/artifact.txt'), 'utf8')).toBe('generated');
    await symlink(outside, join(root, '.cache'), process.platform === 'win32' ? 'junction' : 'dir');
    await expect(clean(root, true)).rejects.toThrow('linked artifact');
    expect(await readFile(join(root, 'dist/artifact.txt'), 'utf8')).toBe('generated');
    await rm(join(root, '.cache'));
    expect(await clean(root, true)).toEqual(['dist']);
    expect(await readFile(join(root, 'record.sgf'), 'utf8')).toBe('(;SZ[9])');
    expect(await Bun.file(join(root, 'dist/artifact.txt')).exists()).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
