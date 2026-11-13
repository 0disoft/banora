import { describe, expect, spyOn, test } from 'bun:test';
import { RecordController } from '../src/controller.js';
import { createSgfNode, parseSgf, serializeSgf } from '../src/sgf.js';

const line = [
  { x: 1.12567, y: 2 },
  { x: 3.75, y: 4.375 },
];
const wire = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    v: 1,
    id: 'ink1',
    color: '#206650',
    width: 0.08,
    points: [
      [1, 2],
      [3, 4],
    ],
    ...overrides,
  });
const sgf = (values: string[]) =>
  serializeSgf({ games: [createSgfNode('root', { SZ: ['9'], XX: ['keep'], BPN: values })] });
const inkForks = (count = 2) =>
  serializeSgf({
    games: [
      createSgfNode(
        'root',
        { SZ: ['9'] },
        Array.from({ length: count }, (_, index) =>
          createSgfNode(`branch${index}`, { B: [''], BPN: [wire({ id: `ink${index}` })] }),
        ),
      ),
    ],
  });

describe('node-local freehand annotations', () => {
  test('warm alternating inspections reuse frozen ink without reparsing or publishing', () => {
    const controller = new RecordController({ sgf: inkForks() });
    const root = controller.getState();
    const ids = root.node.children.map((node) => node.id);
    let notifications = 0;
    controller.subscribe(() => notifications++);
    const parse = spyOn(JSON, 'parse');
    try {
      const first = ids.map((id) => controller.inspectNode(id)!);
      expect(parse.mock.calls.length).toBe(2);
      for (let round = 0; round < 4; round++)
        for (let index = 0; index < ids.length; index++) {
          const state = controller.inspectNode(ids[index]!)!;
          expect(state).not.toBe(first[index]);
          expect(state.strokes).toBe(first[index]!.strokes);
          expect(Object.isFrozen(state.strokes[0]!.points[0])).toBe(true);
        }
      expect(parse.mock.calls.length).toBe(2);
      expect(controller.getState()).toBe(root);
      expect(notifications).toBe(1);
    } finally {
      parse.mockRestore();
      controller.dispose();
    }
  });
  test('inspection ink shares the existing eight-entry recency eviction', () => {
    const controller = new RecordController({ sgf: inkForks(9) });
    const ids = controller.getState().node.children.map((node) => node.id);
    const first = ids.slice(0, 8).map((id) => controller.inspectNode(id)!);
    expect(controller.inspectNode(ids[0]!)!.strokes).toBe(first[0]!.strokes);
    controller.inspectNode(ids[8]!);
    expect(controller.inspectNode(ids[0]!)!.strokes).toBe(first[0]!.strokes);
    const evicted = controller.inspectNode(ids[1]!)!;
    expect(evicted.strokes).not.toBe(first[1]!.strokes);
    expect(evicted.strokes).toEqual(first[1]!.strokes);
    controller.dispose();
  });
  test('cached ink keeps metadata fresh and invalidates on ink edits, Undo/Redo and same-ID imports', () => {
    const source = inkForks();
    const controller = new RecordController({ sgf: source });
    const id = controller.getState().node.children[0]!.id;
    const before = controller.inspectNode(id)!;
    controller.setComment('fresh root comment');
    const commented = controller.inspectNode(id)!;
    expect(commented.strokes).toBe(before.strokes);
    expect(commented.record).toBe(controller.getState().record);
    expect(commented.dirty).toBe(true);
    expect(commented.canUndo).toBe(true);
    controller.goTo(id);
    controller.setComment('fresh ink-node comment');
    expect(controller.getState().strokes).toEqual(before.strokes);
    expect(controller.removeStroke('ink0').ok).toBe(true);
    expect(controller.getState().strokes).toEqual([]);
    controller.undo();
    expect(controller.getState().strokes).toEqual(before.strokes);
    controller.redo();
    expect(controller.getState().strokes).toEqual([]);
    expect(
      controller.loadSgf(source.replaceAll('#206650', '#aabbcc'), { discardChanges: true }).ok,
    ).toBe(true);
    expect(controller.inspectNode(id)!.strokes[0]!.color).toBe('#aabbcc');
    expect(before.strokes[0]!.color).toBe('#206650');
    controller.dispose();
  });
  test('copies fractional points, survives SGF reopen, and restores each edit independently of comment groups', () => {
    const controller = new RecordController({ sgf: '(;SZ[9]XX[keep];B[aa])' });
    const initial = controller.getState();
    const end = controller.beginEditGroup();
    controller.setComment('note');
    expect(controller.addStroke(line, { color: '#AABBCC', width: 0.1 }).ok).toBe(true);
    const state = controller.getState(),
      stroke = state.strokes[0]!;
    expect(stroke.points[0]).toEqual({ x: 1.1257, y: 2 });
    expect(stroke.color).toBe('#aabbcc');
    expect(Object.isFrozen(stroke.points[0])).toBe(true);
    expect(Object.isFrozen(stroke.points)).toBe(true);
    expect(Object.isFrozen(stroke)).toBe(true);
    expect(state.position.board).toEqual(initial.position.board);
    const reopened = new RecordController({ sgf: controller.prepareExport().text });
    expect(reopened.getState().strokes).toEqual(state.strokes);
    expect(reopened.getState().node.properties.XX).toEqual(['keep']);
    end();
    controller.undo();
    expect(controller.getState().node.properties.C).toEqual(['note']);
    expect(controller.getState().strokes).toEqual([]);
    controller.undo();
    expect(controller.getState().dirty).toBe(false);
    controller.redo();
    controller.redo();
    expect(controller.getState().strokes).toEqual(state.strokes);
    controller.next();
    expect(controller.getState().strokes).toEqual([]);
    controller.previous();
    expect(controller.getState().strokes).toEqual(state.strokes);
  });
  test('removal/clear restore ordered IDs and export baseline; empty operations are no-ops', () => {
    const controller = new RecordController({ sgf: sgf([wire()]) });
    controller.addStroke(line);
    const strokes = controller.getState().strokes;
    expect(strokes[1]!.id).not.toBe('ink1');
    const ticket = controller.prepareExport();
    controller.acknowledgeExport(ticket.id);
    expect(controller.removeStroke('ink1').ok).toBe(true);
    expect(controller.getState().strokes).toEqual([strokes[1]!]);
    controller.undo();
    expect(controller.getState().dirty).toBe(false);
    expect(controller.clearStrokes().ok).toBe(true);
    expect(controller.getState().node.properties.BPN).toBeUndefined();
    const empty = controller.getState();
    controller.clearStrokes();
    controller.removeStroke('absent');
    expect(controller.getState()).toBe(empty);
    controller.undo();
    expect(controller.getState().strokes).toEqual(strokes);
  });
  test('rejects invalid style/geometry and configured SGF limits without notifications or history', () => {
    const controller = new RecordController({ size: 9 });
    let notifications = 0;
    controller.subscribe(() => notifications++);
    const initial = controller.getState();
    for (const points of [
      [],
      [{ x: 0, y: 0 }],
      [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
      [
        { x: NaN, y: 0 },
        { x: 1, y: 1 },
      ],
      [
        { x: -0.01, y: 0 },
        { x: 1, y: 1 },
      ],
      [
        { x: 8.01, y: 0 },
        { x: 1, y: 1 },
      ],
      Array.from({ length: 513 }, (_, i) => ({ x: i % 8, y: 0 })),
    ]) {
      expect(controller.addStroke(points)).toEqual({ ok: false, reason: 'invalid-annotation' });
    }
    for (const style of [
      { color: 'url(https://example.com)' },
      { width: 0 },
      { width: Infinity },
      { color: '#fff' },
      { width: 0.5001 },
    ]) {
      expect(controller.addStroke(line, style)).toEqual({
        ok: false,
        reason: 'invalid-annotation',
      });
    }
    expect(controller.getState()).toBe(initial);
    expect(notifications).toBe(1);
    const limited = new RecordController({ size: 9, limits: { maxValueLength: 40 } });
    const before = limited.getState();
    expect(limited.addStroke(line)).toEqual({
      ok: false,
      reason: 'limit',
      diagnostics: expect.any(Array),
    });
    expect(limited.getState()).toBe(before);
  });
  test('bounded imports fail atomically for versions, schemas, IDs, geometry and colors', () => {
    const controller = new RecordController({ size: 9 });
    controller.setComment('unsaved');
    const state = controller.getState();
    for (const values of [
      ['{'],
      [wire({ v: 2 })],
      [wire({ extra: true })],
      [wire({ id: 'bad id' })],
      [wire({ color: 'red' })],
      [wire({ width: 0.001 })],
      [
        wire({
          points: [
            [9, 0],
            [1, 1],
          ],
        }),
      ],
      [
        wire({
          points: [
            [1, 2, 3],
            [3, 4],
          ],
        }),
      ],
      [
        wire({
          points: [
            [1, 2],
            [1, 2],
          ],
        }),
      ],
      [wire(), wire()],
      Array.from({ length: 65 }, (_, i) => wire({ id: `ink${i}` })),
      Array.from({ length: 9 }, (_, i) =>
        wire({ id: `ink${i}`, points: Array.from({ length: 512 }, (_, p) => [p % 8, 1]) }),
      ),
    ]) {
      expect(parseSgf(sgf(values)).ok).toBe(false);
      expect(controller.loadSgf(sgf(values), { discardChanges: true }).ok).toBe(false);
      expect(controller.getState()).toBe(state);
    }
  });
  test('sparse ink is invalid without changing snapshots, notifications or redo history', () => {
    const controller = new RecordController({ size: 9 });
    controller.setComment('keep redo');
    controller.undo();
    const before = controller.getState();
    let notifications = 0;
    controller.subscribe(() => notifications++);
    for (let hole = 0; hole < 3; hole++) {
      const points = Array.from({ length: 3 }, (_, x) => ({ x, y: 0 }));
      delete points[hole];
      expect(controller.addStroke(points)).toEqual({ ok: false, reason: 'invalid-annotation' });
      expect(controller.getState()).toBe(before);
    }
    expect(notifications).toBe(1);
    expect(controller.redo().ok).toBe(true);
    expect(controller.getState().node.properties.C).toEqual(['keep redo']);
    controller.dispose();
  });
  test('host ink array hooks cannot change the indexed geometry saved and reopened', () => {
    const points = line.map((point) => ({ ...point }));
    let hooks = 0;
    const hostile = () => {
      hooks++;
      throw Error('Host array hook executed');
    };
    Object.defineProperties(points, {
      map: { value: hostile },
      [Symbol.iterator]: { get: hostile },
      constructor: { get: hostile },
    });
    const controller = new RecordController({ size: 9 });
    expect(controller.addStroke(points).ok).toBe(true);
    const saved = controller.getState().strokes;
    expect(hooks).toBe(0);
    expect(Object.isFrozen(points)).toBe(false);
    points[0]!.x = 7;
    expect(saved[0]!.points[0]).toEqual({ x: 1.1257, y: 2 });
    const reopened = new RecordController({ sgf: controller.prepareExport().text });
    expect(reopened.getState().strokes).toEqual(saved);
    controller.undo();
    expect(controller.getState().strokes).toEqual([]);
    controller.redo();
    expect(controller.getState().strokes).toEqual(saved);
    reopened.dispose();
    controller.dispose();
  });
  test('node limits and semantic JSON normalization retain drawing order', () => {
    const full = new RecordController({
      sgf: sgf(Array.from({ length: 64 }, (_, i) => wire({ id: `ink${i}` }))),
    });
    expect(full.addStroke(line)).toEqual({ ok: false, reason: 'limit' });
    const dense = new RecordController({
      sgf: sgf(
        Array.from({ length: 8 }, (_, i) =>
          wire({ id: `ink${i}`, points: Array.from({ length: 512 }, (_, p) => [p % 8, 1]) }),
        ),
      ),
    });
    expect(dense.addStroke(line)).toEqual({ ok: false, reason: 'limit' });
    const controller = new RecordController({ sgf: sgf([wire()]) });
    expect(controller.getState().dirty).toBe(false);
    controller.setComment('x');
    controller.undo();
    expect(controller.getState().dirty).toBe(false);
    expect(
      new RecordController({ sgf: controller.prepareExport().text }).getState().strokes,
    ).toEqual(controller.getState().strokes);
  });
});
