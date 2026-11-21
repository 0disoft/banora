import type { ControllerState } from './controller.js';
import type { SgfNode } from './sgf.js';
import { pointFromSgf } from './sgf.js';
import type { Point } from './core.js';
import { recordNumberingKey } from './record-numbering-key.js';
import { indexedSnapshotNodes } from './record-runtime.js';

export interface VariationRow {
  readonly node: SgfNode;
  readonly depth: number;
  readonly indent: number;
  readonly moveNumber: number;
  readonly collapsed: boolean;
  readonly branch: boolean;
}

interface OutlineRow extends VariationRow {
  readonly parentMove: number;
}

interface OutlineCheckpoint {
  readonly game: number;
  readonly selected: string;
  readonly focused: boolean;
  readonly limit: number;
  readonly rows: readonly (Omit<OutlineRow, 'node'> & { id: string })[];
  readonly truncated: boolean;
}

// Keep one bounded layout. Entries own IDs and row metadata, not authored nodes.
let outlineCheckpoint = new WeakMap<object, OutlineCheckpoint>();

interface ForkKey {
  readonly key: string;
  readonly forks: number;
}
interface ForkCheckpoint extends ForkKey {
  readonly node: SgfNode;
  readonly parentId: string | undefined;
  readonly game: number;
  readonly depth: number;
}
// One weak entry, no ancestor arrays or historical record keys retained.
let forkCheckpoint = new WeakMap<object, ForkCheckpoint>();

function fullForkKey(state: ControllerState): ForkKey {
  let node = state.record.games[state.gameIndex]!;
  const chosen: string[] = [];
  for (const id of state.path.slice(1)) {
    if (node.children.length > 1) chosen.push(id);
    node = node.children.find((child) => child.id === id)!;
  }
  return { key: chosen.join('/'), forks: chosen.length };
}

/** Identifies chosen fork paths without rebuilding rows on linear navigation. */
export function variationPathKey(state: ControllerState): string {
  const identity = recordNumberingKey(state.record);
  const before = forkCheckpoint.get(identity);
  let result: ForkKey | undefined;
  if (before?.game === state.gameIndex) {
    if (before.depth === state.path.length && before.node.id === state.node.id) result = before;
    else if (before.depth + 1 === state.path.length) {
      const children = before.node.children;
      if (children.some((child) => child.id === state.node.id)) {
        const branch = children.length > 1;
        let key = before.key;
        if (branch) key = before.forks ? `${key}/${state.node.id}` : state.node.id;
        result = { key, forks: before.forks + Number(branch) };
      }
    } else if (before.depth === state.path.length + 1 && before.parentId === state.node.id) {
      const branch = state.node.children.length > 1;
      const key = branch
        ? before.key.slice(0, before.key.length - before.node.id.length - Number(before.forks > 1))
        : before.key;
      result = { key, forks: before.forks - Number(branch) };
    }
  }
  result ??= fullForkKey(state);
  forkCheckpoint = new WeakMap([
    [
      identity,
      {
        ...result,
        node: state.node,
        parentId: state.path[state.path.length - 2],
        game: state.gameIndex,
        depth: state.path.length,
      },
    ],
  ]);
  return result.key;
}

function visibleRowCursor(state: ControllerState, focused: boolean) {
  const root = state.record.games[state.gameIndex]!;
  const row = {
    node: root,
    depth: 0,
    indent: 0,
    parentMove: 0,
    branch: false,
    moveNumber: 0,
    collapsed: false,
  };
  let path: Set<string> | undefined;
  const siblings: {
    nodes: readonly SgfNode[];
    index: number;
    depth: number;
    indent: number;
    parentMove: number;
  }[] = [];
  function select(
    node: SgfNode,
    depth: number,
    indent: number,
    parentMove: number,
    branch: boolean,
  ) {
    const props = node.properties;
    row.node = node;
    row.depth = depth;
    row.indent = indent;
    row.parentMove = parentMove;
    row.branch = branch;
    row.moveNumber = props.MN ? Number(props.MN[0]) : parentMove + (props.B || props.W ? 1 : 0);
    row.collapsed =
      focused && branch && node.children.length > 0 && !(path ??= new Set(state.path)).has(node.id);
  }
  select(root, 0, 0, 0, false);
  function next(): boolean {
    const children = row.node.children;
    if (!row.collapsed && children.length) {
      const depth = row.depth + 1;
      const branch = children.length > 1;
      const indent = row.indent + Number(branch);
      const parentMove = row.moveNumber;
      if (branch) siblings.push({ nodes: children, index: 1, depth, indent, parentMove });
      select(children[0]!, depth, indent, parentMove, branch);
      return true;
    }
    const fork = siblings.at(-1);
    if (!fork) return false;
    const node = fork.nodes[fork.index++]!;
    if (fork.index === fork.nodes.length) siblings.pop();
    select(node, fork.depth, fork.indent, fork.parentMove, true);
    return true;
  }
  return { row, next };
}

/** A bounded selected neighborhood; collapsing never modifies the record. */
export function getVariationRows(
  state: ControllerState,
  focused = false,
  limit = 500,
): { rows: VariationRow[]; truncated: boolean } {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50_000)
    throw new RangeError('Variation row limit must be 1 through 50000');
  const nodes =
    limit <= 500 && state.path.length > 500
      ? indexedSnapshotNodes(state, state.record.games[state.gameIndex]!)
      : undefined;
  if (!nodes) return projectVariationRows(state, focused, limit);
  const key = recordNumberingKey(state.record);
  const selected = state.node.id;
  const before = outlineCheckpoint.get(key);
  if (
    before?.game === state.gameIndex &&
    before.selected === selected &&
    before.focused === focused &&
    before.limit === limit
  )
    return {
      rows: before.rows.map(({ id, ...layout }) => ({ node: nodes.get(id)!, ...layout })),
      truncated: before.truncated,
    };
  const result = projectVariationRows(state, focused, limit);
  outlineCheckpoint = new WeakMap([
    [
      key,
      {
        game: state.gameIndex,
        selected,
        focused,
        limit,
        rows: result.rows.map(({ node, ...layout }) => ({ id: node.id, ...layout })),
        truncated: result.truncated,
      },
    ],
  ]);
  return result;
}

function projectVariationRows(
  state: ControllerState,
  focused: boolean,
  limit: number,
): { rows: OutlineRow[]; truncated: boolean } {
  const { row, next } = visibleRowCursor(state, focused);
  const rows: (typeof row)[] = [];
  let selected = false;
  while (rows.length < limit) {
    rows.push({ ...row });
    selected ||= row.node.id === state.node.id;
    if (!next()) return { rows, truncated: false };
  }
  if (selected) return { rows, truncated: true };
  // Reuse slots when scanning the prefix. The initial rows remain a separate fallback.
  const capacity = limit - 1;
  const before = capacity ? rows.slice(-capacity).map((entry) => ({ ...entry })) : [];
  let head = 0;
  do {
    if (row.node.id === state.node.id) {
      const current = { ...row };
      const after: OutlineRow[] = [];
      while (after.length < Math.ceil(capacity / 2) && next()) after.push({ ...row });
      const preceding = before.slice(head).concat(before.slice(0, head));
      const count = capacity - after.length;
      return {
        rows: [...(count ? preceding.slice(-count) : []), current, ...after],
        truncated: true,
      };
    }
    if (capacity) {
      Object.assign(before[head]!, row);
      head = (head + 1) % capacity;
    }
  } while (next());
  return { rows, truncated: true };
}

/** Distinct empty intersections at the current fork; pass/annotation rows stay in the tree. */
export function variationCandidates(
  state: ControllerState,
): readonly { node: SgfNode; point: Point; label: string }[] {
  if (state.node.children.length < 2) return [];
  const { width, height, board } = state.position;
  const seen = new Set<number>();
  const candidates: { node: SgfNode; point: Point; label: string }[] = [];
  for (const node of state.node.children) {
    const value = node.properties.B?.[0] ?? node.properties.W?.[0];
    if (!value || (value === 'tt' && width <= 19 && height <= 19)) continue;
    const point = pointFromSgf(value, width, height);
    const index = point.y * width + point.x;
    if (board[index] !== null || seen.has(index)) continue;
    seen.add(index);
    candidates.push({
      node,
      point,
      label:
        candidates.length < 26
          ? String.fromCharCode(65 + candidates.length)
          : String(candidates.length + 1),
    });
  }
  return candidates;
}
