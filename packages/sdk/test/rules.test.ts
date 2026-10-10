import {expect,test} from 'bun:test';
import {createPosition,pass,play,replayMove,setup} from '../src/core.js';
import type {MoveResult,Position} from '../src/core.js';
import {RecordController} from '../src/controller.js';
import {getRuleProfile,RULE_PROFILES} from '../src/rules.js';
import type {RuleProfileId} from '../src/rules.js';
const success=(result:MoveResult): Position => {if (!result.ok) throw Error(result.reason);return result.position;};

test('named presets have immutable explicit policies and reject unknown/prototype IDs', () => {
  expect(getRuleProfile('japanese-territory').play.ko).toBe('simple');
  expect(getRuleProfile('aga-territory').play).toEqual({suicide:'forbid',ko:'situational-superko',passStones:true});
  expect(getRuleProfile('aga-area').scoring.handicapCompensation).toBe('white-minus-one');
  expect(getRuleProfile('tromp-taylor').play.suicide).toBe('allow');
  for (const value of Object.values(RULE_PROFILES)) {
    expect(Object.isFrozen(value)).toBe(true);expect(Object.isFrozen(value.play)).toBe(true);expect(Object.isFrozen(value.scoring)).toBe(true);
    expect(createPosition({rules:value.play}).rules).toEqual(value.play);
  }
  for (const id of ['__proto__','constructor','Chinese','unknown']) expect(() => getRuleProfile(id as RuleProfileId)).toThrow('Unknown rule');
});
test('AGA passes credit the opponent separately; moves/setup reset the pass streak without deleting prisoners', () => {
  const initial=createPosition({width:3,rules:getRuleProfile('aga-territory').play});
  const first=success(pass(initial)),second=success(pass(first)),third=success(pass(second));
  expect(first.passPrisoners).toEqual({black:0,white:1});expect(second.passPrisoners).toEqual({black:1,white:1});
  expect(third.passPrisoners).toEqual({black:1,white:2});expect(third.consecutivePasses).toBe(3);
  expect(third.captures).toEqual({black:0,white:0});expect(initial.passPrisoners).toEqual({black:0,white:0});
  expect(Object.isFrozen(third.passPrisoners)).toBe(true);
  expect(pass(first,'black')).toEqual({ok:false,reason:'wrong-turn'});
  const placed=success(play(third,{x:1,y:1}));expect(placed.consecutivePasses).toBe(0);expect(placed.passPrisoners).toEqual(third.passPrisoners);
  const edited=success(setup(third,[]));expect(edited.consecutivePasses).toBe(0);expect(edited.passPrisoners).toEqual(third.passPrisoners);
  expect(setup(third,[{x:-1,y:0,color:'black'}]).ok).toBe(false);expect(third.consecutivePasses).toBe(3);
});
test('default and Tromp-Taylor passes retain their legacy capture behavior and never create pass prisoners', () => {
  for (const rules of [undefined,getRuleProfile('tromp-taylor').play]) {
    const after=success(pass(success(pass(createPosition({width:3,rules})))));
    expect(after.passPrisoners).toEqual({black:0,white:0});expect(after.consecutivePasses).toBe(2);
    expect(after.captures).toEqual({black:0,white:0});expect(after.moveNumber).toBe(2);
  }
  expect(() => createPosition({rules:{passStones:'yes' as unknown as boolean}})).toThrow('Unsupported');
});
test('recorded passes use recorded colors while ordinary replay never manufactures pass stones', () => {
  const initial=createPosition({width:3,rules:getRuleProfile('aga-area').play});
  const first=success(replayMove(initial,null,'white')),second=success(replayMove(first,null,'white'));
  expect(second.passPrisoners).toEqual({black:2,white:0});expect(second.consecutivePasses).toBe(1);
  const played=success(replayMove(second,{x:1,y:1},'black'));
  expect(played.passPrisoners).toEqual(second.passPrisoners);expect(played.consecutivePasses).toBe(0);expect(played.rules).toEqual(initial.rules);
});
test('controller pass ledger follows branches and editing Undo; SGF retains metadata without selecting policies', () => {
  const sgf='(;SZ[3]RU[AGA](;B[];W[])(;B[aa];W[]))',rules=getRuleProfile('aga-territory').play;
  const model=new RecordController({sgf,rules});const root=model.getState().node;
  model.next();model.next();expect(model.getState().position.passPrisoners).toEqual({black:1,white:1});
  model.goTo(root.children[1]!.children[0]!.id);expect(model.getState().position.passPrisoners).toEqual({black:1,white:0});
  model.play(null);expect(model.getState().position.passPrisoners).toEqual({black:1,white:1});
  model.undo();expect(model.getState().position.passPrisoners).toEqual({black:1,white:0});
  model.redo();expect(model.getState().position.passPrisoners).toEqual({black:1,white:1});
  const reopened=new RecordController({sgf:model.prepareExport().text,rules});
  reopened.goTo(reopened.getState().node.children[1]!.children[0]!.children[0]!.id);
  expect(reopened.getState().position.passPrisoners).toEqual({black:1,white:1});
  model.dispose();reopened.dispose();
  const defaults=new RecordController({sgf});defaults.next();defaults.next();
  expect(defaults.getState().position.rules.passStones).toBe(false);expect(defaults.getState().position.passPrisoners).toEqual({black:0,white:0});defaults.dispose();
});
