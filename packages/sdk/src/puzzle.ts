import { pass, play } from './core.js';
import type { Point } from './core.js';
import { compilePuzzle } from './puzzle-authoring.js';
import type { CompiledPuzzle, CompiledPuzzleNode } from './puzzle-authoring.js';
import type {
  PuzzleAnswer,
  PuzzleDefinition,
  PuzzleEvent,
  PuzzleFailure,
  PuzzleLineMove,
  PuzzleResult,
  PuzzleState,
} from './puzzle-types.js';
export type * from './puzzle-types.js';

/** A deterministic headless session over an explicitly authored answer tree. */
export class PuzzleSession {
  #definition: CompiledPuzzle | undefined;
  #state: PuzzleState | undefined;
  #listeners = new Set<(state: PuzzleState) => void>();
  #events = new Set<(event: PuzzleEvent) => void>();
  #busy = false;
  #disposed = false;
  constructor(definition: PuzzleDefinition) {
    this.#definition = compilePuzzle(definition);
    this.#state = this.#initialState();
  }
  #initialState(): PuzzleState {
    const definition = this.#definition!,
      root = definition.nodes.get(definition.root)!;
    return Object.freeze({
      id: definition.id,
      title: definition.title,
      prompt: definition.prompt,
      player: definition.player,
      nodeId: root.id,
      position: definition.initial,
      status: 'active',
      attempts: 0,
      feedback: root.feedback,
      path: Object.freeze([root.id]),
      line: Object.freeze([]),
      hints: Object.freeze([]),
      remainingHints: root.hints.length,
      lastAnswer: null,
    });
  }
  #assertLive(): void {
    if (this.#disposed) throw Error('PuzzleSession is disposed');
  }
  getState(): PuzzleState {
    this.#assertLive();
    return this.#state!;
  }
  subscribe(listener: (state: PuzzleState) => void): () => void {
    this.#assertLive();
    this.#listeners.add(listener);
    const busy = this.#busy;
    this.#busy = true;
    try {
      listener(this.#state!);
    } catch (error) {
      this.#listeners.delete(listener);
      throw error;
    } finally {
      this.#busy = busy;
    }
    return () => {
      this.#listeners.delete(listener);
    };
  }
  onEvent(listener: (event: PuzzleEvent) => void): () => void {
    this.#assertLive();
    this.#events.add(listener);
    return () => {
      this.#events.delete(listener);
    };
  }
  #guard(finished = true): PuzzleFailure | undefined {
    return this.#disposed
      ? 'disposed'
      : this.#busy
        ? 'busy'
        : finished && this.#state!.status !== 'active'
          ? 'finished'
          : undefined;
  }
  #publish(state: PuzzleState, event: PuzzleEvent): PuzzleResult {
    this.#state = state;
    this.#busy = true;
    try {
      for (const listener of [...this.#listeners]) {
        if (!this.#listeners.has(listener)) continue;
        try {
          listener(state);
        } catch {
          console.error('Banora puzzle state listener failed');
        }
      }
      for (const listener of [...this.#events]) {
        if (!this.#events.has(listener)) continue;
        try {
          listener(event);
        } catch {
          console.error('Banora puzzle event listener failed');
        }
      }
    } finally {
      this.#busy = false;
    }
    return { ok: true, state };
  }
  play(point: Point): PuzzleResult {
    const failure = this.#guard();
    if (failure) return { ok: false, reason: failure };
    if (
      !point ||
      typeof point !== 'object' ||
      typeof point.x !== 'number' ||
      typeof point.y !== 'number'
    )
      return { ok: false, reason: 'invalid-move' };
    return this.#answer(Object.freeze({ x: point.x, y: point.y }));
  }
  pass(): PuzzleResult {
    const failure = this.#guard();
    return failure ? { ok: false, reason: failure } : this.#answer(null);
  }
  #answer(move: Point | null): PuzzleResult {
    const before = this.#state!,
      definition = this.#definition!;
    if (before.attempts >= 1_000_000_000) return { ok: false, reason: 'limit' };
    const played = move === null ? pass(before.position) : play(before.position, move);
    if (!played.ok) return played;
    const parent = definition.nodes.get(before.nodeId)!;
    let node = parent.children
      .map((id) => definition.nodes.get(id)!)
      .find((child) =>
        move === null ? child.move === null : child.move?.x === move.x && child.move.y === move.y,
      );
    const responses: PuzzleLineMove[] = [],
      line = [...before.line],
      path = [...before.path],
      feedback: string[] = [];
    let position = before.position;
    const step = (target: CompiledPuzzleNode, role: 'solver' | 'response') => {
      const playedMove = Object.freeze({
        nodeId: target.id,
        move: target.move,
        color: position.toPlay,
        role,
      });
      const result = target.move === null ? pass(position) : play(position, target.move);
      // Fully validated immutable definitions and private state make this unreachable.
      if (!result.ok) throw Error(`Authored puzzle transition failed: ${result.reason}`);
      position = result.position;
      line.push(playedMove);
      path.push(target.id);
      if (role === 'response') responses.push(playedMove);
      if (target.feedback) feedback.push(target.feedback);
    };
    let outcome: PuzzleAnswer['outcome'] = 'unlisted';
    if (node) {
      // The submitted move has already passed legality. Reuse it rather than
      // repeat its board/group/repetition calculation in the solver transition.
      position = played.position;
      line.push(
        Object.freeze({
          nodeId: node.id,
          move: node.move,
          color: before.position.toPlay,
          role: 'solver',
        }),
      );
      path.push(node.id);
      if (node.feedback) feedback.push(node.feedback);
      while (!node.result && position.toPlay !== definition.player) {
        node = definition.nodes.get(node.response!)!;
        step(node, 'response');
      }
      outcome = node.result ?? 'continue';
    }
    const answer: PuzzleAnswer = Object.freeze({
      move,
      color: before.position.toPlay,
      outcome,
      responses: Object.freeze(responses),
    });
    const state: PuzzleState = Object.freeze({
      ...before,
      nodeId: node?.id ?? before.nodeId,
      position,
      status: outcome === 'correct' || outcome === 'incorrect' ? outcome : 'active',
      attempts: before.attempts + 1,
      feedback:
        outcome === 'unlisted'
          ? 'This legal move is outside the authored answer tree. Try another move.'
          : feedback.join(' '),
      path: node ? Object.freeze(path) : before.path,
      line: node ? Object.freeze(line) : before.line,
      hints: node ? Object.freeze([]) : before.hints,
      remainingHints: node ? node.hints.length : before.remainingHints,
      lastAnswer: answer,
    });
    return this.#publish(state, Object.freeze({ type: 'answer', answer, state }));
  }
  requestHint(): PuzzleResult {
    const failure = this.#guard();
    if (failure) return { ok: false, reason: failure };
    const before = this.#state!,
      hint = this.#definition!.nodes.get(before.nodeId)!.hints[before.hints.length];
    if (!hint) return { ok: false, reason: 'no-hint' };
    const state = Object.freeze({
      ...before,
      hints: Object.freeze([...before.hints, hint]),
      remainingHints: before.remainingHints - 1,
    });
    return this.#publish(state, Object.freeze({ type: 'hint', hint, state }));
  }
  restart(): PuzzleResult {
    const failure = this.#guard(false);
    if (failure) return { ok: false, reason: failure };
    const state = this.#initialState();
    return this.#publish(state, Object.freeze({ type: 'restart', state }));
  }
  dispose(): void {
    this.#disposed = true;
    this.#listeners.clear();
    this.#events.clear();
    this.#definition = undefined;
    this.#state = undefined;
  }
}
