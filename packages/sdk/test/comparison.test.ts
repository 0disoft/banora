import { expect, test } from 'bun:test';
import { comparePositions, createPosition, pass, setup, stoneAt } from '../src/core.js';
import { RecordController } from '../src/controller.js';

test('visible position comparison reports additions/removals/replacements in logical row order', () => {
  const base=createPosition({width:5,height:9});
  const before=setup(base,[{x:1,y:2,color:'black'},{x:3,y:4,color:'white'}]);
  if (!before.ok) throw Error('Invalid fixture');
  const after=setup(before.position,[{x:1,y:2,color:'white'},{x:3,y:4,color:null},{x:4,y:8,color:'black'}]);
  if (!after.ok) throw Error('Invalid fixture');
  const changes=comparePositions(before.position,after.position);
  expect(changes).toEqual([
    {point:{x:1,y:2},before:'black',after:'white'},
    {point:{x:3,y:4},before:'white',after:null},
    {point:{x:4,y:8},before:null,after:'black'},
  ]);
  expect(Object.isFrozen(changes)).toBe(true);
  expect(Object.isFrozen(changes[0])).toBe(true);
  expect(Object.isFrozen(changes[0]!.point)).toBe(true);
  expect(stoneAt(before.position,{x:1,y:2})).toBe('black');
  const passed=pass(before.position);if (!passed.ok) throw Error('Invalid fixture');
  expect(comparePositions(before.position,passed.position)).toEqual([]);
  expect(() => comparePositions(base,createPosition({width:9}))).toThrow(RangeError);
});

test('inspection reads branches/collections/markup without selection, notifications or history changes', () => {
  const controller=new RecordController({sgf:'(;SZ[5:9]AB[bc](;B[de]LB[de:R])(;W[ab];W[cc]C[recorded]))(;SZ[13];B[jj])'});
  const root=controller.getState(), right=root.node.children[1]!.children[0]!;
  let events=0;controller.subscribe(() => events++);
  const inspected=controller.inspectNode(right.id)!;
  expect(inspected.node).toBe(right);
  expect(inspected.path).toEqual([root.node.id,root.node.children[1]!.id,right.id]);
  expect(inspected.position.moveNumber).toBe(2);
  expect(stoneAt(inspected.position,{x:2,y:2})).toBe('white');
  expect(stoneAt(inspected.position,{x:1,y:2})).toBe('black');
  const marked=controller.inspectNode(root.node.children[0]!.id)!;
  expect(marked.markers[0]!.label).toBe('R');
  expect(controller.inspectNode(root.record.games[1]!.children[0]!.id)!.gameIndex).toBe(1);
  expect(controller.inspectNode(root.record.games[1]!.id)!.position.width).toBe(13);
  expect(controller.inspectNode('absent')).toBeNull();
  expect(controller.inspectNode(root.node.id)).toBe(root);
  expect(controller.getState()).toBe(root);expect(events).toBe(1);
  controller.setComment('main');
  const changed=controller.getState();
  expect(controller.inspectNode(right.id)!.dirty).toBe(true);
  expect(controller.inspectNode(right.id)!.canUndo).toBe(true);
  expect(controller.getState()).toBe(changed);expect(events).toBe(2);
  controller.dispose();expect(() => controller.inspectNode(right.id)).toThrow('disposed');
});

test('record generations change only on accepted replacement, making reused IDs distinguishable', () => {
  const controller=new RecordController({sgf:'(;SZ[9];B[aa])'});
  const initial=controller.getState();expect(initial.recordGeneration).toBe(0);
  controller.next();controller.setComment('x');controller.undo();controller.redo();
  expect(controller.getState().recordGeneration).toBe(0);
  expect(controller.loadSgf('bad',{discardChanges:true}).ok).toBe(false);
  expect(controller.loadSgf('(;SZ[13])').ok).toBe(false);
  expect(controller.getState().recordGeneration).toBe(0);
  expect(controller.loadSgf('(;SZ[13])',{discardChanges:true}).ok).toBe(true);
  expect(controller.getState().node.id).toBe(initial.node.id);
  expect(controller.getState().recordGeneration).toBe(1);
  expect(controller.getState().dirty).toBe(false);
  controller.loadSgf('(;SZ[13])');expect(controller.getState().recordGeneration).toBe(2);
});
