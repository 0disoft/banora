import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import type { EventEmitter } from 'node:events';
import type { Readable } from 'node:stream';
import { ReleaseError } from './release-artifacts.js';

type CheckChild = EventEmitter &
  Pick<ChildProcess, 'pid' | 'exitCode' | 'signalCode' | 'unref'> & {
    stdout: Readable;
    stderr: Readable;
  };
interface CheckOptions {
  signal?: AbortSignal;
  confirmationMs?: number;
  start?: (root: string, args: string[]) => CheckChild;
  terminate?: (child: CheckChild) => void;
  closeBrowser?: (root: string, session: string) => void;
}
const ignoreLateError = () => {};

/** Fixed public message; raw causes remain non-enumerable, for trusted local inspection only. */
export class ReleaseCheckError extends ReleaseError {
  constructor(
    readonly stage: 'spawn' | 'execution' | 'timeout' | 'cancelled' | 'termination-unconfirmed',
    cause?: unknown,
  ) {
    super('check');
    if (cause !== undefined) Object.defineProperty(this, 'cause', { value: cause });
  }
}

function start(root: string, args: string[]): CheckChild {
  return spawn(process.execPath, args, {
    cwd: root,
    windowsHide: true,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
function terminate(child: CheckChild) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    const result = spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
      timeout: 5000,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error('Release check termination failed.');
  } else process.kill(-child.pid, 'SIGKILL');
}
function closeBrowser(root: string, session: string) {
  spawnSync(process.execPath, ['run', 'playwright-cli', `-s=${session}`, 'close'], {
    cwd: root,
    windowsHide: true,
    stdio: 'ignore',
    timeout: 10_000,
  });
}

export async function runReleaseCheck(
  root: string,
  args: string[],
  label: string,
  milliseconds = 600_000,
  options: CheckOptions = {},
) {
  const confirmationMs = options.confirmationMs ?? 1000;
  if (
    !Number.isInteger(milliseconds) ||
    milliseconds < 1 ||
    milliseconds > 600_000 ||
    !Number.isInteger(confirmationMs) ||
    confirmationMs < 1 ||
    confirmationMs > 5000
  )
    throw new ReleaseError('usage');
  if (options.signal?.aborted) throw new ReleaseCheckError('cancelled', options.signal.reason);
  process.stderr.write(`Release check: ${label}\n`);
  let child: CheckChild;
  try {
    child = (options.start ?? start)(root, args);
  } catch (cause) {
    throw new ReleaseCheckError('spawn', cause);
  }
  let stopping: 'timeout' | 'cancelled' | 'execution' | undefined;
  let stopCause: unknown;
  let confirmation: ReturnType<typeof setTimeout> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let settled = false;
  let onError: (error: Error) => void;
  let onClose: (code: number | null) => void;
  let onExit: () => void;
  let onAbort: () => void;
  try {
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: ReleaseCheckError) => {
        if (settled) return;
        settled = true;
        if (error) reject(error);
        else resolve();
      };
      const stop = (reason: 'timeout' | 'cancelled' | 'execution', cause?: unknown) => {
        if (settled || stopping) return;
        stopping = reason;
        stopCause = cause;
        confirmation = setTimeout(() => {
          child.unref();
          finish(new ReleaseCheckError('termination-unconfirmed', stopCause));
        }, confirmationMs);
        try {
          (options.terminate ?? terminate)(child);
        } catch (error) {
          stopCause ??= error;
        }
        if (child.exitCode !== null || child.signalCode !== null)
          finish(new ReleaseCheckError(reason, stopCause));
      };
      onError = (cause) => {
        if (settled) return;
        if (stopping) {
          stopCause ??= cause;
          return;
        }
        if (!child.pid) finish(new ReleaseCheckError('spawn', cause));
        else stop('execution', cause);
      };
      onClose = (code) =>
        finish(
          stopping
            ? new ReleaseCheckError(stopping, stopCause)
            : code === 0
              ? undefined
              : new ReleaseCheckError('execution'),
        );
      onExit = () => {
        if (stopping) finish(new ReleaseCheckError(stopping, stopCause));
      };
      onAbort = () => stop('cancelled', options.signal?.reason);
      child.on('error', onError);
      child.on('close', onClose);
      child.on('exit', onExit);
      child.stdout.on('error', onError);
      child.stderr.on('error', onError);
      options.signal?.addEventListener('abort', onAbort, { once: true });
      timer = setTimeout(() => stop('timeout'), milliseconds);
      child.stdout.resume();
      child.stderr.resume(); // Drain without retaining raw logs/paths/content.
      if (options.signal?.aborted) onAbort();
    });
  } finally {
    clearTimeout(timer);
    clearTimeout(confirmation);
    options.signal?.removeEventListener('abort', onAbort!);
    child.removeListener('close', onClose!);
    child.removeListener('exit', onExit!);
    // Inert after settlement: late stream/process errors must not become uncaught.
    const emitters: EventEmitter[] = [child, child.stdout, child.stderr];
    for (const emitter of emitters) {
      emitter.removeListener('error', onError!);
      emitter.on('error', ignoreLateError);
    }
    child.stdout.destroy();
    child.stderr.destroy();
    if (stopping && (label === 'browser-bundle' || label === 'starter-archive') && child.pid) {
      const session =
        label === 'browser-bundle' ? `banora-smoke-${child.pid}` : `banora-starter-${child.pid}`;
      try {
        (options.closeBrowser ?? closeBrowser)(root, session);
      } catch {
        /* Best-effort cleanup must not replace the primary failure. */
      }
    }
  }
}
