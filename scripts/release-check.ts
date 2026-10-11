import { spawn, spawnSync } from 'node:child_process';
import { ReleaseError } from './release-artifacts.js';

export async function runReleaseCheck(
  root: string,
  args: string[],
  label: string,
  milliseconds = 600_000,
) {
  if (!Number.isInteger(milliseconds) || milliseconds < 1 || milliseconds > 600_000)
    throw new ReleaseError('usage');
  process.stderr.write(`Release check: ${label}\n`);
  const child = spawn(process.execPath, args, {
    cwd: root,
    windowsHide: true,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.resume();
  child.stderr.resume(); // Drain without retaining raw logs/paths/content.
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
    if (process.platform === 'win32')
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
        timeout: 5000,
      });
    else {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    }
  }, milliseconds);
  try {
    await new Promise<void>((resolve, reject) => {
      child.once('error', () => reject(new ReleaseError('check')));
      child.once('close', (code) =>
        code === 0 && !expired ? resolve() : reject(new ReleaseError('check')),
      );
    });
  } finally {
    clearTimeout(timer);
    if (expired && (label === 'browser-bundle' || label === 'starter-archive') && child.pid) {
      const session =
        label === 'browser-bundle' ? `banora-smoke-${child.pid}` : `banora-starter-${child.pid}`;
      spawnSync(process.execPath, ['run', 'playwright-cli', `-s=${session}`, 'close'], {
        cwd: root,
        windowsHide: true,
        stdio: 'ignore',
        timeout: 10_000,
      });
    }
  }
}
