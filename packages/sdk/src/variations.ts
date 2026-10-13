import type { ControllerState } from './controller.js';
import type { SgfNode } from './sgf.js';
import { pointFromSgf } from './sgf.js';
import type { Point } from './core.js';

export interface VariationRow {
  readonly node: SgfNode;
  readonly depth: number;
  readonly indent: number;
  readonly moveNumber: number;
  readonly collapsed: boolean;
  readonly branch: boolean;
}

/** Identifies chosen fork paths without rebuilding rows on linear navigation. */
export function variationPathKey(state: ControllerState): string {
  let node = state.record.games[state.gameIndex]!;
  const chosen: string[] = [];
  for (const id of state.path.slice(1)) {
    if (node.children.length > 1) chosen.push(id);
    node = node.children.find((child) => child.id === id)!;
  }
  return chosen.join('/');
}

/** A bounded display projection; collapsing never modifies the record. */
export function getVariationRows(state: ControllerState, focused = false, limit = 500) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50_000)
    throw new RangeError('Variation row limit must be 1 through 50000');
  const path = new Set(state.path);
  const pending = [
    {
      node: state.record.games[state.gameIndex]!,
      depth: 0,
      indent: 0,
      parentMove: 0,
      branch: false,
    },
  ];
  const rows: VariationRow[] = [];
  while (pending.length && rows.length < limit) {
    const entry = pending.pop()!;
    const props = entry.node.properties;
    const moveNumber = props.MN
      ? Number(props.MN[0])
      : entry.parentMove + (props.B || props.W ? 1 : 0);
    const collapsed =
      focused && entry.branch && !path.has(entry.node.id) && entry.node.children.length > 0;
    rows.push({ ...entry, moveNumber, collapsed });
    if (collapsed) continue;
    const branch = entry.node.children.length > 1;
    for (let i = entry.node.children.length - 1; i >= 0; i--)
      pending.push({
        node: entry.node.children[i]!,
        depth: entry.depth + 1,
        indent: entry.indent + (branch ? 1 : 0),
        parentMove: moveNumber,
        branch,
      });
  }
  return { rows, truncated: pending.length > 0 };
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
