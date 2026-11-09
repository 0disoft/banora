import { expect, spyOn, test } from 'bun:test';
import { RecordController, createSgfNode, recordNodeAt, serializeSgf } from '@0disoft/banora';
import type { ControllerState, Position } from '@0disoft/banora';
import { RULE_PROFILES, getRuleProfile } from '@0disoft/banora/rules';
import type { RuleProfileId } from '@0disoft/banora/rules';
import { scorePosition } from '@0disoft/banora/scoring';
import { selectedRecordPrefix } from '../examples/record-prefix.js';
import { deriveScoringPosition } from '../examples/scoring-position.js';

/** Reference implementation: the previous full-collection replay, with the same counting rules. */
function fullReplay(state: ControllerState, profile: RuleProfileId): Position {
  const path: number[] = [];
  let node = state.record.games[state.gameIndex]!;
  for (const id of state.path.slice(1)) {
    const index = node.children.findIndex((child) => child.id === id);
    if (index < 0) throw Error('Invalid reference path');
    path.push(index);
    node = node.children[index]!;
  }
  const model = new RecordController({
    sgf: serializeSgf(state.record),
    rules: { ...getRuleProfile(profile).play, ko: 'none' },
  });
  try {
    return model.inspectNode(
      recordNodeAt(model.getState().record, { gameIndex: state.gameIndex, path })!.id,
    )!.position;
  } finally {
    model.dispose();
  }
}

test('all counting presets match complete previous Positions and reports across games, forks, setup, captures and passes', () => {
  const source = new RecordController({
    sgf: '(;SZ[5]GN[Unrelated];B[aa];W[bb])(;SZ[3]KM[6.5]HA[2]PL[B]AB[ab][ba][cb]AW[bb]XX[raw\\]value];B[bc](;W[];B[];AE[aa]PL[W];W[aa];B[aa];W[cc];B[bb])(;W[cc];B[];W[]))',
  });
  try {
    const pending = [...source.getState().record.games];
    while (pending.length) {
      const node = pending.pop()!;
      pending.push(...node.children);
      source.goTo(node.id);
      const state = source.getState(),
        checkpoint = source.createCheckpoint(),
        exported = source.prepareExport().text;
      for (const profile of Object.keys(RULE_PROFILES) as RuleProfileId[]) {
        const before = fullReplay(state, profile),
          after = deriveScoringPosition(state, profile);
        expect(after).toEqual(before);
        const occupied = after.board.findIndex((stone) => stone !== null);
        const seed =
          occupied < 0
            ? []
            : [{ x: occupied % after.width, y: Math.floor(occupied / after.width) }];
        for (const marks of [{}, { deadStones: seed }, { sekiStones: seed }]) {
          const options = {
            profile,
            komi: 6.5,
            handicap: 2,
            adjustments: { black: 1, white: 0.5 },
            ...marks,
          };
          expect(scorePosition(after, options)).toEqual(scorePosition(before, options));
        }
      }
      expect(source.getState()).toBe(state);
      expect(source.createCheckpoint()).toEqual(checkpoint);
      expect(source.prepareExport().text).toBe(exported);
    }
  } finally {
    source.dispose();
  }
});

test('AGA still recomputes pass prisoners instead of borrowing the live move-policy Position', () => {
  const source = new RecordController({ sgf: '(;SZ[5];B[aa];W[bb];B[];W[tt])' });
  try {
    for (let index = 0; index < 4; index++) source.next();
    const state = source.getState();
    expect(state.position.passPrisoners).toEqual({ black: 0, white: 0 });
    for (const profile of ['aga-territory', 'aga-area'] as const) {
      const position = deriveScoringPosition(state, profile);
      expect(position).not.toBe(state.position);
      expect(position.passPrisoners).toEqual({ black: 1, white: 1 });
      expect(position.consecutivePasses).toBe(2);
      expect(position.rules.ko).toBe('none');
      const score = scorePosition(position, { profile });
      expect(score.ok).toBe(true);
      if (score.ok) expect(score.value.warnings).toEqual([]);
    }
    expect(source.getState()).toBe(state);
  } finally {
    source.dispose();
  }
});

test('the prefix contains exactly selected ancestors, with owned children and unchanged raw properties', () => {
  const source = new RecordController({
    sgf: '(;SZ[5]GN[Other];B[aa])(;SZ[3]KM[7.5]XX[raw\\]value];B[aa](;W[bb]C[chosen\\:comment];B[cc])(;W[cc];B[bb]))',
  });
  try {
    const selected = recordNodeAt(source.getState().record, { gameIndex: 1, path: [0, 0] })!;
    source.goTo(selected.id);
    const state = source.getState(),
      prefix = selectedRecordPrefix(state);
    const path = [
      prefix.games[0]!,
      prefix.games[0]!.children[0]!,
      prefix.games[0]!.children[0]!.children[0]!,
    ];
    expect(prefix.games).toHaveLength(1);
    expect(path.map((node) => node.id)).toEqual([...state.path]);
    expect(path.at(-1)!.children).toHaveLength(0);
    expect(path[0]!.properties).toEqual(state.record.games[1]!.properties);
    expect(path[0]!.rawProperties).toEqual(state.record.games[1]!.rawProperties);
    expect(path.at(-1)!.rawProperties).toEqual(state.node.rawProperties);
    expect(path.at(-1)).not.toBe(state.node);
    expect(Object.isFrozen(path.at(-1)!.children)).toBe(true);
    expect(state.node.children).toHaveLength(1);
    expect(state.record.games[1]!.children[0]!.children).toHaveLength(2);
    expect(serializeSgf(prefix)).not.toContain('GN[Other]');
    for (const profile of Object.keys(RULE_PROFILES) as RuleProfileId[])
      expect(deriveScoringPosition(state, profile)).toEqual(fullReplay(state, profile));
  } finally {
    source.dispose();
  }
});

test('a 20000-move unrelated game reduces to a three-node validated replay', () => {
  const source = new RecordController({
    sgf: '(;SZ[5];B[aa];W[bb])(;SZ[5]' + ';B[];W[]'.repeat(10000) + ')',
  });
  try {
    source.next();
    source.next();
    const state = source.getState(),
      prefix = serializeSgf(selectedRecordPrefix(state));
    expect(prefix.match(/;/g) || []).toHaveLength(3);
    expect(prefix).not.toContain('B[]');
    expect(deriveScoringPosition(state, 'aga-territory')).toEqual(
      fullReplay(state, 'aga-territory'),
    );
    expect(source.getState()).toBe(state);
  } finally {
    source.dispose();
  }
});

test('selected history is still semantically and resource validated; stale/mismatched paths reject', () => {
  const source = new RecordController({ sgf: '(;SZ[5];B[aa])' });
  try {
    const state = source.getState();
    const invalidProperties: Readonly<Record<string, readonly string[]>>[] = [
      { SZ: ['1'] },
      { SZ: ['5'], LB: ['aa:A', 'aa:B'] },
      { SZ: ['5'], C: ['x'.repeat(65537)] },
    ];
    for (const props of invalidProperties) {
      const node = createSgfNode(state.node.id, props);
      const forged = { ...state, node, record: { games: [node] } };
      expect(() => deriveScoringPosition(forged, 'aga-territory')).toThrow();
    }
    for (const forged of [
      { ...state, path: [] },
      { ...state, gameIndex: 1 },
      { ...state, path: [state.node.id, 'missing'] },
      { ...state, node: state.node.children[0]! },
    ])
      expect(() => deriveScoringPosition(forged, 'aga-territory')).toThrow(
        'Position is unavailable',
      );
    expect(() => deriveScoringPosition(state, 'unknown' as RuleProfileId)).toThrow(
      'Unknown rule profile',
    );
    expect(source.getState()).toBe(state);
  } finally {
    source.dispose();
  }
});

test('the temporary controller is disposed on success and on inspection failure without disposing the source', () => {
  const source = new RecordController({ sgf: '(;SZ[5])' });
  const dispose = spyOn(RecordController.prototype, 'dispose');
  let inspect: ReturnType<typeof spyOn> | undefined;
  try {
    const state = source.getState();
    deriveScoringPosition(state, 'aga-area');
    expect(dispose).toHaveBeenCalledTimes(1);
    inspect = spyOn(RecordController.prototype, 'inspectNode').mockImplementation(() => {
      throw Error('injected inspection failure');
    });
    expect(() => deriveScoringPosition(state, 'aga-area')).toThrow('injected inspection failure');
    expect(dispose).toHaveBeenCalledTimes(2);
    expect(source.getState()).toBe(state);
  } finally {
    inspect?.mockRestore();
    dispose.mockRestore();
    source.dispose();
  }
});
