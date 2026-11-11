import { expect, spyOn, test } from 'bun:test';
import { createSgfNode, parseSgf, serializeSgf } from '../src/sgf.js';
import type { SgfNode, SgfRecord } from '../src/sgf.js';

function parsed(text: string): SgfRecord {
  const result = parseSgf(text);
  if (!result.ok) throw new Error(result.diagnostics[0]!.message);
  return result.record;
}

test('parser-owned decoded raw values are reused while plain-only nodes stay unregistered', () => {
  const input = '(;SZ[19]' + ';C[review\\]text\\\\tail]'.repeat(5000) + ')';
  const pattern = /[\\\r\n]/.source;
  const originalTest = RegExp.prototype.test;
  let decodes = 0;
  const spy = spyOn(RegExp.prototype, 'test').mockImplementation(function (
    this: RegExp,
    value: string,
  ) {
    if (this.source === pattern) decodes++;
    return Reflect.apply(originalTest, this, [value]);
  });
  try {
    const record = parsed(input);
    expect(decodes).toBe(5002); // 5,001 initial values plus the unregistered plain SZ root.
    decodes = 0;
    expect(serializeSgf(record)).toContain('C[review\\]text\\\\tail]');
    expect(decodes).toBe(1); // Only the plain SZ root; no repeated escaped-comment decoding.
  } finally {
    spy.mockRestore();
  }
});

test('root canonical headers and Text/SimpleText/label/unknown escapes equal the untrusted fallback', () => {
  for (const raw of ['', 'a\\]b\\\\c\\:d', 'a\tb\rc\nd', 'a\\\r\nb\\\n\rc', '한국어🙂']) {
    const record = parsed(`(;FF[4]GM[1]CA[latin1]C[${raw}]N[${raw}]LB[aa:${raw}]XX[${raw}])`);
    const root = record.games[0]!;
    const copy = createSgfNode(root.id, root.properties, [], root.rawProperties);
    expect(serializeSgf(record)).toBe(serializeSgf({ games: [copy] }));
    expect(serializeSgf(record)).toContain('CA[UTF-8]');
    expect(serializeSgf(record)).toContain(`XX[${raw}]`);
  }
});

test('plain-only records do not allocate per-node weak proof entries', () => {
  const spy = spyOn(WeakMap.prototype, 'set');
  try {
    parsed('(;SZ[19]' + ';C[plain review text]'.repeat(100) + ')');
    expect(spy.mock.calls).toHaveLength(0);
  } finally {
    spy.mockRestore();
  }
});

test('plain records skip every node proof lookup in normalized-size checking and export', () => {
  const spy = spyOn(WeakMap.prototype, 'get');
  try {
    const record = parsed('(;SZ[19]' + ';C[plain review text]'.repeat(5000) + ')');
    expect(spy.mock.calls).toHaveLength(0);
    const text = serializeSgf(record);
    expect(spy.mock.calls).toHaveLength(0);
    expect(text).toContain('C[plain review text]');
  } finally {
    spy.mockRestore();
  }
});

test('mixed collections and wrappers combining plain and escaped records retain escaped proofs', () => {
  const plain = parsed('(;C[plain])');
  const escaped = parsed('(;C[escaped\\]value])');
  const combined = Object.freeze({ games: Object.freeze([...plain.games, ...escaped.games]) });
  const parsedMixed = parsed('(;C[plain])(;C[escaped\\]value])');
  const originalTest = RegExp.prototype.test;
  const pattern = /[\\\r\n]/.source;
  let decodes = 0;
  const spy = spyOn(RegExp.prototype, 'test').mockImplementation(function (
    this: RegExp,
    value: string,
  ) {
    if (this.source === pattern) decodes++;
    return Reflect.apply(originalTest, this, [value]);
  });
  try {
    for (const record of [combined, parsedMixed]) {
      decodes = 0;
      expect(serializeSgf(record)).toContain('C[escaped\\]value]');
      expect(decodes).toBe(1); // Plain root only; the escaped root still reuses its proof.
    }
  } finally {
    spy.mockRestore();
  }
});

test('an escaped edit to a plain record cannot inherit the record classification', () => {
  const root = parsed('(;C[plain])').games[0]!;
  const edited = createSgfNode(root.id, { C: ['new]value'] }, [], root.rawProperties);
  const text = serializeSgf({ games: [edited] });
  expect(text).toContain('C[new\\]value]');
  expect(parsed(text).games[0]!.properties.C).toEqual(['new]value']);
});

test('changed properties with old raw text use the ordinary exact decoded comparison', () => {
  const root = parsed('(;C[old\\]comment]XX[unchanged\\:value])').games[0]!;
  const edited = createSgfNode(
    root.id,
    { ...root.properties, C: ['new]comment'] },
    [],
    root.rawProperties,
  );
  const text = serializeSgf({ games: [edited] });
  expect(text).toContain('C[new\\]comment]');
  expect(text).toContain('XX[unchanged\\:value]');
  expect(parsed(text).games[0]!.properties.C).toEqual(['new]comment']);
});

test('parser properties paired with replaced raw maps never inherit an incorrect proof', () => {
  const root = parsed('(;C[a\\]b]XX[raw\\:value])').games[0]!;
  for (const raw of ['wrong', '\\a\\]b', 'a\\]b']) {
    const rawProperties = Object.freeze({ ...root.rawProperties, C: Object.freeze([raw]) });
    const wrapper = Object.freeze({ ...root, rawProperties });
    const fallback = createSgfNode(root.id, root.properties, [], rawProperties);
    expect(serializeSgf({ games: [wrapper] })).toBe(serializeSgf({ games: [fallback] }));
  }
});

test('foreign frozen accessor properties and raw values are rechecked on every export', () => {
  let value = 'first]value',
    raw = 'first\\]value';
  const properties = Object.freeze({
    get C() {
      return Object.freeze([value]);
    },
  });
  const rawProperties = Object.freeze({
    get C() {
      return Object.freeze([raw]);
    },
  });
  const node: SgfNode = Object.freeze({
    id: 'foreign',
    properties,
    rawProperties,
    children: Object.freeze([]),
  });
  expect(serializeSgf({ games: [node] })).toContain('C[first\\]value]');
  value = 'second]value';
  expect(serializeSgf({ games: [node] })).toContain('C[second\\]value]');
  raw = 'second\\]value';
  expect(serializeSgf({ games: [node] })).toContain('C[second\\]value]');
});

test('reusing properties in another node or root preserves canonical context', () => {
  const record = parsed('(;CA[latin1]C[root\\]text];C[child\\]text]XX[keep\\:escape])');
  const child = record.games[0]!.children[0]!;
  const wrapped = Object.freeze({ ...child, id: 'new-root' });
  expect(serializeSgf({ games: [wrapped] })).toBe(
    serializeSgf({ games: [createSgfNode('foreign', child.properties, [], child.rawProperties)] }),
  );
  expect(serializeSgf(record)).toContain('CA[UTF-8]');
});
