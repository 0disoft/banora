import { comparePositions } from '@banora/sdk';
import type { ControllerState, RecordController } from '@banora/sdk';

export interface ComparisonPair {
  readonly controller: RecordController;
  readonly left: string;
  readonly right: string;
  readonly generation: number;
}
export function startComparison(controller: RecordController): ComparisonPair {
  const state=controller.getState();
  return Object.freeze({controller,left:state.node.id,right:state.node.children[0]?.id ?? state.node.id,generation:state.recordGeneration});
}
export function pinComparison(pair: ComparisonPair, side: 'left'|'right'): ComparisonPair {
  const state=pair.controller.getState();
  const current=state.recordGeneration===pair.generation ? pair : {...pair,left:state.node.id,right:state.node.id,generation:state.recordGeneration};
  return Object.freeze({...current,[side]:state.node.id});
}
export function describeComparison(pair: ComparisonPair, state: ControllerState): string {
  if (pair.generation!==state.recordGeneration) return 'Record replaced. Pin a position again to compare the new record.';
  const left=pair.controller.inspectNode(pair.left),right=pair.controller.inspectNode(pair.right);
  if (!left || !right) return 'Comparison node unavailable. Choose another position or restore the branch.';
  if (left.position.width!==right.position.width || left.position.height!==right.position.height) return 'Different board dimensions; no intersections compared.';
  return `${comparePositions(left.position,right.position).length} changed intersections · Left ${pair.left} · Right ${pair.right}`;
}
