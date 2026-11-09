import { createSgfNode, DEFAULT_SGF_LIMITS } from '@0disoft/banora/sgf';
import type { SgfNode, SgfRecord } from '@0disoft/banora/sgf';
import type { ControllerState } from '@0disoft/banora/controller';

/** Own only the selected game's root-to-cursor path, preserving every property and raw escape. */
export function selectedRecordPrefix(state: ControllerState): SgfRecord {
  if (
    !Array.isArray(state.path) ||
    !state.path.length ||
    state.path.length > DEFAULT_SGF_LIMITS.maxNodes
  )
    throw Error('Position is unavailable');
  const path: SgfNode[] = [];
  let node = state.record.games[state.gameIndex];
  for (let index = 0; index < state.path.length; index++) {
    if (index) node = node?.children.find((child) => child.id === state.path[index]);
    if (!node || node.id !== state.path[index]) throw Error('Position is unavailable');
    path.push(node);
  }
  if (node !== state.node) throw Error('Position is unavailable');
  let prefix: SgfNode | undefined;
  for (let index = path.length - 1; index >= 0; index--) {
    const current = path[index]!;
    prefix = createSgfNode(
      current.id,
      current.properties,
      prefix ? [prefix] : [],
      current.rawProperties,
    );
  }
  return Object.freeze({ games: Object.freeze([prefix!]) });
}
