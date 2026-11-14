import type { ControllerState } from './controller.js';
import type { SgfNode } from './sgf.js';
import { pointFromSgf } from './sgf.js';
import type { Point } from './core.js';
import { recordNumberingKey } from './record-numbering-key.js';

export interface VariationRow {
  readonly node: SgfNode;
  readonly depth: number;
  readonly indent: number;
  readonly moveNumber: number;
  readonly collapsed: boolean;
  readonly branch: boolean;
}

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

function* visibleRows(state: ControllerState, focused: boolean): Generator<VariationRow> {
  const path = new Set(state.path);
  const pending = [
    {
      nodes: [state.record.games[state.gameIndex]!] as readonly SgfNode[],
      index: 0,
      depth: 0,
      indent: 0,
      parentMove: 0,
      branch: false,
    },
  ];
  while (pending.length) {
    const frame = pending.at(-1)!;
    const node = frame.nodes[frame.index++]!;
    // Drop an exhausted sibling cursor before descending: linear games keep one frame.
    if (frame.index === frame.nodes.length) pending.pop();
    const { depth, indent, parentMove, branch } = frame;
    const props = node.properties;
    const moveNumber = props.MN ? Number(props.MN[0]) : parentMove + (props.B || props.W ? 1 : 0);
    const collapsed = focused && branch && !path.has(node.id) && node.children.length > 0;
    const row = { node, depth, indent, parentMove, branch, moveNumber, collapsed };
    yield row;
    if (collapsed || !node.children.length) continue;
    const childBranch = node.children.length > 1;
    pending.push({
      nodes: node.children,
      index: 0,
      depth: depth + 1,
      indent: indent + (childBranch ? 1 : 0),
      parentMove: moveNumber,
      branch: childBranch,
    });
  }
}

/** A bounded selected neighborhood; collapsing never modifies the record. */
export function getVariationRows(state: ControllerState, focused = false, limit = 500) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50_000)
    throw new RangeError('Variation row limit must be 1 through 50000');
  const iterator = visibleRows(state, focused);
  const rows: VariationRow[] = [];
  let selected = false;
  while (rows.length < limit) {
    const step = iterator.next();
    if (step.done) return { rows, truncated: false };
    rows.push(step.value);
    selected ||= step.value.node.id === state.node.id;
  }
  let step = iterator.next();
  if (selected || step.done) return { rows, truncated: !step.done };
  // Keep bounded preceding context without shifting an array for every skipped row.
  const capacity = limit - 1;
  const before = capacity ? rows.slice(-capacity) : [];
  let head = 0;
  while (!step.done) {
    const current = step.value;
    if (current.node.id === state.node.id) {
      const after: VariationRow[] = [];
      while (after.length < Math.ceil(capacity / 2)) {
        const next = iterator.next();
        if (next.done) break;
        after.push(next.value);
      }
      const preceding = before.slice(head).concat(before.slice(0, head));
      const count = capacity - after.length;
      return {
        rows: [...(count ? preceding.slice(-count) : []), current, ...after],
        truncated: true,
      };
    }
    if (capacity) {
      before[head] = current;
      head = (head + 1) % capacity;
    }
    step = iterator.next();
  }
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
