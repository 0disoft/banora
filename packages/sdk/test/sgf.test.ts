import { describe, expect, test } from 'bun:test';
import { createSgfNode, decodeSgf, parseSgf, serializeSgf } from '../src/sgf.js';
import type { SgfRecord, SgfResult } from '../src/sgf.js';
import { semanticRecord } from '../src/record-runtime.js';

function parsed(result: SgfResult): SgfRecord {
  if (!result.ok) throw new Error(result.diagnostics[0]!.message);
  return result.record;
}

describe('SGF FF4 preservation', () => {
  test('raw value scanning retains long slices, escape boundaries and exact failure offsets', () => {
    const raw = '한🙂'.repeat(1400) + '\\]end\\\\';
    const input = `(;XX[${raw}][second]C[${raw}])`;
    const record = parsed(parseSgf(input, { maxValueLength: raw.length }));
    expect(record.games[0]!.rawProperties.XX).toEqual([raw, 'second']);
    expect(record.games[0]!.rawProperties.C).toEqual([raw]);
    expect(record.games[0]!.properties.XX).toEqual(['한🙂'.repeat(1400) + ']end\\', 'second']);
    expect(serializeSgf(record)).toContain(`XX[${raw}][second]`);
    expect(parseSgf(input, { maxValueLength: raw.length - 1 })).toMatchObject({
      ok: false,
      diagnostics: [
        { code: 'limit', message: 'SGF property value limit exceeded', offset: 5 + raw.length },
      ],
    });
    for (const [text, limit, code, message, offset] of [
      ['(;XX[abcd])', 3, 'limit', 'SGF property value limit exceeded', 9],
      ['(;XX[ab\\]cd])', 3, 'limit', 'SGF property value limit exceeded', 9],
      ['(;XX[abc\\', 9, 'syntax', 'Dangling value escape', 9],
      ['(;XX[abc', 9, 'syntax', 'Unclosed property value', 8],
      ['(;XX[abc\\]', 9, 'syntax', 'Unclosed property value', 10],
    ] as const) {
      expect(parseSgf(text, { maxValueLength: limit })).toEqual({
        ok: false,
        diagnostics: [{ code, message, offset }],
      });
    }
  });

  test('round-trips a multi-game collection, branches and escaped unknown properties', () => {
    const input =
      '(;FF[4]GM[1]SZ[9]PB[A]XX[one\\:two][bracket\\] and slash\\\\]C[hello\\\nworld](;B[aa]LB[bb:a\\:b])(;B[cc];W[]))(;SZ[13]PW[B])';
    const before = parsed(parseSgf(input));
    const output = serializeSgf(before);
    const after = parsed(parseSgf(output));
    expect(after.games.length).toBe(2);
    expect(after.games[0]!.children.length).toBe(2);
    expect(after.games[0]!.properties.C).toEqual(['helloworld']);
    expect(output).toContain('XX[one\\:two][bracket\\] and slash\\\\]');
    expect(semanticRecord(after)).toBe(semanticRecord(before));
    expect(Object.isFrozen(after.games[0]!.properties.XX)).toBe(true);
  });
  test('normalizes plain and escaped values without changing raw preservation', () => {
    for (const [raw, text, simple, unknown] of [
      ['한글 日本語 中文 🙂', '한글 日本語 中文 🙂', '한글 日本語 中文 🙂', '한글 日本語 中文 🙂'],
      ['', '', '', ''],
      ['a\tb\vc\fd', 'a b c d', 'a b c d', 'a\tb\vc\fd'],
      ['a\r\nb\n\rc\rd\ne', 'a\nb\nc\nd\ne', 'a b c d e', 'a\nb\nc\nd\ne'],
      ['a\\]b\\\\c\\:d', 'a]b\\c:d', 'a]b\\c:d', 'a]b\\c:d'],
      ['a\\\r\nb\\\n\rc', 'abc', 'abc', 'abc'],
    ]) {
      const record = parsed(parseSgf(`(;C[${raw}]N[${raw}]XX[${raw}]LB[aa:${raw}])`));
      const root = record.games[0]!;
      expect(root.properties.C).toEqual([text!]);
      expect(root.properties.N).toEqual([simple!]);
      expect(root.properties.XX).toEqual([unknown!]);
      expect(root.properties.LB).toEqual([`aa:${simple}`]);
      expect(root.rawProperties.XX).toEqual([raw!]);
      const output = serializeSgf(record);
      expect(output).toContain(`XX[${raw}]`);
      expect(semanticRecord(parsed(parseSgf(output)))).toBe(semanticRecord(record));
    }
  });
  test('freezes parser-owned values deeply while retaining defensive public construction', () => {
    const record = parsed(parseSgf('(;XX[first][second](;B[aa])(;W[bb]))(;C[other game])'));
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen(record.games)).toBe(true);
    const pending = [...record.games];
    while (pending.length) {
      const node = pending.pop()!;
      for (const object of [node, node.children, node.properties, node.rawProperties])
        expect(Object.isFrozen(object)).toBe(true);
      for (const map of [node.properties, node.rawProperties]) {
        expect(Object.getPrototypeOf(map)).toBe(null);
        for (const values of Object.values(map)) {
          expect(Object.isFrozen(values)).toBe(true);
          expect(Reflect.set(values, 0, 'changed')).toBe(false);
        }
      }
      pending.push(...node.children);
    }
    const values = ['caller'],
      raw = ['caller'];
    const properties = { XX: values },
      rawProperties = { XX: raw };
    const node = createSgfNode('external', properties, [], rawProperties);
    values[0] = 'changed';
    raw[0] = 'changed';
    expect(Object.isFrozen(properties)).toBe(false);
    expect(Object.isFrozen(values)).toBe(false);
    expect(Object.isFrozen(rawProperties)).toBe(false);
    expect(Object.isFrozen(raw)).toBe(false);
    expect(node.properties.XX).toEqual(['caller']);
    expect(node.rawProperties.XX).toEqual(['caller']);
    expect(record.games[0]!.properties.XX).toEqual(['first', 'second']);
  });
  test('decodes declared UTF-8, falls back to true Latin-1, and ignores fake CA in comments', () => {
    const utf8 = parsed(decodeSgf(new TextEncoder().encode('(;CA[UTF-8]C[한글])')));
    expect(utf8.games[0]!.properties.C?.[0]).toBe('한글');
    const bytes = new Uint8Array([
      ...new TextEncoder().encode('(;C[CA[UTF-8\\] caf'),
      233,
      ...new TextEncoder().encode('])'),
    ]);
    const latin = parsed(decodeSgf(bytes));
    expect(latin.games[0]!.properties.C?.[0]).toBe('CA[UTF-8] café');
    expect(serializeSgf(latin)).toContain('CA[UTF-8]');
  });
  test('rejects unsupported/malformed encodings and mixed-encoding collections', () => {
    expect(decodeSgf(new TextEncoder().encode('(;CA[alien])')).ok).toBe(false);
    const broken = new Uint8Array([...new TextEncoder().encode('(;CA[UTF-8]C['), 255, 93, 41]);
    expect(decodeSgf(broken).ok).toBe(false);
    expect(decodeSgf(new TextEncoder().encode('(;CA[UTF-8])(;CA[ISO-8859-1])')).ok).toBe(false);
  });
  test('decodes multibyte characters whose trailing byte resembles an SGF escape', () => {
    for (const [encoding, bytes, expected] of [
      ['Shift_JIS', [0x83, 0x5c, 0x95, 0x5c], 'ソ表'],
      ['SJIS', [0x83, 0x5c], 'ソ'],
      ['GB18030', [0x81, 0x5c], '乗'],
    ] as const) {
      const input = new Uint8Array([
        ...new TextEncoder().encode(`(;SZ[9]CA[${encoding}]C[`),
        ...bytes,
        ...new TextEncoder().encode(']LB[aa:'),
        ...bytes,
        ...new TextEncoder().encode(']XX[keep])'),
      ]);
      const record = parsed(decodeSgf(input));
      expect(record.games[0]!.properties.C).toEqual([expected]);
      expect(record.games[0]!.properties.LB).toEqual([`aa:${expected}`]);
      const reopened = parsed(decodeSgf(new TextEncoder().encode(serializeSgf(record))));
      expect(semanticRecord(reopened)).toBe(semanticRecord(record));
      expect(reopened.games[0]!.properties.CA).toEqual(['UTF-8']);
    }
  });
  test('byte decoding applies property character limits to the decoded text', () => {
    const input = '(;CA[UTF-8]C[한글한글])';
    expect(
      parsed(decodeSgf(new TextEncoder().encode(input), { maxValueLength: 6 })).games[0]!.properties
        .C,
    ).toEqual(['한글한글']);
    expect(
      decodeSgf(new TextEncoder().encode('(;CA[UTF-8]C[한글한글한글한글])'), {
        maxValueLength: 6,
      }).ok,
    ).toBe(false);
    expect(
      parsed(decodeSgf(new TextEncoder().encode('\uFEFF(;C[한글])'), { maxValueLength: 3 }))
        .games[0]!.properties.C,
    ).toEqual(['한글']);
  });
  test('multibyte recovery still requires a real matching root encoding declaration', () => {
    const bytes = new Uint8Array([
      ...new TextEncoder().encode('(;C[CA[Shift_JIS\\] '),
      0x83,
      0x5c,
      ...new TextEncoder().encode('])'),
    ]);
    expect(decodeSgf(bytes).ok).toBe(false);
    const mixed = new Uint8Array([
      ...new TextEncoder().encode('(;CA[Shift_JIS]C['),
      0x83,
      0x5c,
      ...new TextEncoder().encode('])(;CA[UTF-8])'),
    ]);
    expect(decodeSgf(mixed).ok).toBe(false);
  });
  test('rejects invalid structure, conflicting setup, malformed points and other formats', () => {
    for (const input of [
      '()',
      '(;C[x]C[y])',
      '(;B[aa]W[bb])',
      '(;SZ[9]B[zz])',
      '(;AB[aa]AW[aa])',
      '(;B[aa]PL[W])',
      '(;GM[2])',
      '(;FF[3])',
      '(;MN[NaN])',
      '(;C[unfinished)',
    ]) {
      expect(parseSgf(input).ok).toBe(false);
    }
  });
  test('limits bytes, nodes, variation nesting and property values explicitly', () => {
    expect(parseSgf('(;C[long])', { maxBytes: 4 }).ok).toBe(false);
    expect(parseSgf('(;B[aa];W[bb])', { maxNodes: 1 }).ok).toBe(false);
    expect(parseSgf('(;B[aa](;W[bb]))', { maxDepth: 1 }).ok).toBe(false);
    expect(parseSgf('(;C[long])', { maxValueLength: 2 }).ok).toBe(false);
  });
  test('handles long linear records iteratively instead of exhausting the call stack', () => {
    const record = parsed(parseSgf(`(;SZ[9]${';B[];W[]'.repeat(3000)})`));
    expect(parsed(parseSgf(serializeSgf(record))).games.length).toBe(1);
  });
  test('bounds expanded point area across nodes and games for text and byte imports', () => {
    const source = '(;SZ[52]TR[aa:ZZ])(;SZ[52]AB[aa:ZZ])';
    for (const input of [source, new TextEncoder().encode(source)]) {
      // Both representations use the same collection-wide area budget.
      const run = (limit: number) =>
        typeof input === 'string'
          ? parseSgf(input, { maxExpandedPoints: limit })
          : decodeSgf(input, { maxExpandedPoints: limit });
      expect(run(5408).ok).toBe(true);
      const rejected = run(5407);
      expect(rejected.ok).toBe(false);
      if (!rejected.ok) expect(rejected.diagnostics[0]?.code).toBe('limit');
    }
    expect(parseSgf(`(;SZ[52]${';TR[aa:ZZ]'.repeat(400)})`).ok).toBe(false);
    expect(parseSgf('(;SZ[9]DD[]VW[]TB[]TW[])', { maxExpandedPoints: 1 }).ok).toBe(true);
    expect(() => parseSgf('(;)', { maxExpandedPoints: 0 })).toThrow(RangeError);
  });
  test('rectangle masks preserve overlap checks across the 32-bit and board boundaries', () => {
    expect(parseSgf('(;SZ[52]TR[aa:Fa][Ga:Za][ab:Zb])', { maxExpandedPoints: 104 }).ok).toBe(true);
    for (const points of ['[aa:Za][Fa]', '[Fa:Ga][Ga]', '[ZZ][ZZ]', '[aa:bb][bb:cc]'])
      expect(parseSgf(`(;SZ[52]TR${points})`).ok).toBe(false);
    expect(parseSgf('(;SZ[52]AB[aa:Ga]AW[Fa:Za])').ok).toBe(false);
    expect(parseSgf('(;SZ[52]AB[aa:Fa]AW[Ga:Za])').ok).toBe(true);
    expect(parseSgf('(;SZ[52]TR[bb:aa])').ok).toBe(false);
  });
  test('compressed point lists compare semantically to expanded lists', () => {
    expect(semanticRecord(parsed(parseSgf('(;SZ[9]TR[aa:bb])')))).toBe(
      semanticRecord(parsed(parseSgf('(;SZ[9]TR[aa][ba][ab][bb])'))),
    );
  });
});
