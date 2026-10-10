import type { BoardFrame, BoardBinding } from './board-frame.js';
import type { RecordController, ControllerState } from './controller.js';
import { expandSgfPoints, pointFromSgf } from './sgf.js';

/** A projection, not another record or rules engine. Number traversal stays lazy. */
export function recordBoardBinding(controller: RecordController, owned: boolean): BoardBinding {
  const cache = new WeakMap<ControllerState, BoardFrame>();
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
        numbers = new Map();
        const nodes = new Map<string, typeof state.node>(),
          pending = [...state.record.games];
        while (pending.length) {
          const node = pending.pop()!;
          nodes.set(node.id, node);
          pending.push(...node.children);
        }
        let number = 0;
        for (const id of state.path) {
          const node = nodes.get(id)!;
          for (const key of ['AB', 'AW', 'AE'])
            for (const value of node.properties[key] ?? []) {
              for (const point of expandSgfPoints(value, width, height))
                numbers.delete(point.y * width + point.x);
            }
          const value = node.properties.B?.[0] ?? node.properties.W?.[0];
          if (value !== undefined) number++;
          if (node.properties.MN) number = Number(node.properties.MN[0]);
          if (!value || (value === 'tt' && width <= 19 && height <= 19)) continue;
          const point = pointFromSgf(value, width, height);
          numbers.set(point.y * width + point.x, number);
        }
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
