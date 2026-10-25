import { expect, spyOn, test } from 'bun:test';
import * as core from '../src/core.js';
import { RecordController } from '../src/controller.js';
import { getRuleProfile } from '../src/rules.js';
import { AnalysisError, AnalysisSession, createAnalysisContext } from '../src/analysis.js';
import type { AnalysisCancellation, AnalysisRequest, AnalysisSettings } from '../src/analysis.js';
import { KataGoProvider, createKataGoQuery, decodeKataGoResult } from '../src/katago.js';
import type { KataGoOptions } from '../src/katago.js';
const options: KataGoOptions = { perspective: 'black' };
function request(
  controller: RecordController,
  settings: AnalysisSettings = { profile: 'japanese-territory' },
): AnalysisRequest {
  const context = createAnalysisContext(controller.getState(), settings);
  if (!context.ok) throw Error(context.message);
  return {
    id: 'test-request',
    providerId: 'katago',
    context: context.value,
    limits: { maxVisits: 100, maxPvLength: 16, includeOwnership: true },
  };
}
function report(id: string, turnNumber = 0, player = 'B') {
  return {
    id,
    turnNumber,
    isDuringSearch: false,
    rootInfo: { currentPlayer: player, winrate: 0.7, scoreLead: 4, visits: 100 },
    moveInfos: [
      { move: 'C3', order: 0, winrate: 0.8, scoreLead: 5, visits: 80, pv: ['C3', 'D2'] },
      { move: 'pass', order: 1, winrate: 0.6, scoreLead: 3, visits: 20, pv: ['pass'] },
    ],
    ownership: Array(25).fill(0.8),
  };
}
function token() {
  let cancelled = false;
  const listeners = new Set<() => void>();
  const cancellation: AnalysisCancellation = {
    get cancelled() {
      return cancelled;
    },
    onCancel(listener) {
      if (cancelled) listener();
      else listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return {
    cancellation,
    cancel() {
      cancelled = true;
      for (const listener of [...listeners]) listener();
    },
    listeners,
  };
}
test('queries transmit real colored history/setup, selected epoch turn and exact rules without record metadata', () => {
  const controller = new RecordController({
    sgf: '(;SZ[9:7]KM[6.5]PB[Private name]C[Private note]AB[aa]AW[hc];B[bc]MN[80];W[];B[cd])',
  });
  controller.next();
  controller.next();
  controller.next();
  const before = controller.getState(),
    query = createKataGoQuery(request(controller), options);
  expect(query.initialStones).toEqual([
    ['B', 'A7'],
    ['W', 'H5'],
  ]);
  expect(query.initialPlayer).toBe('B');
  expect(query.moves).toEqual([
    ['B', 'B5'],
    ['W', 'pass'],
    ['B', 'C4'],
  ]);
  expect(query.analyzeTurns).toEqual([3]);
  expect(query.boardXSize).toBe(9);
  expect(query.boardYSize).toBe(7);
  expect(query.komi).toBe(6.5);
  expect(query.rules).toEqual({
    ko: 'SIMPLE',
    scoring: 'TERRITORY',
    tax: 'SEKI',
    suicide: false,
    hasButton: false,
    whiteHandicapBonus: '0',
    friendlyPassOk: true,
  });
  expect(query.overrideSettings).toEqual({ ignorePreRootHistory: false });
  expect(query.maxVisits).toBe(100);
  expect(query.analysisPVLen).toBe(16);
  expect(query.includeOwnership).toBe(true);
  expect(JSON.stringify(query)).not.toContain('Private');
  expect(controller.getState()).toBe(before);
  for (const value of [
    query,
    query.initialStones,
    query.initialStones[0],
    query.moves,
    query.moves[0],
    query.rules,
    query.analyzeTurns,
    query.overrideSettings,
  ])
    expect(Object.isFrozen(value)).toBe(true);
  controller.dispose();
});
test('territory setup preserves old capture differences in effective komi; area uses explicit handicap compensation', () => {
  for (const [sgf, expected] of [
    ['(;SZ[5]KM[6.5]AB[ab][ba][cb]AW[bb];B[bc];PL[W]AB[ee])', 5.5],
    ['(;SZ[5]KM[6.5]AW[ab][ba][cb]AB[bb]PL[W];W[bc];PL[B]AB[ee])', 7.5],
  ] as const) {
    const controller = new RecordController({ sgf });
    controller.next();
    controller.next();
    const current = request(controller),
      query = createKataGoQuery(current, options);
    expect(query.moves).toEqual([]);
    expect(query.komi).toBe(expected);
    expect(current.context.komi).toBe(6.5);
    controller.dispose();
  }
  const controller = new RecordController({
    sgf: '(;SZ[5]HA[3]KM[0.5]AB[aa][bb])',
    rules: getRuleProfile('aga-area').play,
  });
  const query = createKataGoQuery(request(controller, { profile: 'aga-area' }), options);
  expect(query.komi).toBe(2.5);
  expect(query.whiteHandicapBonus).toBe('0');
  expect(query.rules.scoring).toBe('AREA');
  expect(query.rules.ko).toBe('SITUATIONAL');
  controller.dispose();
});
test('unsupported engine contexts reject instead of approximating history, policy, setup or komi', () => {
  const unsupported = (
    controller: RecordController,
    settings: AnalysisSettings = { profile: 'japanese-territory' },
  ) => {
    expect(() => createKataGoQuery(request(controller, settings), options)).toThrow(AnalysisError);
    controller.dispose();
  };
  unsupported(new RecordController({ size: 25 }));
  unsupported(new RecordController({ sgf: '(;SZ[5]KM[0.25])' }));
  unsupported(new RecordController({ sgf: '(;SZ[5]KM[400.5])' }));
  unsupported(new RecordController({ sgf: '(;SZ[2]AB[aa][ab][ba][bb])' }));
  unsupported(new RecordController({ size: 5, rules: getRuleProfile('aga-territory').play }), {
    profile: 'aga-territory',
  });
  const scoring = {
    method: 'area',
    seki: 'include',
    handicapCompensation: 'none',
    whiteLastPass: false,
  } as const;
  unsupported(new RecordController({ size: 5, rules: { ko: 'none' } }), { scoring });
  unsupported(
    new RecordController({ size: 5, rules: { ko: 'situational-superko', suicide: 'allow' } }),
    { scoring },
  );
  const ended = new RecordController({ sgf: '(;SZ[5];B[];W[];B[aa])' });
  ended.next();
  ended.next();
  ended.next();
  unsupported(ended);
  const normal = new RecordController({ size: 5 }),
    current = request(normal);
  expect(() =>
    createKataGoQuery({ ...current, limits: { ...current.limits, maxPvLength: 0 } }, options),
  ).toThrow('at least one');
  expect(() => createKataGoQuery({ ...current, context: { ...current.context } }, options)).toThrow(
    'Invalid KataGo',
  );
  expect(
    () =>
      new KataGoProvider({ sendLine() {} }, { perspective: 'guess' } as unknown as KataGoOptions),
  ).toThrow('perspective');
  normal.dispose();
});
test('query encoding reuses proven legality without replaying moves or passes', () => {
  const controller = new RecordController({ sgf: '(;SZ[9];B[aa];W[];B[bb];W[cc])' });
  for (let move = 0; move < 4; move++) expect(controller.next().ok).toBe(true);
  const current = request(controller),
    play = spyOn(core, 'play'),
    pass = spyOn(core, 'pass');
  try {
    for (let query = 0; query < 3; query++) {
      const encoded = createKataGoQuery(current, options);
      expect(encoded.moves).toEqual([
        ['B', 'A9'],
        ['W', 'pass'],
        ['B', 'B8'],
        ['W', 'C7'],
      ]);
      expect(encoded.analyzeTurns).toEqual([4]);
      expect(Object.isFrozen(encoded.moves)).toBe(true);
    }
    expect(play).toHaveBeenCalledTimes(0);
    expect(pass).toHaveBeenCalledTimes(0);
    for (const value of [
      current.context,
      current.context.initial,
      current.context.initial.board,
      current.context.position,
      current.context.position.board,
      current.context.moves,
      current.context.moves[0],
      current.context.moves[0]!.move,
    ])
      expect(Object.isFrozen(value)).toBe(true);
    expect(() =>
      createKataGoQuery({ ...current, context: { ...current.context } }, options),
    ).toThrow('Invalid KataGo analysis request');
    expect(() =>
      createKataGoQuery({ ...current, context: Object.freeze({ ...current.context }) }, options),
    ).toThrow('Invalid KataGo analysis request');
    expect(() =>
      createKataGoQuery({ ...current, limits: { ...current.limits, maxVisits: 0 } }, options),
    ).toThrow('Invalid KataGo analysis request');
  } finally {
    play.mockRestore();
    pass.mockRestore();
    controller.dispose();
  }
});

test('query validation and encoding consume the same single-read request snapshot', () => {
  const controller = new RecordController({ size: 5 });
  const current = request(controller);
  let contexts = 0,
    limits = 0,
    visits = 0;
  const changing = {
    ...current,
    get context() {
      return ++contexts === 1 ? current.context : { ...current.context };
    },
    get limits() {
      limits++;
      return {
        ...current.limits,
        get maxVisits() {
          return ++visits === 1 ? 100 : 0;
        },
      };
    },
  };
  try {
    const encoded = createKataGoQuery(changing, options);
    expect(encoded.maxVisits).toBe(100);
    expect(encoded.moves).toEqual([]);
    expect([contexts, limits, visits]).toEqual([1, 1, 1]);
    expect(() => createKataGoQuery(changing, options)).toThrow('Invalid KataGo analysis request');
  } finally {
    controller.dispose();
  }
});

test('query phase checks preserve single-pass, reset, and two-pass history boundaries', () => {
  for (const [suffix, moves, rejected] of [
    [';B[]', 1, false],
    [';B[];W[aa];B[]', 3, false],
    [';B[];W[]', 2, true],
    [';B[];W[];B[aa]', 3, true],
    [';B[];W[];PL[B];B[aa]', 1, false],
    [';B[aa]MN[200];W[];B[bb]', 3, false],
  ] as const) {
    const controller = new RecordController({ sgf: `(;SZ[5]${suffix})` });
    try {
      while (controller.next().ok) {
        /* select the last node */
      }
      const current = request(controller);
      expect(current.context.moves.length).toBe(moves);
      if (rejected)
        expect(() => createKataGoQuery(current, options)).toThrow('two-pass phase boundary');
      else expect(createKataGoQuery(current, options).analyzeTurns).toEqual([moves]);
    } finally {
      controller.dispose();
    }
  }
});

test('Tromp-Taylor and explicitly compiled large boards map extended coordinates without changing Banora sizes', () => {
  const controller = new RecordController({
    sgf: '(;SZ[52:3]AB[za][Aa][Za])',
    rules: getRuleProfile('tromp-taylor').play,
  });
  const query = createKataGoQuery(request(controller, { profile: 'tromp-taylor' }), {
    perspective: 'white',
    maxBoardSize: 52,
  });
  expect(query.initialStones).toEqual([
    ['B', 'AA3'],
    ['B', 'AB3'],
    ['B', 'BB3'],
  ]);
  expect(query.rules.suicide).toBe(true);
  expect(query.rules.ko).toBe('POSITIONAL');
  controller.dispose();
});
test('response decoding normalizes metrics/ownership for all declared perspectives and validates immutable legal PVs', () => {
  const controller = new RecordController({ sgf: '(;SZ[5]PL[W])' }),
    current = request(controller),
    raw = report(current.id, 0, 'W');
  for (const perspective of ['black', 'white', 'to-play'] as const) {
    const result = decodeKataGoResult(current, raw, { perspective }),
      black = perspective === 'black';
    expect(result.root.winProbabilityBlack).toBeCloseTo(black ? 0.7 : 0.3);
    expect(result.root.scoreLeadBlack).toBe(black ? 4 : -4);
    expect(result.ownership?.[0]).toBe(black ? 0.8 : -0.8);
    expect(result.candidates[0]?.move).toEqual({ x: 2, y: 2 });
    expect(result.candidates[0]?.principalVariation[1]).toEqual({ x: 3, y: 3 });
    expect(Object.isFrozen(result.candidates[0]?.principalVariation)).toBe(true);
    raw.moveInfos[0]!.pv[1] = 'D2';
  }
  const malformed = [
    { id: 'wrong' },
    { turnNumber: 1 },
    { isDuringSearch: true },
    { rootInfo: { ...raw.rootInfo, currentPlayer: 'B' } },
    { rootInfo: { ...raw.rootInfo, winrate: NaN } },
    { rootInfo: { ...raw.rootInfo, scoreLead: Infinity } },
    { moveInfos: [{ ...raw.moveInfos[0], move: 'I3' }] },
    { moveInfos: [{ ...raw.moveInfos[0], pv: ['C3', 'C3'] }] },
    { moveInfos: [{ ...raw.moveInfos[0], pv: ['C3', 'resign'] }] },
    { ownership: Array(24).fill(0) },
    { ownership: [...Array(24).fill(0), 2] },
    { warning: 'secret engine detail' },
    { error: 'secret engine detail' },
    { noResults: true },
  ];
  for (const change of malformed)
    expect(() => decodeKataGoResult(current, { ...raw, ...change }, options)).toThrow(
      AnalysisError,
    );
  const machine = decodeKataGoResult(
    current,
    { ...raw, moveInfos: [{ ...raw.moveInfos[0], move: '(2,2)', pv: ['(2,2)', 'pass'] }] },
    options,
  );
  expect(machine.candidates[0]?.principalVariation).toEqual([{ x: 2, y: 2 }, null]);
  controller.dispose();
});
test('provider accepts out-of-order finals while ignoring unrelated IDs, action acknowledgements and interim reports', async () => {
  const sent: string[] = [],
    provider = new KataGoProvider(
      {
        sendLine(line) {
          sent.push(line);
        },
      },
      { perspective: 'black' },
    );
  const firstRecord = new RecordController({ size: 5 }),
    secondRecord = new RecordController({ sgf: '(;SZ[5]PL[W])' });
  const first = new AnalysisSession(firstRecord, provider, { profile: 'japanese-territory' }),
    second = new AnalysisSession(secondRecord, provider, { profile: 'japanese-territory' });
  expect(sent).toHaveLength(0);
  const a = first.request(),
    b = second.request(),
    aQuery = JSON.parse(sent[0]!),
    bQuery = JSON.parse(sent[1]!);
  expect(provider.receiveLine(JSON.stringify({ id: 'unknown', action: 'terminate' })).ok).toBe(
    true,
  );
  expect(
    provider.receiveLine(JSON.stringify({ ...report(aQuery.id), isDuringSearch: true })).ok,
  ).toBe(true);
  expect(first.getState().status).toBe('loading');
  expect(provider.receiveLine(JSON.stringify(report(bQuery.id, 0, 'W')) + '\r\n').ok).toBe(true);
  expect((await b).ok).toBe(true);
  expect(first.getState().status).toBe('loading');
  expect(provider.receiveLine(JSON.stringify(report(aQuery.id))).ok).toBe(true);
  expect((await a).ok).toBe(true);
  expect(first.getState().result?.candidates.map((candidate) => candidate.scoreLoss)).toEqual([
    0, 2,
  ]);
  expect(second.getState().result?.candidates.map((candidate) => candidate.scoreLoss)).toEqual([
    2, 0,
  ]);
  first.dispose();
  second.dispose();
  firstRecord.dispose();
  secondRecord.dispose();
  provider.dispose();
});
test('cancellation removes pending work, sends scoped termination and ignores late engine results', async () => {
  const sent: string[] = [],
    provider = new KataGoProvider(
      {
        sendLine(line) {
          sent.push(line);
        },
      },
      { perspective: 'black', maxPending: 1 },
    ),
    controller = new RecordController({ size: 5 });
  const session = new AnalysisSession(controller, provider, { profile: 'japanese-territory' }),
    promise = session.request(),
    query = JSON.parse(sent[0]!);
  expect(session.cancel().ok).toBe(true);
  expect(await promise).toMatchObject({ ok: false, reason: 'cancelled' });
  expect(JSON.parse(sent[1]!)).toMatchObject({
    action: 'terminate',
    terminateId: query.id,
    turnNumbers: [0],
  });
  provider.receiveLine(JSON.stringify(report(query.id)));
  expect(session.getState().status).toBe('cancelled');
  const next = session.request(),
    nextQuery = JSON.parse(sent[2]!);
  controller.play({ x: 0, y: 0 });
  expect(await next).toMatchObject({ ok: false, reason: 'stale' });
  expect(JSON.parse(sent[3]!).terminateId).toBe(nextQuery.id);
  provider.receiveLine(JSON.stringify(report(nextQuery.id)));
  expect(session.getState().status).toBe('idle');
  session.dispose();
  provider.dispose();
  expect(controller.undo().ok).toBe(true);
  controller.dispose();
});
test('warnings, wrong turns, engine errors and no-results settle requests with safe diagnostics and local play remains usable', async () => {
  const sent: string[] = [],
    provider = new KataGoProvider(
      {
        sendLine(line) {
          sent.push(line);
        },
      },
      { perspective: 'black' },
    ),
    controller = new RecordController({ size: 5 }),
    session = new AnalysisSession(controller, provider, { profile: 'japanese-territory' });
  for (const fields of [
    { warning: 'private converted rules', field: 'rules' },
    { error: 'private invalid input' },
    { turnNumber: 1, isDuringSearch: false },
    { turnNumber: 0, isDuringSearch: false, noResults: true },
  ]) {
    const promise = session.request(),
      query = JSON.parse(sent.at(-1)!);
    const action = provider.receiveLine(JSON.stringify({ id: query.id, ...fields }));
    expect(action.ok).toBe(false);
    const completion = await promise;
    expect(completion.ok).toBe(false);
    expect(JSON.stringify(completion)).not.toContain('private');
    expect(session.getState().status).toBe('error');
  }
  expect(controller.play({ x: 0, y: 0 }).ok).toBe(true);
  expect(controller.undo().ok).toBe(true);
  session.dispose();
  controller.dispose();
  provider.dispose();
});
test('line and pending bounds, malformed framing, EOF and disposal release subscriptions without owning transport', async () => {
  const sent: string[] = [],
    provider = new KataGoProvider(
      {
        sendLine(line) {
          sent.push(line);
        },
      },
      { perspective: 'black', maxPending: 1 },
    ),
    controller = new RecordController({ size: 5 }),
    current = request(controller),
    firstToken = token(),
    secondToken = token();
  const first = provider.analyze(current, firstToken.cancellation);
  expect(firstToken.listeners.size).toBe(1);
  await expect(
    provider.analyze({ ...current, id: 'second' }, secondToken.cancellation),
  ).rejects.toMatchObject({ reason: 'limit' });
  expect(secondToken.listeners.size).toBe(0);
  expect(provider.receiveLine('{}\n{}').ok).toBe(false);
  await expect(first).rejects.toMatchObject({ reason: 'invalid-result' });
  expect(firstToken.listeners.size).toBe(0);
  const after = provider.analyze({ ...current, id: 'after' }, secondToken.cancellation);
  provider.fail();
  await expect(after).rejects.toMatchObject({ reason: 'provider' });
  expect(secondToken.listeners.size).toBe(0);
  const final = provider.analyze({ ...current, id: 'final' }, firstToken.cancellation);
  provider.dispose();
  await expect(final).rejects.toMatchObject({ reason: 'disposed' });
  expect(firstToken.listeners.size).toBe(0);
  expect(provider.receiveLine('{}')).toMatchObject({ ok: false, reason: 'disposed' });
  await expect(provider.analyze(current, firstToken.cancellation)).rejects.toMatchObject({
    reason: 'disposed',
  });
  const other = new KataGoProvider({ sendLine() {} }, options);
  expect(other.receiveLine('x'.repeat(1048577))).toMatchObject({ ok: false, reason: 'limit' });
  other.dispose();
  controller.dispose();
});
test('synchronous/asynchronous send failures and already-cancelled submissions never expose transport exception text', async () => {
  const controller = new RecordController({ size: 5 }),
    current = request(controller);
  for (const sendLine of [
    () => {
      throw Error('private secret');
    },
    async () => {
      throw Error('private secret');
    },
  ]) {
    const provider = new KataGoProvider({ sendLine }, options),
      lease = token();
    await expect(provider.analyze(current, lease.cancellation)).rejects.toMatchObject({
      reason: 'provider',
      message: 'KataGo transport failed.',
    });
    expect(lease.listeners.size).toBe(0);
    provider.dispose();
  }
  const sent: string[] = [],
    provider = new KataGoProvider(
      {
        sendLine(line) {
          sent.push(line);
        },
      },
      options,
    ),
    lease = token();
  lease.cancel();
  await expect(provider.analyze(current, lease.cancellation)).rejects.toMatchObject({
    reason: 'cancelled',
  });
  expect(sent).toHaveLength(0);
  provider.dispose();
  controller.dispose();
});
test('late write failures cannot affect settled requests or reused IDs after any terminal path', async () => {
  for (const mode of ['cancel', 'success', 'disconnect', 'invalid-result', 'dispose'] as const) {
    const controller = new RecordController({ size: 5 }),
      current = request(controller),
      firstToken = token(),
      writes: { reject(error: Error): void }[] = [];
    const provider = new KataGoProvider(
      {
        sendLine(line) {
          if (JSON.parse(line).action === 'terminate') return;
          return new Promise<void>((_resolve, reject) => writes.push({ reject }));
        },
      },
      { ...options, maxPending: 1 },
    );
    try {
      const result = provider.analyze(current, firstToken.cancellation).then(
        () => 'success',
        (error: AnalysisError) => error.reason,
      );
      if (mode === 'cancel') firstToken.cancel();
      else if (mode === 'success') provider.receiveLine(JSON.stringify(report(current.id)));
      else if (mode === 'disconnect') provider.fail();
      else if (mode === 'dispose') provider.dispose();
      else provider.receiveLine('{}');
      const expected = {
        cancel: 'cancelled',
        success: 'success',
        disconnect: 'provider',
        'invalid-result': 'invalid-result',
        dispose: 'disposed',
      };
      expect(await result).toBe(expected[mode]);
      expect(firstToken.listeners.size).toBe(0);
      if (mode === 'dispose') {
        writes[0]!.reject(Error('private late write failure'));
        await Promise.resolve();
        await expect(provider.analyze(current, token().cancellation)).rejects.toMatchObject({
          reason: 'disposed',
        });
        continue;
      }
      const replacementToken = token();
      let settled = false;
      const replacement = provider.analyze(current, replacementToken.cancellation);
      void replacement.then(
        () => {
          settled = true;
        },
        () => {
          settled = true;
        },
      );
      expect(replacementToken.listeners.size).toBe(1);
      writes[0]!.reject(Error('private late write failure'));
      await Promise.resolve();
      await Promise.resolve();
      expect(settled).toBe(false);
      expect(replacementToken.listeners.size).toBe(1);
      provider.receiveLine(JSON.stringify(report(current.id)));
      await expect(replacement).resolves.toMatchObject({ requestId: current.id });
      expect(replacementToken.listeners.size).toBe(0);
      writes[1]!.reject(Error('private late successful write failure'));
      await Promise.resolve();
    } finally {
      provider.dispose();
      controller.dispose();
    }
  }
});

test('disposal blocks reentrant submissions and failed cancellation subscriptions do not occupy pending capacity', async () => {
  const controller = new RecordController({ size: 5 }),
    current = request(controller),
    lease = token();
  let reentrant: Promise<unknown> | undefined;
  const provider = new KataGoProvider(
    {
      sendLine(line) {
        if (JSON.parse(line).action === 'terminate')
          reentrant = provider.analyze({ ...current, id: 'reentrant' }, lease.cancellation);
      },
    },
    options,
  );
  const pending = provider.analyze(current, lease.cancellation);
  provider.dispose();
  await expect(pending).rejects.toMatchObject({ reason: 'disposed' });
  await expect(reentrant!).rejects.toMatchObject({ reason: 'disposed' });
  expect(lease.listeners.size).toBe(0);
  const other = new KataGoProvider({ sendLine() {} }, { ...options, maxPending: 1 });
  await expect(
    other.analyze(current, {
      cancelled: false,
      onCancel() {
        throw Error('private');
      },
    }),
  ).rejects.toMatchObject({ reason: 'provider' });
  const retry = other.analyze(current, lease.cancellation);
  other.fail();
  await expect(retry).rejects.toMatchObject({ reason: 'provider' });
  expect(lease.listeners.size).toBe(0);
  other.dispose();
  controller.dispose();
});
