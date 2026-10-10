export type Color = 'black' | 'white';
export interface Point { readonly x: number; readonly y: number }
export interface RulePolicy {
  readonly suicide: 'forbid' | 'allow';
  readonly ko: 'simple' | 'none';
}
export interface Position {
  readonly width: number;
  readonly height: number;
  readonly board: readonly (Color | null)[];
  readonly toPlay: Color;
  readonly captures: Readonly<Record<Color, number>>;
  readonly moveNumber: number;
  readonly previousBoard: readonly (Color | null)[] | null;
  readonly rules: RulePolicy;
}
export type MoveFailure = 'out-of-bounds' | 'occupied' | 'wrong-turn' | 'suicide' | 'ko' | 'invalid-setup';
export type MoveResult =
  | { readonly ok: true; readonly position: Position; readonly captured: readonly Point[] }
  | { readonly ok: false; readonly reason: MoveFailure };
export interface PositionOptions {
  readonly width?: number;
  readonly height?: number;
  readonly toPlay?: Color;
  readonly rules?: Partial<RulePolicy>;
}
export interface SetupStone extends Point { readonly color: Color | null }

export function opposite(color: Color): Color { return color === 'black' ? 'white' : 'black'; }

function seal(position: Position): Position {
  return Object.freeze({
    ...position,
    board: Object.freeze([...position.board]),
    captures: Object.freeze({ ...position.captures }),
    rules: Object.freeze({ ...position.rules }),
    previousBoard: position.previousBoard ? Object.freeze([...position.previousBoard]) : null,
  });
}

export function createPosition(options: PositionOptions = {}): Position {
  const width = options.width ?? 19;
  const height = options.height ?? width;
  if (![width, height].every(value => Number.isInteger(value) && value >= 2 && value <= 52)) {
    throw new RangeError('Board dimensions must be integers from 2 to 52');
  }
  const rules: RulePolicy = { suicide: options.rules?.suicide ?? 'forbid', ko: options.rules?.ko ?? 'simple' };
  if (!['forbid', 'allow'].includes(rules.suicide) || !['simple', 'none'].includes(rules.ko)) {
    throw new TypeError('Unsupported rule policy');
  }
  const toPlay = options.toPlay ?? 'black';
  if (!['black', 'white'].includes(toPlay)) throw new TypeError('Invalid stone color');
  return seal({ width, height, board: Array(width * height).fill(null), toPlay,
    captures: { black: 0, white: 0 }, moveNumber: 0, previousBoard: null, rules });
}

export function isOnBoard(position: Pick<Position, 'width' | 'height'>, point: Point): boolean {
  return Number.isInteger(point.x) && Number.isInteger(point.y) && point.x >= 0 &&
    point.y >= 0 && point.x < position.width && point.y < position.height;
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
    if (enemy.liberties.size === 0) for (const stone of enemy.stones) {
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
  if (position.rules.ko === 'simple' && position.previousBoard &&
      board.every((stone, offset) => stone === position.previousBoard![offset])) {
    return { ok: false, reason: 'ko' };
  }
  return { ok: true, position: seal({ ...position, board, captures,
    toPlay: opposite(color), moveNumber: position.moveNumber + 1, previousBoard: position.board }),
    captured: Object.freeze(captured.map(point => Object.freeze(point))) };
}

export function pass(position: Position, color: Color = position.toPlay): MoveResult {
  if (color !== position.toPlay) return { ok: false, reason: 'wrong-turn' };
  return { ok: true, position: seal({ ...position, toPlay: opposite(color),
    moveNumber: position.moveNumber + 1, previousBoard: null }), captured: Object.freeze([]) };
}

export function setup(position: Position, stones: readonly SetupStone[], toPlay: Color = position.toPlay): MoveResult {
  const seen = new Set<number>();
  const board = [...position.board];
  if (!['black', 'white'].includes(toPlay)) return { ok: false, reason: 'invalid-setup' };
  for (const stone of stones) {
    if (!isOnBoard(position, stone) || (stone.color !== null && !['black', 'white'].includes(stone.color))) {
      return { ok: false, reason: 'invalid-setup' };
    }
    const index = stone.y * position.width + stone.x;
    if (seen.has(index)) return { ok: false, reason: 'invalid-setup' };
    seen.add(index);
    board[index] = stone.color;
  }
  return { ok: true, position: seal({ ...position, board, toPlay, previousBoard: null }), captured: Object.freeze([]) };
}

/** SGF playback executes recorded moves even when normal play would reject them. */
export function replayMove(position: Position, point: Point | null, color: Color): MoveResult {
  if (!['black', 'white'].includes(color)) return { ok: false, reason: 'wrong-turn' };
  if (point === null) return pass(seal({ ...position, toPlay: color }), color);
  if (!isOnBoard(position, point)) return { ok: false, reason: 'out-of-bounds' };
  const board = [...position.board];
  board[point.y * position.width + point.x] = null;
  const result = play(seal({ ...position, board, toPlay: color,
    rules: { suicide: 'allow', ko: 'none' } }), point, color);
  if (!result.ok) return result;
  return { ...result, position: seal({ ...result.position, rules: position.rules,
    previousBoard: position.board }) };
}

export interface PositionDifference {
  readonly point: Point;
  readonly before: Color | null;
  readonly after: Color | null;
}
/** Compare visible stones only, not turn, history, annotations or rule equivalence. */
export function comparePositions(before: Position, after: Position): readonly PositionDifference[] {
  if (before.width !== after.width || before.height !== after.height) throw new RangeError('Position comparison requires matching board dimensions');
  const changes: PositionDifference[] = [];
  for (let index = 0; index < before.board.length; index++) if (before.board[index] !== after.board[index]) {
    changes.push(Object.freeze({point:Object.freeze({x:index%before.width,y:Math.floor(index/before.width)}),
      before:before.board[index]!,after:after.board[index]!}));
  }
  return Object.freeze(changes);
}
