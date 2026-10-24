import { createSgfNode } from './sgf.js';
import type { SgfNode } from './sgf.js';

const properties = Object.freeze({
  blackPlayer: 'PB',
  whitePlayer: 'PW',
  gameName: 'GN',
  date: 'DT',
  komi: 'KM',
  result: 'RE',
} as const);
type Field = keyof typeof properties;
/** Authored SGF text, including original numeric/date spelling; missing fields stay absent. */
export type GameInfo = Readonly<Partial<Record<Field, string>>>;
/** Undefined leaves a field unchanged; null or an empty string removes its property. */
export type GameInfoPatch = Readonly<
  Partial<Record<Exclude<Field, 'komi'>, string | null>> & {
    komi?: number | string | null;
  }
>;
const MAX_KOMI = 1_000_000_000;
const real = /^[+-]?\d+(?:\.\d+)?$/;

export function readGameInfo(root: SgfNode): GameInfo {
  const info: Partial<Record<Field, string>> = {};
  for (const key of Object.keys(properties) as Field[]) {
    const value = root.properties[properties[key]]?.[0];
    if (value !== undefined) info[key] = value;
  }
  return Object.freeze(info);
}

/** SGF reals do not use exponent notation, including when JS formats tiny numbers that way. */
function decimal(value: number): string {
  const text = String(value),
    [coefficient, exponent] = text.split('e');
  if (exponent === undefined) return text;
  const negative = coefficient!.startsWith('-'),
    unsigned = negative ? coefficient!.slice(1) : coefficient!;
  const [integer, fraction = ''] = unsigned.split('.'),
    digits = integer! + fraction;
  const point = integer!.length + Number(exponent);
  const expanded =
    point <= 0
      ? `0.${'0'.repeat(-point)}${digits}`
      : point >= digits.length
        ? digits + '0'.repeat(point - digits.length)
        : `${digits.slice(0, point)}.${digits.slice(point)}`;
  return (negative ? '-' : '') + expanded;
}

/** FF4 DT partial dates and left-to-right month/day shortcuts, using Gregorian arithmetic. */
function validDate(text: string): boolean {
  let year: number | undefined, month: number | undefined, day: number | undefined;
  for (const token of text.split(',')) {
    const full = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(token);
    if (full) {
      year = Number(full[1]);
      month = full[2] === undefined ? undefined : Number(full[2]);
      day = full[3] === undefined ? undefined : Number(full[3]);
    } else {
      const short = /^(\d{2})(?:-(\d{2}))?$/.exec(token);
      if (!short || year === undefined || month === undefined) return false;
      if (short[2] !== undefined) {
        month = Number(short[1]);
        day = Number(short[2]);
      } else if (day === undefined) month = Number(short[1]);
      else day = Number(short[1]);
    }
    if (month !== undefined && (month < 1 || month > 12)) return false;
    const leap = year! % 4 === 0 && (year! % 100 !== 0 || year! % 400 === 0);
    const days = month === 2 ? (leap ? 29 : 28) : [4, 6, 9, 11].includes(month!) ? 30 : 31;
    if (day !== undefined && (day < 1 || day > days)) return false;
  }
  return true;
}

function validResult(text: string): boolean {
  if (['0', 'Draw', 'Void', '?'].includes(text)) return true;
  const win = /^[BW]\+(.*)$/.exec(text);
  if (!win) return false;
  const score = win[1]!;
  return (
    ['', 'R', 'Resign', 'T', 'Time', 'F', 'Forfeit'].includes(score) ||
    (real.test(score) && Number.isFinite(Number(score)) && Number(score) >= 0)
  );
}

export function buildGameInfo(
  root: SgfNode,
  patch: GameInfoPatch,
  maxLength: number,
): { ok: true; node: SgfNode } | { ok: false; reason: 'invalid-edit' | 'limit' } {
  const invalid = { ok: false, reason: 'invalid-edit' } as const;
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return invalid;
  const prototype = Object.getPrototypeOf(patch);
  if (prototype !== null && Object.getPrototypeOf(prototype) !== null) return invalid;
  const changed = { ...root.properties };
  let dirty = false;
  for (const key of Reflect.ownKeys(patch)) {
    if (typeof key !== 'string' || !Object.hasOwn(properties, key)) return invalid;
    const descriptor = Object.getOwnPropertyDescriptor(patch, key)!;
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) return invalid;
    let value: unknown = descriptor.value;
    if (value === undefined) continue;
    if (key === 'komi' && typeof value === 'number') {
      if (!Number.isFinite(value) || Math.abs(value) > MAX_KOMI) return invalid;
      value = decimal(value);
    }
    if (value !== null && typeof value !== 'string') return invalid;
    const text =
      value === null
        ? ''
        : (value as string).replace(/\r\n|\n\r|\r/g, '\n').replace(/[\n\t\v\f]/g, ' ');
    if (text.length > maxLength) return { ok: false, reason: 'limit' };
    if (
      text &&
      ((key === 'date' && !validDate(text)) ||
        (key === 'result' && !validResult(text)) ||
        (key === 'komi' &&
          (!real.test(text) ||
            !Number.isFinite(Number(text)) ||
            Math.abs(Number(text)) > MAX_KOMI)))
    )
      return invalid;
    const property = properties[key as Field];
    if (text) {
      if (changed[property]?.length === 1 && changed[property][0] === text) continue;
      changed[property] = [text];
    } else {
      if (!Object.hasOwn(changed, property)) continue;
      delete changed[property];
    }
    dirty = true;
  }
  return {
    ok: true,
    node: dirty ? createSgfNode(root.id, changed, root.children, root.rawProperties) : root,
  };
}
