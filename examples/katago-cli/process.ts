import { spawn } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';
import { KataGoProvider } from '@0disoft/banora/katago';
import type { KataGoPerspective } from '@0disoft/banora/katago';
import { stopEngineProcess } from './shutdown.js';
import { EngineWriter } from './writer.js';

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
export function startLocalKataGo(
  options: LocalKataGoOptions,
  runtime: {
    spawn?: typeof spawn;
    graceMs?: number;
    confirmationMs?: number;
  } = {},
) {
  if (
    ![options.binary, options.model, options.config, options.cwd].every(
      (value) => typeof value === 'string' && value.length > 0,
    ) ||
    !['black', 'white', 'to-play'].includes(options.perspective)
  ) {
    throw TypeError('Supply engine/model/config/working paths and a reporting perspective');
  }
  const child = (runtime.spawn ?? spawn)(
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
  let stopPromise: Promise<void> | undefined;
  let processClosed = false;
  const writer = new EngineWriter(
    (line) =>
      new Promise<void>((resolve, reject) => {
        if (unavailable || closing) {
          reject(new Error('Engine is closed'));
          return;
        }
        options.onStdinLine?.(line);
        child.stdin.write(line + '\n', 'utf8', (error) => (error ? reject(error) : resolve()));
      }),
    disconnect,
  );
  const provider = new KataGoProvider(
    {
      sendLine(line) {
        if (unavailable || closing) return Promise.reject(new Error('Engine is closed'));
        return writer.sendLine(line);
      },
    },
    { perspective: options.perspective },
  );

  function disconnect(): void {
    if (unavailable) return;
    unavailable = true;
    provider.fail();
    writer.close();
    buffer = '';
    if (!processClosed)
      void stop().catch(() => {
        console.error('KataGo engine shutdown could not be confirmed.');
      });
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
      processClosed = true;
      disconnect();
      resolve({ code, signal });
    });
  });

  function stop(): Promise<void> {
    if (!stopPromise) {
      // Establish the single shutdown lease before disposal can call host code again.
      stopPromise = Promise.resolve().then(async () => {
        try {
          await stopEngineProcess(
            child,
            exited,
            writer.idle(),
            () => {
              closing = true;
              writer.close();
            },
            runtime.graceMs,
            runtime.confirmationMs,
          );
        } finally {
          closing = true;
          writer.close();
          buffer = '';
        }
      });
      // Block new provider work synchronously, while keeping termination writes ordered.
      provider.dispose();
    }
    return stopPromise;
  }

  return Object.freeze({ provider, exited, stop });
}
