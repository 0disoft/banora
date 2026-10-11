import { describe, expect, spyOn, test } from 'bun:test';
import { RecordController } from '../src/controller.js';
import { stoneAt } from '../src/core.js';

describe('authoritative record editing', () => {
  test('an old edit-group cleanup cannot split a newer editor session', () => {
    const controller = new RecordController({ sgf: '(;C[original])' });
    const endFirst = controller.beginEditGroup();
    controller.setComment('first');
    const endSecond = controller.beginEditGroup();
    controller.setComment('second');
    endFirst();
    controller.setComment('second final');
    endSecond();
    controller.undo();
    expect(controller.getState().node.properties.C).toEqual(['first']);
    controller.undo();
    expect(controller.getState().node.properties.C).toEqual(['original']);
    expect(controller.getState().dirty).toBe(false);
  });
  test('snapshots are stable for unchanged state and change only after committed commands', () => {
    const controller = new RecordController();
    const before = controller.getState();
    expect(controller.getState()).toBe(before);
    controller.goTo(before.node.id);
    controller.prepareExport();
    expect(controller.getState()).toBe(before);
    controller.play({ x: -1, y: 0 });
    expect(controller.getState()).toBe(before);
    controller.setComment('changed');
    const after = controller.getState();
    expect(after).not.toBe(before);
    expect(controller.getState()).toBe(after);
    expect(before.node.properties.C).toBeUndefined();
  });
  test('navigation is clean; branching is undoable without destroying the original branch', () => {
    const controller = new RecordController({ sgf: '(;SZ[9];B[aa];W[bb])' });
    controller.next();
    expect(controller.getState().dirty).toBe(false);
    expect(controller.getState().canUndo).toBe(false);
    const parent = controller.getState().node.id;
    expect(controller.play({ x: 2, y: 2 }).ok).toBe(true);
    expect(controller.getState().dirty).toBe(true);
    controller.goTo(parent);
    expect(controller.getState().node.children.length).toBe(2);
    controller.undo();
    expect(controller.getState().node.children.length).toBe(1);
    expect(controller.getState().dirty).toBe(false);
    controller.redo();
    expect(controller.getState().node.children.length).toBe(2);
    controller.next(1);
    expect(stoneAt(controller.getState().position, { x: 2, y: 2 })).toBe('white');
  });
  test('a comment editing session is one Undo unit; return to baseline clears dirty', () => {
    const controller = new RecordController({ sgf: '(;C[original])' });
    controller.beginEditGroup();
    controller.setComment('o');
    controller.setComment('once');
    controller.setComment('final');
    controller.endEditGroup();
    controller.undo();
    expect(controller.getState().node.properties.C).toEqual(['original']);
    expect(controller.getState().dirty).toBe(false);
    expect(controller.getState().canUndo).toBe(false);
    controller.redo();
    expect(controller.getState().node.properties.C).toEqual(['final']);
    controller.setComment('original');
    expect(controller.getState().dirty).toBe(false);
  });
  test('failed edits and empty Redo preserve an active comment group and its cleanup', () => {
    const failures = [
      (controller: RecordController) => controller.play({ x: -1, y: 0 }),
      (controller: RecordController) => controller.play({ x: 0, y: 0 }),
      (controller: RecordController) => controller.play({ x: 1, y: 1 }),
      (controller: RecordController) =>
        controller.setMarker({ x: 1, y: 1 }, 'label', '\\'.repeat(4)),
      (controller: RecordController) => controller.redo(),
    ];
    for (const fail of failures) {
      const controller = new RecordController({
        sgf: '(;SZ[5]AB[aa]C[original])',
        limits: { maxNodes: 1, maxValueLength: 8 },
      });
      try {
        const end = controller.beginEditGroup();
        expect(controller.setComment('first').ok).toBe(true);
        const before = controller.getState();
        expect(fail(controller).ok).toBe(false);
        expect(controller.getState()).toBe(before);
        expect(controller.setComment('final').ok).toBe(true);
        end();
        expect(controller.undo().ok).toBe(true);
        expect(controller.getState().node.properties.C).toEqual(['original']);
        expect(controller.getState().canUndo).toBe(false);
        expect(controller.getState().dirty).toBe(false);
        expect(controller.redo().ok).toBe(true);
        expect(controller.getState().node.properties.C).toEqual(['final']);
      } finally {
        controller.dispose();
      }
    }
  });
  test('rejected appended setup retains grouping while a committed marker remains a separate Undo unit', () => {
    const controller = new RecordController({ sgf: '(;SZ[5];B[aa])', limits: { maxNodes: 2 } });
    try {
      controller.next();
      const end = controller.beginEditGroup();
      expect(controller.undo()).toEqual({ ok: false, reason: 'no-history' });
      controller.setComment('first');
      expect(controller.setMarker({ x: 2, y: 2 }, null).ok).toBe(true);
      expect(controller.setSetup([{ x: 1, y: 1, color: 'white' }]).ok).toBe(false);
      controller.setComment('final');
      end();
      controller.undo();
      expect(controller.getState().node.properties.C).toBeUndefined();
      expect(controller.getState().dirty).toBe(false);
      controller.beginEditGroup();
      controller.setComment('new');
      expect(controller.setMarker({ x: 1, y: 1 }, 'triangle').ok).toBe(true);
      controller.setComment('after');
      controller.undo();
      expect(controller.getState().node.properties.C).toEqual(['new']);
      expect(controller.getState().markers).toHaveLength(1);
      controller.undo();
      expect(controller.getState().node.properties.C).toEqual(['new']);
      expect(controller.getState().markers).toHaveLength(0);
      controller.undo();
      expect(controller.getState().node.properties.C).toBeUndefined();
    } finally {
      controller.dispose();
    }
  });
  test('markers, colon labels and unknown data survive export/reopen and Undo', () => {
    const controller = new RecordController({ sgf: '(;SZ[9]XX[preserved]TR[aa:bb])' });
    controller.setMarker({ x: 0, y: 0 }, 'label', 'A:B]C');
    const ticket = controller.prepareExport();
    const reopened = new RecordController({ sgf: ticket.text });
    expect(reopened.getState().node.properties.XX).toEqual(['preserved']);
    expect(reopened.getState().markers.find((marker) => marker.kind === 'label')?.label).toBe(
      'A:B]C',
    );
    expect(reopened.getState().markers.length).toBe(4);
    controller.undo();
    expect(controller.getState().dirty).toBe(false);
    expect(controller.getState().markers.every((marker) => marker.kind === 'triangle')).toBe(true);
  });
  test('failed imports and dirty replacement guards preserve the active record', () => {
    const controller = new RecordController({ sgf: '(;C[keep])' });
    controller.setComment('edited');
    const record = controller.getState().record;
    expect(controller.loadSgf('(bad', { discardChanges: true }).ok).toBe(false);
    expect(controller.getState().record).toBe(record);
    expect(controller.loadSgf('(;SZ[9])')).toEqual({ ok: false, reason: 'unsaved-changes' });
    expect(controller.getState().record).toBe(record);
    expect(controller.loadSgf('(;SZ[9])', { discardChanges: true }).ok).toBe(true);
    expect(controller.getState().dirty).toBe(false);
  });
  test('cancelled exports keep dirty; acknowledging older content does not mark later edits clean', () => {
    const controller = new RecordController();
    controller.setComment('one');
    const cancelled = controller.prepareExport();
    controller.cancelExport(cancelled.id);
    expect(controller.acknowledgeExport(cancelled.id).ok).toBe(false);
    expect(controller.getState().dirty).toBe(true);
    const first = controller.prepareExport();
    controller.setComment('two');
    controller.acknowledgeExport(first.id);
    expect(controller.getState().dirty).toBe(true);
    controller.undo();
    expect(controller.getState().dirty).toBe(false);
    controller.redo();
    const second = controller.prepareExport();
    controller.acknowledgeExport(second.id);
    expect(controller.getState().dirty).toBe(false);
    expect(controller.acknowledgeExport(first.id).ok).toBe(false);
  });
  test('SGF playback executes occupied and same-color recorded moves while new play validates', () => {
    const controller = new RecordController({ sgf: '(;SZ[9];B[aa];B[aa];W[bb])' });
    controller.next();
    controller.next();
    expect(stoneAt(controller.getState().position, { x: 0, y: 0 })).toBe('black');
    expect(controller.play({ x: 0, y: 0 })).toEqual({ ok: false, reason: 'occupied' });
    controller.next();
    expect(stoneAt(controller.getState().position, { x: 1, y: 1 })).toBe('white');
    expect(controller.getState().dirty).toBe(false);
  });
  test('branch navigation reconstructs simple ko instead of comparing only visible stones', () => {
    const controller = new RecordController({
      sgf: '(;SZ[5]AB[ab][ba][cb]AW[bb][ac][cc][bd](;B[bc])(;B[];W[]))',
    });
    const root = controller.getState().node.id;
    controller.next(0);
    const koNode = controller.getState().node.id;
    expect(controller.play({ x: 1, y: 1 })).toEqual({ ok: false, reason: 'ko' });
    controller.goTo(root);
    controller.next(1);
    controller.next();
    controller.goTo(koNode);
    expect(controller.play({ x: 1, y: 1 })).toEqual({ ok: false, reason: 'ko' });
  });
  test('all games remain in the export when editing the second game', () => {
    const controller = new RecordController({ sgf: '(;SZ[9]C[first])(;SZ[13]C[second])' });
    controller.goTo(controller.getState().record.games[1]!.id);
    controller.setComment('changed');
    const reopened = new RecordController({ sgf: controller.prepareExport().text });
    expect(reopened.getState().record.games[0]!.properties.C).toEqual(['first']);
    expect(reopened.getState().record.games[1]!.properties.C).toEqual(['changed']);
  });
  test('reentrant subscribers receive states in order and unsubscription releases the listener', () => {
    const controller = new RecordController();
    controller.subscribe((state) => {
      if (state.node.properties.C?.[0] === 'first') controller.setComment('second');
    });
    const observed: string[] = [];
    const unsubscribe = controller.subscribe((state) => {
      observed.push(state.node.properties.C?.[0] ?? '');
    });
    controller.setComment('first');
    expect(observed).toEqual(['', 'first', 'second']);
    unsubscribe();
    controller.setComment('third');
    expect(observed.length).toBe(3);
    controller.dispose();
    expect(() => controller.getState()).toThrow('disposed');
  });
  test('edit limits fail atomically without adding Undo or changing content', () => {
    const controller = new RecordController({ limits: { maxValueLength: 8 } });
    const original = controller.getState().record;
    expect(controller.setComment('\\'.repeat(8)).ok).toBe(false);
    expect(controller.getState().record).toBe(original);
    expect(controller.getState().canUndo).toBe(false);
  });
  test('notification failures omit host exception content and preserve later subscribers and Undo', () => {
    const controller = new RecordController();
    const log = spyOn(console, 'error').mockImplementation(() => {});
    let fail = false;
    let inspected = 0;
    const privateFailure = Object.defineProperty({}, 'message', {
      get() {
        inspected++;
        return 'Authored private callback content';
      },
    });
    const observed: string[] = [];
    try {
      controller.subscribe(() => {
        if (fail) throw privateFailure;
      });
      controller.subscribe((state) => observed.push(state.node.properties.C?.[0] ?? ''));
      fail = true;
      expect(controller.setComment('Authored edit').ok).toBe(true);
      expect(controller.undo().ok).toBe(true);
      expect(observed).toEqual(['', 'Authored edit', '']);
      expect(controller.getState().dirty).toBe(false);
      expect(log.mock.calls).toEqual([
        ['Banora state listener failed'],
        ['Banora state listener failed'],
      ]);
      expect(inspected).toBe(0);
    } finally {
      log.mockRestore();
      controller.dispose();
    }
  });
});
