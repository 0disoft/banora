import {expect, test} from 'bun:test';
import {createPosition, opposite, pass, play, replayMove, setup} from '../src/core.js';
import type {Color, MoveResult, Position, RulePolicy, SetupStone} from '../src/core.js';
import {hasSituation, rememberSituation} from '../src/repetition-history.js';

const koPolicies=['positional-superko','situational-superko'] as const;
const success=(result:MoveResult): Position => {if (!result.ok) throw Error(result.reason);return result.position;};
function koStones(shift=0,center:Color='white'): SetupStone[] {
  const other=opposite(center);
  return [{x:shift+1,y:1,color:center}, ...[[0,1],[1,0],[2,1]].map(([x,y]) => ({x:shift+x!,y:y!,color:other})),
    ...[[0,2],[2,2],[1,3]].map(([x,y]) => ({x:shift+x!,y:y!,color:center}))];
}
function initial(ko:RulePolicy['ko'],count=1): Position {
  return success(setup(createPosition({width:count*6-1,height:5,rules:{ko}}),
    Array.from({length:count},(_,index) => koStones(index*6,index%2 ? 'black' : 'white')).flat()));
}

test('superko rejects recapture after legal passes without mutating the prior position', () => {
  for (const ko of ['simple','none',...koPolicies] as const) {
    const original=initial(ko),captured=success(play(original,{x:1,y:2}));
    if (ko==='simple') expect(play(captured,{x:1,y:1})).toEqual({ok:false,reason:'ko'});
    else if (ko!=='none') expect(play(captured,{x:1,y:1})).toEqual({ok:false,reason:'superko'});
    const afterPasses=success(pass(success(pass(captured))));
    const before=JSON.stringify(afterPasses),result=play(afterPasses,{x:1,y:1});
    expect(result.ok).toBe(ko==='simple' || ko==='none');
    if (!result.ok) expect(result.reason).toBe('superko');
    expect(JSON.stringify(afterPasses)).toBe(before);
    expect(original.repetitionHistory?.size ?? 0).toBe(ko==='simple' || ko==='none' ? 0 : 1);
  }
});
test('a six-move triple-ko cycle is legal under simple ko and rejected under both superko policies', () => {
  const moves=[{x:1,y:2},{x:7,y:2},{x:13,y:2},{x:1,y:1},{x:7,y:1},{x:13,y:1}];
  for (const ko of ['simple',...koPolicies] as const) {
    const root=initial(ko,3);let position=root;
    for (const point of moves.slice(0,-1)) position=success(play(position,point));
    const result=play(position,moves.at(-1)!);
    if (ko==='simple') {expect(result.ok).toBe(true);expect(success(result).board).toEqual(root.board);}
    else {expect(result).toEqual({ok:false,reason:'superko'});expect(position.moveNumber).toBe(5);}
  }
});
test('positional and situational superko distinguish a double-ko return with a different next player', () => {
  for (const ko of koPolicies) {
    const root=initial(ko,2);
    let position=success(play(root,{x:1,y:2}));position=success(play(position,{x:7,y:2}));
    position=success(pass(position));position=success(play(position,{x:1,y:1}));
    const result=play(position,{x:7,y:1});
    if (ko==='positional-superko') expect(result).toEqual({ok:false,reason:'superko'});
    else {
      const returned=success(result);expect(returned.board).toEqual(root.board);expect(returned.toPlay).toBe('white');
      // A pass cannot erase the already observed capture situation.
      expect(play(success(pass(returned)),{x:1,y:2})).toEqual({ok:false,reason:'superko'});
    }
  }
});
test('allowed self-capture still respects exact repetition and captures are not part of its identity', () => {
  for (const ko of koPolicies) {
    const root=success(setup(createPosition({width:3,rules:{ko,suicide:'allow'}}),
      [[0,1],[1,0],[2,1],[1,2]].map(([x,y]) => ({x:x!,y:y!,color:'white'}))));
    const result=play(root,{x:1,y:1});
    if (ko==='positional-superko') expect(result).toEqual({ok:false,reason:'superko'});
    else {
      const after=success(result);expect(after.board).toEqual(root.board);expect(after.captures.white).toBe(1);
      expect(play(success(pass(after)),{x:1,y:1})).toEqual({ok:false,reason:'superko'});
      expect(root.captures.white).toBe(0);
    }
  }
});
test('setup starts a new epoch and preserves counters; invalid setup preserves all history', () => {
  for (const ko of koPolicies) {
    const captured=success(play(initial(ko),{x:1,y:2}));
    expect(setup(captured,[{x:-1,y:0,color:'black'}])).toEqual({ok:false,reason:'invalid-setup'});
    expect(captured.repetitionHistory?.size).toBe(2);
    const edited=success(setup(captured,[]));
    expect(edited.repetitionHistory?.size).toBe(1);
    expect(edited.captures).toEqual(captured.captures);expect(edited.moveNumber).toBe(captured.moveNumber);
    expect(play(edited,{x:1,y:1}).ok).toBe(true);
  }
});
test('recorded repetition, out-of-turn and occupied replacement remain replayable and feed future legality', () => {
  const root=initial('positional-superko'),capture=success(replayMove(root,{x:1,y:2},'black'));
  const recapture=success(replayMove(capture,{x:1,y:1},'white'));
  expect(recapture.board).toEqual(root.board);expect(recapture.rules).toEqual(root.rules);
  expect(recapture.repetitionHistory?.size).toBe(2);
  expect(play(recapture,{x:1,y:2})).toEqual({ok:false,reason:'superko'});
  const replacement=success(replayMove(createPosition({width:3,rules:{ko:'situational-superko'}}),{x:1,y:1},'white'));
  const overwritten=success(replayMove(replacement,{x:1,y:1},'black'));
  expect(overwritten.board[4]).toBe('black');expect(overwritten.repetitionHistory?.size).toBe(3);
  expect(overwritten.rules.ko).toBe('situational-superko');
});
test('exact equality resolves hash collisions and old history snapshots remain immutable', () => {
  // These distinct FNV-1a keys collide; the same appended turn preserves that collision.
  const before=rememberSituation(null,'costarring','black');
  const after=rememberSituation(before,'liquid','black');
  expect(after.size).toBe(2);expect(before.size).toBe(1);
  expect(after.root && 'keys' in after.root ? after.root.keys.length : 0).toBe(2);
  expect(hasSituation(before,'liquid','black')).toBe(false);
  expect(hasSituation(after,'costarring','black')).toBe(true);expect(hasSituation(after,'liquid','black')).toBe(true);
  expect(hasSituation(after,'liquid','white')).toBe(false);
  expect(rememberSituation(after,'liquid','black')).toBe(after);
  expect(Object.isFrozen(after)).toBe(true);expect(Object.isFrozen(after.root)).toBe(true);
});
test('repeated passes retain at most two distinct situations without growing duplicate history', () => {
  let position=createPosition({width:9,rules:{ko:'situational-superko'}});
  for (let i=0;i<6000;i++) position=success(pass(position));
  expect(position.repetitionHistory?.size).toBe(2);expect(position.moveNumber).toBe(6000);
  expect(() => createPosition({rules:{ko:'unknown' as RulePolicy['ko']}})).toThrow('Unsupported');
});
