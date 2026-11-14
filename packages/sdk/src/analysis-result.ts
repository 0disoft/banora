import { isOnBoard, pass, play } from './core.js';
import type { Point } from './core.js';
import { AnalysisError } from './analysis-types.js';
import type {
  AnalysisCandidate,
  AnalysisCompletion,
  AnalysisContext,
  AnalysisMetrics,
  AnalysisRequest,
  AnalysisResult,
} from './analysis-types.js';
import { analysisFailure, isAnalysisContext } from './analysis-context.js';

interface DecodedResult {
  readonly result: AnalysisResult;
  readonly maxVisits: number;
  readonly maxPvLength: number;
  readonly includeOwnership: boolean;
}
// Neither the context nor response is kept alive by a proof. Values own no Positions.
const decodedResults = new WeakMap<AnalysisContext, WeakMap<object, DecodedResult>>();
/** Internal: input must be deeply SDK-owned and frozen, after full validation. */
export function rememberDecodedAnalysisResult(
  request: AnalysisRequest,
  input: object,
  result: AnalysisResult,
): void {
  let results = decodedResults.get(request.context);
  if (!results) decodedResults.set(request.context, (results = new WeakMap()));
  results.set(input, {
    result,
    maxVisits: request.limits.maxVisits,
    maxPvLength: request.limits.maxPvLength,
    includeOwnership: request.limits.includeOwnership,
  });
}
function fail(message: string): never {
  throw new AnalysisError('invalid-result', message);
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('Expected an analysis result object.');
  return value as Record<string, unknown>;
}
function number(value: unknown, min: number, max: number, integer = false): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    fail('Invalid or unbounded analysis metric.');
  return value;
}
function metrics(value: unknown): AnalysisMetrics {
  const data = object(value);
  return Object.freeze({
    winProbabilityBlack: number(data.winProbabilityBlack, 0, 1),
    scoreLeadBlack: number(data.scoreLeadBlack, -1e9, 1e9),
    visits: number(data.visits, 0, 1e9, true),
  });
}
/** Decode bounded indexed data into an SDK-owned dense array, never host array methods. */
export function analysisArray<T>(
  input: unknown,
  minimum: number,
  maximum: number,
  message: string,
  read: (value: unknown) => T,
): T[] {
  if (!Array.isArray(input)) fail(message);
  const length = input.length;
  if (!Number.isSafeInteger(length) || length < minimum || length > maximum) fail(message);
  const result = new Array<T>(length);
  for (let index = 0; index < length; index++) {
    if (!Object.hasOwn(input, index)) fail(message);
    const value = input[index];
    if (value === undefined) fail(message);
    result[index] = read(value);
  }
  return result;
}
const key = (move: Point | null) => (move ? `${move.x},${move.y}` : 'pass');
export function normalizeAnalysisResult(
  request: AnalysisRequest,
  input: unknown,
): AnalysisCompletion {
  try {
    if (
      !request ||
      typeof request.id !== 'string' ||
      !request.id.length ||
      request.id.length > 128 ||
      typeof request.providerId !== 'string' ||
      !/^[A-Za-z0-9_-]{1,64}$/.test(request.providerId) ||
      !isAnalysisContext(request.context) ||
      !request.limits ||
      !Number.isInteger(request.limits.maxVisits) ||
      request.limits.maxVisits < 1 ||
      request.limits.maxVisits > 1e6 ||
      typeof request.limits.includeOwnership !== 'boolean' ||
      !Number.isInteger(request.limits.maxPvLength) ||
      request.limits.maxPvLength < 0 ||
      request.limits.maxPvLength > 256
    )
      fail('Invalid analysis request context or limits.');
    const value = object(input);
    const decoded = decodedResults.get(request.context)?.get(value);
    if (
      decoded &&
      decoded.result.requestId === request.id &&
      decoded.result.providerId === request.providerId &&
      decoded.maxVisits === request.limits.maxVisits &&
      decoded.maxPvLength === request.limits.maxPvLength &&
      decoded.includeOwnership === request.limits.includeOwnership
    )
      return { ok: true, result: decoded.result };
    const position = request.context.position,
      area = position.width * position.height;
    if (value.requestId !== request.id || value.contextKey !== request.context.key)
      fail('Analysis response identity does not match the request.');
    const root = metrics(value.root);
    const move = (value: unknown): Point | null => {
      if (value === null) return null;
      const point = object(value),
        x = point.x,
        y = point.y;
      if (typeof x !== 'number' || typeof y !== 'number' || !isOnBoard(position, { x, y }))
        fail('Analysis point is outside the board.');
      return Object.freeze({ x, y });
    };
    let pvTotal = 0;
    const moveKeys = new Set<string>(),
      ranks = new Set<number>();
    const candidates: Omit<AnalysisCandidate, 'scoreLoss'>[] = analysisArray(
      value.candidates,
      0,
      area + 1,
      'Candidate list is invalid or exceeds board area plus pass.',
      (raw) => {
        const data = object(raw),
          point = move(data.move),
          rank = number(data.rank, 0, area, true),
          pv = data.principalVariation;
        if (moveKeys.has(key(point)) || ranks.has(rank))
          fail('Analysis candidates contain duplicate moves or ranks.');
        moveKeys.add(key(point));
        ranks.add(rank);
        const principalVariation = analysisArray(
          pv,
          0,
          Math.min(request.limits.maxPvLength + 1, 8192 - pvTotal),
          'Principal variations exceed their bounds or contain missing moves.',
          move,
        );
        pvTotal += principalVariation.length;
        if (principalVariation.length && key(principalVariation[0]!) !== key(point))
          fail('Principal variation must start with its candidate move.');
        const proposed = point === null ? pass(position) : play(position, point);
        if (!proposed.ok) fail(`Analysis candidate is illegal: ${proposed.reason}.`);
        // The first PV move was checked equal to the legal candidate above.
        // Continue from that exact transition instead of playing it twice.
        let current = proposed.position;
        for (let index = 1; index < principalVariation.length; index++) {
          const step = principalVariation[index]!;
          const result = step === null ? pass(current) : play(current, step);
          if (!result.ok) fail(`Principal variation is illegal: ${result.reason}.`);
          current = result.position;
        }
        return Object.freeze({
          ...metrics(data),
          move: point,
          rank,
          principalVariation: Object.freeze(principalVariation),
        });
      },
    );
    const sign = position.toPlay === 'black' ? 1 : -1,
      best = candidates.length
        ? Math.max(...candidates.map((candidate) => sign * candidate.scoreLeadBlack))
        : 0;
    const scored = candidates
      .map((candidate) =>
        Object.freeze({
          ...candidate,
          scoreLoss: Math.max(0, best - sign * candidate.scoreLeadBlack),
        }),
      )
      .sort((a, b) => a.rank - b.rank);
    let ownership: readonly number[] | null = null;
    const rawOwnership = value.ownership;
    if (rawOwnership !== undefined) {
      ownership = Object.freeze(
        analysisArray(
          rawOwnership,
          area,
          area,
          'Ownership must be a dense vector with one value per point.',
          (value) => number(value, -1, 1),
        ),
      );
    }
    return {
      ok: true,
      result: Object.freeze({
        requestId: request.id,
        contextKey: request.context.key,
        providerId: request.providerId,
        root,
        candidates: Object.freeze(scored),
        ownership,
      }),
    };
  } catch (error) {
    return analysisFailure(
      'invalid-result',
      error instanceof AnalysisError ? error.message : 'Analysis result is malformed.',
    );
  }
}
