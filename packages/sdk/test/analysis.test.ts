import { expect, spyOn, test } from 'bun:test';
import {
  AnalysisError,
  AnalysisSession,
  createAnalysisContext,
  normalizeAnalysisResult,
  sameAnalysisContext,
} from '../src/analysis.js';
import type {
  AnalysisCancellation,
  AnalysisContextResult,
  AnalysisProvider,
  AnalysisRequest,
  AnalysisResultInput,
  AnalysisSettings,
  AnalysisState,
} from '../src/analysis.js';
import { RecordController } from '../src/controller.js';
import * as core from '../src/core.js';
import { getRuleProfile } from '../src/rules.js';
const settings: AnalysisSettings = { profile: 'japanese-territory' };

test('session proofs skip comment/export replay and incrementally validate recorded navigation', () => {
  const controller = new RecordController({ sgf: `(;SZ[9]${';B[];W[]'.repeat(50)};B[aa];W[bb])` });
  for (let i = 0; i < 100; i++) controller.next();
  const session = new AnalysisSession(controller, controlled().provider, settings);
  const replay = spyOn(core, 'replayMove');
  try {
    const prior = session.getState().context;
    controller.setComment('text without a position change');
    controller.acknowledgeExport(controller.prepareExport().id);
    expect(replay).toHaveBeenCalledTimes(0);
    expect(session.getState().context).toBe(prior);
    controller.next();
    // One recorded transition in the controller and one in the incremental context.
    expect(replay).toHaveBeenCalledTimes(2);
    expect(
      sameAnalysisContext(
        session.getState().context,
        context(createAnalysisContext(controller.getState(), settings)),
      ),
    ).toBe(true);
    replay.mockClear();
    controller.next();
    expect(replay).toHaveBeenCalledTimes(2);
    expect(
      sameAnalysisContext(
        session.getState().context,
        context(createAnalysisContext(controller.getState(), settings)),
      ),
    ).toBe(true);
  } finally {
    replay.mockRestore();
    session.dispose();
    controller.dispose();
  }
});

test('session proof invalidation matches full extraction across setup, MN, edits, Undo and imports', () => {
  const controller = new RecordController({
    sgf: '(;SZ[5]KM[0];B[aa];W[bb];AE[aa]PL[W]MN[17];W[cc];B[dd])',
  });
  const session = new AnalysisSession(controller, controlled().provider, settings);
  try {
    const compare = () => {
      const full = createAnalysisContext(controller.getState(), settings);
      const cached = session.getState();
      expect(cached.error?.reason ?? null).toBe(full.ok ? null : full.reason);
      if (full.ok) expect(sameAnalysisContext(cached.context, full.value)).toBe(true);
    };
    compare();
    for (let i = 0; i < 5; i++) {
      controller.next();
      compare();
    }
    controller.previous();
    compare();
    controller.previous();
    compare();
    controller.setComment('setup note');
    compare();
    controller.setMarker({ x: 0, y: 0 }, 'circle');
    compare();
    controller.undo();
    compare();
    controller.redo();
    compare();
    expect(
      controller.loadSgf('(;SZ[5];B[aa];W[aa];AE[aa];B[bb])', { discardChanges: true }).ok,
    ).toBe(true);
    for (let i = 0; i < 4; i++) {
      controller.next();
      compare();
    }
  } finally {
    session.dispose();
    controller.dispose();
  }
});
const context = (result: AnalysisContextResult) => {
  if (!result.ok) throw Error(result.message);
  return result.value;
};
function controlled() {
  const jobs: {
    request: AnalysisRequest;
    cancellation: AnalysisCancellation;
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }[] = [];
  const provider: AnalysisProvider = {
    id: 'controlled',
    analyze(request, cancellation) {
      return new Promise((resolve, reject) =>
        jobs.push({ request, cancellation, resolve, reject }),
      );
    },
  };
  return { provider, jobs };
}
function report(request: AnalysisRequest): AnalysisResultInput {
  return {
    requestId: request.id,
    contextKey: request.context.key,
    root: { visits: 100, winProbabilityBlack: 0.7, scoreLeadBlack: 3 },
    candidates: [
      {
        rank: 0,
        move: { x: 2, y: 2 },
        visits: 80,
        winProbabilityBlack: 0.75,
        scoreLeadBlack: 4,
        principalVariation: [
          { x: 2, y: 2 },
          { x: 3, y: 3 },
        ],
      },
      {
        rank: 1,
        move: null,
        visits: 20,
        winProbabilityBlack: 0.65,
        scoreLeadBlack: 2,
        principalVariation: [null],
      },
    ],
    ownership: Array.from({ length: request.context.position.board.length }, (_, index) =>
      index % 2 ? -0.5 : 0.75,
    ),
  };
}
const failure = (result: { ok: boolean; reason?: string }) => {
  expect(result.ok).toBe(false);
  return result.reason;
};

test('contexts carry actual colored history and preserve baseline capture/pass ledgers after setup', () => {
  const controller = new RecordController({
    sgf: '(;SZ[5]KM[6.5]AB[ab][ba][cb]AW[bb];B[bc];W[];PL[B]AB[ee];B[dd])',
    rules: getRuleProfile('aga-territory').play,
  });
  for (let i = 0; i < 4; i++) controller.next();
  const before = controller.getState();
  const extracted = context(createAnalysisContext(before, { profile: 'aga-territory' }));
  expect(extracted.komi).toBe(6.5);
  expect(extracted.initial.captures.black).toBe(1);
  expect(extracted.initial.passPrisoners.black).toBe(1);
  expect(extracted.moves).toEqual([{ color: 'black', move: { x: 3, y: 3 } }]);
  expect(extracted.initial.toPlay).toBe('black');
  expect(extracted.position.toPlay).toBe('white');
  expect(extracted.position.board).toEqual(before.position.board);
  expect(extracted.position.captures).toEqual(before.position.captures);
  expect(controller.getState()).toBe(before);
  for (const value of [
    extracted,
    extracted.source,
    extracted.moves,
    extracted.moves[0],
    extracted.moves[0]?.move,
    extracted.scoring,
  ])
    expect(Object.isFrozen(value)).toBe(true);
  controller.dispose();
});
test('exact context matching distinguishes turn/history/settings/imports while ignoring comments and private metadata', () => {
  const controller = new RecordController({
    sgf: '(;SZ[5]KM[0]PB[Private player]C[Private notes];B[];W[])',
  });
  const first = context(createAnalysisContext(controller.getState(), settings));
  controller.setComment('Different private notes');
  const annotated = context(createAnalysisContext(controller.getState(), settings));
  expect(annotated.key).not.toBe(first.key);
  expect(sameAnalysisContext(first, annotated)).toBe(true);
  expect(JSON.stringify(first)).not.toContain('Private');
  const komi = context(createAnalysisContext(controller.getState(), { ...settings, komi: 0.5 }));
  expect(sameAnalysisContext(first, komi)).toBe(false);
  controller.next();
  const otherTurn = context(createAnalysisContext(controller.getState(), settings));
  expect(otherTurn.position.board).toEqual(first.position.board);
  expect(sameAnalysisContext(first, otherTurn)).toBe(false);
  controller.next();
  const repeated = context(createAnalysisContext(controller.getState(), settings));
  expect(repeated.position.board).toEqual(first.position.board);
  expect(repeated.position.toPlay).toBe(first.position.toPlay);
  expect(repeated.moves.map((move) => move.color)).toEqual(['black', 'white']);
  expect(sameAnalysisContext(first, repeated)).toBe(false);
  controller.loadSgf('(;SZ[5]KM[0])', { discardChanges: true });
  const imported = context(createAnalysisContext(controller.getState(), settings));
  expect(imported.source.nodeId).toBe(first.source.nodeId);
  expect(sameAnalysisContext(first, imported)).toBe(false);
  controller.dispose();
});
test('unrepresentable archived moves reject analysis without rejecting local browsing, then a setup epoch restores availability', () => {
  const controller = new RecordController({ sgf: '(;SZ[5];W[aa];PL[B])' });
  controller.next();
  const before = controller.getState();
  expect(failure(createAnalysisContext(before, settings))).toBe('unsupported-history');
  expect(controller.getState()).toBe(before);
  controller.next();
  expect(context(createAnalysisContext(controller.getState(), settings)).moves).toEqual([]);
  controller.dispose();
  const ko = new RecordController({ sgf: '(;SZ[5]AW[bb][ac][cc][bd]AB[ab][ba][cb];B[bc];W[bb])' });
  ko.next();
  ko.next();
  expect(failure(createAnalysisContext(ko.getState(), settings))).toBe('unsupported-history');
  expect(ko.setComment('Still editable').ok).toBe(true);
  ko.dispose();
});
test('named profiles require matching actual rules while custom scoring permits explicit host play policies', () => {
  const controller = new RecordController({ size: 5, rules: { ko: 'none' } });
  expect(failure(createAnalysisContext(controller.getState(), settings))).toBe('invalid-context');
  const custom: AnalysisSettings = {
    scoring: {
      method: 'area',
      seki: 'include',
      handicapCompensation: 'none',
      whiteLastPass: false,
    },
    komi: -0.5,
  };
  expect(context(createAnalysisContext(controller.getState(), custom)).position.rules.ko).toBe(
    'none',
  );
  for (const invalid of [
    {},
    { ...custom, profile: 'tromp-taylor' },
    { ...custom, komi: Infinity },
    { ...custom, handicap: -1 },
    { ...custom, scoring: null },
  ]) {
    expect(failure(createAnalysisContext(controller.getState(), invalid as AnalysisSettings))).toBe(
      'invalid-context',
    );
  }
  controller.dispose();
});
test('validated results use Black metrics and derive score loss for the actual player, with immutable ownership/PVs', async () => {
  const controller = new RecordController({ sgf: '(;SZ[5]PL[W])' }),
    { provider, jobs } = controlled(),
    session = new AnalysisSession(controller, provider, settings);
  const promise = session.request({ includeOwnership: true });
  const input = report(jobs[0]!.request);
  jobs[0]!.resolve(input);
  const completed = await promise;
  expect(completed.ok).toBe(true);
  if (!completed.ok) throw Error(completed.message);
  expect(completed.result.candidates.map((candidate) => candidate.scoreLoss)).toEqual([2, 0]);
  expect(completed.result.ownership?.[1]).toBe(-0.5);
  expect(completed.result.root.winProbabilityBlack).toBe(0.7);
  expect(session.getState().status).toBe('ready');
  (input as unknown as { ownership: number[] }).ownership[0] = -1;
  expect(completed.result.ownership?.[0]).toBe(0.75);
  for (const value of [
    session.getState(),
    completed.result,
    completed.result.root,
    completed.result.candidates,
    completed.result.candidates[0],
    completed.result.candidates[0]?.move,
    completed.result.candidates[0]?.principalVariation,
    completed.result.ownership,
  ])
    expect(Object.isFrozen(value)).toBe(true);
  session.dispose();
  expect(controller.getState().dirty).toBe(false);
  controller.dispose();
});
test('candidate legality is reused for the identical first PV move without changing frozen output', () => {
  const controller = new RecordController({ size: 19 });
  const request: AnalysisRequest = {
    id: 'one-step',
    providerId: 'manual',
    context: context(createAnalysisContext(controller.getState(), settings)),
    limits: { maxVisits: 100, maxPvLength: 0, includeOwnership: false },
  };
  const metrics = { winProbabilityBlack: 0.5, scoreLeadBlack: 0, visits: 1 };
  const candidates = Array.from({ length: 361 }, (_, index) => {
    const move = { x: index % 19, y: Math.floor(index / 19) };
    return { ...metrics, rank: 360 - index, move, principalVariation: [move] };
  });
  const input = {
    requestId: request.id,
    contextKey: request.context.key,
    root: metrics,
    candidates: [...candidates, { ...metrics, rank: 361, move: null, principalVariation: [null] }],
  };
  const state = controller.getState(),
    play = spyOn(core, 'play'),
    pass = spyOn(core, 'pass');
  try {
    const completed = normalizeAnalysisResult(request, input);
    expect(completed.ok).toBe(true);
    if (!completed.ok) throw Error(completed.message);
    expect(play).toHaveBeenCalledTimes(361);
    expect(pass).toHaveBeenCalledTimes(1);
    expect(completed.result.candidates.map((candidate) => candidate.rank)).toEqual(
      Array.from({ length: 362 }, (_, rank) => rank),
    );
    expect(completed.result.candidates[0]!.move).toEqual({ x: 18, y: 18 });
    expect(completed.result.candidates.at(-1)!.principalVariation).toEqual([null]);
    expect(completed.result.candidates.every((candidate) => candidate.scoreLoss === 0)).toBe(true);
    for (const candidate of completed.result.candidates) {
      expect(Object.isFrozen(candidate)).toBe(true);
      expect(Object.isFrozen(candidate.principalVariation)).toBe(true);
    }
    candidates[0]!.move.x = 8;
    expect(completed.result.candidates[360]!.move).toEqual({ x: 0, y: 0 });
    expect(completed.result.candidates[360]!.principalVariation).toEqual([{ x: 0, y: 0 }]);
    expect(controller.getState()).toBe(state);
  } finally {
    play.mockRestore();
    pass.mockRestore();
    controller.dispose();
  }
});

test('PV snapshots preserve every indexed move without invoking host map, iterator or species', () => {
  const controller = new RecordController({ size: 5 });
  const request: AnalysisRequest = {
    id: 'host-array',
    providerId: 'manual',
    context: context(createAnalysisContext(controller.getState(), settings)),
    limits: { maxVisits: 100, maxPvLength: 16, includeOwnership: false },
  };
  const point = { x: 2, y: 2 };
  let calls = 0;
  const pv = [point, point];
  Object.defineProperty(pv, 'map', {
    value() {
      calls++;
      return [point];
    },
  });
  Object.defineProperty(pv, Symbol.iterator, {
    value() {
      calls++;
      throw Error('host iterator');
    },
  });
  Object.defineProperty(pv, 'constructor', {
    get() {
      calls++;
      throw Error('host species');
    },
  });
  try {
    const metrics = { winProbabilityBlack: 0.5, scoreLeadBlack: 0, visits: 1 };
    const result = normalizeAnalysisResult(request, {
      requestId: request.id,
      contextKey: request.context.key,
      root: metrics,
      candidates: [{ ...metrics, rank: 0, move: point, principalVariation: pv }],
    });
    expect(result).toMatchObject({
      ok: false,
      reason: 'invalid-result',
      message: 'Principal variation is illegal: occupied.',
    });
    expect(calls).toBe(0);
  } finally {
    controller.dispose();
  }
});

test('PV reuse preserves empty, multi-step, pass, occupied and ko validation boundaries', () => {
  const point = { x: 1, y: 2 },
    recapture = { x: 1, y: 1 };
  for (const [sgf, move, pv, error, plays, passes] of [
    ['(;SZ[5])', point, [], '', 1, 0],
    ['(;SZ[5])', point, [point], '', 1, 0],
    ['(;SZ[5])', point, [point, null, null], '', 1, 2],
    ['(;SZ[5])', null, [], '', 0, 1],
    ['(;SZ[5])', null, [null, point], '', 1, 1],
    ['(;SZ[5])', point, [recapture], 'must start', 0, 0],
    ['(;SZ[5])', point, [point, point], 'Principal variation is illegal: occupied.', 2, 0],
    ['(;SZ[5]AB[bc])', point, [], 'Analysis candidate is illegal: occupied.', 1, 0],
    [
      '(;SZ[5]AW[bb][ac][cc][bd]AB[ab][ba][cb])',
      point,
      [point, recapture],
      'Principal variation is illegal: ko.',
      2,
      0,
    ],
  ] as const) {
    const controller = new RecordController({ sgf });
    const request: AnalysisRequest = {
      id: 'boundaries',
      providerId: 'manual',
      context: context(createAnalysisContext(controller.getState(), settings)),
      limits: { maxVisits: 100, maxPvLength: 16, includeOwnership: false },
    };
    const play = spyOn(core, 'play'),
      pass = spyOn(core, 'pass');
    try {
      const metrics = { winProbabilityBlack: 0.5, scoreLeadBlack: 0, visits: 1 };
      const result = normalizeAnalysisResult(request, {
        requestId: request.id,
        contextKey: request.context.key,
        root: metrics,
        candidates: [{ ...metrics, rank: 0, move, principalVariation: pv }],
      });
      expect(result.ok).toBe(!error);
      if (!result.ok) {
        expect(result.reason).toBe('invalid-result');
        expect(result.message).toContain(error);
      } else expect(result.result.candidates[0]!.principalVariation).toEqual(pv);
      expect(play).toHaveBeenCalledTimes(plays);
      expect(pass).toHaveBeenCalledTimes(passes);
    } finally {
      play.mockRestore();
      pass.mockRestore();
      controller.dispose();
    }
  }
});

test('result trust boundary rejects identity, metrics, duplicates, illegal PVs and sparse/malformed ownership', () => {
  const controller = new RecordController({ size: 5 }),
    request: AnalysisRequest = {
      id: 'manual',
      providerId: 'manual',
      context: context(createAnalysisContext(controller.getState(), settings)),
      limits: { maxVisits: 100, maxPvLength: 16, includeOwnership: true },
    },
    valid = report(request);
  expect(normalizeAnalysisResult(request, valid).ok).toBe(true);
  const bad = [
    { ...valid, requestId: 'other' },
    { ...valid, contextKey: 'other' },
    { ...valid, root: { ...valid.root, winProbabilityBlack: 2 } },
    { ...valid, root: { ...valid.root, scoreLeadBlack: NaN } },
    { ...valid, candidates: [valid.candidates[0], valid.candidates[0]] },
    { ...valid, candidates: [{ ...valid.candidates[0], move: { x: 5, y: 0 } }] },
    { ...valid, candidates: [{ ...valid.candidates[0], principalVariation: [{ x: 0, y: 0 }] }] },
    {
      ...valid,
      candidates: [
        {
          ...valid.candidates[0],
          principalVariation: [
            { x: 2, y: 2 },
            { x: 2, y: 2 },
          ],
        },
      ],
    },
    { ...valid, candidates: new Array(1) },
    { ...valid, ownership: new Array(25) },
    { ...valid, ownership: Array(25).fill(2) },
    { ...valid, ownership: Array(24).fill(0) },
  ];
  for (const value of bad)
    expect(failure(normalizeAnalysisResult(request, value))).toBe('invalid-result');
  controller.dispose();
});
test('submission is explicit; invalid request/settings retain pending state and comment edits preserve matching results', async () => {
  const controller = new RecordController({ size: 5 }),
    { provider, jobs } = controlled(),
    session = new AnalysisSession(controller, provider, settings),
    source = controller.getState();
  expect(jobs).toHaveLength(0);
  expect(session.getState().status).toBe('idle');
  const promise = session.request(),
    loading = session.getState();
  expect(jobs).toHaveLength(1);
  expect(failure(await session.request({ maxVisits: 0 }))).toBe('invalid-request');
  expect(session.getState()).toBe(loading);
  expect(jobs[0]!.cancellation.cancelled).toBe(false);
  expect(failure(session.setSettings({ ...settings, komi: NaN }))).toBe('invalid-context');
  expect(session.getState()).toBe(loading);
  jobs[0]!.resolve(report(jobs[0]!.request));
  expect((await promise).ok).toBe(true);
  const ready = session.getState();
  expect(controller.getState()).toBe(source);
  controller.setComment('Metadata only');
  expect(session.getState()).toBe(ready);
  expect(session.setSettings({ ...settings, komi: 0 }).ok).toBe(true);
  expect(session.getState()).toBe(ready);
  session.dispose();
  controller.dispose();
});
test('cancel settles never-ending work immediately and late results cannot restore cancelled overlays', async () => {
  const controller = new RecordController({ size: 5 }),
    { provider, jobs } = controlled(),
    session = new AnalysisSession(controller, provider, settings);
  let cancellations = 0;
  const promise = session.request();
  jobs[0]!.cancellation.onCancel(() => cancellations++);
  expect(session.cancel().ok).toBe(true);
  expect(failure(await promise)).toBe('cancelled');
  expect(cancellations).toBe(1);
  expect(session.getState().status).toBe('cancelled');
  const cancelled = session.getState();
  jobs[0]!.resolve(report(jobs[0]!.request));
  await Promise.resolve();
  expect(session.getState()).toBe(cancelled);
  jobs[0]!.cancellation.onCancel(() => cancellations++);
  expect(cancellations).toBe(2);
  session.dispose();
  controller.dispose();
});
test('source navigation, settings and identical imports invalidate old requests; late failures cannot overwrite a newer result', async () => {
  const controller = new RecordController({ size: 5 }),
    { provider, jobs } = controlled(),
    session = new AnalysisSession(controller, provider, settings);
  const first = session.request();
  controller.play({ x: 0, y: 0 });
  expect(failure(await first)).toBe('stale');
  expect(jobs[0]!.cancellation.cancelled).toBe(true);
  expect(session.getState().result).toBeNull();
  const second = session.request();
  session.setSettings({ ...settings, komi: 6.5 });
  expect(failure(await second)).toBe('stale');
  expect(session.getState().context?.komi).toBe(6.5);
  const third = session.request();
  controller.loadSgf('(;SZ[5];B[aa])', { discardChanges: true });
  controller.next();
  expect(failure(await third)).toBe('stale');
  const fourth = session.request();
  jobs[3]!.resolve(report(jobs[3]!.request));
  expect((await fourth).ok).toBe(true);
  const ready = session.getState();
  jobs[0]!.reject(Error('Private credentials must not surface'));
  jobs[1]!.resolve(report(jobs[1]!.request));
  jobs[2]!.reject(Error('Old error'));
  await Promise.resolve();
  expect(session.getState()).toBe(ready);
  expect(jobs[3]!.cancellation.cancelled).toBe(false);
  let completedCancel = 0;
  jobs[3]!.cancellation.onCancel(() => completedCancel++);
  session.cancel();
  expect(completedCancel).toBe(0);
  session.dispose();
  controller.dispose();
});
test('provider errors/invalid results stay in analysis; local record/Undo remain usable and arbitrary errors are redacted', async () => {
  const controller = new RecordController({ size: 5 }),
    { provider, jobs } = controlled(),
    session = new AnalysisSession(controller, provider, settings),
    before = controller.getState();
  const bad = session.request();
  jobs[0]!.resolve({ ...report(jobs[0]!.request), requestId: 'foreign' });
  expect(failure(await bad)).toBe('invalid-result');
  expect(session.getState().status).toBe('error');
  expect(controller.getState()).toBe(before);
  const error = session.request();
  jobs[1]!.reject(Error('secret token from transport'));
  expect(failure(await error)).toBe('provider');
  expect(session.getState().error?.message).toBe('Analysis provider failed.');
  expect(session.getState().error?.messageSource).toBeUndefined();
  expect(controller.play({ x: 0, y: 0 }).ok).toBe(true);
  expect(controller.undo().ok).toBe(true);
  expect(controller.getState().dirty).toBe(false);
  session.setProvider({
    id: 'public-error',
    analyze() {
      throw new AnalysisError('unsupported', 'Explicit public diagnostic');
    },
  });
  expect(failure(await session.request())).toBe('unsupported');
  expect(session.getState().error?.message).toBe('Explicit public diagnostic');
  expect(session.getState().error?.messageSource).toBe('provider');
  session.dispose();
  controller.dispose();
});
test('loading listeners can change the source before submission; commands are guarded and listener failures are isolated', async () => {
  const controller = new RecordController({ size: 5 }),
    { provider, jobs } = controlled(),
    session = new AnalysisSession(controller, provider, settings),
    log = spyOn(console, 'error').mockImplementation(() => {}),
    states: AnalysisState[] = [];
  try {
    session.subscribe(() => {
      expect(failure(session.cancel())).toBe('busy');
    });
    session.subscribe((state) => {
      if (state.status === 'loading') throw Error('Bad listener');
    });
    session.subscribe((state) => {
      states.push(state);
      if (state.status === 'loading') controller.play({ x: 0, y: 0 });
    });
    expect(failure(await session.request())).toBe('stale');
    expect(jobs).toHaveLength(0);
    expect(session.getState().context?.position.board[0]).toBe('black');
    expect(states.map((state) => state.status)).toEqual(['idle', 'loading', 'idle']);
    expect(log).toHaveBeenCalledTimes(1);
  } finally {
    log.mockRestore();
    session.dispose();
    controller.dispose();
  }
});
test('cancellation callbacks changing source cannot restore an obsolete outer settings snapshot', async () => {
  const controller = new RecordController({ size: 5 }),
    { provider, jobs } = controlled(),
    session = new AnalysisSession(controller, provider, settings);
  const promise = session.request();
  jobs[0]!.cancellation.onCancel(() => {
    expect(failure(session.cancel())).toBe('busy');
    controller.play({ x: 0, y: 0 });
  });
  expect(session.setSettings({ ...settings, komi: 1 }).ok).toBe(true);
  expect(failure(await promise)).toBe('stale');
  expect(session.getState().context?.position.board[0]).toBe('black');
  expect(session.getState().context?.position.toPlay).toBe('white');
  expect(session.getState().context?.komi).toBe(1);
  session.dispose();
  controller.dispose();
});
test('provider replacement/disposal settle outstanding work and preserve the borrowed source after every late outcome', async () => {
  const controller = new RecordController({ size: 5 }),
    first = controlled(),
    second = controlled(),
    session = new AnalysisSession(controller, first.provider, settings);
  const old = session.request();
  session.setProvider(second.provider);
  expect(failure(await old)).toBe('stale');
  const active = session.request();
  session.dispose();
  expect(failure(await active)).toBe('disposed');
  first.jobs[0]!.resolve(report(first.jobs[0]!.request));
  second.jobs[0]!.reject(Error('After disposal'));
  await Promise.resolve();
  expect(controller.play({ x: 0, y: 0 }).ok).toBe(true);
  expect(failure(await session.request())).toBe('disposed');
  expect(() => session.getState()).toThrow('disposed');
  session.dispose();
  controller.dispose();
});
test('cancellation listeners can unsubscribe during dispatch and a throwing transport cleanup cannot suppress another listener', async () => {
  const controller = new RecordController({ size: 5 }),
    { provider, jobs } = controlled(),
    session = new AnalysisSession(controller, provider, settings),
    log = spyOn(console, 'error').mockImplementation(() => {}),
    calls: number[] = [];
  try {
    const promise = session.request();
    let removeSecond = () => {};
    jobs[0]!.cancellation.onCancel(() => {
      calls.push(1);
      removeSecond();
      throw Error('Transport cleanup failed');
    });
    removeSecond = jobs[0]!.cancellation.onCancel(() => calls.push(2));
    jobs[0]!.cancellation.onCancel(() => calls.push(3));
    session.cancel();
    expect(failure(await promise)).toBe('cancelled');
    expect(calls).toEqual([1, 3]);
    expect(log).toHaveBeenCalledTimes(1);
  } finally {
    log.mockRestore();
    session.dispose();
    controller.dispose();
  }
});
