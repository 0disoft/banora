import type { BoardFrame, BoardBinding } from './board-frame.js';
import type { RecordController, ControllerState } from './controller.js';
import { expandSgfPoints, pointFromSgf } from './sgf.js';
import type { SgfNode, SgfRecord } from './sgf.js';
import { variationCandidates } from './variations.js';

/** Mutates only the fresh map being built for this frame. */
function numberNode(
  node: SgfNode,
  numbers: Map<number, number>,
  number: number,
  width: number,
  height: number,
): number {
  for (const key of ['AB', 'AW', 'AE'])
    for (const value of node.properties[key] ?? [])
      for (const point of expandSgfPoints(value, width, height))
        numbers.delete(point.y * width + point.x);
  const value = node.properties.B?.[0] ?? node.properties.W?.[0];
  if (value !== undefined) number++;
  if (node.properties.MN) number = Number(node.properties.MN[0]);
  if (value && !(value === 'tt' && width <= 19 && height <= 19)) {
    const point = pointFromSgf(value, width, height);
    numbers.set(point.y * width + point.x, number);
  }
  return number;
}

/** A projection, not another record or rules engine. Number traversal stays lazy. */
export function recordBoardBinding(controller: RecordController, owned: boolean): BoardBinding {
  const cache = new WeakMap<ControllerState, BoardFrame>();
  let checkpoint = new WeakMap<
    SgfRecord,
    {
      node: SgfNode;
      game: number;
      depth: number;
      number: number;
      values: ReadonlyMap<number, number>;
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
        const before = checkpoint.get(state.record);
        let number: number;
        if (
          before &&
          before.game === state.gameIndex &&
          before.depth + 1 === state.path.length &&
          before.node.children.includes(state.node)
        ) {
          numbers = new Map(before.values);
          number = numberNode(state.node, numbers, before.number, width, height);
        } else {
          numbers = new Map();
          number = 0;
          let node = state.record.games[state.gameIndex]!;
          // Non-adjacent navigation keeps the original selected-path traversal.
          for (let index = 0; index < state.path.length; index++) {
            if (index) node = node.children.find((child) => child.id === state.path[index])!;
            number = numberNode(node, numbers, number, width, height);
          }
        }
        // Exactly one weak record key, no retained history cache. Copy the private
        // checkpoint so even a mutated returned map cannot affect future frames.
        checkpoint = new WeakMap([
          [
            state.record,
            {
              node: state.node,
              game: state.gameIndex,
              depth: state.path.length,
              number,
              values: new Map(numbers),
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
