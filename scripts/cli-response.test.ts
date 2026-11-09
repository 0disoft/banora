import { afterAll, beforeAll, expect, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { saveResponse, stringifyResponse } from '../packages/cli/src/json-response.js';

let directory: string;
beforeAll(async () => {
  await mkdir(resolve('.tmp'), { recursive: true });
  directory = await mkdtemp(resolve('.tmp/cli-response-'));
  const build = await Bun.build({
    entrypoints: [resolve('packages/cli/src/main.ts')],
    outdir: directory,
    naming: 'main.mjs',
    target: 'node',
    packages: 'external',
  });
  if (!build.success) throw new AggregateError(build.logs, 'Could not build CLI test entry');
});
afterAll(async () => {
  if (!directory) return;
  const target = resolve(directory);
  if (!target.startsWith(resolve('.tmp') + sep)) throw Error('Unexpected CLI test cleanup target');
  await rm(target, { recursive: true, force: true });
});

test('compact JSON preserves native key order, escaping, omissions, holes, hooks and shared references', () => {
  const shared = { name: 'quote" slash\\ newline\n 日本語', nullable: null };
  const source = {
    2: 'two',
    1: 'one',
    z: shared,
    a: shared,
    omit: undefined,
    fn: () => 0,
    symbol: Symbol(),
    array: new Array<unknown>(1).concat([undefined, NaN, Infinity, -0, true, shared]),
    date: new Date('2026-01-01T00:00:00Z'),
    boxed: [new Number(2), new String('x'), new Boolean(false)],
    hook: {
      toJSON(key: string) {
        return { key, omit: undefined };
      },
    },
    empty: {
      toJSON() {
        return undefined;
      },
    },
  };
  expect(stringifyResponse(source)).toBe(JSON.stringify(source));
  expect(stringifyResponse(Object.assign(Object.create(null), { key: 'value' }))).toBe(
    '{"key":"value"}',
  );
  const cycle: { self?: unknown } = {};
  cycle.self = cycle;
  expect(() => stringifyResponse(cycle)).toThrow();
  expect(() => stringifyResponse({ big: 1n })).toThrow();
  expect(() => stringifyResponse(Object(1n))).toThrow();
});

test('serialization failure makes zero save calls and cannot create or force-replace a file', async () => {
  const path = resolve(directory, 'kept.sgf');
  await writeFile(path, 'original');
  const invalid: { loop?: unknown } = {};
  invalid.loop = invalid;
  let writes = 0;
  await expect(
    saveResponse(path, 'replacement', invalid, [], true, async () => {
      writes++;
      return path;
    }),
  ).rejects.toThrow();
  await expect(
    saveResponse(
      resolve(directory, 'absent.sgf'),
      'replacement',
      { invalid: 1n },
      [],
      false,
      async () => {
        writes++;
        return path;
      },
    ),
  ).rejects.toThrow();
  expect(writes).toBe(0);
  expect(await readFile(path, 'utf8')).toBe('original');
  expect(await readdir(directory)).not.toContain('absent.sgf');
});

test('prepared response and committed output retain the exact existing format and path', async () => {
  const path = resolve(directory, 'saved.sgf'),
    result = { schemaVersion: 'banora.automation/v1', ok: true, kind: 'record', sgf: '(;SZ[9])' };
  expect(await saveResponse(path, result.sgf, result, [], false)).toBe(
    JSON.stringify({ ...result, output: path }),
  );
  expect(await readFile(path, 'utf8')).toBe(result.sgf);
  await expect(saveResponse(path, 'changed', result, [], false)).rejects.toMatchObject({
    code: 'output',
  });
  expect(await readFile(path, 'utf8')).toBe(result.sgf);
});

function cli(args: string[], input?: string) {
  const child = spawnSync('node', [resolve(directory, 'main.mjs'), ...args], {
    input,
    encoding: 'utf8',
    timeout: 20000,
    maxBuffer: 32 * 1024 * 1024,
  });
  expect(child.error).toBeUndefined();
  expect(child.stderr).toBe('');
  expect(child.stdout.trim().split('\n')).toHaveLength(1);
  return { exit: child.status, response: JSON.parse(child.stdout) };
}
const record = (moves: number) =>
  '(;SZ[9]XX[keep]' +
  Array.from({ length: moves }, (_, index) => `;${index % 2 ? 'W' : 'B'}[]`).join('') +
  ')';
function treeMoves(root: { children: unknown[] }) {
  let node = root,
    count = 0;
  while (node.children.length) {
    if (node.children.length !== 1) throw Error('Expected the original nested single-child tree');
    node = node.children[0] as typeof node;
    count++;
  }
  return count;
}
test('Node CLI keeps nested trees through the maximum 50000 nodes, saving exactly what success reports', async () => {
  for (const moves of [2000, 49999]) {
    const output = resolve(directory, `record-${moves}.sgf`),
      sgf = record(moves);
    const result = cli(
      ['run', '--request', '-', '--output', output],
      JSON.stringify({
        schemaVersion: 'banora.automation/v1',
        kind: 'record',
        sgf,
        includeTree: true,
      }),
    );
    expect(result.exit).toBe(0);
    expect(result.response.ok).toBe(true);
    expect(result.response.output).toBe(output);
    expect(treeMoves(result.response.games[0])).toBe(moves);
    expect(await readFile(output, 'utf8')).toBe(result.response.sgf);
    expect(result.response.games[0].properties.XX).toEqual(['keep']);
    const forced = cli(
      ['run', '--request', '-', '--output', output, '--force'],
      JSON.stringify({
        schemaVersion: 'banora.automation/v1',
        kind: 'record',
        sgf,
        includeTree: true,
      }),
    );
    expect(forced.exit).toBe(0);
    expect(await readFile(output, 'utf8')).toBe(forced.response.sgf);
  }
}, 30000);

test('inspect --tree, absent tree flag, validation errors and input protections retain behavior', async () => {
  const path = resolve(directory, 'inspect.sgf');
  await writeFile(path, record(2000));
  const inspected = cli(['inspect', '--input', path, '--tree']);
  expect(inspected.exit).toBe(0);
  expect(treeMoves(inspected.response.games[0])).toBe(2000);
  expect(cli(['inspect', '--input', path]).response.games).toBeUndefined();
  const operations = resolve(directory, 'empty-operations.json');
  await writeFile(operations, '[]');
  const denied = cli([
    'edit',
    '--input',
    path,
    '--operations',
    operations,
    '--output',
    path,
    '--force',
  ]);
  expect(denied.exit).toBe(4);
  expect(denied.response.error.code).toBe('output');
  expect(await readFile(path, 'utf8')).toBe(record(2000));
  const output = resolve(directory, 'failed.sgf');
  await writeFile(output, 'keep on failure');
  const failed = cli(
    ['run', '--output', output, '--force'],
    JSON.stringify({
      schemaVersion: 'banora.automation/v1',
      kind: 'record',
      sgf: '(bad',
      includeTree: true,
    }),
  );
  expect(failed.exit).toBe(3);
  expect(failed.response.ok).toBe(false);
  expect(await readFile(output, 'utf8')).toBe('keep on failure');
});
