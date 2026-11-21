import { numberNode } from './record-numbers.js';
import { recordNumberingKey } from './record-numbering-key.js';
import type { BoardFrame, BoardBinding } from './board-frame.js';
import type { RecordController, ControllerState } from './controller.js';
import { pointFromSgf } from './sgf.js';
import type { SgfNode } from './sgf.js';
import { variationCandidates } from './variations.js';

const NUMBER_CHECKPOINT_INTERVAL = 128;
const NUMBER_CHECKPOINT_LIMIT = 32;

interface NumberCheckpoint {
  node: SgfNode;
  depth: number;
  number: number;
  values: ReadonlyMap<number, number>;
}

function rememberNumberCheckpoint(
  checkpoints: Map<number, NumberCheckpoint>,
  node: SgfNode,
  depth: number,
  number: number,
  values: ReadonlyMap<number, number>,
): void {
  if (depth % NUMBER_CHECKPOINT_INTERVAL) return;
  checkpoints.delete(depth);
  checkpoints.set(depth, { node, depth, number, values: new Map(values) });
  if (checkpoints.size > NUMBER_CHECKPOINT_LIMIT)
    checkpoints.delete(checkpoints.keys().next().value!);
}

/** A projection, not another record or rules engine. Number traversal stays lazy. */
export function recordBoardBinding(controller: RecordController, owned: boolean): BoardBinding {
  const cache = new WeakMap<ControllerState, BoardFrame>();
  let checkpoint = new WeakMap<
    object,
    {
      game: number;
      latest: NumberCheckpoint;
      sparse: Map<number, NumberCheckpoint>;
    }
  >();
  function frame(state: ControllerState): BoardFrame {
    const previous = cache.get(state);
    if (previous) return previous;
    const { width, height } = state.position;
    const value = state.node.properties.B?.[0] ?? state.node.properties.W?.[0];
    const lastMove =
      value && !(value === 'tt' && width <= 19 && height <= 19)
        ? pointFromSgf(value, width, height)
        : null;
    let numbers: Map<number, number> | undefined;
    const result: BoardFrame = {
      position: state.position,
      nodeId: state.node.id,
      recordGeneration: state.recordGeneration,
      identity: state.record,
      recordState: state,
      lastMove,
      markers: state.markers,
      connections: state.connections,
      strokes: state.strokes,
      visiblePoints: null,
      dimPoints: new Set(),
      overlays: [],
      numbers() {
        if (numbers) return numbers;
        const key = recordNumberingKey(state.record);
        const cached = checkpoint.get(key);
        const sameGame = cached?.game === state.gameIndex ? cached : undefined;
        const before = sameGame?.latest;
        const sparse = sameGame?.sparse ?? new Map<number, NumberCheckpoint>();
        const depth = state.path.length;
        let number: number;
        if (before && before.depth === depth && before.node.id === state.node.id) {
          numbers = new Map(before.values);
          number = before.number;
        } else if (
          before &&
          before.depth + 1 === depth &&
          before.node.children.some((child) => child.id === state.node.id)
        ) {
          numbers = new Map(before.values);
          number = numberNode(state.node, numbers, before.number, width, height);
          rememberNumberCheckpoint(sparse, state.node, depth, number, numbers);
        } else {
          let ancestor: NumberCheckpoint | undefined;
          for (const candidate of sparse.values()) {
            if (
              candidate.depth > (ancestor?.depth ?? 0) &&
              state.path[candidate.depth - 1] === candidate.node.id
            )
              ancestor = candidate;
          }
          numbers = new Map(ancestor?.values);
          number = ancestor?.number ?? 0;
          let node = ancestor?.node ?? state.record.games[state.gameIndex]!;
          for (let index = ancestor?.depth ?? 0; index < depth; index++) {
            if (index) node = node.children.find((child) => child.id === state.path[index])!;
            number = numberNode(node, numbers, number, width, height);
            rememberNumberCheckpoint(sparse, node, index + 1, number, numbers);
          }
        }
        checkpoint = new WeakMap([
          [
            key,
            {
              game: state.gameIndex,
              latest: { node: state.node, depth, number, values: new Map(numbers) },
              sparse,
            },
          ],
        ]);
        return numbers;
      },
    };
    cache.set(state, result);
    return result;
  }
  return {
    getState: () => frame(controller.getState()),
    inspectNode: (id) => {
      const state = controller.inspectNode(id);
      return state ? frame(state) : null;
    },
    subscribe: (listener) => controller.subscribe((state) => listener(frame(state))),
    play: (point) => controller.play(point),
    selectVariation: (point) => {
      const candidate = variationCandidates(controller.getState()).find(
        (entry) => entry.point.x === point.x && entry.point.y === point.y,
      );
      return candidate ? controller.goTo(candidate.node.id).ok : false;
    },
    addStroke: (points, style) => controller.addStroke(points, style),
    previous: () => {
      controller.previous();
    },
    next: () => {
      controller.next();
    },
    dispose: () => {
      if (owned) controller.dispose();
    },
  };
}
