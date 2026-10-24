import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { browserSmokeScopes, parseBrowserOptions } from './browser-options.js';

test('browser smoke accepts every actual scope and a compatible browser in either order', () => {
  expect(parseBrowserOptions([])).toEqual({
    browser: 'chrome',
    engine: 'chromium',
    scope: undefined,
  });
  for (const scope of browserSmokeScopes) {
    expect(parseBrowserOptions([scope]).scope).toBe(scope);
    expect(parseBrowserOptions([scope, '--browser=chrome'])).toEqual(
      parseBrowserOptions(['--browser=chrome', scope]),
    );
  }
  for (const browser of ['chrome', 'msedge', 'firefox', 'webkit'] as const) {
    const result = parseBrowserOptions([`--browser=${browser}`, '--locale-only']);
    expect(result.browser).toBe(browser);
    expect(result.engine).toBe(browser === 'chrome' || browser === 'msedge' ? 'chromium' : browser);
    expect(Object.isFrozen(result)).toBe(true);
  }
  const args = ['--touch-only'];
  parseBrowserOptions(args);
  expect(args).toEqual(['--touch-only']);
});

test('unknown, conflicting and incompatible options reject rather than selecting more or fewer checks', () => {
  for (const args of [
    ['--ink-only'],
    ['--lokale-only'],
    ['locale'],
    ['--help'],
    ['--browser'],
    ['--browser='],
    ['--browser=safari'],
    ['--browsers=chrome'],
    ['--browser=chrome', '--browser=chrome'],
    ['--locale-only', '--touch-only'],
    ['--locale-only', '--locale-only'],
    ['--browser=firefox', '--performance-only'],
    ['--browser=webkit', '--memory-only'],
    ['--browser=msedge', '--zoom-only'],
  ])
    expect(() => parseBrowserOptions(args)).toThrow();
  expect(parseBrowserOptions(['--browser=msedge', '--performance-only']).engine).toBe('chromium');
});

test('runner handles every registered scope and validates before creating resources', () => {
  const source = readFileSync(new URL('./browser-smoke.ts', import.meta.url), 'utf8');
  const branches = [...source.matchAll(/else if \(scope === '(--[\w-]+)'\)/g)].map(
    (match) => match[1]!,
  );
  expect(['--zoom-only', ...branches].sort()).toEqual([...browserSmokeScopes].sort());
  const validation = source.indexOf('parseBrowserOptions(process.argv.slice(2))');
  expect(validation).toBeGreaterThanOrEqual(0);
  expect(validation).toBeLessThan(source.indexOf('await releaseInput()'));
  expect(validation).toBeLessThan(source.indexOf('Bun.serve('));
});

test('retained release input remains owned by releaseInput, with path values kept opaque', () => {
  const expected = parseBrowserOptions(['--touch-only', '--browser=firefox']);
  for (const args of [
    ['--release-bundle', 'output/release with spaces', '--touch-only', '--browser=firefox'],
    ['--touch-only', '--release-bundle', 'output/release with spaces', '--browser=firefox'],
    ['--touch-only', '--browser=firefox', '--release-bundle', 'output/release with spaces'],
  ])
    expect(parseBrowserOptions(Object.freeze(args))).toEqual(expected);
  expect(parseBrowserOptions(['--release-bundle', 'output/saved']).scope).toBeUndefined();
  // Missing/duplicate release values still reach the existing structured usage check.
  for (const args of [
    ['--release-bundle'],
    ['--release-bundle', '--touch-only'],
    ['--release-bundle', 'one', '--release-bundle', 'two'],
  ])
    expect(() => parseBrowserOptions(args)).not.toThrow();
  expect(() => parseBrowserOptions(['--release-bundle', 'bundle', '--ink-only'])).toThrow();
  expect(() => parseBrowserOptions(['--release-bundle', 'bundle', 'extra'])).toThrow();
});

test('invalid browser selections and unsupported measurements fail before launching a browser', () => {
  for (const args of [
    ['--browser=unknown'],
    ['--browser='],
    ['--browser', 'firefox'],
    ['--browser=chrome', '--browser=firefox'],
    ['--browser=firefox', '--performance-only'],
    ['--browser=webkit', '--performance-only'],
    ['--browser=firefox', '--memory-only'],
    ['--browser=webkit', '--memory-only'],
    ['--browser=firefox', '--zoom-only'],
    ['--browser=webkit', '--zoom-only'],
    ['--browser=msedge', '--zoom-only'],
  ]) {
    const result = spawnSync(process.execPath, ['scripts/browser-smoke.ts', ...args], {
      encoding: 'utf8',
      timeout: 10_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      args.includes('--zoom-only')
        ? 'requires --browser=chrome'
        : args.some((arg) => ['--performance-only', '--memory-only'].includes(arg))
          ? 'requires a Chromium engine'
          : 'Use one --browser=',
    );
    expect(result.stdout).not.toContain('Browser engine:');
  }
});
