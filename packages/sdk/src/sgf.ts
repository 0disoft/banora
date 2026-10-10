import { createPosition, isOnBoard } from './core.js';
import type { Point } from './core.js';

export interface SgfNode {
  readonly id: string;
  readonly properties: Readonly<Record<string, readonly string[]>>;
  readonly children: readonly SgfNode[];
  /** Preserves escaping for unedited unknown/composed property values. */
  readonly rawProperties: Readonly<Record<string, readonly string[]>>;
}
export interface SgfRecord { readonly games: readonly SgfNode[] }
export interface SgfLimits {
  readonly maxBytes: number;
  readonly maxNodes: number;
  readonly maxDepth: number;
  readonly maxValueLength: number;
}
export const DEFAULT_SGF_LIMITS: SgfLimits = Object.freeze({
  maxBytes: 5 * 1024 * 1024, maxNodes: 50_000, maxDepth: 128, maxValueLength: 65_536,
});
export interface SgfDiagnostic {
  readonly code: 'syntax' | 'limit' | 'encoding' | 'unsupported' | 'property';
  readonly message: string;
  readonly offset?: number;
}
export type SgfResult =
  | { readonly ok: true; readonly record: SgfRecord; readonly diagnostics: readonly SgfDiagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly SgfDiagnostic[] };

const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const simpleText = new Set(['N', 'AP', 'CA', 'AN', 'BR', 'BT', 'CP', 'DT', 'EV', 'GN',
  'ON', 'OT', 'PB', 'PC', 'PW', 'RE', 'RO', 'RU', 'SO', 'US', 'WR', 'WT', 'LB']);
const pointLists = new Set(['AB', 'AW', 'AE', 'CR', 'SQ', 'TR', 'MA', 'SL', 'DD', 'TB', 'TW', 'VW']);
const rootOnly = new Set(['FF', 'GM', 'CA', 'AP', 'SZ', 'ST']);
const scalar = new Set(['B', 'W', 'FF', 'GM', 'CA', 'AP', 'SZ', 'ST', 'PL', 'C', 'GC',
  'N', 'HA', 'KM', 'MN', 'PB', 'PW', 'BR', 'WR', 'RU']);

class SgfError extends Error {
  constructor(readonly diagnostic: SgfDiagnostic) { super(diagnostic.message); }
}
function fail(code: SgfDiagnostic['code'], message: string, offset?: number): never {
  throw new SgfError(Object.freeze({ code, message, ...(offset === undefined ? {} : { offset }) }));
}
function limitsFor(options: Partial<SgfLimits>): SgfLimits {
  const limits = { ...DEFAULT_SGF_LIMITS, ...options };
  if (Object.values(limits).some(value => !Number.isSafeInteger(value) || value < 1)) {
    throw new RangeError('SGF limits must be positive safe integers');
  }
  return limits;
}
function valuesObject(source: Readonly<Record<string, readonly string[]>>) {
  const result: Record<string, readonly string[]> = Object.create(null);
  for (const [key, values] of Object.entries(source)) result[key] = Object.freeze([...values]);
  return Object.freeze(result);
}
export function createSgfNode(id: string, properties: Readonly<Record<string, readonly string[]>>,
  children: readonly SgfNode[] = [], rawProperties: Readonly<Record<string, readonly string[]>> = {}): SgfNode {
  return Object.freeze({ id, properties: valuesObject(properties),
    children: Object.freeze([...children]), rawProperties: valuesObject(rawProperties) });
}

function decodeValue(raw: string, key: string): string {
  let decoded = '';
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
  if (value.length !== 2 || !isOnBoard({ width, height }, point)) fail('property', `Invalid SGF point: ${value}`);
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
  try { createPosition({ width: width!, height }); }
  catch { fail('property', 'SGF board dimensions must be from 2 to 52'); }
  return { width: width!, height };
}

function validateGame(root: SgfNode): void {
  if (root.properties.FF && root.properties.FF[0] !== '4') fail('unsupported', 'Only SGF FF4 is supported');
  if (root.properties.GM && root.properties.GM[0] !== '1') fail('unsupported', 'Only Go (GM[1]) is supported');
  const { width, height } = sgfBoardSize(root);
  const pending = [root];
  while (pending.length) {
    const node = pending.pop()!;
    const props = node.properties;
    for (const [key, values] of Object.entries(props)) {
      if (scalar.has(key) && values.length !== 1) fail('property', `${key} requires one value`);
      if (rootOnly.has(key) && node !== root) fail('property', `${key} is only valid on a game root`);
      if (pointLists.has(key)) {
        const seen = new Set<string>();
        for (const value of values) {
          if (value === '' && ['DD', 'VW', 'TB', 'TW'].includes(key)) continue;
          for (const point of expandSgfPoints(value, width, height)) {
            const name = pointToSgf(point);
            if (seen.has(name)) fail('property', `Duplicate ${key} point: ${name}`);
            seen.add(name);
          }
        }
      }
      if (key === 'LB') for (const value of values) {
        if (value[2] !== ':') fail('property', 'Labels require point:text');
        pointFromSgf(value.slice(0, 2), width, height);
      }
      if (key === 'LN' || key === 'AR') {
        const seen = new Set<string>();
        for (const value of values) {
          if (value.length !== 5 || value[2] !== ':') fail('property', `${key} requires point:point`);
          pointFromSgf(value.slice(0, 2), width, height);
          pointFromSgf(value.slice(3), width, height);
          if (value.slice(0, 2) === value.slice(3)) fail('property', `${key} endpoints must differ`);
          const canonical = key === 'LN' ? value.split(':').sort().join(':') : value;
          if (seen.has(canonical)) fail('property', `Duplicate ${key} connection`);
          seen.add(canonical);
        }
      }
      if (key === 'PL' && !['B', 'W'].includes(values[0]!)) fail('property', 'Invalid player to move');
      if (key === 'MN' && (!/^\d+$/.test(values[0]!) || !Number.isSafeInteger(Number(values[0])))) fail('property', 'Invalid move number');
    }
    if (props.B && props.W) fail('property', 'B and W cannot occur on the same node');
    if ((props.B || props.W) && (props.AB || props.AW || props.AE || props.PL)) {
      fail('property', 'Move and setup properties cannot share a node');
    }
    const move = props.B?.[0] ?? props.W?.[0];
    if (move !== undefined && move !== '' && !(move === 'tt' && width <= 19 && height <= 19)) {
      pointFromSgf(move, width, height);
    }
    const occupied = new Set<string>();
    for (const key of ['AB', 'AW', 'AE']) for (const value of props[key] ?? []) {
      for (const point of expandSgfPoints(value, width, height)) {
        const name = pointToSgf(point);
        if (occupied.has(name)) fail('property', 'Setup properties contain conflicting points');
        occupied.add(name);
      }
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
  if (new TextEncoder().encode(text).length > limits.maxBytes) fail('limit', 'SGF input exceeds byte limit');
  let offset = 0;
  const nodes: MutableNode[] = [];
  const roots: MutableNode[] = [];
  const stack: { last: MutableNode | null; branched: boolean }[] = [];
  const whitespace = () => { while (/\s/.test(text[offset] ?? '') && offset < text.length) offset++; };
  while (offset < text.length) {
    whitespace();
    if (offset >= text.length) break;
    const character = text[offset++];
    if (character === '(') {
      if (stack.length >= limits.maxDepth) fail('limit', 'SGF variation depth exceeded', offset);
      if (stack.length && !stack.at(-1)!.last) fail('syntax', 'Variation requires a parent node', offset);
      if (stack.length) stack.at(-1)!.branched = true;
      stack.push({ last: null, branched: false });
    } else if (character === ')') {
      if (!stack.length || !stack.at(-1)!.last) fail('syntax', 'Empty or unmatched game tree', offset);
      stack.pop();
    } else if (character === ';') {
      const frame = stack.at(-1);
      if (!frame || frame.branched) fail('syntax', 'Node outside sequence', offset);
      if (nodes.length >= limits.maxNodes) fail('limit', 'SGF node limit exceeded', offset);
      const node: MutableNode = { id: `n${nodes.length + 1}`, properties: Object.create(null),
        rawProperties: Object.create(null), children: [] };
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
          let raw = '';
          let closed = false;
          while (offset < text.length) {
            const next = text[offset++]!;
            if (next === ']') { closed = true; break; }
            raw += next;
            if (next === '\\') {
              if (offset >= text.length) fail('syntax', 'Dangling value escape', offset);
              raw += text[offset++];
            }
            if (raw.length > limits.maxValueLength) fail('limit', 'SGF property value limit exceeded', offset);
          }
          if (!closed) fail('syntax', 'Unclosed property value', offset);
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
    Object.assign(node, { properties: valuesObject(node.properties), rawProperties: valuesObject(node.rawProperties),
      children: Object.freeze(node.children) });
    Object.freeze(node);
  }
  const record: SgfRecord = Object.freeze({ games: Object.freeze(roots) });
  for (const root of record.games) validateGame(root);
  if (new TextEncoder().encode(serializeSgf(record)).length > limits.maxBytes) {
    fail('limit', 'Normalized UTF-8 export exceeds byte limit');
  }
  return record;
}

export function parseSgf(text: string, options: Partial<SgfLimits> = {}): SgfResult {
  const limits = limitsFor(options);
  try { return { ok: true, record: parse(text.replace(/^\uFEFF/, ''), limits), diagnostics: Object.freeze([]) }; }
  catch (error) {
    if (!(error instanceof SgfError)) throw error;
    return { ok: false, diagnostics: Object.freeze([error.diagnostic]) };
  }
}

function latin1(bytes: Uint8Array): string {
  let text = '';
  for (let start = 0; start < bytes.length; start += 8192) text += String.fromCharCode(...bytes.subarray(start, start + 8192));
  return text;
}
export function decodeSgf(bytes: Uint8Array, options: Partial<SgfLimits> = {}): SgfResult {
  const limits = limitsFor(options);
  if (bytes.length > limits.maxBytes) return { ok: false, diagnostics: [{ code: 'limit', message: 'SGF input exceeds byte limit' }] };
  // Parse an ASCII-compatible view to find real root CA properties, never a regex
  // that could mistake comment contents for an encoding declaration.
  const probe = parseSgf(latin1(bytes).replace(/^\xEF\xBB\xBF/, ''), { ...limits, maxBytes: limits.maxBytes * 2 });
  if (!probe.ok) return probe;
  const utf8Bom = bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191;
  const normalize = (label: string) => label.toLowerCase().replace(/[_\s]/g, '-');
  const encodings = probe.record.games.map(root => normalize(root.properties.CA?.[0] ?? (utf8Bom ? 'utf-8' : 'iso-8859-1')));
  if (new Set(encodings).size !== 1) return { ok: false, diagnostics: [{ code: 'encoding', message: 'Mixed-encoding collections are not supported' }] };
  const encoding = encodings[0]!;
  const supported = new Set(['utf-8', 'utf8', 'iso-8859-1', 'latin1', 'windows-1252', 'shift-jis', 'sjis', 'gb18030', 'euc-kr']);
  if (!supported.has(encoding)) return { ok: false, diagnostics: [{ code: 'encoding', message: `Unsupported SGF encoding: ${encoding}` }] };
  try {
    const text = ['iso-8859-1', 'latin1'].includes(encoding) ? latin1(bytes) :
      new TextDecoder(encoding === 'sjis' ? 'shift-jis' : encoding, { fatal: true }).decode(bytes);
    return parseSgf(text, limits);
  } catch {
    return { ok: false, diagnostics: [{ code: 'encoding', message: `Invalid bytes for SGF encoding: ${encoding}` }] };
  }
}

function escapeValue(value: string): string { return value.replace(/\\/g, '\\\\').replace(/\]/g, '\\]'); }
function nodeText(node: SgfNode, root: boolean): string {
  const properties = root ? { ...node.properties, FF: ['4'], GM: ['1'], CA: ['UTF-8'] } : node.properties;
  let result = ';';
  for (const key of Object.keys(properties).sort()) {
    const values = properties[key]!;
    result += key;
    for (let index = 0; index < values.length; index++) {
      const value = values[index]!;
      const raw = node.rawProperties[key]?.[index];
      const preserved = raw !== undefined && decodeValue(raw, key) === value && !(root && ['FF', 'GM', 'CA'].includes(key));
      const encoded = preserved ? raw : key === 'LB' ?
        `${value.slice(0, 2)}:${escapeValue(value.slice(3)).replace(/:/g, '\\:')}` : escapeValue(value);
      result += `[${encoded}]`;
    }
  }
  return result;
}
export function serializeSgf(record: SgfRecord): string {
  const pieces: string[] = [];
  const stack: (string | { node: SgfNode; root: boolean })[] = [];
  for (let i = record.games.length - 1; i >= 0; i--) stack.push({ node: record.games[i]!, root: true });
  while (stack.length) {
    const item = stack.pop()!;
    if (typeof item === 'string') { pieces.push(item); continue; }
    pieces.push('(');
    let node = item.node;
    pieces.push(nodeText(node, item.root));
    while (node.children.length === 1) { node = node.children[0]!; pieces.push(nodeText(node, false)); }
    stack.push(')');
    for (let i = node.children.length - 1; i >= 0; i--) stack.push({ node: node.children[i]!, root: false });
  }
  return pieces.join('') + '\n';
}
