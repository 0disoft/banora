import type { ControllerState, SgfNode } from '@0disoft/banora';

/** Resolve only the selected ancestry; never traverse unrelated descendants or replay boards. */
export function recordParent(state: ControllerState): SgfNode | undefined {
  let node = state.record.games[state.gameIndex];
  if (state.path.length < 2 || node?.id !== state.path[0]) return undefined;
  for (let index = 1; node && index < state.path.length - 1; index++)
    node = node.children.find((child) => child.id === state.path[index]);
  return node;
}
