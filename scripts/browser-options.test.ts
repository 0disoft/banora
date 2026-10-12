import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';

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
  ]) {
    const result = spawnSync(process.execPath, ['scripts/browser-smoke.ts', ...args], {
      encoding: 'utf8',
      timeout: 10_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      args.some((arg) => ['--performance-only', '--memory-only'].includes(arg))
        ? 'requires a Chromium engine'
        : 'Use one --browser=',
    );
    expect(result.stdout).not.toContain('Browser engine:');
  }
});
