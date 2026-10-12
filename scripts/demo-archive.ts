import { createHash } from 'node:crypto';
import { lstat, open } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export const demoArchiveLimit = 64 * 1024 * 1024;
export interface DemoFile {
  readonly name: string;
  readonly bytes: number;
  readonly sha256: string;
}
export interface DemoInventory {
  readonly tarSha256: string;
  readonly tarBytes: number;
  readonly files: readonly DemoFile[];
}
export const demoPath = (name: string) =>
  name.length <= 512 &&
  name
    .split('/')
    .every(
      (segment) =>
        /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(segment) && segment !== '.' && segment !== '..',
    );
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

/** Bounded USTAR/GNU regular-file inventory; never extract or execute entries. */
export function demoInventory(input: Uint8Array): DemoInventory {
  const tar = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  if (tar.length < 1024 || tar.length > demoArchiveLimit || tar.length % 512)
    throw Error('archive');
  const text = (header: Buffer, start: number, length: number) =>
    header
      .subarray(start, start + length)
      .toString('utf8')
      .replace(/\0.*$/s, '');
  const octal = (header: Buffer, start: number, length: number) => {
    const value = text(header, start, length).trim();
    if (!/^[0-7]{1,11}$/.test(value)) throw Error('archive');
    return Number.parseInt(value, 8);
  };
  const files: DemoFile[] = [],
    names = new Set<string>();
  let offset = 0,
    entries = 0,
    ended = false;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((value) => value === 0)) {
      if (tar.length - offset < 1024 || !tar.subarray(offset).every((value) => value === 0))
        throw Error('archive');
      ended = true;
      break;
    }
    let checksum = 0;
    for (let i = 0; i < 512; i++) checksum += i >= 148 && i < 156 ? 32 : header[i]!;
    if (checksum !== octal(header, 148, 8) || text(header, 257, 5) !== 'ustar')
      throw Error('archive');
    const type = header[156];
    if (![0, 48, 53].includes(type!)) throw Error('archive');
    const prefix = text(header, 345, 155);
    let name = `${prefix ? prefix + '/' : ''}${text(header, 0, 100)}`;
    if (name.startsWith('./')) name = name.slice(2);
    if (type === 53 && name.endsWith('/')) name = name.slice(0, -1);
    const bytes = octal(header, 124, 12),
      start = offset + 512;
    if (
      ++entries > 2048 ||
      bytes > demoArchiveLimit ||
      start + bytes > tar.length ||
      (type === 53 && bytes !== 0)
    )
      throw Error('archive');
    if (!(type === 53 && (name === '' || name === '.'))) {
      if (!demoPath(name) || names.has(name)) throw Error('archive');
      names.add(name);
      if (type !== 53) {
        if (files.length >= 512) throw Error('archive');
        files.push({ name, bytes, sha256: hash(tar.subarray(start, start + bytes)) });
      }
    }
    offset = start + Math.ceil(bytes / 512) * 512;
  }
  if (!ended || !files.length || !files.some((file) => file.name === 'studio/index.html'))
    throw Error('archive');
  return { tarSha256: hash(tar), tarBytes: tar.length, files };
}

export async function regularDemoDirectory(directory: string) {
  for (let path = resolve(directory); ; path = dirname(path)) {
    const info = await lstat(path);
    if (!info.isDirectory() || info.isSymbolicLink()) throw Error('archive');
    if (path === dirname(path)) break;
  }
}

export async function readDemoInventory(path: string) {
  const full = resolve(path);
  await regularDemoDirectory(dirname(full));
  const before = await lstat(full);
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.size < 1024 ||
    before.size > demoArchiveLimit
  )
    throw Error('archive');
  const file = await open(full, 'r');
  try {
    const opened = await file.stat();
    if (opened.ino !== before.ino || opened.dev !== before.dev || opened.size !== before.size)
      throw Error('archive');
    const buffer = Buffer.alloc(before.size);
    let position = 0;
    while (position < buffer.length) {
      const { bytesRead } = await file.read(buffer, position, buffer.length - position, position);
      if (!bytesRead) throw Error('archive');
      position += bytesRead;
    }
    const after = await lstat(full);
    if (
      !after.isFile() ||
      after.isSymbolicLink() ||
      after.ino !== before.ino ||
      after.dev !== before.dev ||
      after.size !== before.size
    )
      throw Error('archive');
    return demoInventory(buffer);
  } finally {
    await file.close();
  }
}
