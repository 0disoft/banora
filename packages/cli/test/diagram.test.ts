import { afterAll, afterEach, expect, spyOn, test } from 'bun:test';
import { RecordController } from '@0disoft/banora/controller';
import { renderDiagramCommand } from '../src/diagram.js';
import { CliError } from '../src/io.js';

const sgf = '(;SZ[5]XX[keep];B[aa](;W[bb]LB[bb:Main])(;W[dd]TR[aa]))(;SZ[3];B[cc])';
const dispose = spyOn(RecordController.prototype, 'dispose');
afterAll(() => {
  dispose.mockRestore();
});
afterEach(() => {
  dispose.mockClear();
});
const read = async (path: string) => Buffer.from(path === 'game.sgf' ? sgf : path);

test('diagram selects mainline end, explicit variations, root and other games without editing input', async () => {
  const main = await renderDiagramCommand({ input: 'game.sgf' }, read);
  expect(main.selection).toEqual({ gameIndex: 0, path: [0, 0] });
  expect(main.svg).toContain('Main');
  expect(main.svg).toContain('data-stone="1,1"');
  const branch = await renderDiagramCommand(
    { input: 'game.sgf', path: '0,1', options: '{"moveNumbers":true,"width":160}' },
    read,
  );
  expect(branch.selection?.path).toEqual([0, 1]);
  expect(branch.svg).toContain('data-stone="3,3"');
  expect(branch.svg).not.toContain('Main');
  expect(branch.svg).toContain('data-move-number="2"');
  expect((await renderDiagramCommand({ input: 'game.sgf', path: 'root' }, read)).svg).not.toContain(
    'data-stone',
  );
  expect((await renderDiagramCommand({ input: 'game.sgf', game: '1' }, read)).svg).toContain(
    'data-stone="2,2"',
  );
  expect(dispose).toHaveBeenCalledTimes(4);
});

test('invalid selectors reject before reading and snapshot input cannot silently ignore record selection', async () => {
  let reads = 0;
  const reader = async () => {
    reads++;
    return Buffer.from(sgf);
  };
  for (const flags of [
    {},
    { input: 'a', state: 'b' },
    { state: 'a', game: '0' },
    { state: 'a', path: 'root' },
    { input: '-', options: '-' },
    { input: 'a', game: '-1' },
    { input: 'a', game: '1e3' },
    { input: 'a', game: '9007199254740992' },
    { input: 'a', path: '0,,1' },
    { input: 'a', path: '0,-1' },
  ])
    await expect(renderDiagramCommand(flags, reader)).rejects.toMatchObject({ code: 'usage' });
  expect(reads).toBe(0);
  expect(dispose).not.toHaveBeenCalled();
});

test('historical self capture and occupied recorded points retain controller replay semantics', async () => {
  const input = async () => Buffer.from('(;SZ[3]AB[ab][ba][cb][bc]PL[W];W[bb];B[aa])');
  const result = await renderDiagramCommand({ input: '-' }, input);
  expect(result.svg.match(/data-stone=/g)).toHaveLength(5);
  const historical = await renderDiagramCommand({ input: '-' }, async () =>
    Buffer.from('(;SZ[3];B[aa];W[aa])'),
  );
  expect(historical.svg.match(/data-stone=/g)).toHaveLength(1);
  expect(historical.svg).toMatch(/<circle[^>]*fill="#fbfaf4"[^>]*data-stone="0,0"/);
  expect(dispose).toHaveBeenCalledTimes(2);
});

test('missing targets and invalid rendering options always dispose the temporary controller', async () => {
  for (const flags of [
    { input: 'game.sgf', game: '9' },
    { input: 'game.sgf', path: '0,9' },
    { input: 'game.sgf', options: '{"width":0}' },
    { input: 'game.sgf', options: '{"title":false}' },
  ])
    await expect(renderDiagramCommand(flags, read)).rejects.toMatchObject({ code: 'input' });
  expect(dispose).toHaveBeenCalledTimes(4);
});

test('snapshot JSON, invalid UTF-8 and malformed sources use bounded structured CLI errors', async () => {
  const result = await renderDiagramCommand(
    { state: '{"key":"external","width":2,"height":2,"stones":["black",null,null,null]}' },
    read,
  );
  expect(result.source).toBe('snapshot');
  expect(result.selection).toBeUndefined();
  expect(result.svg).toContain('data-stone="0,0"');
  expect(dispose).not.toHaveBeenCalled();
  for (const flags of [
    { input: 'secret-invalid-sgf' },
    { state: '{broken secret' },
    { state: 'null' },
    { input: 'game.sgf', options: '{broken secret' },
  ]) {
    let error;
    try {
      await renderDiagramCommand(flags, read);
    } catch (failure) {
      error = failure;
    }
    expect(error).toBeInstanceOf(CliError);
    expect((error as Error).message).not.toContain('secret');
  }
  await expect(
    renderDiagramCommand({ state: '-' }, async () => Buffer.from([0xff])),
  ).rejects.toMatchObject({ code: 'input' });
});
