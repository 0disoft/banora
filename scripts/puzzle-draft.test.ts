import { expect, test } from 'bun:test';
import { RecordController, PuzzleSession, serializeSgf } from '@0disoft/banora';
import {
  createPuzzleDraft,
  exportPuzzleDraft,
  initialPuzzleEdits,
  puzzleDraftPosition,
} from '../examples/studio/puzzle-draft.js';
const meta = { id: 'study-1', title: 'Authored <title>', prompt: 'Find the answer 日本語' };

test('exports selected history only and plays the authored correct/incorrect alternatives without changing source', () => {
  const model = new RecordController({
    sgf: '(;SZ[5]GN[Private title]XX[a\\:b];B[aa](;W[bb](;B[cc]TE[1]C[Correct text])(;B[dd]BM[1]C[Wrong text]))(;W[ee]C[Private branch]))(;SZ[9]GN[Other game])',
  });
  try {
    model.next();
    model.next();
    const before = model.getState(),
      original = serializeSgf(before.record);
    const draft = createPuzzleDraft(before),
      edits = initialPuzzleEdits(draft);
    expect(draft.nodes).toHaveLength(3);
    expect(draft.sgf).toContain('XX[a\\:b]');
    expect(draft.sgf).not.toContain('Private branch');
    expect(draft.sgf).not.toContain('Other game');
    expect(() => exportPuzzleDraft(draft, meta, edits)).toThrow('Mark each ending');
    edits.get('answer-1')!.kind = 'correct';
    edits.get('answer-2')!.kind = 'incorrect';
    edits.get('root')!.hint = 'Look near the corner';
    const { json } = exportPuzzleDraft(draft, meta, edits);
    const session = new PuzzleSession(JSON.parse(json));
    try {
      expect(session.getState().position.board).toEqual(before.position.board);
      expect(session.getState().position.moveNumber).toBe(before.position.moveNumber);
      expect(session.requestHint().ok).toBe(true);
      expect(session.play({ x: 2, y: 2 }).ok).toBe(true);
      expect(session.getState().status).toBe('correct');
      session.restart();
      session.play({ x: 3, y: 3 });
      expect(session.getState().status).toBe('incorrect');
    } finally {
      session.dispose();
    }
    expect(model.getState()).toBe(before);
    expect(serializeSgf(model.getState().record)).toBe(original);
  } finally {
    model.dispose();
  }
});

test('explicit opponent replies control reachability and terminal choices prune later moves', () => {
  const model = new RecordController({ sgf: '(;SZ[5];B[aa](;W[bb];B[cc])(;W[dd];B[ee]))' });
  try {
    const draft = createPuzzleDraft(model.getState()),
      edits = initialPuzzleEdits(draft);
    edits.get('answer-3')!.kind = 'correct';
    edits.get('answer-5')!.kind = 'incorrect';
    expect(() => exportPuzzleDraft(draft, meta, edits)).toThrow('Choose an automatic reply');
    edits.get('answer-1')!.response = 'answer-4';
    expect(() => exportPuzzleDraft(draft, meta, edits)).toThrow('At least one correct');
    edits.get('answer-1')!.response = 'answer-2';
    const result = exportPuzzleDraft(draft, meta, edits);
    const session = new PuzzleSession(result.definition);
    try {
      session.play({ x: 0, y: 0 });
      expect(session.getState().position.board[6]).toBe('white');
      expect(session.getState().status).toBe('active');
      session.play({ x: 2, y: 2 });
      expect(session.getState().status).toBe('correct');
    } finally {
      session.dispose();
    }
    edits.get('answer-1')!.kind = 'correct';
    expect(
      exportPuzzleDraft(draft, meta, edits).definition.tree.children![0]!.children,
    ).toBeUndefined();
  } finally {
    model.dispose();
  }
});

test('annotation-only nodes are not passes; setup branches require explicit exclusion', () => {
  const model = new RecordController({ sgf: '(;SZ[5](;C[note];B[aa])(;AB[bb];W[cc]))' });
  try {
    const draft = createPuzzleDraft(model.getState()),
      edits = initialPuzzleEdits(draft);
    expect(draft.nodes).toHaveLength(4);
    expect(draft.nodes[1]!.move).toEqual({ x: 0, y: 0 });
    edits.get('answer-1')!.kind = 'correct';
    edits.get('answer-3')!.kind = 'incorrect';
    expect(() => exportPuzzleDraft(draft, meta, edits)).toThrow('Exclude position-edit');
    edits.get('answer-2')!.kind = 'exclude';
    expect(exportPuzzleDraft(draft, meta, edits).definition.tree.children).toHaveLength(1);
    expect(() => puzzleDraftPosition(draft, 'answer-2')).toThrow('Exclude position-edit');
  } finally {
    model.dispose();
  }
});

test('strict puzzle legality rejects historical color and occupied-point replay without repairing source', () => {
  for (const sgf of ['(;SZ[5];W[aa])', '(;SZ[5];B[aa];W[aa])']) {
    const model = new RecordController({ sgf });
    try {
      const draft = createPuzzleDraft(model.getState()),
        edits = initialPuzzleEdits(draft);
      edits.get(draft.nodes.at(-1)!.id)!.kind = 'correct';
      if (draft.nodes.length === 3) edits.get('answer-1')!.response = 'answer-2';
      expect(() => exportPuzzleDraft(draft, meta, edits)).toThrow();
      expect(() => puzzleDraftPosition(draft, draft.nodes.at(-1)!.id)).toThrow();
    } finally {
      model.dispose();
    }
  }
});

test('passes, legacy tt, other-game selection and owned preview positions preserve the source', () => {
  const model = new RecordController({ sgf: '(;SZ[5])(;SZ[5]PL[W];W[tt];B[aa])' });
  try {
    model.goTo(model.getState().record.games[1]!.id);
    const before = model.getState(),
      draft = createPuzzleDraft(before),
      edits = initialPuzzleEdits(draft);
    expect(draft.nodes[1]!.move).toBeNull();
    expect(puzzleDraftPosition(draft, 'answer-2').board[0]).toBe('black');
    edits.get('answer-1')!.response = 'answer-2';
    edits.get('answer-2')!.kind = 'correct';
    const result = exportPuzzleDraft(draft, meta, edits);
    expect(result.definition.player).toBe('white');
    expect(result.definition.initial?.gameIndex).toBe(0);
    expect(model.getState()).toBe(before);
  } finally {
    model.dispose();
  }
});

test('draft limits and metadata do not silently truncate a large answer tree', () => {
  for (const count of [129, 1000]) {
    const model = new RecordController({ sgf: `(;SZ[5]${';B[]'.repeat(count)})` });
    try {
      expect(() => createPuzzleDraft(model.getState())).toThrow('Select a smaller variation');
    } finally {
      model.dispose();
    }
  }
  const model = new RecordController({ sgf: '(;SZ[5];B[aa])' });
  try {
    const draft = createPuzzleDraft(model.getState()),
      edits = initialPuzzleEdits(draft);
    edits.get('answer-1')!.kind = 'correct';
    for (const patch of [
      { id: '../unsafe' },
      { title: '' },
      { prompt: '' },
      { title: 'a'.repeat(257) },
    ])
      expect(() => exportPuzzleDraft(draft, { ...meta, ...patch }, edits)).toThrow(
        'Enter an ASCII',
      );
    edits.get('answer-1')!.feedback = 'a'.repeat(4097);
    expect(() => exportPuzzleDraft(draft, meta, edits)).toThrow('illegal move or invalid text');
  } finally {
    model.dispose();
  }
});
