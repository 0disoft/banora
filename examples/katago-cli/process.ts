import { spawn } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';
import { KataGoProvider } from '@0disoft/banora/katago';
import type { KataGoPerspective } from '@0disoft/banora/katago';

export interface LocalKataGoOptions {
  readonly binary: string;
  readonly model: string;
  readonly config: string;
  readonly cwd: string;
  readonly perspective: KataGoPerspective;
  readonly onStdinLine?: (line: string) => void;
  readonly onStdoutLine?: (line: string) => void;
  readonly onStderr?: (text: string) => void;
}

/** Example host bridge. Importing this file does not start an engine. */
export function startLocalKataGo(options: LocalKataGoOptions) {
  if (
    ![options.binary, options.model, options.config, options.cwd].every(
      (value) => typeof value === 'string' && value.length > 0,
    ) ||
    !['black', 'white', 'to-play'].includes(options.perspective)
  ) {
    throw TypeError('Supply engine/model/config/working paths and a reporting perspective');
  }
  const child = spawn(
    options.binary,
    ['analysis', '-model', options.model, '-config', options.config],
    {
      cwd: options.cwd,
      shell: false,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );
  const decoder = new StringDecoder('utf8');
  const maxLine = 1_048_576;
  let buffer = '';
  let unavailable = false;
  let closing = false;
  let writeQueue = Promise.resolve();
  let stopPromise: Promise<void> | undefined;
  const provider = new KataGoProvider(
    {
      sendLine(line) {
        if (unavailable || closing) return Promise.reject(new Error('Engine is closed'));
        const written = writeQueue.then(
          () =>
            new Promise<void>((resolve, reject) => {
              if (unavailable || closing) {
                reject(new Error('Engine is closed'));
                return;
              }
              options.onStdinLine?.(line);
              child.stdin.write(line + '\n', 'utf8', (error) =>
                error ? reject(error) : resolve(),
              );
            }),
        );
        // Keep call order while allowing failed writes to settle every caller.
        writeQueue = written.catch(() => {
          disconnect();
        });
        return written;
      },
    },
    { perspective: options.perspective },
  );

  function disconnect(): void {
    if (unavailable) return;
    unavailable = true;
    provider.fail();
  }
  function frame(text: string): void {
    buffer += text;
    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).replace(/\r$/, '');
      buffer = buffer.slice(newline + 1);
      if (line.length > maxLine) throw Error('Engine stdout line exceeds the limit');
      options.onStdoutLine?.(line);
      provider.receiveLine(line);
    }
    if (buffer.length > maxLine + 1) throw Error('Engine stdout framing exceeds the limit');
  }
  child.stdout.on('data', (chunk: Buffer) => {
    try {
      frame(decoder.write(chunk));
    } catch {
      buffer = '';
      disconnect();
      child.kill();
    }
  });
  child.stdout.once('end', () => {
    try {
      frame(decoder.end());
    } catch {
      /* EOF fails any pending work below. */
    }
    buffer = '';
    disconnect();
  });
  child.stderr.on('data', (chunk: Buffer) => {
    // Engine logs never enter receiveLine or the SDK's public error messages.
    try {
      options.onStderr?.(chunk.toString('utf8'));
    } catch {
      /* Host diagnostics are optional. */
    }
  });
  child.once('error', disconnect);
  child.stdin.on('error', disconnect);
  child.stdout.once('error', disconnect);
  child.stderr.once('error', disconnect);
  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    child.once('close', (code, signal) => {
      disconnect();
      resolve({ code, signal });
    });
  });

  return Object.freeze({
    provider,
    exited,
    stop(): Promise<void> {
      if (stopPromise) return stopPromise;
      // Send scoped termination before closing the writer; flush queued writes.
      provider.dispose();
      stopPromise = (async () => {
        const timer = setTimeout(() => {
          closing = true;
          child.stdin.destroy();
          child.kill();
        }, 5_000);
        // The deadline also covers blocked writes to an unresponsive process.
        void writeQueue.then(() => {
          closing = true;
          child.stdin.end();
        });
        try {
          await exited;
        } finally {
          clearTimeout(timer);
        }
      })();
      return stopPromise;
    },
  });
}
