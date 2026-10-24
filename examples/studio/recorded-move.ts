import { pointToSgf } from '@0disoft/banora';
import type { ControllerState, Point, SgfNode } from '@0disoft/banora';

/** Resolve an assessment target from one immutable snapshot without board replay. */
export function recordedMoveAt(state: ControllerState, point: Point): SgfNode | undefined {
  const value = pointToSgf(point);
  const child = state.node.children.find(
    (node) => (node.properties.B?.[0] ?? node.properties.W?.[0]) === value,
  );
  if (child) return child;
  const color = state.position.board[point.y * state.position.width + point.x];
  if (!color) return undefined;
  const key = color === 'black' ? 'B' : 'W';
  let node = state.record.games[state.gameIndex]!;
  let target: SgfNode | undefined;
  for (let i = 0; i < state.path.length; i++) {
    if (i > 0) node = node.children.find((candidate) => candidate.id === state.path[i])!;
    if (node.properties[key]?.[0] === value) target = node;
  }
  return target;
}
