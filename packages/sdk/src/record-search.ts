import type { RecordLocator, SgfNode, SgfRecord } from './sgf.js';

export interface RecordSearchOptions {
  readonly query: string;
  readonly properties?: readonly string[];
  readonly caseSensitive?: boolean;
  readonly gameIndex?: number;
  readonly offset?: number;
  readonly limit?: number;
}
export interface RecordSearchHit {
  readonly nodeId: string;
  readonly target: RecordLocator;
  readonly moveNumber: number;
  readonly properties: readonly string[];
  readonly excerpt: string;
}
export interface RecordSearchResult {
  readonly hits: readonly RecordSearchHit[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
  readonly hasMore: boolean;
}
const defaults = ['C', 'N', 'GN', 'PB', 'PW', 'LB'] as const;
const integer = (value: unknown, min: number, max: number) =>
  Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max;
type Step = { index: number; parent: Step | null };
/** Literal, bounded, iterative search across the entire immutable SGF collection. */
export function searchRecord(record: SgfRecord, options: RecordSearchOptions): RecordSearchResult {
  if (
    !options ||
    typeof options !== 'object' ||
    Array.isArray(options) ||
    Object.keys(options).some(
      (key) =>
        !['query', 'properties', 'caseSensitive', 'gameIndex', 'offset', 'limit'].includes(key),
    ) ||
    typeof options.query !== 'string' ||
    options.query.length > 512 ||
    (options.caseSensitive !== undefined && typeof options.caseSensitive !== 'boolean')
  )
    throw new TypeError('Invalid record search options');
  const properties = options.properties ?? defaults;
  const offset = options.offset ?? 0,
    limit = options.limit ?? 50;
  if (
    !integer(offset, 0, 50_000) ||
    !integer(limit, 1, 100) ||
    !Array.isArray(properties) ||
    properties.length < 1 ||
    properties.length > 32 ||
    Array.from(properties).some((key) => typeof key !== 'string' || !/^[A-Z]{1,8}$/.test(key)) ||
    new Set(properties).size !== properties.length ||
    (options.gameIndex !== undefined && !integer(options.gameIndex, 0, record.games.length - 1))
  )
    throw new TypeError('Invalid record search bounds or properties');
  const query = options.caseSensitive ? options.query : options.query.toLowerCase();
  const hits: RecordSearchHit[] = [];
  const pending: { node: SgfNode; game: number; move: number; step: Step | null }[] = [];
  for (let game = record.games.length - 1; game >= 0; game--)
    if (options.gameIndex === undefined || options.gameIndex === game)
      pending.push({ node: record.games[game]!, game, move: 0, step: null });
  let textUnits = 0;
  let total = 0,
    visited = 0,
    pathSteps = 0;
  while (pending.length) {
    if (++visited > 50_000) throw new RangeError('Record search exceeds 50000 nodes');
    const { node, game, move, step } = pending.pop()!;
    const moveNumber = node.properties.MN
      ? Number(node.properties.MN[0])
      : move + (node.properties.B || node.properties.W ? 1 : 0);
    const matched: string[] = [];
    let excerpt = '';
    for (const key of properties) {
      for (const value of node.properties[key] ?? []) {
        textUnits += value.length;
        if (textUnits > 8_388_608) throw new RangeError('Record search exceeds 8 Mi text units');
        if (value.trim() && (options.caseSensitive ? value : value.toLowerCase()).includes(query)) {
          matched.push(key);
          if (!excerpt) excerpt = value.slice(0, 160).replace(/[\uD800-\uDBFF]$/, '');
          break;
        }
      }
    }
    if (matched.length) {
      if (total >= offset && hits.length < limit) {
        const path: number[] = [];
        for (let link = step; link; link = link.parent) {
          if (++pathSteps > 100_000)
            throw new RangeError('Search locator output exceeds 100000 path steps; lower limit');
          path.push(link.index);
        }
        path.reverse();
        hits.push(
          Object.freeze({
            nodeId: node.id,
            target: Object.freeze({ gameIndex: game, path: Object.freeze(path) }),
            moveNumber,
            properties: Object.freeze(matched),
            excerpt,
          }),
        );
      }
      total++;
    }
    for (let index = node.children.length - 1; index >= 0; index--)
      pending.push({
        node: node.children[index]!,
        game,
        move: moveNumber,
        step: { index, parent: step },
      });
  }
  return Object.freeze({
    hits: Object.freeze(hits),
    total,
    offset,
    limit,
    hasMore: offset + hits.length < total,
  });
}
