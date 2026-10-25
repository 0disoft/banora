import { expect, test } from 'bun:test';
import { createAnalysisContext, normalizeAnalysisResult } from '../src/analysis.js';
import type { AnalysisRequest } from '../src/analysis.js';
import { RecordController } from '../src/controller.js';

const metrics = { visits: 10, winProbabilityBlack: 0.5, scoreLeadBlack: 0 };
function request(size = 5): AnalysisRequest {
  const controller = new RecordController({ size });
  try {
    const context = createAnalysisContext(controller.getState(), { profile: 'japanese-territory' });
    if (!context.ok) throw Error('Fixture context failed');
    return {
      id: 'arrays',
      providerId: 'manual',
      context: context.value,
      limits: { maxVisits: 100, maxPvLength: 256, includeOwnership: true },
    };
  } finally {
    controller.dispose();
  }
}
const input = (request: AnalysisRequest) => ({
  requestId: request.id,
  contextKey: request.context.key,
  root: metrics,
  candidates: [],
});
const candidate = (rank = 0) => ({
  ...metrics,
  rank,
  move: { x: 1, y: 1 },
  principalVariation: [{ x: 1, y: 1 }],
});

test('provider map/includes cannot publish forged candidates, nonfinite ownership or sparse arrays', () => {
  const req = request();
  let calls = 0;
  const forged = { ...candidate(), move: { x: 99, y: 99 }, rank: -1 };
  const candidates = Object.assign([forged], {
    map() {
      calls++;
      return [forged];
    },
  });
  const ownership = Object.assign(Array(25).fill(NaN), {
    map() {
      calls++;
      return [NaN];
    },
  });
  const sparse = Object.assign(new Array(1), {
    includes() {
      calls++;
      return false;
    },
  });
  for (const patch of [{ candidates }, { ownership }, { candidates: sparse }])
    expect(normalizeAnalysisResult(req, { ...input(req), ...patch })).toMatchObject({
      ok: false,
      reason: 'invalid-result',
    });
  expect(calls).toBe(0);
});

test('valid indexed candidates, PVs and ownership ignore host methods, iterators and species', () => {
  const req = request(),
    point = { x: 1, y: 1 };
  const pv = [point],
    candidates = [{ ...candidate(), move: point, principalVariation: pv }];
  const ownership = Array(25).fill(0.5);
  let calls = 0;
  const hostile = () => {
    calls++;
    throw Error('Host array hook executed');
  };
  for (const array of [candidates, pv, ownership])
    Object.defineProperties(array, {
      map: { value: hostile },
      includes: { value: hostile },
      [Symbol.iterator]: { value: hostile },
      constructor: { get: hostile },
    });
  const result = normalizeAnalysisResult(req, { ...input(req), candidates, ownership });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.result.candidates[0]?.move).toEqual({ x: 1, y: 1 });
  expect(result.result.candidates[0]?.principalVariation).toEqual([{ x: 1, y: 1 }]);
  expect(result.result.ownership).toEqual(Array(25).fill(0.5));
  point.x = 4;
  ownership[0] = -1;
  expect(result.result.candidates[0]?.move).toEqual({ x: 1, y: 1 });
  expect(result.result.ownership?.[0]).toBe(0.5);
  expect(Object.isFrozen(result.result.candidates[0]?.move)).toBe(true);
  expect(Object.isFrozen(result.result.candidates[0]?.principalVariation)).toBe(true);
  expect(Object.isFrozen(result.result.ownership)).toBe(true);
  expect(calls).toBe(0);
});

test('array shape bounds reject before indexed reads and sample each length once', () => {
  const req = request();
  let indexed = 0;
  function observed(length: number) {
    return new Proxy([], {
      get(target, key, receiver) {
        if (key === 'length') return length;
        if (typeof key === 'string' && /^\d+$/.test(key)) indexed++;
        return Reflect.get(target, key, receiver);
      },
    });
  }
  for (const patch of [
    { candidates: observed(27) },
    { candidates: observed(Infinity) },
    { ownership: observed(24) },
    { ownership: observed(26) },
    { candidates: [{ ...candidate(), principalVariation: observed(258) }] },
  ])
    expect(normalizeAnalysisResult(req, { ...input(req), ...patch }).ok).toBe(false);
  expect(indexed).toBe(0);
  let lengths = 0,
    cells = 0,
    fields = 0;
  const ownership = new Proxy(Array(25).fill(0), {
    get(target, key, receiver) {
      if (key === 'length') lengths++;
      if (typeof key === 'string' && /^\d+$/.test(key)) cells++;
      return Reflect.get(target, key, receiver);
    },
  });
  const result = normalizeAnalysisResult(req, {
    ...input(req),
    get ownership() {
      fields++;
      return ownership;
    },
  });
  expect(result.ok).toBe(true);
  expect({ lengths, cells, fields }).toEqual({ lengths: 1, cells: 25, fields: 1 });
});

test('indexed coordinates are validated and published from the same single-read snapshot', () => {
  const req = request();
  let reads = 0;
  const point = {
    get x() {
      return ++reads <= 4 ? 1 : 99;
    },
    y: 1,
  };
  const result = normalizeAnalysisResult(req, {
    ...input(req),
    candidates: [{ ...candidate(), move: point, principalVariation: [] }],
  });
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.result.candidates[0]?.move).toEqual({ x: 1, y: 1 });
  expect(reads).toBe(1);
});

test('aggregate PV limit accepts 8191/8192 moves and refuses 8193 before reading the excess PV', () => {
  const req = request(9);
  const candidates = Array.from({ length: 32 }, (_, rank) => {
    const point = { x: rank % 9, y: Math.floor(rank / 9) };
    return { ...metrics, rank, move: point, principalVariation: [point, ...Array(255).fill(null)] };
  });
  candidates[31]!.principalVariation.pop();
  expect(normalizeAnalysisResult(req, { ...input(req), candidates }).ok).toBe(true);
  candidates[31]!.principalVariation.push(null);
  expect(normalizeAnalysisResult(req, { ...input(req), candidates }).ok).toBe(true);
  let reads = 0;
  const extra = new Proxy([{ x: 5, y: 3 }], {
    get(target, key, receiver) {
      if (key === '0') reads++;
      return Reflect.get(target, key, receiver);
    },
  });
  expect(
    normalizeAnalysisResult(req, {
      ...input(req),
      candidates: [
        ...candidates,
        { ...metrics, rank: 32, move: { x: 5, y: 3 }, principalVariation: extra },
      ],
    }).ok,
  ).toBe(false);
  expect(reads).toBe(0);
});
