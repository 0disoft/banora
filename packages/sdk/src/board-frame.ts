import type { Color, Point } from './core.js';
import type { ControllerState, CommandResult, Marker, Connection } from './controller.js';
import type { Stroke, StrokeStyle } from './annotations.js';
import type { BoardSnapshotValue, BoardOverlay, BoardLabels } from './board-state.js';
import type { BoardOptions, BoardView } from './board.js';

/** Display-only shape shared by record and controlled bindings; no rules/history fields. */
export interface BoardFrame {
  readonly position: {
    readonly width: number;
    readonly height: number;
    readonly board: readonly (Color | null)[];
    readonly toPlay: Color;
    readonly captures: Readonly<Record<Color, number>>;
    readonly moveNumber: number;
  };
  readonly nodeId: string;
  readonly recordGeneration: number;
  readonly identity: unknown;
  readonly recordState?: ControllerState;
  readonly numbers: () => ReadonlyMap<number, number>;
  readonly lastMove: Point | null;
  readonly markers: readonly Marker[];
  readonly connections: readonly Connection[];
  readonly strokes: readonly Stroke[];
  readonly visiblePoints: ReadonlySet<number> | null;
  readonly dimPoints: ReadonlySet<number>;
  readonly overlays: readonly BoardOverlay[];
}
export interface BoardBinding {
  getState(): BoardFrame;
  inspectNode(id: string): BoardFrame | null;
  subscribe(listener: (state: BoardFrame) => void): () => void;
  play(point: Point): CommandResult;
  addStroke(points: readonly Point[], style?: StrokeStyle): CommandResult;
  previous(): void;
  next(): void;
  dispose(): void;
}
export interface BoardSurfaceOptions extends Omit<BoardOptions, 'controller'> {
  readonly labels?: BoardLabels;
  readonly onContextMenu?: (point: Point, screen: Point) => void;
}
export interface BoardSurfaceView extends Omit<BoardView, 'controller'> {
  update(options: BoardSurfaceOptions): void;
  announce(message: string): void;
}
export function boardContains(size: { width: number; height: number }, point: Point): boolean {
  return (
    Number.isInteger(point.x) &&
    Number.isInteger(point.y) &&
    point.x >= 0 &&
    point.y >= 0 &&
    point.x < size.width &&
    point.y < size.height
  );
}
export function snapshotFrame(state: BoardSnapshotValue): BoardFrame {
  const numbers = new Map(
    state.numbers.map((value) => [value.point.y * state.width + value.point.x, value.value]),
  );
  return {
    position: {
      width: state.width,
      height: state.height,
      board: state.stones,
      toPlay: state.toPlay,
      captures: state.captures,
      moveNumber: state.moveNumber,
    },
    nodeId: state.key,
    recordGeneration: 0,
    identity: state,
    numbers: () => numbers,
    lastMove: state.lastMove,
    markers: state.markers,
    connections: state.connections,
    strokes: state.strokes,
    visiblePoints:
      state.visiblePoints === null
        ? null
        : new Set(state.visiblePoints.map((point) => point.y * state.width + point.x)),
    dimPoints: new Set(state.dimPoints.map((point) => point.y * state.width + point.x)),
    overlays: state.overlays,
  };
}
export function frameDifferences(before: BoardFrame, after: BoardFrame) {
  const a = before.position,
    b = after.position;
  return b.board.flatMap((color, index) =>
    a.board[index] === color
      ? []
      : [
          {
            point: { x: index % b.width, y: Math.floor(index / b.width) },
            before: a.board[index]!,
            after: color,
          },
        ],
  );
}
export function boardMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  );
}
