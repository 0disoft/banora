import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { publicRegistryIO } from './publication.js';

test('actual npm configuration cannot inherit ancestor project settings or use a project npmrc in the isolated working directory', async () => {
  await mkdir('.tmp', { recursive: true });
  const root = await mkdtemp(resolve('.tmp/npm-config-isolation-')),
    child = resolve(root, 'isolated');
  await mkdir(child);
  await writeFile(
    resolve(root, 'package.json'),
    JSON.stringify({ name: 'authored-config-fixture', private: true }),
  );
  // Innocuous authored registry setting; no credential or private value is created.
  await writeFile(resolve(root, '.npmrc'), 'registry=https://example.org/\n');
  const io = publicRegistryIO(root),
    before = await readFile(resolve(root, '.npmrc'));
  const read = io.run(['npm', 'config', 'get', 'registry'], child);
  expect(read.status).toBe(0);
  expect(read.stdout.trim()).toBe('https://registry.npmjs.org/');
  const retryRead = io.run(
    ['npm', 'config', 'get', 'fetch-retries', '--fetch-retries=9', '--fetch-retries=0'],
    child,
  );
  expect(retryRead.status).toBe(0);
  expect(retryRead.stdout.trim()).toBe('0');
  await writeFile(resolve(child, '.npmrc'), 'registry=https://example.org/\n');
  expect(() => io.run(['npm', 'config', 'get', 'registry'], child)).toThrow('authority');
  expect(await readFile(resolve(root, '.npmrc'))).toEqual(before);
});

test('npm upload transport disables hidden retries while read configuration and uncertain failure handling remain separate', async () => {
  await mkdir('.tmp', { recursive: true });
  const root = await mkdtemp(resolve('.tmp/npm-write-once-'));
  const calls: { args: readonly string[]; timeout?: number; retries?: string }[] = [];
  const io = publicRegistryIO(root, (command, args, options) => {
    expect(command).toBe('npm');
    expect(options.shell).toBe(false);
    calls.push({ args, timeout: options.timeout, retries: options.env?.NPM_CONFIG_FETCH_RETRIES });
    return {
      pid: 0,
      output: [],
      stdout: '',
      stderr: 'npm error code ECONNRESET\n',
      status: 1,
      signal: null,
    };
  });
  const failure = io.run(['npm', 'publish', './authored.tgz', '--fetch-retries=9'], root);
  expect(failure).toEqual({ status: 1, stdout: '', npmCode: 'ECONNRESET' });
  expect(calls).toHaveLength(1);
  expect(calls[0]!.args.slice(-3)).toEqual(['--fetch-retries=0', '--prefix', root]);
  expect(calls[0]).toMatchObject({ timeout: 180_000, retries: '0' });
  io.run(['npm', 'view', '@0disoft/banora', '--json'], root);
  expect(calls).toHaveLength(2);
  expect(calls[1]).toMatchObject({ timeout: 30_000 });
  expect(calls[1]!.retries).toBeUndefined();
  expect(calls[1]!.args).not.toContain('--fetch-retries=0');
});

test('asynchronous read adapter retains isolated configuration and refuses writes before launching', async () => {
  await mkdir('.tmp', { recursive: true });
  const root = await mkdtemp(resolve('.tmp/npm-async-read-'));
  let launches = 0;
  const io = publicRegistryIO(
    root,
    () => {
      throw Error('synchronous command is forbidden');
    },
    async (command, args, options) => {
      launches++;
      expect(command).toBe('npm');
      expect(args.slice(-2)).toEqual(['--prefix', root]);
      expect(options.env?.NPM_CONFIG_LOGLEVEL).toBe('error');
      expect(await readFile(options.env!.NPM_CONFIG_USERCONFIG!, 'utf8')).toBe('');
      expect(await readFile(options.env!.NPM_CONFIG_GLOBALCONFIG!, 'utf8')).toBe('');
      expect(options.cwd).toBe(root);
      return { status: 0, stdout: '{}' };
    },
  );
  expect(await io.read(['npm', 'view', '@0disoft/banora', '--json'], root)).toEqual({
    status: 0,
    stdout: '{}',
  });
  await expect(io.read(['npm', 'publish', './authored.tgz'], root)).rejects.toMatchObject({
    code: 'authority',
  });
  expect(launches).toBe(1);
  await writeFile(resolve(root, '.npmrc'), 'registry=https://example.org/\n');
  await expect(io.read(['npm', 'view', '@0disoft/banora'], root)).rejects.toMatchObject({
    code: 'authority',
  });
  expect(launches).toBe(1);
});
