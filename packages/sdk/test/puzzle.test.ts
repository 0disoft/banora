import { expect, spyOn, test } from 'bun:test';
import { PuzzleSession } from '../src/puzzle.js';
import type { PuzzleDefinition, PuzzleEvent, PuzzleNode, PuzzleResult } from '../src/puzzle.js';
import { RecordController } from '../src/controller.js';
import { getRuleProfile } from '../src/rules.js';
const state = (result: PuzzleResult) => {
  if (!result.ok) throw Error(result.reason);
  return result.state;
};
function fixture(): PuzzleDefinition {
  return {
    schemaVersion: 'banora.puzzle/v1',
    id: 'capture',
    title: 'Capture and continue',
    prompt: 'Black to play.',
    sgf: '(;SZ[5]AB[ab][ba][cb]AW[bb]XX[keep])',
    tree: {
      id: 'start',
      hints: [
        { text: 'Find the last liberty.', point: { x: 1, y: 2 } },
        { text: 'Fill it before continuing.' },
      ],
      children: [
        {
          id: 'capture',
          move: { x: 1, y: 2 },
          feedback: 'Captured.',
          response: 'reply',
          children: [
            {
              id: 'reply',
              move: { x: 4, y: 4 },
              feedback: 'White replies.',
              hints: [{ text: 'Continue below.', point: { x: 1, y: 3 } }],
              children: [
                { id: 'finish', move: { x: 1, y: 3 }, result: 'correct', feedback: 'Complete.' },
                {
                  id: 'second-wrong',
                  move: { x: 2, y: 2 },
                  result: 'incorrect',
                  feedback: 'Authored rejection.',
                },
              ],
            },
            {
              id: 'unused-reply',
              move: { x: 3, y: 4 },
              result: 'correct',
              feedback: 'Not the selected response.',
            },
          ],
        },
        {
          id: 'wrong',
          move: { x: 3, y: 3 },
          result: 'incorrect',
          feedback: 'That misses the authored objective.',
        },
        {
          id: 'alternative',
          move: { x: 2, y: 0 },
          result: 'correct',
          feedback: 'Alternate authored solution.',
        },
      ],
    },
  };
}
test('authored solver/response steps share core capture semantics and notify once after the full transition', () => {
  const session = new PuzzleSession(fixture()),
    initial = session.getState(),
    states: unknown[] = [],
    events: PuzzleEvent[] = [];
  session.subscribe((value) => states.push(value));
  session.onEvent((event) => events.push(event));
  const progressed = state(session.play({ x: 1, y: 2 }));
  expect(progressed).toMatchObject({
    status: 'active',
    nodeId: 'reply',
    attempts: 1,
    feedback: 'Captured. White replies.',
  });
  expect(progressed.position.captures.black).toBe(1);
  expect(progressed.position.board[6]).toBeNull();
  expect(progressed.position.board[24]).toBe('white');
  expect(progressed.position.toPlay).toBe('black');
  expect(progressed.position.moveNumber).toBe(2);
  expect(progressed.path).toEqual(['start', 'capture', 'reply']);
  expect(progressed.line.map((move) => move.role)).toEqual(['solver', 'response']);
  expect(progressed.remainingHints).toBe(1);
  expect(events).toHaveLength(1);
  expect(states).toHaveLength(2);
  expect(events[0]?.state).toBe(progressed);
  expect(progressed.lastAnswer?.responses[0]?.nodeId).toBe('reply');
  expect(initial.position.board[6]).toBe('white');
  expect(initial.attempts).toBe(0);
  const complete = state(session.play({ x: 1, y: 3 }));
  expect(complete.status).toBe('correct');
  expect(complete.lastAnswer?.outcome).toBe('correct');
  expect(complete.line).toHaveLength(3);
  expect(session.play({ x: 0, y: 4 })).toEqual({ ok: false, reason: 'finished' });
  expect(session.getState()).toBe(complete);
  expect(events).toHaveLength(2);
  session.dispose();
});
test('illegal moves retain exact snapshots/events; legal unlisted answers permit retry without changing board/path/hints', () => {
  const session = new PuzzleSession(fixture()),
    events: PuzzleEvent[] = [];
  session.onEvent((event) => events.push(event));
  state(session.requestHint());
  const before = session.getState();
  expect(session.play({ x: 1, y: 1 })).toEqual({ ok: false, reason: 'occupied' });
  expect(session.play({ x: -1, y: 2 })).toEqual({ ok: false, reason: 'out-of-bounds' });
  expect(session.play(null as unknown as { x: number; y: number })).toEqual({
    ok: false,
    reason: 'invalid-move',
  });
  expect(session.getState()).toBe(before);
  expect(events).toHaveLength(1);
  const unlisted = state(session.play({ x: 0, y: 4 }));
  expect(unlisted.lastAnswer?.outcome).toBe('unlisted');
  expect(unlisted.status).toBe('active');
  expect(unlisted.position).toBe(before.position);
  expect(unlisted.path).toBe(before.path);
  expect(unlisted.hints).toBe(before.hints);
  expect(unlisted.attempts).toBe(1);
  expect(unlisted.feedback).toContain('outside the authored answer tree');
  expect(state(session.play({ x: 1, y: 2 })).nodeId).toBe('reply');
  expect(session.getState().hints).toEqual([]);
  expect(session.getState().attempts).toBe(2);
  session.dispose();
});
test('authored incorrect branches finish on their own diagram; hints are sequential and restart restores exact initial context', () => {
  const session = new PuzzleSession(fixture()),
    initial = session.getState(),
    events: PuzzleEvent[] = [];
  session.onEvent((event) => events.push(event));
  expect(initial.remainingHints).toBe(2);
  const hinted = state(session.requestHint());
  expect(hinted.hints[0]?.point).toEqual({ x: 1, y: 2 });
  expect(hinted.remainingHints).toBe(1);
  expect(hinted.position).toBe(initial.position);
  expect(hinted.attempts).toBe(0);
  expect(events[0]?.type).toBe('hint');
  state(session.requestHint());
  const exhausted = session.getState();
  expect(exhausted.remainingHints).toBe(0);
  expect(session.requestHint()).toEqual({ ok: false, reason: 'no-hint' });
  expect(session.getState()).toBe(exhausted);
  const rejected = state(session.play({ x: 3, y: 3 }));
  expect(rejected.status).toBe('incorrect');
  expect(rejected.position.board[18]).toBe('black');
  expect(rejected.feedback).toContain('misses');
  expect(session.requestHint()).toEqual({ ok: false, reason: 'finished' });
  const restarted = state(session.restart());
  expect(restarted).toEqual(initial);
  expect(restarted.position).toBe(initial.position);
  expect(events.map((event) => event.type)).toEqual(['hint', 'hint', 'answer', 'restart']);
  expect(state(session.play({ x: 2, y: 0 })).status).toBe('correct');
  session.dispose();
});
test('authored passes use configured ledgers and explicit response IDs rather than the first child', () => {
  const definition: PuzzleDefinition = {
    ...fixture(),
    sgf: '(;SZ[3])',
    rules: getRuleProfile('aga-area').play,
    tree: {
      id: 'start',
      children: [
        {
          id: 'pass',
          move: null,
          response: 'chosen',
          children: [
            { id: 'not-chosen', move: { x: 0, y: 0 }, result: 'incorrect' },
            { id: 'chosen', move: null, result: 'correct', feedback: 'Both pass.' },
          ],
        },
      ],
    },
  };
  const session = new PuzzleSession(definition),
    completed = state(session.pass());
  expect(completed.status).toBe('correct');
  expect(completed.position.passPrisoners).toEqual({ black: 1, white: 1 });
  expect(completed.position.consecutivePasses).toBe(2);
  expect(completed.lastAnswer?.responses[0]?.move).toBeNull();
  expect(completed.line.map((move) => move.nodeId)).toEqual(['pass', 'chosen']);
  session.dispose();
});
test('serialized initial locators retain the selected game/branch/history without editing a host record', () => {
  const sgf = '(;SZ[3]PL[W]AW[bb])(;SZ[5](;B[aa])(;B[cc];W[dd]))',
    host = new RecordController({ sgf }),
    before = host.getState();
  const definition: PuzzleDefinition = {
    ...fixture(),
    sgf,
    initial: { gameIndex: 1, path: [1, 0] },
    tree: { id: 'start', children: [{ id: 'finish', move: { x: 0, y: 4 }, result: 'correct' }] },
  };
  const session = new PuzzleSession(definition),
    initial = session.getState();
  expect(initial.position.width).toBe(5);
  expect(initial.position.moveNumber).toBe(2);
  expect(initial.position.board[12]).toBe('black');
  expect(initial.position.board[18]).toBe('white');
  state(session.play({ x: 0, y: 4 }));
  state(session.restart());
  expect(session.getState().position).toBe(initial.position);
  expect(host.getState()).toBe(before);
  expect(host.getState().dirty).toBe(false);
  host.dispose();
  session.dispose();
});
test('compiled inputs, progress snapshots and events are deeply immutable and do not retain mutable author objects', () => {
  const input = fixture(),
    session = new PuzzleSession(input),
    initial = session.getState();
  const mutable = input as unknown as {
    tree: {
      hints: { text: string; point: { x: number; y: number } }[];
      children: { move: { x: number; y: number }; feedback: string }[];
    };
  };
  mutable.tree.hints[0]!.text = 'Changed';
  mutable.tree.hints[0]!.point.x = 4;
  mutable.tree.children[0]!.move.x = 4;
  mutable.tree.children[0]!.feedback = 'Changed';
  const hinted = state(session.requestHint());
  expect(hinted.hints[0]?.text).toBe('Find the last liberty.');
  expect(hinted.hints[0]?.point?.x).toBe(1);
  const progressed = state(session.play({ x: 1, y: 2 }));
  expect(progressed.feedback).toBe('Captured. White replies.');
  for (const value of [
    initial,
    progressed,
    progressed.path,
    progressed.line,
    progressed.line[0],
    progressed.line[0]?.move,
    progressed.lastAnswer,
    progressed.lastAnswer?.responses,
    hinted.hints,
    hinted.hints[0],
    hinted.hints[0]?.point,
  ])
    expect(Object.isFrozen(value)).toBe(true);
  session.dispose();
});
test('notification commands reject reentrancy; throws/unsubscribe/disposal cannot fabricate or suppress other committed events', () => {
  const session = new PuzzleSession(fixture()),
    errorLog = spyOn(console, 'error').mockImplementation(() => {}),
    received: string[] = [];
  try {
    session.subscribe(() => {
      expect(session.restart()).toEqual({ ok: false, reason: 'busy' });
    });
    const unsubscribe = session.onEvent(() => {
      received.push('remove');
      unsubscribe();
      expect(session.play({ x: 1, y: 2 })).toEqual({ ok: false, reason: 'busy' });
    });
    session.onEvent(() => {
      throw Error('Consumer failure');
    });
    session.onEvent((event) => received.push(event.type));
    state(session.requestHint());
    state(session.requestHint());
    expect(received).toEqual(['remove', 'hint', 'hint']);
    expect(errorLog).toHaveBeenCalledTimes(2);
    session.onEvent(() => session.dispose());
    state(session.restart());
    expect(session.play({ x: 1, y: 2 })).toEqual({ ok: false, reason: 'disposed' });
    expect(session.restart()).toEqual({ ok: false, reason: 'disposed' });
    expect(() => session.getState()).toThrow('disposed');
    session.dispose();
  } finally {
    errorLog.mockRestore();
    session.dispose();
  }
});
test('state and event notification failures log fixed labels without inspecting private host errors', () => {
  const session = new PuzzleSession(fixture());
  const log = spyOn(console, 'error').mockImplementation(() => {});
  let fail = false;
  let inspected = 0;
  const privateFailure = Object.defineProperty({}, 'stack', {
    get() {
      inspected++;
      return 'Authored private callback stack';
    },
  });
  const events: string[] = [];
  const statuses: string[] = [];
  try {
    session.subscribe(() => {
      if (fail) throw privateFailure;
    });
    session.subscribe((value) => statuses.push(value.status));
    session.onEvent(() => {
      throw privateFailure;
    });
    session.onEvent((event) => events.push(event.type));
    fail = true;
    expect(session.requestHint().ok).toBe(true);
    expect(session.restart().ok).toBe(true);
    expect(events).toEqual(['hint', 'restart']);
    expect(statuses).toEqual(['active', 'active', 'active']);
    expect(session.getState().hints).toEqual([]);
    expect(log.mock.calls).toEqual([
      ['Banora puzzle state listener failed'],
      ['Banora puzzle event listener failed'],
      ['Banora puzzle state listener failed'],
      ['Banora puzzle event listener failed'],
    ]);
    expect(inspected).toBe(0);
  } finally {
    log.mockRestore();
    session.dispose();
  }
});
test('invalid or ambiguous authored definitions fail before exposing a session', () => {
  const invalid = (change: Partial<PuzzleDefinition>, message?: string) => {
    expect(() => new PuzzleSession({ ...fixture(), ...change })).toThrow(message);
  };
  invalid({ sgf: '(;SZ[0])' });
  invalid({ initial: { gameIndex: 9, path: [] } }, 'locator');
  invalid({ player: 'white' }, 'initial turn');
  invalid({ schemaVersion: 'unknown' as 'banora.puzzle/v1' }, 'schemaVersion');
  invalid({ rules: { ko: 'unknown' as 'simple' } });
  invalid({ rules: { ko: null as unknown as 'simple' } }, 'null');
  invalid({ id: '../bad' }, 'IDs');
  invalid({ title: 'a'.repeat(257) }, 'title');
  invalid({ tree: { id: 'root', result: 'correct' } }, 'root');
  invalid({ tree: { id: 'root' } }, 'terminal');
  invalid(
    {
      tree: { id: 'root', children: [{ id: 'occupied', move: { x: 1, y: 1 }, result: 'correct' }] },
    },
    'occupied',
  );
  invalid(
    {
      tree: {
        id: 'root',
        children: [
          { id: 'first', move: { x: 3, y: 3 }, result: 'correct' },
          { id: 'first', move: { x: 4, y: 3 }, result: 'correct' },
        ],
      },
    },
    'duplicate node',
  );
  invalid(
    {
      tree: {
        id: 'root',
        children: [
          { id: 'first', move: { x: 3, y: 3 }, result: 'correct' },
          { id: 'second', move: { x: 3, y: 3 }, result: 'incorrect' },
        ],
      },
    },
    'duplicate sibling',
  );
  invalid(
    {
      tree: {
        id: 'root',
        children: [
          {
            id: 'step',
            move: { x: 3, y: 3 },
            children: [{ id: 'end', move: { x: 4, y: 3 }, result: 'correct' }],
          },
        ],
      },
    },
    'explicit response',
  );
  invalid(
    {
      tree: {
        id: 'root',
        children: [
          {
            id: 'step',
            move: { x: 3, y: 3 },
            response: 'wrong',
            children: [
              { id: 'wrong', move: { x: 4, y: 3 }, result: 'incorrect' },
              { id: 'unused', move: { x: 3, y: 4 }, result: 'correct' },
            ],
          },
        ],
      },
    },
    'no correct result',
  );
  invalid({ tree: { ...fixture().tree, response: 'capture' } }, 'solver');
  invalid(
    { tree: { ...fixture().tree, hints: [{ text: 'x', point: { x: 5, y: 0 } }] } },
    'outside',
  );
  invalid(
    {
      tree: {
        ...fixture().tree,
        hints: [{ text: 'x', point: null as unknown as { x: number; y: number } }],
      },
    },
    'null',
  );
  invalid({ tree: { ...fixture().tree, hints: new Array(1) } }, 'dense');
  invalid({ tree: { ...fixture().tree, children: new Array(1) } }, 'dense');
  const a: PuzzleNode = { id: 'a', move: { x: 3, y: 3 }, response: 'b' },
    b: PuzzleNode = { id: 'b', move: { x: 4, y: 3 }, children: [a] };
  (a as unknown as { children: PuzzleNode[] }).children = [b];
  invalid({ tree: { id: 'root', children: [a] } }, 'cycle');
  const shared: PuzzleNode = { id: 'shared', move: { x: 2, y: 2 }, result: 'correct' };
  invalid(
    {
      tree: {
        id: 'root',
        children: [
          { id: 'p1', move: { x: 3, y: 3 }, response: 'shared', children: [shared] },
          { id: 'p2', move: { x: 4, y: 3 }, response: 'shared', children: [shared] },
        ],
      },
    },
    'reused',
  );
});
test('authoring enforces depth/node/aggregate-text bounds and applies the requested ko policy to every branch', () => {
  function chain(depth: number): PuzzleNode {
    let node: PuzzleNode = { id: `n${depth}`, move: null, result: 'correct' };
    for (let index = depth - 1; index >= 1; index--)
      node = {
        id: `n${index}`,
        move: null,
        children: [node],
        ...(index % 2 ? { response: node.id } : {}),
      };
    return { id: 'root', children: [node] };
  }
  const bounded = new PuzzleSession({ ...fixture(), tree: chain(128) });
  bounded.dispose();
  expect(() => new PuzzleSession({ ...fixture(), tree: chain(129) })).toThrow('depth');
  const wide: PuzzleNode = {
    id: 'root',
    children: Array.from({ length: 1000 }, (_, index) => ({
      id: `n${index}`,
      move: { x: index % 52, y: Math.floor(index / 52) },
      result: 'correct' as const,
    })),
  };
  expect(() => new PuzzleSession({ ...fixture(), sgf: '(;SZ[52])', tree: wide })).toThrow(
    '1000 nodes',
  );
  const hints = Array.from({ length: 16 }, () => ({ text: 'a'.repeat(4096) }));
  expect(
    () =>
      new PuzzleSession({
        ...fixture(),
        tree: {
          id: 'root',
          children: Array.from({ length: 4 }, (_, x) => ({
            id: `n${x}`,
            move: { x, y: 4 },
            result: 'correct' as const,
            hints,
          })),
        },
      }),
  ).toThrow('aggregate');
  const ko: PuzzleDefinition = {
    ...fixture(),
    sgf: '(;SZ[5]AW[bb][ac][cc][bd]AB[ab][ba][cb];B[bc])',
    initial: { gameIndex: 0, path: [0] },
    tree: { id: 'root', children: [{ id: 'recapture', move: { x: 1, y: 1 }, result: 'correct' }] },
  };
  expect(() => new PuzzleSession(ko)).toThrow('ko');
  const noKo = new PuzzleSession({ ...ko, rules: { ko: 'none' } });
  expect(state(noKo.play({ x: 1, y: 1 })).status).toBe('correct');
  noKo.dispose();
  const superko: PuzzleDefinition = {
    ...ko,
    sgf: ko.sgf.slice(0, -1) + ';W[];B[])',
    initial: { gameIndex: 0, path: [0, 0, 0] },
    rules: { ko: 'positional-superko' },
  };
  expect(() => new PuzzleSession(superko)).toThrow('superko');
});
