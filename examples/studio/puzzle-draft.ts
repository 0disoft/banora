import { DEFAULT_SGF_LIMITS, isSgfPass, pointFromSgf, serializeSgf } from '@0disoft/banora/sgf';
import type { RecordLocator } from '@0disoft/banora/sgf';
import { pass, play } from '@0disoft/banora/core';
import type { Color, Point, Position } from '@0disoft/banora/core';
import type { ControllerState } from '@0disoft/banora/controller';
import { PuzzleSession } from '@0disoft/banora/puzzle';
import type { PuzzleDefinition, PuzzleNode } from '@0disoft/banora/puzzle';
import { selectedRecordPrefix } from '../record-prefix.js';

export const PUZZLE_DRAFT_LIMITS = Object.freeze({ nodes: 1000, depth: 128, bytes: 8_388_608 });
export const puzzleDraftErrors = {
  limits: 'Select a smaller variation. Puzzles support 1000 nodes, depth 128 and 8 MiB JSON.',
  metadata: 'Enter an ASCII puzzle ID, a title and a question within the text limits.',
  setup: 'Exclude position-edit branches or select a starting position after those edits.',
  turn: 'Answer moves must alternate from the starting player. Exclude or fix this branch.',
  grade: 'Mark each ending as correct or incorrect, or exclude the branch.',
  response: 'Choose an automatic reply for every continuing opponent turn.',
  solution: 'At least one correct ending must be reachable through the chosen replies.',
  invalid: 'The puzzle contains an illegal move or invalid text. Review the answer tree.',
} as const;
export class PuzzleDraftError extends Error {
  constructor(
    readonly code: keyof typeof puzzleDraftErrors,
    readonly nodeId?: string,
  ) {
    super(puzzleDraftErrors[code]);
  }
}
export interface PuzzleDraftNode {
  readonly id: string;
  readonly parent: string | null;
  readonly depth: number;
  readonly color?: Color;
  readonly move?: Point | null;
  readonly unsupported: boolean;
  readonly feedback: string;
  readonly children: readonly string[];
}
export interface PuzzleDraft {
  readonly sgf: string;
  readonly initial: RecordLocator;
  readonly position: Position;
  readonly nodes: readonly PuzzleDraftNode[];
}
export interface PuzzleNodeEdit {
  kind: 'continue' | 'correct' | 'incorrect' | 'exclude';
  response: string;
  feedback: string;
  hint: string;
}
export interface PuzzleMetadata {
  id: string;
  title: string;
  prompt: string;
}

/** Preserve the selected game's exact history while dropping unrelated games and branches. */
function prefix(state: ControllerState): string {
  try {
    return serializeSgf(selectedRecordPrefix(state));
  } catch {
    throw new PuzzleDraftError('invalid');
  }
}

/** Project owned, bounded authoring data. SGF annotations never imply answer grades. */
export function createPuzzleDraft(state: ControllerState): PuzzleDraft {
  const rows: (Omit<PuzzleDraftNode, 'children'> & { children: string[] })[] = [
    {
      id: 'root',
      parent: null,
      depth: 0,
      unsupported: false,
      feedback: '',
      children: [],
    },
  ];
  const root = rows[0]!;
  const pending = [...state.node.children].reverse().map((node) => ({ node, parent: root }));
  let visited = 0;
  while (pending.length) {
    const { node, parent } = pending.pop()!;
    if (++visited > DEFAULT_SGF_LIMITS.maxNodes) throw new PuzzleDraftError('limits');
    const props = node.properties;
    const unsupported = ['AB', 'AW', 'AE', 'PL', 'SZ', 'HA'].some(
      (key) => props[key] !== undefined,
    );
    const value = props.B?.[0] ?? props.W?.[0];
    let next = parent;
    // Annotation-only nodes do not become fictitious passes. Setup edits stay visible and blocked.
    if (value !== undefined || unsupported) {
      if (rows.length >= PUZZLE_DRAFT_LIMITS.nodes || parent.depth >= PUZZLE_DRAFT_LIMITS.depth)
        throw new PuzzleDraftError('limits');
      next = {
        id: `answer-${rows.length}`,
        parent: parent.id,
        depth: parent.depth + 1,
        unsupported,
        feedback: props.C?.join('\n') ?? '',
        children: [],
        ...(value !== undefined
          ? {
              color: props.B ? ('black' as const) : ('white' as const),
              move: isSgfPass(value, state.position.width, state.position.height)
                ? null
                : pointFromSgf(value, state.position.width, state.position.height),
            }
          : {}),
      };
      parent.children.push(next.id);
      rows.push(next);
    }
    for (let index = node.children.length - 1; index >= 0; index--)
      pending.push({ node: node.children[index]!, parent: next });
  }
  return Object.freeze({
    sgf: prefix(state),
    position: state.position,
    initial: Object.freeze({
      gameIndex: 0,
      path: Object.freeze(Array(state.path.length - 1).fill(0)),
    }),
    nodes: Object.freeze(
      rows.map((row) => Object.freeze({ ...row, children: Object.freeze(row.children) })),
    ),
  });
}

export function initialPuzzleEdits(draft: PuzzleDraft): Map<string, PuzzleNodeEdit> {
  return new Map(
    draft.nodes.map((node) => [
      node.id,
      { kind: 'continue', response: '', feedback: node.feedback, hint: '' },
    ]),
  );
}

/** Reconstruct at most 128 normal-play moves for the authoring board, without reparsing SGF. */
export function puzzleDraftPosition(draft: PuzzleDraft, id: string): Position {
  const nodes = new Map(draft.nodes.map((node) => [node.id, node]));
  const path: PuzzleDraftNode[] = [];
  let node = nodes.get(id);
  if (!node) throw new PuzzleDraftError('invalid');
  while (node.parent) {
    path.push(node);
    node = nodes.get(node.parent)!;
  }
  let position = draft.position;
  for (const step of path.reverse()) {
    if (step.unsupported || step.move === undefined) throw new PuzzleDraftError('setup', step.id);
    if (step.color !== position.toPlay) throw new PuzzleDraftError('turn', step.id);
    const result = step.move === null ? pass(position) : play(position, step.move);
    if (!result.ok) throw new PuzzleDraftError('invalid', step.id);
    position = result.position;
  }
  return position;
}

/** All grade/response choices are explicit, and the canonical SDK validates every included answer. */
export function exportPuzzleDraft(
  draft: PuzzleDraft,
  metadata: PuzzleMetadata,
  edits: ReadonlyMap<string, PuzzleNodeEdit>,
): { definition: PuzzleDefinition; json: string } {
  if (
    !/^[A-Za-z0-9_-]{1,64}$/.test(metadata.id) ||
    !metadata.title.trim() ||
    metadata.title.length > 256 ||
    !metadata.prompt.trim() ||
    metadata.prompt.length > 4096
  )
    throw new PuzzleDraftError('metadata');
  const nodes = new Map(draft.nodes.map((node) => [node.id, node]));
  function convert(id: string): PuzzleNode {
    const node = nodes.get(id)!;
    const edit = edits.get(id);
    if (!edit || edit.kind === 'exclude') throw new PuzzleDraftError('invalid', id);
    if (node.unsupported) throw new PuzzleDraftError('setup', id);
    const expected =
      node.depth % 2
        ? draft.position.toPlay
        : draft.position.toPlay === 'black'
          ? 'white'
          : 'black';
    if (node.parent && node.color !== expected) throw new PuzzleDraftError('turn', id);
    const terminal = edit.kind === 'correct' || edit.kind === 'incorrect';
    if (!node.parent && terminal) throw new PuzzleDraftError('grade', id);
    const children = terminal
      ? []
      : node.children.filter((child) => edits.get(child)?.kind !== 'exclude').map(convert);
    if (!terminal && !children.length) throw new PuzzleDraftError('grade', id);
    const responseTurn = node.depth % 2 === 1;
    if (!terminal && responseTurn && !children.some((child) => child.id === edit.response))
      throw new PuzzleDraftError('response', id);
    return {
      id,
      ...(node.parent ? { move: node.move! } : {}),
      ...(terminal ? { result: edit.kind as 'correct' | 'incorrect' } : { children }),
      ...(!terminal && responseTurn ? { response: edit.response } : {}),
      ...(edit.feedback ? { feedback: edit.feedback } : {}),
      ...(edit.hint ? { hints: [{ text: edit.hint }] } : {}),
    };
  }
  const tree = convert('root');
  const pending = [tree];
  let solved = false;
  while (pending.length) {
    const node = pending.pop()!;
    if (node.result === 'correct') {
      solved = true;
      break;
    }
    if (!node.result)
      pending.push(
        ...(node.response
          ? node.children!.filter((child) => child.id === node.response)
          : (node.children ?? [])),
      );
  }
  if (!solved) throw new PuzzleDraftError('solution');
  const definition: PuzzleDefinition = {
    schemaVersion: 'banora.puzzle/v1',
    ...metadata,
    sgf: draft.sgf,
    initial: draft.initial,
    player: draft.position.toPlay,
    rules: { ...draft.position.rules },
    tree,
  };
  let session: PuzzleSession | undefined;
  try {
    session = new PuzzleSession(definition);
  } catch {
    throw new PuzzleDraftError('invalid');
  } finally {
    session?.dispose();
  }
  const json = JSON.stringify(definition, null, 2) + '\n';
  if (new TextEncoder().encode(json).byteLength > PUZZLE_DRAFT_LIMITS.bytes)
    throw new PuzzleDraftError('limits');
  return { definition, json };
}
