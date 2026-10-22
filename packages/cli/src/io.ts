import { createReadStream } from 'node:fs';
import { link, open, realpath, rename, unlink } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export class CliError extends Error {
  constructor(
    readonly code: 'usage' | 'input' | 'output' | 'limit',
    message: string,
  ) {
    super(message);
  }
}
export async function readInput(path: string): Promise<Buffer> {
  if (path === '-' && process.stdin.isTTY)
    throw new CliError(
      'usage',
      'Provide a file or pipe stdin; interactive prompts are not supported.',
    );
  const stream = path === '-' ? process.stdin : createReadStream(path);
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    for await (const chunk of stream) {
      const bytes = Buffer.from(chunk);
      size += bytes.length;
      if (size > 8 * 1024 * 1024) throw new CliError('limit', 'Input exceeds 8 MiB.');
      chunks.push(bytes);
    }
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError('input', 'Input file could not be read.');
  }
  return Buffer.concat(chunks);
}
export function json(bytes: Buffer): unknown {
  try {
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, ''),
    );
  } catch {
    throw new CliError('input', 'Expected valid UTF-8 JSON.');
  }
}
interface OutputIO {
  realpath(path: string): Promise<string>;
  open(path: string, flags: 'wx'): Promise<Pick<FileHandle, 'writeFile' | 'close'>>;
  link(source: string, destination: string): Promise<void>;
  rename(source: string, destination: string): Promise<void>;
  unlink(path: string): Promise<void>;
  createId(): string;
}
const outputIO: OutputIO = { realpath, open, link, rename, unlink, createId: randomUUID };

export async function saveOutput(
  path: string,
  text: string,
  inputs: readonly string[],
  force: boolean,
  overrides: Partial<OutputIO> = {},
): Promise<string> {
  const io = { ...outputIO, ...overrides };
  const output = resolve(path),
    fold = (value: string) => (process.platform === 'win32' ? value.toLowerCase() : value);
  const canonicalOutput = await io.realpath(output).catch(() => output);
  for (const input of inputs.filter((item) => item !== '-')) {
    if (
      fold(output) === fold(resolve(input)) ||
      fold(canonicalOutput) === fold(await io.realpath(input).catch(() => resolve(input)))
    )
      throw new CliError('output', 'Output must not replace an input file, including aliases.');
  }
  const temporary = join(dirname(output), `.banora-${io.createId()}.tmp`);
  let owned = false;
  try {
    const file = await io.open(temporary, 'wx');
    owned = true;
    try {
      await file.writeFile(text);
    } finally {
      await file.close();
    }
    if (force) await io.rename(temporary, output);
    else await io.link(temporary, output); // Exclusive publication of an already complete file.
  } catch {
    throw new CliError(
      'output',
      'Output could not be saved; use a new path or --force for an existing output.',
    );
  } finally {
    if (owned) await io.unlink(temporary).catch(() => {});
  }
  return output;
}
