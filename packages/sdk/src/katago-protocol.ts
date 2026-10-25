import type { Color, Point, Position } from './core.js';
import { AnalysisError } from './analysis-types.js';
import type { AnalysisMetrics, AnalysisRequest, AnalysisResultInput } from './analysis-types.js';
import { normalizeAnalysisResult } from './analysis-result.js';

export type KataGoPerspective = 'black' | 'white' | 'to-play';
export interface KataGoOptions {
  /** Must match the engine's reportAnalysisWinratesAs configuration. */
  readonly perspective: KataGoPerspective;
  /** Explicit capability of the host's compiled engine. Defaults to 19. */
  readonly maxBoardSize?: number;
}
export interface KataGoQuery {
  readonly id: string;
  readonly initialStones: readonly (readonly ['B' | 'W', string])[];
  readonly initialPlayer: 'B' | 'W';
  readonly moves: readonly (readonly ['B' | 'W', string])[];
  readonly rules: {
    readonly ko: 'SIMPLE' | 'POSITIONAL' | 'SITUATIONAL';
    readonly scoring: 'AREA' | 'TERRITORY';
    readonly tax: 'NONE' | 'SEKI';
    readonly suicide: boolean;
    readonly hasButton: false;
    readonly whiteHandicapBonus: '0';
    readonly friendlyPassOk: boolean;
  };
  readonly whiteHandicapBonus: '0';
  readonly komi: number;
  readonly boardXSize: number;
  readonly boardYSize: number;
  readonly analyzeTurns: readonly number[];
  readonly maxVisits: number;
  readonly analysisPVLen: number;
  readonly includeOwnership: boolean;
  readonly overrideSettings: { readonly ignorePreRootHistory: false };
}
const alphabet = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
const color = (value: Color): 'B' | 'W' => (value === 'black' ? 'B' : 'W');
function fail(message: string): never {
  throw new AnalysisError('invalid-result', message);
}
export function kataGoOptions(options: KataGoOptions): Readonly<Required<KataGoOptions>> {
  if (!options || !['black', 'white', 'to-play'].includes(options.perspective))
    throw TypeError('Declare the KataGo reporting perspective.');
  const maxBoardSize = options.maxBoardSize ?? 19;
  if (!Number.isInteger(maxBoardSize) || maxBoardSize < 2 || maxBoardSize > 52)
    throw RangeError('KataGo maximum board size must be between 2 and 52.');
  return Object.freeze({ perspective: options.perspective, maxBoardSize });
}
function location(point: Point | null, height: number): string {
  if (point === null) return 'pass';
  const x = point.x;
  return `${x < 25 ? alphabet[x] : alphabet[Math.floor(x / 25) - 1]! + alphabet[x % 25]!}${height - point.y}`;
}
function point(value: unknown, position: Position): Point | null {
  if (typeof value !== 'string' || value.length > 32) fail('Invalid KataGo coordinate.');
  if (value.toLowerCase() === 'pass') return null;
  const text = value.toUpperCase(),
    match = /^([A-HJ-Z]{1,2})([1-9][0-9]*)$/.exec(text),
    machine = /^\((0|[1-9][0-9]*),(0|[1-9][0-9]*)\)$/.exec(text);
  let x: number, y: number;
  if (match) {
    x =
      match[1]!.length === 1
        ? alphabet.indexOf(match[1]!)
        : (alphabet.indexOf(match[1]![0]!) + 1) * 25 + alphabet.indexOf(match[1]![1]!);
    y = position.height - Number(match[2]);
  } else if (machine) {
    x = Number(machine[1]);
    y = Number(machine[2]);
  } else fail('Invalid KataGo coordinate.');
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x >= position.width ||
    y >= position.height
  )
    fail('KataGo coordinate is outside the board.');
  return Object.freeze({ x, y });
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('Expected a KataGo response object.');
  return value as Record<string, unknown>;
}
function numeric(value: unknown, min: number, max: number, integer = false): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    fail('Invalid KataGo metric.');
  return value;
}
/** Internal boundary copy; never freeze or retain caller-owned request wrappers. */
export function snapshotKataGoRequest(request: AnalysisRequest): AnalysisRequest {
  const limits = request?.limits;
  return Object.freeze({
    id: request?.id,
    providerId: request?.providerId,
    context: request?.context,
    limits:
      limits &&
      Object.freeze({
        maxVisits: limits.maxVisits,
        maxPvLength: limits.maxPvLength,
        includeOwnership: limits.includeOwnership,
      }),
  });
}
function validRequest(request: AnalysisRequest): AnalysisRequest {
  const snapshot = snapshotKataGoRequest(request);
  const result = normalizeAnalysisResult(snapshot, {
    requestId: snapshot.id,
    contextKey: snapshot.context?.key,
    root: { visits: 0, scoreLeadBlack: 0, winProbabilityBlack: 0.5 },
    candidates: [],
  });
  if (!result.ok) throw new AnalysisError('invalid-request', 'Invalid KataGo analysis request.');
  return snapshot;
}
/** Encode actual setup/history. Throws instead of silently changing unsupported rules. */
export function createKataGoQuery(request: AnalysisRequest, options: KataGoOptions): KataGoQuery {
  request = validRequest(request);
  const capability = kataGoOptions(options),
    context = request.context,
    { initial, position, scoring } = context,
    rules = position.rules;
  const unsupported = (message: string): never => {
    throw new AnalysisError('unsupported', message);
  };
  if (position.width > capability.maxBoardSize || position.height > capability.maxBoardSize)
    unsupported('The board exceeds the declared KataGo engine capability.');
  if (rules.ko === 'none') unsupported('KataGo cannot represent the no-ko play policy.');
  if (rules.suicide === 'allow' && rules.ko !== 'positional-superko')
    unsupported(
      'KataGo only permits multi-stone suicide; this play policy also permits single-stone suicide.',
    );
  if (
    scoring.method === 'territory' &&
    (rules.passStones || initial.passPrisoners.black !== 0 || initial.passPrisoners.white !== 0)
  )
    unsupported('KataGo territory analysis does not represent Banora pass-prisoner accounting.');
  if (scoring.method === 'area' && scoring.seki === 'exclude')
    unsupported('KataGo area analysis does not represent this custom seki exclusion.');
  if (request.limits.maxPvLength === 0)
    unsupported('KataGo requires at least one PV continuation move.');
  // validRequest accepts only SDK-issued immutable contexts, whose complete epoch
  // already passed legal core transitions. Check the engine-specific phase bound
  // without repeating board/group/ko calculations or retaining replay positions.
  let consecutivePasses = initial.consecutivePasses;
  for (const move of context.moves) {
    if (move.move === null && consecutivePasses >= 1)
      unsupported('KataGo analysis does not support histories crossing a two-pass phase boundary.');
    consecutivePasses = move.move === null ? consecutivePasses + 1 : 0;
  }
  // setStone in the engine can remove zero-liberty setup groups. Never change setup.
  const seen = new Set<number>();
  for (let start = 0; start < initial.board.length; start++) {
    const stone = initial.board[start];
    if (stone === null || seen.has(start)) continue;
    const pending = [start];
    seen.add(start);
    let liberty = false;
    while (pending.length) {
      const index = pending.pop()!,
        x = index % initial.width,
        y = Math.floor(index / initial.width);
      const neighbors = [
        ...(x ? [index - 1] : []),
        ...(x < initial.width - 1 ? [index + 1] : []),
        ...(y ? [index - initial.width] : []),
        ...(y < initial.height - 1 ? [index + initial.width] : []),
      ];
      for (const next of neighbors) {
        if (initial.board[next] === null) liberty = true;
        else if (initial.board[next] === stone && !seen.has(next)) {
          seen.add(next);
          pending.push(next);
        }
      }
    }
    if (!liberty) unsupported('KataGo cannot preserve a zero-liberty setup group.');
  }
  const handicapBonus =
    scoring.handicapCompensation === 'white-minus-one' ? Math.max(0, context.handicap - 1) : 0;
  // Engine territory initialization accounts for setup stones but has no old captures.
  const prisoners =
    scoring.method === 'territory' ? initial.captures.black - initial.captures.white : 0;
  const komi = context.komi + handicapBonus - prisoners;
  if (!Number.isFinite(komi) || Math.abs(komi) > 400 || !Number.isInteger(komi * 2))
    unsupported('KataGo requires effective komi in half-point steps within -400 to 400.');
  const tuple = (stone: Color, move: Point | null): readonly ['B' | 'W', string] =>
    Object.freeze([color(stone), location(move, initial.height)]);
  const initialStones = initial.board.flatMap((stone, index) =>
    stone === null
      ? []
      : [tuple(stone!, { x: index % initial.width, y: Math.floor(index / initial.width) })],
  );
  return Object.freeze({
    id: request.id,
    initialStones: Object.freeze(initialStones),
    initialPlayer: color(initial.toPlay),
    moves: Object.freeze(context.moves.map((move) => tuple(move.color, move.move))),
    rules: Object.freeze({
      ko:
        rules.ko === 'simple'
          ? 'SIMPLE'
          : rules.ko === 'positional-superko'
            ? 'POSITIONAL'
            : 'SITUATIONAL',
      scoring: scoring.method === 'area' ? 'AREA' : 'TERRITORY',
      tax: scoring.seki === 'exclude' ? 'SEKI' : 'NONE',
      suicide: rules.suicide === 'allow',
      hasButton: false,
      whiteHandicapBonus: '0',
      friendlyPassOk: scoring.whiteLastPass || context.profile === 'japanese-territory',
    }),
    whiteHandicapBonus: '0',
    komi,
    boardXSize: position.width,
    boardYSize: position.height,
    analyzeTurns: Object.freeze([context.moves.length]),
    maxVisits: request.limits.maxVisits,
    analysisPVLen: request.limits.maxPvLength,
    includeOwnership: request.limits.includeOwnership,
    overrideSettings: Object.freeze({ ignorePreRootHistory: false }),
  });
}
/** Decode a final response, converting declared engine perspective to Black. */
export function decodeKataGoResult(
  request: AnalysisRequest,
  input: unknown,
  options: KataGoOptions,
): AnalysisResultInput {
  request = validRequest(request);
  const capability = kataGoOptions(options),
    value = object(input),
    position = request.context.position,
    area = position.width * position.height;
  if (
    value.id !== request.id ||
    value.turnNumber !== request.context.moves.length ||
    value.isDuringSearch !== false
  )
    fail('KataGo response identity, turn or final status does not match.');
  if (Object.hasOwn(value, 'warning'))
    throw new AnalysisError('unsupported', 'KataGo warned about the query; analysis was rejected.');
  if (Object.hasOwn(value, 'error'))
    throw new AnalysisError('provider', 'KataGo rejected the query.');
  if (value.noResults === true)
    throw new AnalysisError('provider', 'KataGo returned no analysis results.');
  const root = object(value.rootInfo);
  if (root.currentPlayer !== color(position.toPlay))
    fail('KataGo current player does not match the captured position.');
  const black =
    capability.perspective === 'black' ||
    (capability.perspective === 'to-play' && position.toPlay === 'black');
  const metrics = (input: unknown): AnalysisMetrics => {
    const data = object(input),
      probability = numeric(data.winrate, 0, 1),
      score = numeric(data.scoreLead, -1e9, 1e9);
    return Object.freeze({
      winProbabilityBlack: black ? probability : 1 - probability,
      scoreLeadBlack: black ? score : -score,
      visits: numeric(data.visits, 0, 1e9, true),
    });
  };
  const moves = value.moveInfos;
  if (!Array.isArray(moves) || moves.length > area + 1 || moves.includes(undefined))
    fail('Invalid KataGo candidate list.');
  let total = 0;
  const candidates = Object.freeze(
    moves.map((input) => {
      const data = object(input),
        pv = data.pv;
      if (
        !Array.isArray(pv) ||
        pv.includes(undefined) ||
        pv.length > request.limits.maxPvLength + 1 ||
        (total += pv.length) > 8192
      )
        fail('Invalid or unbounded KataGo PV.');
      return Object.freeze({
        ...metrics(data),
        move: point(data.move, position),
        rank: numeric(data.order, 0, area, true),
        principalVariation: Object.freeze(pv.map((move) => point(move, position))),
      });
    }),
  );
  let ownership: readonly number[] | undefined;
  if (value.ownership !== undefined) {
    if (
      !Array.isArray(value.ownership) ||
      value.ownership.length !== area ||
      value.ownership.includes(undefined)
    )
      fail('Invalid KataGo ownership dimensions.');
    ownership = Object.freeze(
      value.ownership.map((value) => {
        const number = numeric(value, -1, 1);
        return black ? number : -number;
      }),
    );
  }
  const result = Object.freeze({
    requestId: request.id,
    contextKey: request.context.key,
    root: metrics(root),
    candidates,
    ...(ownership ? { ownership } : {}),
  });
  const normalized = normalizeAnalysisResult(request, result);
  if (!normalized.ok) throw new AnalysisError(normalized.reason, normalized.message);
  return result;
}
