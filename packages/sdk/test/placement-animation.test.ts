import {expect,test} from 'bun:test';
import {RecordController} from '../src/controller.js';
import {normalizePlacementAnimation,placementTarget} from '../src/placement-animation.js';

test('placement motion is opt-in with immutable bounded duration options',() => {
  for (const value of [undefined,null,false]) expect(normalizePlacementAnimation(value)).toBeNull();
  expect(normalizePlacementAnimation(true)).toEqual({durationMs:160});expect(normalizePlacementAnimation({})).toEqual({durationMs:160});
  expect(normalizePlacementAnimation({durationMs:1000})).toEqual({durationMs:1000});
  expect(Object.isFrozen(normalizePlacementAnimation(true))).toBe(true);
  for (const value of [0,-1,1001,1.5,NaN,Infinity,null,'100']) expect(() => normalizePlacementAnimation({durationMs:value} as never)).toThrow(RangeError);
  for (const value of [[],1,'fade']) expect(() => normalizePlacementAnimation(value as never)).toThrow(TypeError);
});
test('single child moves qualify through legal play, recorded playback, redo and captures',() => {
  const controller=new RecordController({sgf:'(;SZ[5:9];B[bc](;W[dd])(;W[ef]))'});
  const root=controller.getState();controller.next();const first=controller.getState();
  expect(placementTarget(root,first)).toEqual({x:1,y:2});expect(Object.isFrozen(placementTarget(root,first))).toBe(true);
  controller.next(1);expect(placementTarget(first,controller.getState())).toEqual({x:4,y:5});
  const before=controller.getState();controller.play({x:3,y:7});const played=controller.getState();
  expect(placementTarget(before,played)).toEqual({x:3,y:7});
  controller.undo();const undone=controller.getState();controller.redo();expect(placementTarget(undone,controller.getState())).toEqual({x:3,y:7});controller.dispose();
  const capture=new RecordController({sgf:'(;SZ[3]AB[ab][ba][cb]AW[bb])'}),initial=capture.getState();capture.play({x:1,y:2});
  expect(placementTarget(initial,capture.getState())).toEqual({x:1,y:2});expect(capture.getState().position.captures.black).toBe(1);capture.dispose();
});
test('imports, setup, metadata, pass, occupied replay, sibling jumps and backward movement do not qualify',() => {
  const controller=new RecordController({sgf:'(;SZ[9](;B[aa];W[bb])(;B[cc]))'}),root=controller.getState();
  controller.next();controller.next();const deep=controller.getState();expect(placementTarget(root,deep)).toBeNull();
  controller.previous();expect(placementTarget(deep,controller.getState())).toBeNull();
  const left=controller.getState();controller.goTo(root.node.children[1]!.id);expect(placementTarget(left,controller.getState())).toBeNull();
  const state=controller.getState();controller.setComment('annotation');expect(placementTarget(state,controller.getState())).toBeNull();
  controller.play(null);expect(placementTarget(state,controller.getState())).toBeNull();
  const pass=controller.getState();controller.setSetup([{x:3,y:3,color:'white'}]);expect(placementTarget(pass,controller.getState())).toBeNull();
  const before=controller.getState();controller.loadSgf('(;SZ[9];B[aa])',{discardChanges:true,locator:{gameIndex:0,path:[0]}});
  expect(placementTarget(before,controller.getState())).toBeNull();controller.dispose();
  const replay=new RecordController({sgf:'(;SZ[9]AB[aa];W[aa])'}),occupied=replay.getState();replay.next();expect(placementTarget(occupied,replay.getState())).toBeNull();replay.dispose();
});
