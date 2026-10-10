import { createPosition, replayMove, setup } from './core.js';
import type { Color, Position, RulePolicy, SetupStone } from './core.js';
import { expandSgfPoints, pointFromSgf, pointToSgf, sgfBoardSize } from './sgf.js';
import type { SgfNode, SgfRecord } from './sgf.js';

export function initialRecordPosition(root: SgfNode, rules?: Partial<RulePolicy>): Position {
  return createPosition({ ...sgfBoardSize(root), rules,
    toPlay: Number(root.properties.HA?.[0] ?? '0') >= 2 ? 'white' : 'black' });
}

export function applyRecordNode(position: Position, node: SgfNode): Position {
  const props = node.properties;
  const stones: SetupStone[] = [];
  for (const [key, color] of [['AB', 'black'], ['AW', 'white'], ['AE', null]] as const) {
    for (const value of props[key] ?? []) for (const point of expandSgfPoints(value, position.width, position.height)) {
      stones.push({ ...point, color });
    }
  }
  if (stones.length || props.PL) {
    const toPlay = props.PL ? (props.PL[0] === 'W' ? 'white' : 'black') : position.toPlay;
    const result = setup(position, stones, toPlay);
    if (!result.ok) throw new Error(`Invalid setup at ${node.id}: ${result.reason}`);
    position = result.position;
  }
  for (const [key, color] of [['B', 'black'], ['W', 'white']] as const) {
    const value = props[key]?.[0];
    if (value === undefined) continue;
    const point = value === '' || (value === 'tt' && position.width <= 19 && position.height <= 19) ? null :
      pointFromSgf(value, position.width, position.height);
    const result = replayMove(position, point, color);
    if (!result.ok) throw new Error(`Invalid move at ${node.id}: ${result.reason}`);
    position = result.position;
  }
  if (props.MN) position = Object.freeze({ ...position, moveNumber: Number(props.MN[0]) });
  return position;
}

export interface RecordIndex {
  nodes: Map<string, SgfNode>;
  parents: Map<string, string | null>;
  games: Map<string, number>;
}
export function indexRecord(record: SgfRecord): RecordIndex {
  const index: RecordIndex = { nodes: new Map(), parents: new Map(), games: new Map() };
  const pending: { node: SgfNode; parent: string | null; game: number }[] = [];
  record.games.forEach((node, game) => pending.push({ node, game, parent: null }));
  while (pending.length) {
    const { node, parent, game } = pending.pop()!;
    if (index.nodes.has(node.id)) throw new Error('Record node identities must be unique');
    index.nodes.set(node.id, node);
    index.parents.set(node.id, parent);
    index.games.set(node.id, game);
    for (const child of node.children) pending.push({ node: child, parent: node.id, game });
  }
  return index;
}

/** Stable content comparison excludes identities, cursor and original formatting. */
export function semanticRecord(record: SgfRecord): string {
  const tokens: string[] = [];
  const pending: (string | { node: SgfNode; root: boolean; width: number; height: number })[] = [];
  for (let i = record.games.length - 1; i >= 0; i--) pending.push({ node: record.games[i]!, root: true, ...sgfBoardSize(record.games[i]!) });
  while (pending.length) {
    const entry = pending.pop()!;
    if (typeof entry === 'string') { tokens.push(entry); continue; }
    const properties = entry.root ? { ...entry.node.properties, FF: ['4'], GM: ['1'], CA: ['UTF-8'] } : entry.node.properties;
    const pointLists = new Set(['AB', 'AW', 'AE', 'CR', 'SQ', 'TR', 'MA', 'SL', 'DD', 'TB', 'TW', 'VW']);
    tokens.push('[', JSON.stringify(Object.keys(properties).sort().map(key => {
      const values = properties[key]!;
      if (pointLists.has(key)) return [key, values.flatMap(value => value === '' ? [''] :
        expandSgfPoints(value, entry.width, entry.height).map(pointToSgf)).sort()];
      return [key, key === 'LB' ? [...values].sort() : values];
    })));
    pending.push(']');
    for (let i = entry.node.children.length - 1; i >= 0; i--) pending.push({ node: entry.node.children[i]!, root: false, width: entry.width, height: entry.height });
  }
  return tokens.join('');
}

export function sgfColor(color: Color): 'B' | 'W' { return color === 'black' ? 'B' : 'W'; }
