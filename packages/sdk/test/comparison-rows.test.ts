import { expect, test } from 'bun:test';
import { comparisonRows } from '../src/comparison-rows.js';
import { createSgfNode, parseSgf } from '../src/sgf.js';
import type { SgfNode } from '../src/sgf.js';
import { createUiMessages, SUPPORTED_LOCALES } from '../src/locale.js';

const ui = createUiMessages();
function chain(length: number): SgfNode {
  let node = createSgfNode(`n${length - 1}`, {});
  for (let i = length - 2; i >= 0; i--) node = createSgfNode(`n${i}`, {}, [node]);
  return node;
}

test('comparison rows preserve preorder, depth, names, rectangular coordinates and legacy passes', () => {
  const parsed = parseSgf(
    '(;SZ[5:9]N[<authored>](;B[ei];W[])(;B[aa]N[]))(;SZ[19];B[tt])(;SZ[20];B[tt])',
  );
  if (!parsed.ok) throw Error('Invalid fixture');
  const result = comparisonRows(parsed.record, ui);
  expect(result.truncated).toBe(false);
  expect(result.rows.map((row) => row.label)).toEqual([
    'Game 1 · Start position · <authored>',
    'Game 1 · Node 1 · Black E1',
    'Game 1 · Node 2 · White pass',
    'Game 1 · Node 1 · ',
    'Game 2 · Start position · Annotation',
    'Game 2 · Node 1 · Black pass',
    'Game 3 · Start position · Annotation',
    'Game 3 · Node 1 · Black U1',
  ]);
  for (const locale of SUPPORTED_LOCALES) {
    const localized = comparisonRows(parsed.record, createUiMessages({ locale }));
    expect(localized.rows.map((row) => row.id)).toEqual(result.rows.map((row) => row.id));
    expect(localized.rows[0]!.label).toContain('<authored>');
    expect(localized.rows[1]!.label).toContain('E1');
    expect(localized.truncated).toBe(false);
  }
});

test('comparison truncation distinguishes 499, 500 and 501 nodes in deep and multi-game records', () => {
  for (const length of [499, 500, 501]) {
    for (const games of [
      [chain(length)],
      Array.from({ length }, (_, i) => createSgfNode(`g${i}`, {})),
    ]) {
      const result = comparisonRows({ games }, ui);
      expect(result.rows.length).toBe(Math.min(500, length));
      expect(result.truncated).toBe(length > 500);
      expect(new Set(result.rows.map((row) => row.id)).size).toBe(result.rows.length);
    }
  }
});

test('a wide fork reads only displayed children instead of enumerating hidden siblings', () => {
  const children = Object.freeze(
    Array.from({ length: 49_999 }, (_, i) => createSgfNode(`c${i}`, {})),
  );
  let reads = 0;
  const observed = new Proxy(children, {
    get(target, property, receiver) {
      if (typeof property === 'string' && /^\d+$/.test(property)) reads++;
      return Reflect.get(target, property, receiver);
    },
  });
  const root = Object.freeze({ ...createSgfNode('root', {}), children: observed });
  const result = comparisonRows({ games: [root] }, ui);
  expect(result.rows.length).toBe(500);
  expect(result.rows[1]!.id).toBe('c0');
  expect(result.rows.at(-1)!.id).toBe('c498');
  expect(result.truncated).toBe(true);
  expect(reads).toBe(499);
});

test('a full first game leaves every later game unread and retains input ownership', () => {
  const games = Object.freeze([
    chain(500),
    ...Array.from({ length: 4999 }, (_, i) => createSgfNode(`g${i}`, {})),
  ]);
  let reads = 0;
  const observed = new Proxy(games, {
    get(target, property, receiver) {
      if (typeof property === 'string' && /^\d+$/.test(property)) reads++;
      return Reflect.get(target, property, receiver);
    },
  });
  const result = comparisonRows(Object.freeze({ games: observed }), ui);
  expect(result.rows.length).toBe(500);
  expect(result.truncated).toBe(true);
  expect(reads).toBe(1);
  result.rows.reverse();
  expect(games[0]!.id).toBe('n0');
  expect(games[0]!.children[0]!.id).toBe('n1');
  expect(comparisonRows({ games: [] }, ui)).toEqual({ rows: [], truncated: false });
});
