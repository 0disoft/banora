import { createPosition, isOnBoard } from './core.js';
import type { Point } from './core.js';
import { decodeStrokes } from './annotations.js';

export interface SgfNode {
  readonly id: string;
  readonly properties: Readonly<Record<string, readonly string[]>>;
  readonly children: readonly SgfNode[];
  /** Preserves escaping for unedited unknown/composed property values. */
  readonly rawProperties: Readonly<Record<string, readonly string[]>>;
}
export interface SgfRecord {
  readonly games: readonly SgfNode[];
}
/** Stable locator within a serialized collection; path contains child indices. */
export interface RecordLocator {
  readonly gameIndex: number;
  readonly path: readonly number[];
}
export function recordNodeAt(record: SgfRecord, locator: RecordLocator): SgfNode | null {
  if (
    !locator ||
    !Number.isSafeInteger(locator.gameIndex) ||
    locator.gameIndex < 0 ||
    !Array.isArray(locator.path) ||
    locator.path.length > 50_000 ||
    locator.path.some((index) => !Number.isSafeInteger(index) || index < 0)
  )
    return null;
  let node = record.games[locator.gameIndex];
  for (const index of locator.path) {
    node = node?.children[index];
    if (!node) return null;
  }
  return node ?? null;
}
export interface SgfLimits {
  readonly maxBytes: number;
  readonly maxNodes: number;
  readonly maxDepth: number;
  readonly maxValueLength: number;
  /** Total point-list area across all games; defaults to one million. */
  readonly maxExpandedPoints?: number;
}
export const DEFAULT_SGF_LIMITS: Required<SgfLimits> = Object.freeze({
  maxBytes: 5 * 1024 * 1024,
  maxNodes: 50_000,
  maxDepth: 128,
  maxValueLength: 65_536,
  maxExpandedPoints: 1_000_000,
});
export interface SgfDiagnostic {
  readonly code: 'syntax' | 'limit' | 'encoding' | 'unsupported' | 'property';
  readonly message: string;
  readonly offset?: number;
}
export type SgfResult =
  | {
      readonly ok: true;
      readonly record: SgfRecord;
      readonly diagnostics: readonly SgfDiagnostic[];
    }
  | { readonly ok: false; readonly diagnostics: readonly SgfDiagnostic[] };

const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const simpleText = new Set([
  'N',
  'AP',
  'CA',
  'AN',
  'BR',
  'BT',
  'CP',
  'DT',
  'EV',
  'GN',
  'ON',
  'OT',
  'PB',
  'PC',
  'PW',
  'RE',
  'RO',
  'RU',
  'SO',
  'US',
  'WR',
  'WT',
  'LB',
]);
const pointLists = new Set([
  'AB',
  'AW',
  'AE',
  'CR',
  'SQ',
  'TR',
  'MA',
  'SL',
  'DD',
  'TB',
  'TW',
  'VW',
]);
const rootOnly = new Set(['FF', 'GM', 'CA', 'AP', 'SZ', 'ST']);
const scalar = new Set([
  'B',
  'W',
  'FF',
  'GM',
  'CA',
  'AP',
  'SZ',
  'ST',
  'PL',
  'C',
  'GC',
  'N',
  'HA',
  'KM',
  'MN',
  'PB',
  'PW',
  'BR',
  'WR',
  'RU',
]);

class SgfError extends Error {
  constructor(readonly diagnostic: SgfDiagnostic) {
    super(diagnostic.message);
  }
}
function fail(code: SgfDiagnostic['code'], message: string, offset?: number): never {
  throw new SgfError(Object.freeze({ code, message, ...(offset === undefined ? {} : { offset }) }));
}
function limitsFor(options: Partial<SgfLimits>): Required<SgfLimits> {
  const limits = { ...DEFAULT_SGF_LIMITS, ...options };
  if (Object.values(limits).some((value) => !Number.isSafeInteger(value) || value < 1)) {
    throw new RangeError('SGF limits must be positive safe integers');
  }
  return limits;
}
function valuesObject(source: Readonly<Record<string, readonly string[]>>) {
  const result: Record<string, readonly string[]> = Object.create(null);
  for (const [key, values] of Object.entries(source)) result[key] = Object.freeze([...values]);
  return Object.freeze(result);
}
export function createSgfNode(
  id: string,
  properties: Readonly<Record<string, readonly string[]>>,
  children: readonly SgfNode[] = [],
  rawProperties: Readonly<Record<string, readonly string[]>> = {},
): SgfNode {
  return Object.freeze({
    id,
    properties: valuesObject(properties),
    children: Object.freeze([...children]),
    rawProperties: valuesObject(rawProperties),
  });
}

function decodeValue(raw: string, key: string): string {
  // Most values have no escapes or line endings; retain their existing string.
  let decoded = raw;
  if (/[\\\r\n]/.test(raw)) {
    decoded = '';
    for (let i = 0; i < raw.length; i++) {
      let character = raw[i]!;
      if (character === '\\') {
        character = raw[++i] ?? '';
        if (character === '\r' || character === '\n') {
          if ((raw[i + 1] === '\r' || raw[i + 1] === '\n') && raw[i + 1] !== character) i++;
          continue;
        }
      } else if (character === '\r' || character === '\n') {
        if ((raw[i + 1] === '\r' || raw[i + 1] === '\n') && raw[i + 1] !== character) i++;
        character = '\n';
      }
      decoded += character;
    }
  }
  if (key === 'C' || key === 'GC') return decoded.replace(/[\t\v\f]/g, ' ');
  if (simpleText.has(key)) return decoded.replace(/[\n\t\v\f]/g, ' ');
  return decoded;
}

export function pointToSgf(point: Point): string {
  if (!isOnBoard({ width: 52, height: 52 }, point)) throw new RangeError('Invalid SGF point');
  return alphabet[point.x]! + alphabet[point.y]!;
}
export function pointFromSgf(value: string, width = 19, height = width): Point {
  const point = { x: alphabet.indexOf(value[0] ?? ''), y: alphabet.indexOf(value[1] ?? '') };
  if (value.length !== 2 || !isOnBoard({ width, height }, point))
    fail('property', `Invalid SGF point: ${value}`);
  return Object.freeze(point);
}
export function expandSgfPoints(value: string, width: number, height = width): readonly Point[] {
  if (!value.includes(':')) return [pointFromSgf(value, width, height)];
  const parts = value.split(':');
  if (parts.length !== 2) fail('property', `Invalid point rectangle: ${value}`);
  const from = pointFromSgf(parts[0]!, width, height);
  const to = pointFromSgf(parts[1]!, width, height);
  if (from.x > to.x || from.y > to.y) fail('property', `Reversed point rectangle: ${value}`);
  const result: Point[] = [];
  for (let y = from.y; y <= to.y; y++) for (let x = from.x; x <= to.x; x++) result.push({ x, y });
  return result;
}
export function sgfBoardSize(root: SgfNode): { width: number; height: number } {
  const text = root.properties.SZ?.[0] ?? '19';
  if (!/^\d+(?::\d+)?$/.test(text)) fail('property', 'Invalid SZ property');
  const [width, suppliedHeight] = text.split(':').map(Number);
  const height = suppliedHeight ?? width!;
  try {
    createPosition({ width: width!, height });
  } catch {
    fail('property', 'SGF board dimensions must be from 2 to 52');
  }
  return { width: width!, height };
}

/** Validate rectangles with row masks instead of allocating every covered point. */
function claimPoints(
  value: string,
  width: number,
  height: number,
  seen: Uint32Array,
  message: string,
): number {
  const parts = value.split(':');
  if (parts.length > 2) fail('property', `Invalid point rectangle: ${value}`);
  const from = pointFromSgf(parts[0]!, width, height);
  const to = parts.length === 2 ? pointFromSgf(parts[1]!, width, height) : from;
  if (from.x > to.x || from.y > to.y) fail('property', `Reversed point rectangle: ${value}`);
  for (let y = from.y; y <= to.y; y++) {
    for (let word = from.x >>> 5; word <= to.x >>> 5; word++) {
      const first = Math.max(from.x - word * 32, 0);
      const last = Math.min(to.x - word * 32, 31);
      const mask = (0xffffffff << first) & (0xffffffff >>> (31 - last));
      const index = y * 2 + word;
      if ((seen[index]! & mask) !== 0) fail('property', message);
      seen[index] = seen[index]! | mask;
    }
  }
  return (to.x - from.x + 1) * (to.y - from.y + 1);
}

function validateGame(root: SgfNode, budget: { remaining: number }): void {
  if (root.properties.FF && root.properties.FF[0] !== '4')
    fail('unsupported', 'Only SGF FF4 is supported');
  if (root.properties.GM && root.properties.GM[0] !== '1')
    fail('unsupported', 'Only Go (GM[1]) is supported');
  const { width, height } = sgfBoardSize(root);
  const pending = [root];
  while (pending.length) {
    const node = pending.pop()!;
    const props = node.properties;
    try {
      decodeStrokes(props.BPN, { width, height });
    } catch (error) {
      fail(
        'property',
        `Invalid BPN ink: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    for (const [key, values] of Object.entries(props)) {
      if (scalar.has(key) && values.length !== 1) fail('property', `${key} requires one value`);
      if (rootOnly.has(key) && node !== root)
        fail('property', `${key} is only valid on a game root`);
      if (pointLists.has(key)) {
        const seen = new Uint32Array(height * 2);
        for (const value of values) {
          if (value === '' && ['DD', 'VW', 'TB', 'TW'].includes(key)) continue;
          budget.remaining -= claimPoints(value, width, height, seen, `Duplicate ${key} point`);
          if (budget.remaining < 0) fail('limit', 'SGF expanded point budget exceeded');
        }
      }
      if (key === 'LB')
        for (const value of values) {
          if (value[2] !== ':') fail('property', 'Labels require point:text');
          pointFromSgf(value.slice(0, 2), width, height);
        }
      if (key === 'LN' || key === 'AR') {
        const seen = new Set<string>();
        for (const value of values) {
          if (value.length !== 5 || value[2] !== ':')
            fail('property', `${key} requires point:point`);
          pointFromSgf(value.slice(0, 2), width, height);
          pointFromSgf(value.slice(3), width, height);
          if (value.slice(0, 2) === value.slice(3))
            fail('property', `${key} endpoints must differ`);
          const canonical = key === 'LN' ? value.split(':').sort().join(':') : value;
          if (seen.has(canonical)) fail('property', `Duplicate ${key} connection`);
          seen.add(canonical);
        }
      }
      if (key === 'PL' && !['B', 'W'].includes(values[0]!))
        fail('property', 'Invalid player to move');
      if (key === 'MN' && (!/^\d+$/.test(values[0]!) || !Number.isSafeInteger(Number(values[0]))))
        fail('property', 'Invalid move number');
    }
    if (props.B && props.W) fail('property', 'B and W cannot occur on the same node');
    if ((props.B || props.W) && (props.AB || props.AW || props.AE || props.PL)) {
      fail('property', 'Move and setup properties cannot share a node');
    }
    const move = props.B?.[0] ?? props.W?.[0];
    if (move !== undefined && move !== '' && !(move === 'tt' && width <= 19 && height <= 19)) {
      pointFromSgf(move, width, height);
    }
    const occupied = new Uint32Array(height * 2);
    for (const key of ['AB', 'AW', 'AE'])
      for (const value of props[key] ?? []) {
        claimPoints(value, width, height, occupied, 'Setup properties contain conflicting points');
      }
    for (const child of node.children) pending.push(child);
  }
}

interface MutableNode {
  id: string;
  properties: Record<string, string[]>;
  rawProperties: Record<string, string[]>;
  children: MutableNode[];
}
function parse(text: string, limits: SgfLimits): SgfRecord {
  if (new TextEncoder().encode(text).length > limits.maxBytes)
    fail('limit', 'SGF input exceeds byte limit');
  let offset = 0;
  const nodes: MutableNode[] = [];
  const roots: MutableNode[] = [];
  const stack: { last: MutableNode | null; branched: boolean }[] = [];
  const valueBoundary = /[\\\]]/g;
  const whitespace = () => {
    while (/\s/.test(text[offset] ?? '') && offset < text.length) offset++;
  };
  while (offset < text.length) {
    whitespace();
    if (offset >= text.length) break;
    const character = text[offset++];
    if (character === '(') {
      if (stack.length >= limits.maxDepth) fail('limit', 'SGF variation depth exceeded', offset);
      if (stack.length && !stack.at(-1)!.last)
        fail('syntax', 'Variation requires a parent node', offset);
      if (stack.length) stack.at(-1)!.branched = true;
      stack.push({ last: null, branched: false });
    } else if (character === ')') {
      if (!stack.length || !stack.at(-1)!.last)
        fail('syntax', 'Empty or unmatched game tree', offset);
      stack.pop();
    } else if (character === ';') {
      const frame = stack.at(-1);
      if (!frame || frame.branched) fail('syntax', 'Node outside sequence', offset);
      if (nodes.length >= limits.maxNodes) fail('limit', 'SGF node limit exceeded', offset);
      const node: MutableNode = {
        id: `n${nodes.length + 1}`,
        properties: Object.create(null),
        rawProperties: Object.create(null),
        children: [],
      };
      nodes.push(node);
      if (frame.last) frame.last.children.push(node);
      else if (stack.length > 1) stack.at(-2)!.last!.children.push(node);
      else roots.push(node);
      frame.last = node;
      whitespace();
      while (/[A-Z]/.test(text[offset] ?? '') && offset < text.length) {
        let key = '';
        while (/[A-Z]/.test(text[offset] ?? '') && offset < text.length) key += text[offset++];
        if (node.properties[key]) fail('property', `Duplicate property: ${key}`, offset);
        const values: string[] = [];
        const rawValues: string[] = [];
        whitespace();
        while (text[offset] === '[') {
          offset++;
          const valueStart = offset;
          let closed = false;
          valueBoundary.lastIndex = offset;
          const boundary = valueBoundary.exec(text);
          if (boundary?.[0] === ']') {
            // Plain values need no character-by-character escape handling.
            if (boundary.index - valueStart > limits.maxValueLength)
              fail(
                'limit',
                'SGF property value limit exceeded',
                valueStart + limits.maxValueLength + 1,
              );
            offset = boundary.index + 1;
            closed = true;
          }
          while (!closed && offset < text.length) {
            const next = text[offset++]!;
            if (next === ']') {
              closed = true;
              break;
            }
            if (next === '\\') {
              if (offset >= text.length) fail('syntax', 'Dangling value escape', offset);
              offset++;
            }
            if (offset - valueStart > limits.maxValueLength)
              fail('limit', 'SGF property value limit exceeded', offset);
          }
          if (!closed) fail('syntax', 'Unclosed property value', offset);
          // Retain the exact original escapes without allocating per character.
          const raw = text.slice(valueStart, offset - 1);
          rawValues.push(raw);
          values.push(decodeValue(raw, key));
          whitespace();
        }
        if (!values.length) fail('syntax', `Missing value for ${key}`, offset);
        node.properties[key] = values;
        node.rawProperties[key] = rawValues;
      }
    } else fail('syntax', `Unexpected token: ${character}`, offset - 1);
  }
  if (stack.length || !roots.length) fail('syntax', 'Incomplete or empty SGF collection', offset);
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i]!;
    // These maps and arrays belong exclusively to the parser. Freeze them in
    // place; createSgfNode still defensively copies caller-owned input.
    for (const values of Object.values(node.properties)) Object.freeze(values);
    for (const values of Object.values(node.rawProperties)) Object.freeze(values);
    Object.freeze(node.properties);
    Object.freeze(node.rawProperties);
    Object.freeze(node.children);
    Object.freeze(node);
  }
  const record: SgfRecord = Object.freeze({ games: Object.freeze(roots) });
  const budget = { remaining: limits.maxExpandedPoints ?? DEFAULT_SGF_LIMITS.maxExpandedPoints };
  for (const root of record.games) validateGame(root, budget);
  if (new TextEncoder().encode(serializeSgf(record)).length > limits.maxBytes) {
    fail('limit', 'Normalized UTF-8 export exceeds byte limit');
  }
  return record;
}

export function parseSgf(text: string, options: Partial<SgfLimits> = {}): SgfResult {
  const limits = limitsFor(options);
  try {
    return {
      ok: true,
      record: parse(text.replace(/^\uFEFF/, ''), limits),
      diagnostics: Object.freeze([]),
    };
  } catch (error) {
    if (!(error instanceof SgfError)) throw error;
    return { ok: false, diagnostics: Object.freeze([error.diagnostic]) };
  }
}

function latin1(bytes: Uint8Array): string {
  let text = '';
  for (let start = 0; start < bytes.length; start += 8192)
    text += String.fromCharCode(...bytes.subarray(start, start + 8192));
  return text;
}
export function decodeSgf(bytes: Uint8Array, options: Partial<SgfLimits> = {}): SgfResult {
  const limits = limitsFor(options);
  if (bytes.length > limits.maxBytes)
    return { ok: false, diagnostics: [{ code: 'limit', message: 'SGF input exceeds byte limit' }] };
  // Parse an ASCII-compatible view to find real root CA properties, never a regex
  // that could mistake comment contents for an encoding declaration.
  const probe = parseSgf(latin1(bytes).replace(/^\xEF\xBB\xBF/, ''), {
    ...limits,
    maxBytes: limits.maxBytes * 2,
  });
  const utf8Bom = bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191;
  const normalize = (label: string) => label.toLowerCase().replace(/[_\s]/g, '-');
  const encodingOf = (record: SgfRecord) => {
    const encodings = record.games.map((root) =>
      normalize(root.properties.CA?.[0] ?? (utf8Bom ? 'utf-8' : 'iso-8859-1')),
    );
    return new Set(encodings).size === 1 ? encodings[0]! : undefined;
  };
  const decoderLabel = (encoding: string) =>
    encoding === 'sjis' ? 'shift-jis' : encoding === 'utf8' ? 'utf-8' : encoding;
  const decode = (encoding: string): SgfResult => {
    try {
      const text = ['iso-8859-1', 'latin1'].includes(encoding)
        ? latin1(bytes)
        : new TextDecoder(decoderLabel(encoding), { fatal: true }).decode(bytes);
      return parseSgf(text, limits);
    } catch {
      return {
        ok: false,
        diagnostics: [{ code: 'encoding', message: `Invalid bytes for SGF encoding: ${encoding}` }],
      };
    }
  };
  if (!probe.ok) {
    // Multibyte trail bytes can resemble SGF escapes/delimiters, and the ASCII
    // probe counts bytes rather than decoded characters. Accept recovery only
    // when a real root CA (or UTF-8 BOM) agrees with the strict decoder.
    for (const encoding of ['utf-8', 'shift-jis', 'gb18030', 'euc-kr']) {
      const decoded = decode(encoding);
      if (decoded.ok) {
        const declared = encodingOf(decoded.record);
        if (declared !== undefined && decoderLabel(declared) === encoding) return decoded;
      }
    }
    return probe;
  }
  const encoding = encodingOf(probe.record);
  if (encoding === undefined)
    return {
      ok: false,
      diagnostics: [{ code: 'encoding', message: 'Mixed-encoding collections are not supported' }],
    };
  const supported = new Set([
    'utf-8',
    'utf8',
    'iso-8859-1',
    'latin1',
    'windows-1252',
    'shift-jis',
    'sjis',
    'gb18030',
    'euc-kr',
  ]);
  if (!supported.has(encoding))
    return {
      ok: false,
      diagnostics: [{ code: 'encoding', message: `Unsupported SGF encoding: ${encoding}` }],
    };
  const decoded = decode(encoding);
  if (decoded.ok && encodingOf(decoded.record) !== encoding)
    return {
      ok: false,
      diagnostics: [{ code: 'encoding', message: 'Mixed-encoding collections are not supported' }],
    };
  return decoded;
}

function escapeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\]/g, '\\]');
}
function nodeText(node: SgfNode, root: boolean): string {
  const properties = root
    ? { ...node.properties, FF: ['4'], GM: ['1'], CA: ['UTF-8'] }
    : node.properties;
  let result = ';';
  for (const key of Object.keys(properties).sort()) {
    const values = properties[key]!;
    result += key;
    for (let index = 0; index < values.length; index++) {
      const value = values[index]!;
      const raw = node.rawProperties[key]?.[index];
      const preserved =
        raw !== undefined &&
        decodeValue(raw, key) === value &&
        !(root && ['FF', 'GM', 'CA'].includes(key));
      const encoded = preserved
        ? raw
        : key === 'LB'
          ? `${value.slice(0, 2)}:${escapeValue(value.slice(3)).replace(/:/g, '\\:')}`
          : escapeValue(value);
      result += `[${encoded}]`;
    }
  }
  return result;
}
export function serializeSgf(record: SgfRecord): string {
  const pieces: string[] = [];
  const stack: (string | { node: SgfNode; root: boolean })[] = [];
  for (let i = record.games.length - 1; i >= 0; i--)
    stack.push({ node: record.games[i]!, root: true });
  while (stack.length) {
    const item = stack.pop()!;
    if (typeof item === 'string') {
      pieces.push(item);
      continue;
    }
    pieces.push('(');
    let node = item.node;
    pieces.push(nodeText(node, item.root));
    while (node.children.length === 1) {
      node = node.children[0]!;
      pieces.push(nodeText(node, false));
    }
    stack.push(')');
    for (let i = node.children.length - 1; i >= 0; i--)
      stack.push({ node: node.children[i]!, root: false });
  }
  return pieces.join('') + '\n';
}
