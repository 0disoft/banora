import { resolve } from 'node:path';
import { saveOutput } from './io.js';

interface Frame {
  readonly value: object;
  readonly keys: readonly string[] | null;
  readonly length: number;
  index: number;
  written: boolean;
}

/** Compact JSON without recursive descent into the SDK's potentially 50,000-deep tree. */
export function stringifyResponse(input: unknown): string {
  const pieces: string[] = [],
    frames: Frame[] = [];
  const active = new Set<object>();
  const normalize = (input: unknown, key: string): unknown => {
    let value = input;
    if (value !== null && ['object', 'function', 'bigint'].includes(typeof value)) {
      const hook = (value as { toJSON?: unknown }).toJSON;
      if (typeof hook === 'function') value = hook.call(value, key);
    }
    if (value instanceof Number || value instanceof String || value instanceof Boolean)
      value = value.valueOf();
    if (
      typeof value === 'object' &&
      value !== null &&
      Object.prototype.toString.call(value) === '[object BigInt]'
    )
      throw new TypeError('BigInt is not JSON data');
    return value;
  };
  const append = (value: unknown) => {
    if (value !== null && typeof value === 'object') {
      if (active.has(value)) throw new TypeError('Cyclic JSON response');
      const keys = Array.isArray(value) ? null : Object.keys(value);
      active.add(value);
      frames.push({
        value,
        keys,
        length: keys ? keys.length : (value as unknown[]).length,
        index: 0,
        written: false,
      });
      pieces.push(keys ? '{' : '[');
    } else {
      const encoded = JSON.stringify(value);
      if (encoded === undefined) throw new TypeError('Response is not JSON data');
      pieces.push(encoded);
    }
  };
  append(normalize(input, ''));
  while (frames.length) {
    const frame = frames.at(-1)!;
    if (frame.index === frame.length) {
      pieces.push(frame.keys ? '}' : ']');
      active.delete(frame.value);
      frames.pop();
      continue;
    }
    const key = frame.keys ? frame.keys[frame.index++]! : String(frame.index++);
    let value = normalize((frame.value as Record<string, unknown>)[key], key);
    if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
      if (frame.keys) continue;
      value = null;
    }
    if (frame.written) pieces.push(',');
    frame.written = true;
    if (frame.keys) pieces.push(JSON.stringify(key), ':');
    append(value);
  }
  return pieces.join('');
}

/** Prepare the exact final response before any output can be published or replaced. */
export async function saveResponse(
  path: string,
  content: string,
  result: object,
  inputs: readonly string[],
  force: boolean,
  save: typeof saveOutput = saveOutput,
): Promise<string> {
  const output = resolve(path);
  const response = stringifyResponse({ ...result, output });
  await save(output, content, inputs, force);
  return response;
}
