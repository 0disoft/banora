import { expect, spyOn, test } from 'bun:test';
import { RecordController } from '@0disoft/banora';
import { recordedMoveAt } from '../examples/studio/recorded-move.js';

function last(controller: RecordController, game = 0, variation = 0) {
  let node = controller.getState().record.games[game]!;
  while (node.children.length) {
    node = node.children[variation] ?? node.children[0]!;
    variation = 0;
  }
  expect(controller.goTo(node.id).ok).toBe(true);
  return controller.getState();
}

test('assessment targeting preserves immediate-child priority even over an occupied stone', () => {
  const controller = new RecordController({
    sgf: '(;SZ[9];B[aa](;W[aa]N[first])(;B[aa]N[second]))',
  });
  controller.next();
  const state = controller.getState();
  expect(recordedMoveAt(state, { x: 0, y: 0 })).toBe(state.node.children[0]);
  controller.dispose();
  const empty = new RecordController({ sgf: '(;SZ[9];B[aa])' });
  expect(recordedMoveAt(empty.getState(), { x: 0, y: 0 })).toBe(empty.getState().node.children[0]);
  empty.dispose();
});

test('assessment targeting follows only the chosen path and uses the latest move of the visible color', () => {
  const controller = new RecordController({
    sgf: '(;SZ[9];B[aa]N[old](;W[bb];B[aa]N[latest];W[])(;W[cc];B[aa]N[sibling]))',
  });
  const state = last(controller);
  const target = recordedMoveAt(state, { x: 0, y: 0 });
  expect(target?.properties.N).toEqual(['latest']);
  expect(controller.setMoveAssessment('good', target!.id).ok).toBe(true);
  expect(controller.getState().node.id).toBe(state.node.id);
  expect(recordedMoveAt(controller.getState(), { x: 0, y: 0 })?.properties.TE).toEqual(['1']);
  expect(controller.undo().ok).toBe(true);
  expect(recordedMoveAt(controller.getState(), { x: 0, y: 0 })?.properties.TE).toBeUndefined();
  controller.dispose();

  const setup = new RecordController({ sgf: '(;SZ[9];B[aa]N[black];W[aa]N[white];AB[aa];W[])' });
  expect(recordedMoveAt(last(setup), { x: 0, y: 0 })?.properties.N).toEqual(['black']);
  setup.dispose();
});

test('setup-only and empty points are not recorded moves; root moves and other games remain reachable', () => {
  const setup = new RecordController({ sgf: '(;SZ[9]AB[aa];W[])' });
  const state = last(setup);
  expect(recordedMoveAt(state, { x: 0, y: 0 })).toBeUndefined();
  expect(recordedMoveAt(state, { x: 1, y: 1 })).toBeUndefined();
  setup.dispose();
  const collection = new RecordController({
    sgf: '(;SZ[9]B[aa]N[first])(;SZ[9]W[aa]N[chosen];B[])',
  });
  expect(recordedMoveAt(last(collection, 1), { x: 0, y: 0 })).toBe(
    collection.getState().record.games[1],
  );
  collection.dispose();
});

test('long histories resolve without live inspection, notifications or snapshot mutation', () => {
  const controller = new RecordController({ sgf: '(;SZ[9];B[aa]' + ';W[];B[]'.repeat(500) + ')' });
  const state = last(controller);
  const first = state.record.games[0]!.children[0]!;
  const inspect = spyOn(controller, 'inspectNode').mockImplementation(() => {
    throw Error('Unexpected board replay');
  });
  let events = 0;
  const unsubscribe = controller.subscribe(() => events++);
  events = 0;
  try {
    expect(recordedMoveAt(state, { x: 0, y: 0 })).toBe(first);
    expect(controller.getState()).toBe(state);
    expect(events).toBe(0);
    expect(state.dirty).toBe(false);
    expect(state.canUndo).toBe(false);
    expect(state.path.length).toBe(1002);
    expect(Object.isFrozen(state.path)).toBe(true);
  } finally {
    inspect.mockRestore();
    unsubscribe();
    controller.dispose();
  }
  expect(recordedMoveAt(state, { x: 0, y: 0 })).toBe(first);
});
