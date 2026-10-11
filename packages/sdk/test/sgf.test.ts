import { describe, expect, test } from 'bun:test';
import { decodeSgf, parseSgf, serializeSgf } from '../src/sgf.js';
import type { SgfRecord, SgfResult } from '../src/sgf.js';
import { semanticRecord } from '../src/record-runtime.js';

function parsed(result: SgfResult): SgfRecord {
  if (!result.ok) throw new Error(result.diagnostics[0]!.message);
  return result.record;
}

describe('SGF FF4 preservation', () => {
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
  test('compressed point lists compare semantically to expanded lists', () => {
    expect(semanticRecord(parsed(parseSgf('(;SZ[9]TR[aa:bb])')))).toBe(
      semanticRecord(parsed(parseSgf('(;SZ[9]TR[aa][ba][ab][bb])'))),
    );
  });
});
