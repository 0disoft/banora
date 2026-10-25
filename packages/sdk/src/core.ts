import { boardKey, hasSituation, rememberSituation } from './repetition-history.js';
import { validBoardDimensions } from './board-dimensions.js';
import type { RepetitionHistory } from './repetition-history.js';
export type { RepetitionHistory } from './repetition-history.js';

export type Color = 'black' | 'white';
export interface Point {
  readonly x: number;
  readonly y: number;
}
export interface RulePolicy {
  readonly suicide: 'forbid' | 'allow';
  readonly ko: 'simple' | 'none' | 'positional-superko' | 'situational-superko';
  readonly passStones: boolean;
}
export interface Position {
  readonly width: number;
  readonly height: number;
  readonly board: readonly (Color | null)[];
  readonly toPlay: Color;
  readonly captures: Readonly<Record<Color, number>>;
  readonly passPrisoners: Readonly<Record<Color, number>>;
  readonly consecutivePasses: number;
  readonly moveNumber: number;
  readonly previousBoard: readonly (Color | null)[] | null;
  readonly repetitionHistory: RepetitionHistory | null;
  readonly rules: RulePolicy;
}
export type MoveFailure =
  | 'out-of-bounds'
  | 'occupied'
  | 'wrong-turn'
  | 'suicide'
  | 'ko'
  | 'superko'
  | 'invalid-setup';
export type MoveResult =
  | { readonly ok: true; readonly position: Position; readonly captured: readonly Point[] }
  | { readonly ok: false; readonly reason: MoveFailure };
export interface PositionOptions {
  readonly width?: number;
  readonly height?: number;
  readonly toPlay?: Color;
  readonly rules?: Partial<RulePolicy>;
}
export interface SetupStone extends Point {
  readonly color: Color | null;
}

export function opposite(color: Color): Color {
  return color === 'black' ? 'white' : 'black';
}
function superko(rules: RulePolicy): boolean {
  return rules.ko === 'positional-superko' || rules.ko === 'situational-superko';
}
function nextHistory(
  position: Position,
  board: readonly (Color | null)[],
  toPlay: Color,
): RepetitionHistory | null {
  return superko(position.rules)
    ? rememberSituation(position.repetitionHistory, boardKey(board), toPlay)
    : null;
}

// Only arrays frozen here are trusted; a foreign frozen array may contain getters.
const sealedBoards = new WeakSet<readonly (Color | null)[]>();
function sealBoard(board: readonly (Color | null)[], owned = false): readonly (Color | null)[] {
  if (sealedBoards.has(board)) return board;
  const sealed = Object.freeze(owned ? board : [...board]);
  sealedBoards.add(sealed);
  return sealed;
}

function seal(position: Position, ownedBoard = false): Position {
  return Object.freeze({
    ...position,
    board: sealBoard(position.board, ownedBoard),
    captures: Object.freeze({ ...position.captures }),
    passPrisoners: Object.freeze({ ...position.passPrisoners }),
    rules: Object.freeze({ ...position.rules }),
    previousBoard: position.previousBoard ? sealBoard(position.previousBoard) : null,
  });
}

export function createPosition(options: PositionOptions = {}): Position {
  const width = options.width ?? 19;
  const height = options.height ?? width;
  if (!validBoardDimensions(width, height)) {
    throw new RangeError('Board dimensions must be integers from 2 to 52');
  }
  const rules: RulePolicy = {
    suicide: options.rules?.suicide ?? 'forbid',
    ko: options.rules?.ko ?? 'simple',
    passStones: options.rules?.passStones ?? false,
  };
  if (
    !['forbid', 'allow'].includes(rules.suicide) ||
    !['simple', 'none', 'positional-superko', 'situational-superko'].includes(rules.ko) ||
    typeof rules.passStones !== 'boolean'
  ) {
    throw new TypeError('Unsupported rule policy');
  }
  const toPlay = options.toPlay ?? 'black';
  if (!['black', 'white'].includes(toPlay)) throw new TypeError('Invalid stone color');
  const board = Array<Color | null>(width * height).fill(null);
  return seal(
    {
      width,
      height,
      board,
      toPlay,
      captures: { black: 0, white: 0 },
      moveNumber: 0,
      previousBoard: null,
      rules,
      passPrisoners: { black: 0, white: 0 },
      consecutivePasses: 0,
      repetitionHistory: superko(rules) ? rememberSituation(null, boardKey(board), toPlay) : null,
    },
    true,
  );
}

export function isOnBoard(position: Pick<Position, 'width' | 'height'>, point: Point): boolean {
  return (
    Number.isInteger(point.x) &&
    Number.isInteger(point.y) &&
    point.x >= 0 &&
    point.y >= 0 &&
    point.x < position.width &&
    point.y < position.height
  );
}

export function stoneAt(position: Position, point: Point): Color | null {
  if (!isOnBoard(position, point)) throw new RangeError('Point is outside the board');
  return position.board[point.y * position.width + point.x]!;
}

function neighbors(index: number, width: number, height: number): number[] {
  const x = index % width;
  const y = Math.floor(index / width);
  const result: number[] = [];
  if (x > 0) result.push(index - 1);
  if (x < width - 1) result.push(index + 1);
  if (y > 0) result.push(index - width);
  if (y < height - 1) result.push(index + width);
  return result;
}

function group(board: readonly (Color | null)[], start: number, width: number, height: number) {
  const stones = new Set<number>([start]);
  const liberties = new Set<number>();
  const pending = [start];
  while (pending.length) {
    for (const next of neighbors(pending.pop()!, width, height)) {
      if (board[next] === null) liberties.add(next);
      else if (board[next] === board[start] && !stones.has(next)) {
        stones.add(next);
        pending.push(next);
      }
    }
  }
  return { stones, liberties };
}

export function play(position: Position, point: Point, color: Color = position.toPlay): MoveResult {
  if (color !== position.toPlay) return { ok: false, reason: 'wrong-turn' };
  if (!isOnBoard(position, point)) return { ok: false, reason: 'out-of-bounds' };
  const index = point.y * position.width + point.x;
  if (position.board[index] !== null) return { ok: false, reason: 'occupied' };
  const board = [...position.board];
  board[index] = color;
  const captured: Point[] = [];
  const visited = new Set<number>();
  for (const neighbor of neighbors(index, position.width, position.height)) {
    if (board[neighbor] !== opposite(color) || visited.has(neighbor)) continue;
    const enemy = group(board, neighbor, position.width, position.height);
    for (const stone of enemy.stones) visited.add(stone);
    if (enemy.liberties.size === 0)
      for (const stone of enemy.stones) {
        board[stone] = null;
        captured.push({ x: stone % position.width, y: Math.floor(stone / position.width) });
      }
  }
  const own = group(board, index, position.width, position.height);
  const captures = { ...position.captures, [color]: position.captures[color] + captured.length };
  if (own.liberties.size === 0) {
    if (position.rules.suicide === 'forbid') return { ok: false, reason: 'suicide' };
    for (const stone of own.stones) board[stone] = null;
    captures[opposite(color)] += own.stones.size;
  }
  if (
    position.rules.ko === 'simple' &&
    position.previousBoard &&
    board.every((stone, offset) => stone === position.previousBoard![offset])
  ) {
    return { ok: false, reason: 'ko' };
  }
  const toPlay = opposite(color);
  const repetitionKey = superko(position.rules) ? boardKey(board) : null;
  if (
    repetitionKey !== null &&
    hasSituation(
      position.repetitionHistory,
      repetitionKey,
      position.rules.ko === 'situational-superko' ? toPlay : undefined,
    )
  )
    return { ok: false, reason: 'superko' };
  return {
    ok: true,
    position: seal(
      {
        ...position,
        board,
        captures,
        toPlay,
        moveNumber: position.moveNumber + 1,
        previousBoard: position.board,
        consecutivePasses: 0,
        repetitionHistory:
          repetitionKey === null
            ? null
            : rememberSituation(position.repetitionHistory, repetitionKey, toPlay),
      },
      true,
    ),
    captured: Object.freeze(captured.map((point) => Object.freeze(point))),
  };
}

export function pass(position: Position, color: Color = position.toPlay): MoveResult {
  if (color !== position.toPlay) return { ok: false, reason: 'wrong-turn' };
  const recipient = opposite(color),
    passPrisoners = { ...position.passPrisoners };
  if (position.rules.passStones) passPrisoners[recipient]++;
  return {
    ok: true,
    position: seal({
      ...position,
      toPlay: opposite(color),
      passPrisoners,
      consecutivePasses: position.consecutivePasses + 1,
      moveNumber: position.moveNumber + 1,
      previousBoard: null,
      repetitionHistory: nextHistory(position, position.board, opposite(color)),
    }),
    captured: Object.freeze([]),
  };
}

export function setup(
  position: Position,
  stones: readonly SetupStone[],
  toPlay: Color = position.toPlay,
): MoveResult {
  const seen = new Set<number>();
  const board = [...position.board];
  if (!['black', 'white'].includes(toPlay)) return { ok: false, reason: 'invalid-setup' };
  for (const stone of stones) {
    if (
      !isOnBoard(position, stone) ||
      (stone.color !== null && !['black', 'white'].includes(stone.color))
    ) {
      return { ok: false, reason: 'invalid-setup' };
    }
    const index = stone.y * position.width + stone.x;
    if (seen.has(index)) return { ok: false, reason: 'invalid-setup' };
    seen.add(index);
    board[index] = stone.color;
  }
  return {
    ok: true,
    position: seal(
      {
        ...position,
        board,
        toPlay,
        previousBoard: null,
        consecutivePasses: 0,
        repetitionHistory: superko(position.rules)
          ? rememberSituation(null, boardKey(board), toPlay)
          : null,
      },
      true,
    ),
    captured: Object.freeze([]),
  };
}

/** SGF playback executes recorded moves even when normal play would reject them. */
export function replayMove(position: Position, point: Point | null, color: Color): MoveResult {
  if (!['black', 'white'].includes(color)) return { ok: false, reason: 'wrong-turn' };
  if (point === null)
    return pass(
      seal({
        ...position,
        toPlay: color,
        consecutivePasses: position.toPlay === color ? position.consecutivePasses : 0,
      }),
      color,
    );
  if (!isOnBoard(position, point)) return { ok: false, reason: 'out-of-bounds' };
  const board = [...position.board];
  board[point.y * position.width + point.x] = null;
  const result = play(
    seal(
      {
        ...position,
        board,
        toPlay: color,
        rules: { suicide: 'allow', ko: 'none', passStones: position.rules.passStones },
      },
      true,
    ),
    point,
    color,
  );
  if (!result.ok) return result;
  return {
    ...result,
    position: seal({
      ...result.position,
      rules: position.rules,
      previousBoard: position.board,
      repetitionHistory: nextHistory(position, result.position.board, result.position.toPlay),
    }),
  };
}

export interface PositionDifference {
  readonly point: Point;
  readonly before: Color | null;
  readonly after: Color | null;
}
/** Compare visible stones only, not turn, history, annotations or rule equivalence. */
export function comparePositions(before: Position, after: Position): readonly PositionDifference[] {
  if (before.width !== after.width || before.height !== after.height)
    throw new RangeError('Position comparison requires matching board dimensions');
  const changes: PositionDifference[] = [];
  for (let index = 0; index < before.board.length; index++)
    if (before.board[index] !== after.board[index]) {
      changes.push(
        Object.freeze({
          point: Object.freeze({ x: index % before.width, y: Math.floor(index / before.width) }),
          before: before.board[index]!,
          after: after.board[index]!,
        }),
      );
    }
  return Object.freeze(changes);
}
