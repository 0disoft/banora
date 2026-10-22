import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtemp, open, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { saveOutput } from '../packages/cli/src/io.js';

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'banora-output-'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

test('an occupied temporary path is never deleted or published, including with force', async () => {
  const output = join(root, 'output.svg');
  const temporary = join(root, '.banora-collision.tmp');
  await writeFile(temporary, 'someone else');
  await writeFile(output, 'original output');
  for (const force of [false, true]) {
    let removals = 0;
    await expect(
      saveOutput(output, 'replacement', [], force, {
        createId: () => 'collision',
        unlink: async () => {
          removals++;
        },
      }),
    ).rejects.toMatchObject({ code: 'output' });
    expect(removals).toBe(0);
    expect(await readFile(temporary, 'utf8')).toBe('someone else');
    expect(await readFile(output, 'utf8')).toBe('original output');
  }
});

for (const phase of ['write', 'close'] as const)
  test(`a ${phase} failure closes and removes only its own partial temporary file`, async () => {
    const output = join(root, 'output.svg');
    await writeFile(output, 'original output');
    let closes = 0;
    await expect(
      saveOutput(output, 'replacement', [], true, {
        createId: () => 'partial',
        open: async (path, flags) => {
          const file = await open(path, flags);
          return {
            writeFile: async () => {
              await file.writeFile('partial content');
              if (phase === 'write') throw Error('private write failure');
            },
            close: async () => {
              closes++;
              await file.close();
              if (phase === 'close') throw Error('private close failure');
            },
          };
        },
      }),
    ).rejects.toMatchObject({ code: 'output' });
    expect(closes).toBe(1);
    expect(await readFile(output, 'utf8')).toBe('original output');
    expect(await readdir(root)).toEqual(['output.svg']);
  });

test('exclusive publication preserves an existing output and cleans its own completed temporary file', async () => {
  const output = join(root, 'output.svg');
  await writeFile(output, 'original output');
  await expect(saveOutput(output, 'replacement', [], false)).rejects.toMatchObject({
    code: 'output',
  });
  expect(await readFile(output, 'utf8')).toBe('original output');
  expect(await readdir(root)).toEqual(['output.svg']);
});

test('normal publication and force replacement return the exact path and leave no temporary files', async () => {
  const output = join(root, 'output.svg');
  expect(await saveOutput(output, 'first', [], false)).toBe(resolve(output));
  expect(await readFile(output, 'utf8')).toBe('first');
  expect(await saveOutput(output, 'second', [], true)).toBe(resolve(output));
  expect(await readFile(output, 'utf8')).toBe('second');
  expect(await readdir(root)).toEqual(['output.svg']);
});

test('input protection runs before any temporary file is created', async () => {
  const input = join(root, 'input.sgf');
  await writeFile(input, 'source content');
  let creations = 0;
  await expect(
    saveOutput(input, 'replacement', [input], true, {
      open: async () => {
        creations++;
        throw Error('must not open');
      },
    }),
  ).rejects.toMatchObject({ code: 'output' });
  expect(creations).toBe(0);
  expect(await readFile(input, 'utf8')).toBe('source content');
  expect(await readdir(root)).toEqual(['input.sgf']);
});
