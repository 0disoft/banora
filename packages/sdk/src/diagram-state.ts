import type { Position } from './core.js';
import type { ControllerState } from './controller.js';
import { createBoardSnapshot } from './board-state.js';
import type { BoardSnapshot, BoardSnapshotValue } from './board-state.js';
import { DEFAULT_SGF_LIMITS, pointFromSgf } from './sgf.js';
import { numberNode } from './record-numbers.js';

export type DiagramSource = BoardSnapshot | Position | ControllerState;

/** Own a bounded snapshot; walk only the selected record path when numbers are requested. */
export function diagramSnapshot(source: DiagramSource, moveNumbers: boolean): BoardSnapshotValue {
  if (!source || typeof source !== 'object')
    throw new TypeError('Diagram source must be a position, controller state or board snapshot');
  if (!('position' in source)) {
    return createBoardSnapshot(
      'board' in source
        ? {
            key: 'diagram',
            width: source.width,
            height: source.height,
            stones: source.board,
            toPlay: source.toPlay,
            captures: source.captures,
            moveNumber: source.moveNumber,
          }
        : source,
    );
  }
  const position = source.position;
  const move = source.node.properties.B?.[0] ?? source.node.properties.W?.[0];
  const snapshot = createBoardSnapshot({
    key: source.node.id,
    width: position.width,
    height: position.height,
    stones: position.board,
    toPlay: position.toPlay,
    captures: position.captures,
    moveNumber: position.moveNumber,
    lastMove:
      move && !(move === 'tt' && position.width <= 19 && position.height <= 19)
        ? pointFromSgf(move, position.width, position.height)
        : null,
    markers: source.markers,
    connections: source.connections,
    strokes: source.strokes,
  });
  if (!moveNumbers) return snapshot;
  if (
    !Array.isArray(source.path) ||
    source.path.length < 1 ||
    source.path.length > DEFAULT_SGF_LIMITS.maxNodes
  )
    throw new RangeError('Diagram record path exceeds the SGF node limit');
  const numbers = new Map<number, number>();
  let node = source.record.games[source.gameIndex];
  let number = 0,
    edges = DEFAULT_SGF_LIMITS.maxNodes;
  const budget = { remaining: DEFAULT_SGF_LIMITS.maxExpandedPoints };
  for (let index = 0; index < source.path.length; index++) {
    if (index && node) {
      let child;
      for (const candidate of node.children) {
        if (--edges < 0) throw new RangeError('Diagram record path exceeds the SGF node limit');
        if (candidate.id === source.path[index]) {
          child = candidate;
          break;
        }
      }
      node = child;
    }
    if (!node || node.id !== source.path[index])
      throw new RangeError('Diagram record path does not exist');
    number = numberNode(node, numbers, number, position.width, position.height, budget);
  }
  if (node !== source.node)
    throw new RangeError('Diagram record path does not match the selected node');
  return createBoardSnapshot({
    ...snapshot,
    numbers: [...numbers]
      .filter(([index]) => snapshot.stones[index] !== null)
      .map(([index, value]) => ({
        point: { x: index % position.width, y: Math.floor(index / position.width) },
        value,
      })),
  });
}
