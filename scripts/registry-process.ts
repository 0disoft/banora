import { spawn, type SpawnOptions } from 'node:child_process';

/** Only fixed diagnostics escape this private process boundary. */
export class RegistryReadError extends Error {
  constructor(
    readonly code: 'cancelled' | 'timeout' | 'output' | 'spawn' | 'unconfirmed' | 'busy',
  ) {
    super(`Registry read: ${code}.`);
  }
}

function start(
  command: string,
  args: readonly string[],
  options: Pick<SpawnOptions, 'cwd' | 'env'>,
) {
  try {
    return spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new RegistryReadError('spawn');
  }
}

/** Bounded output, force deadline and independent exit confirmation; never a shell. */
export function registryReadProcess(
  command: string,
  args: readonly string[],
  options: Pick<SpawnOptions, 'cwd' | 'env'> & { signal?: AbortSignal; timeoutMs?: number },
) {
  const timeoutMs = options.timeoutMs ?? 30_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000)
    return Promise.reject(new RegistryReadError('timeout'));
  if (options.signal?.aborted) return Promise.reject(new RegistryReadError('cancelled'));
  return new Promise<{ status: number | null; stdout: string }>((resolve, reject) => {
    const child = start(command, args, options);
    let chunks: Buffer[] = [];
    let outBytes = 0,
      errBytes = 0;
    let stopped: RegistryReadError | undefined;
    let settled = false;
    let confirmation: ReturnType<typeof setTimeout> | undefined;
    const finish = (code: number | null, error?: RegistryReadError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(confirmation);
      options.signal?.removeEventListener('abort', cancel);
      child.stdout.destroy();
      child.stderr.destroy();
      if (error) reject(error);
      else resolve({ status: code, stdout: Buffer.concat(chunks).toString('utf8') });
      chunks = [];
    };
    const stop = (code: 'cancelled' | 'timeout' | 'output' | 'spawn') => {
      if (stopped || settled) return;
      stopped = new RegistryReadError(code);
      chunks = [];
      confirmation = setTimeout(() => {
        child.unref();
        finish(null, new RegistryReadError('unconfirmed'));
      }, 1000);
      try {
        child.kill('SIGKILL');
      } catch {
        /* The confirmation deadline still owns settlement. */
      }
      if (child.exitCode !== null || child.signalCode !== null) finish(null, stopped);
    };
    const cancel = () => stop('cancelled');
    const timer = setTimeout(() => stop('timeout'), timeoutMs);
    child.on('error', () => {
      if (!child.pid) finish(null, new RegistryReadError('spawn'));
      else stop('spawn');
    });
    child.on('exit', () => {
      if (stopped) finish(null, stopped);
    });
    child.on('close', (code) => finish(code, stopped));
    child.stdout.on('error', () => stop('spawn'));
    child.stderr.on('error', () => stop('spawn'));
    child.stdout.on('data', (chunk: Buffer) => {
      if (stopped || settled) return;
      outBytes += chunk.length;
      if (outBytes > 1024 * 1024) stop('output');
      else chunks.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      if (!stopped && !settled && (errBytes += chunk.length) > 1024 * 1024) stop('output');
    });
    options.signal?.addEventListener('abort', cancel, { once: true });
    if (options.signal?.aborted) cancel();
  });
}

/** Shared by default registry adapters: two processes, at most 32 queued calls.
 * Unconfirmed termination closes admission rather than exceeding the process cap.
 */
export function registryReadLimiter() {
  let active = 0,
    failed = false;
  const waiting: { enter: () => void; fail: (error: RegistryReadError) => void }[] = [];
  return async <T>(operation: () => Promise<T>, signal?: AbortSignal): Promise<T> => {
    if (failed || waiting.length >= 32) throw new RegistryReadError('busy');
    if (signal?.aborted) throw new RegistryReadError('cancelled');
    if (active >= 2)
      await new Promise<void>((resolve, reject) => {
        const cancel = () => {
          const index = waiting.indexOf(entry);
          if (index >= 0) waiting.splice(index, 1);
          reject(new RegistryReadError('cancelled'));
        };
        const entry = {
          enter() {
            signal?.removeEventListener('abort', cancel);
            resolve();
          },
          fail(error: RegistryReadError) {
            signal?.removeEventListener('abort', cancel);
            reject(error);
          },
        };
        waiting.push(entry);
        signal?.addEventListener('abort', cancel, { once: true });
      });
    else active++;
    try {
      if (signal?.aborted) throw new RegistryReadError('cancelled');
      return await operation();
    } catch (error) {
      if (error instanceof RegistryReadError && error.code === 'unconfirmed') {
        failed = true;
        for (const entry of waiting.splice(0)) entry.fail(new RegistryReadError('busy'));
      }
      throw error;
    } finally {
      active--;
      const next = failed ? undefined : waiting.shift();
      if (next) {
        active++;
        next.enter();
      }
    }
  };
}
