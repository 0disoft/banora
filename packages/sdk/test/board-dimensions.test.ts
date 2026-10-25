import { expect, spyOn, test } from 'bun:test';
import * as core from '../src/core.js';
import { createSgfNode, parseSgf, sgfBoardSize } from '../src/sgf.js';
import { initialRecordPosition, sameRecordContent } from '../src/record-runtime.js';

test('core creation and SGF dimension projection preserve square/rectangular boundaries', () => {
  for (const width of [0, 1, 2, 3, 19, 51, 52, 53]) {
    for (const height of [0, 1, 2, 3, 19, 51, 52, 53]) {
      const root = createSgfNode('root', { SZ: [`${width}:${height}`] });
      if (width >= 2 && width <= 52 && height >= 2 && height <= 52) {
        const position = core.createPosition({ width, height });
        expect(position.board).toHaveLength(width * height);
        expect(Object.isFrozen(position.board)).toBe(true);
        expect(sgfBoardSize(root)).toEqual({ width, height });
      } else {
        expect(() => core.createPosition({ width, height })).toThrow(
          new RangeError('Board dimensions must be integers from 2 to 52'),
        );
        expect(() => sgfBoardSize(root)).toThrow('SGF board dimensions must be from 2 to 52');
      }
    }
  }
  expect(sgfBoardSize(createSgfNode('default', {}))).toEqual({ width: 19, height: 19 });
  expect(sgfBoardSize(createSgfNode('leading', { SZ: ['02:052'] }))).toEqual({
    width: 2,
    height: 52,
  });
  expect(core.createPosition().width).toBe(19);
  expect(core.createPosition({ width: 3 }).height).toBe(3);
});

test('invalid core dimensions still fail before rules/turn access and reject nonintegers', () => {
  for (const width of [NaN, Infinity, -Infinity, 2.5, Number.MAX_SAFE_INTEGER])
    expect(() => core.createPosition({ width })).toThrow(RangeError);
  const options = {
    width: 1,
    get rules(): never {
      throw Error('Wrong validation order');
    },
  };
  expect(() => core.createPosition(options)).toThrow(RangeError);
});

test('SGF size grammar, error diagnostics and expanded-point limits remain unchanged', () => {
  for (const size of ['', '-2', '2.5', '2:2:2', '9:', 'NaN', 'Infinity', '9e1'])
    expect(parseSgf(`(;SZ[${size}])`)).toEqual({
      ok: false,
      diagnostics: [{ code: 'property', message: 'Invalid SZ property' }],
    });
  for (const size of ['1', '53', '2:1', '52:53', '9'.repeat(400)])
    expect(parseSgf(`(;SZ[${size}])`)).toEqual({
      ok: false,
      diagnostics: [{ code: 'property', message: 'SGF board dimensions must be from 2 to 52' }],
    });
  expect(parseSgf('(;SZ[52]AB[aa:ZZ])', { maxExpandedPoints: 2704 }).ok).toBe(true);
  expect(parseSgf('(;SZ[52]AB[aa:ZZ])', { maxExpandedPoints: 2703 })).toMatchObject({
    ok: false,
    diagnostics: [{ code: 'limit', message: 'SGF expanded point budget exceeded' }],
  });
});

test('collection parsing and shared-root dirty comparison allocate no temporary Positions', () => {
  const create = spyOn(core, 'createPosition');
  try {
    const parsed = parseSgf('(;SZ[19])'.repeat(500));
    if (!parsed.ok) throw Error('Invalid fixture');
    expect(create).toHaveBeenCalledTimes(0);
    const root = parsed.record.games[0]!;
    const changed = Object.freeze({
      games: Object.freeze([
        createSgfNode(root.id, { ...root.properties, C: ['changed'] }),
        ...parsed.record.games.slice(1),
      ]),
    });
    expect(sameRecordContent(changed, parsed.record)).toBe(false);
    expect(sameRecordContent(parsed.record, { games: [...parsed.record.games] })).toBe(true);
    expect(create).toHaveBeenCalledTimes(0);
    const position = initialRecordPosition(root);
    expect(position.board).toHaveLength(361);
    expect(create).toHaveBeenCalledTimes(1);
  } finally {
    create.mockRestore();
  }
});
