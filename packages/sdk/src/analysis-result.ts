import { isOnBoard, pass, play } from './core.js';
import type { Point } from './core.js';
import { AnalysisError } from './analysis-types.js';
import type {
  AnalysisCandidate,
  AnalysisCompletion,
  AnalysisMetrics,
  AnalysisRequest,
} from './analysis-types.js';
import { analysisFailure, isAnalysisContext } from './analysis-context.js';
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
    const value = object(input),
      position = request.context.position,
      area = position.width * position.height;
    if (value.requestId !== request.id || value.contextKey !== request.context.key)
      fail('Analysis response identity does not match the request.');
    const root = metrics(value.root),
      rawCandidates = value.candidates;
    if (
      !Array.isArray(rawCandidates) ||
      rawCandidates.length > area + 1 ||
      rawCandidates.includes(undefined)
    )
      fail('Candidate list is invalid or exceeds board area plus pass.');
    const move = (value: unknown): Point | null => {
      if (value === null) return null;
      const point = object(value);
      if (
        typeof point.x !== 'number' ||
        typeof point.y !== 'number' ||
        !isOnBoard(position, point as unknown as Point)
      )
        fail('Analysis point is outside the board.');
      return Object.freeze({ x: point.x, y: point.y });
    };
    let pvTotal = 0;
    const moveKeys = new Set<string>(),
      ranks = new Set<number>();
    const candidates: Omit<AnalysisCandidate, 'scoreLoss'>[] = rawCandidates.map((raw) => {
      const data = object(raw),
        point = move(data.move),
        rank = number(data.rank, 0, area, true),
        pv = data.principalVariation;
      if (moveKeys.has(key(point)) || ranks.has(rank))
        fail('Analysis candidates contain duplicate moves or ranks.');
      moveKeys.add(key(point));
      ranks.add(rank);
      const pvLength = Array.isArray(pv) ? pv.length : -1;
      if (
        !Array.isArray(pv) ||
        pvLength > request.limits.maxPvLength + 1 ||
        pv.includes(undefined) ||
        (pvTotal += pvLength) > 8192
      )
        fail('Principal variations exceed their bounds or contain missing moves.');
      // Own the bounded dense copy; do not invoke a host array's map/iterator/species.
      const principalVariation = new Array<Point | null>(pvLength);
      for (let index = 0; index < pvLength; index++) principalVariation[index] = move(pv[index]);
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
    });
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
    if (value.ownership !== undefined) {
      if (
        !Array.isArray(value.ownership) ||
        value.ownership.length !== area ||
        value.ownership.includes(undefined)
      )
        fail('Ownership must be a dense vector with one value per point.');
      ownership = Object.freeze(value.ownership.map((value) => number(value, -1, 1)));
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
