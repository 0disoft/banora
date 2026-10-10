import {expect, test} from 'bun:test';
import {RecordController} from '../src/controller.js';
import {recordNodeAt} from '../src/sgf.js';
import {createShareLink, decodeShareLink, MAX_SHARE_URL_LENGTH} from '../src/share.js';

const base='https://example.test/studio/?token=do-not-share#old';
const wire=(value:unknown) => '#banora=v1.'+Buffer.from(JSON.stringify(value)).toString('base64url');
const fixture='(;SZ[9]PB[private name]C[root secret]XX[escape\\:keep];B[aa](;W[bb]C[left private])(;W[cc];B[dd]C[제로디 🦆]))(;SZ[5:9]AB[ab];W[de]C[other game])';

test('record/node links round-trip collections and exact branch paths without acknowledging dirty edits', () => {
  const controller=new RecordController({sgf:fixture});controller.next();controller.next(1);controller.next();
  controller.addStroke([{x:1.25,y:2},{x:3,y:4.5}],{color:'#cc7733'});
  const state=controller.getState(), link=createShareLink(state,base);
  expect(link.ok).toBe(true);if (!link.ok) throw Error(link.message);
  expect(link.value).toStartWith('https://example.test/studio/#banora=v1.');
  expect(link.value).not.toContain('token');expect(link.value.length).toBeLessThanOrEqual(MAX_SHARE_URL_LENGTH);
  const decoded=decodeShareLink(link.value);if (!decoded.ok) throw Error(decoded.message);
  expect(decoded.value.kind).toBe('node');expect(decoded.value.locator).toEqual({gameIndex:0,path:[0,1,0]});
  expect(decoded.value.record.games).toHaveLength(2);
  expect(decoded.value.sgf).toContain('XX[escape\\:keep]');
  expect(recordNodeAt(decoded.value.record,decoded.value.locator)?.properties.C).toEqual(['제로디 🦆']);
  expect(Object.isFrozen(decoded.value)).toBe(true);expect(Object.isFrozen(decoded.value.locator.path)).toBe(true);
  const reopened=new RecordController();expect(reopened.loadSgf(decoded.value.sgf,{locator:decoded.value.locator}).ok).toBe(true);
  expect(reopened.getState().position.board).toEqual(state.position.board);
  expect(reopened.getState().strokes).toEqual(state.strokes);
  controller.goTo(state.record.games[1]!.children[0]!.id);
  const record=createShareLink(controller.getState(),base,{kind:'record'});if (!record.ok) throw Error(record.message);
  const full=decodeShareLink(new URL(record.value).hash);if (!full.ok) throw Error(full.message);
  expect(full.value.locator).toEqual({gameIndex:1,path:[]});
  expect(controller.getState().dirty).toBe(true);
  controller.dispose();reopened.dispose();
});

test('position links contain visible setup, turn, move number and local markup with opt-in comment only', () => {
  const controller=new RecordController({sgf:fixture});controller.next();controller.next(1);controller.next();
  controller.setMarker({x:4,y:4},'label','공유');controller.setConnection({x:0,y:1},{x:3,y:4},'arrow');
  controller.addStroke([{x:2,y:2},{x:4,y:4}]);
  const before=controller.getState();
  for (const includeComment of [false,true]) {
    const link=createShareLink(before,base,{kind:'position',includeComment});if (!link.ok) throw Error(link.message);
    const decoded=decodeShareLink(link.value);if (!decoded.ok) throw Error(decoded.message);
    expect(decoded.value.locator).toEqual({gameIndex:0,path:[]});expect(decoded.value.record.games).toHaveLength(1);
    const reopened=new RecordController({sgf:decoded.value.sgf}), state=reopened.getState();
    expect(state.node.children).toHaveLength(0);expect(state.position.board).toEqual(before.position.board);
    expect(state.position.toPlay).toBe(before.position.toPlay);expect(state.position.moveNumber).toBe(before.position.moveNumber);
    expect(state.markers).toEqual(before.markers);expect(state.connections).toEqual(before.connections);expect(state.strokes).toEqual(before.strokes);
    expect(state.node.properties.C).toEqual(includeComment ? ['제로디 🦆'] : undefined);
    for (const property of ['PB','XX','B','W','RU','KM']) expect(state.node.properties[property]).toBeUndefined();
    expect(decoded.value.sgf).not.toContain('secret');expect(decoded.value.sgf).not.toContain('left private');reopened.dispose();
  }
  expect(controller.getState()).toBe(before);controller.dispose();
});

test('locator imports are validated and atomic across dirty guards, generations and subscriber reentrancy', () => {
  const controller=new RecordController({sgf:'(;SZ[9])'});controller.setComment('keep');
  const before=controller.getState();let events=0;const comments:(string|undefined)[]=[];
  controller.subscribe(state => {events++;comments.push(state.node.properties.C?.[0]);});
  expect(controller.loadSgf(fixture,{locator:{gameIndex:0,path:[0,99]},discardChanges:true})).toEqual({ok:false,reason:'node-not-found'});
  expect(controller.loadSgf(fixture,{locator:{gameIndex:1,path:[0]}})).toEqual({ok:false,reason:'unsaved-changes'});
  expect(controller.getState()).toBe(before);expect(events).toBe(1);
  expect(controller.loadSgf(fixture,{locator:{gameIndex:1,path:[0]},discardChanges:true})).toEqual({ok:true});
  expect(comments).toEqual(['keep','other game']);expect(events).toBe(2);
  expect(controller.getState().recordGeneration).toBe(1);expect(controller.getState().canUndo).toBe(false);
  expect(controller.getState().gameIndex).toBe(1);expect(controller.getState().dirty).toBe(false);controller.dispose();
});

test('share decoding rejects malformed/unsupported payloads and invalid targets without transport', () => {
  const valid={kind:'node',sgf:'(;SZ[9];B[aa])',game:0,path:[0]};
  for (const value of [null,[],{}, {...valid,extra:true},{...valid,game:-1},{...valid,path:[-1]},{...valid,path:'0'},{...valid,kind:'other'},{...valid,sgf:1}]) {
    expect(decodeShareLink(wire(value))).toMatchObject({ok:false,reason:'invalid-payload'});
  }
  for (const text of ['#other=v1.AA','#banora=v1.A','#banora=v1.AB','#banora=v1.AA==','#banora=v1._w',wire(valid)+'=']) {
    expect(decodeShareLink(text)).toMatchObject({ok:false,reason:'invalid-payload'});
  }
  expect(decodeShareLink('#banora=v2.AA')).toMatchObject({ok:false,reason:'unsupported-version'});
  expect(decodeShareLink(wire({...valid,sgf:'broken'}))).toMatchObject({ok:false,reason:'invalid-record'});
  for (const value of [{...valid,path:[9]},{...valid,game:9},{...valid,kind:'record'},{...valid,kind:'position'},{...valid,kind:'position',path:[]}]) {
    expect(decodeShareLink(wire(value))).toMatchObject({ok:false,reason:'invalid-target'});
  }
  for (const url of ['javascript:alert(1)','file:///test','https://user:pass@example.test/#banora=v1.AA','relative']) {
    expect(decodeShareLink(url)).toMatchObject({ok:false,reason:'invalid-url'});
  }
});

test('share bounds fail explicitly without truncation and static links do not claim capture history', () => {
  const controller=new RecordController({sgf:'(;SZ[3]AB[ab][ba][cb]AW[bb];B[bc])'});controller.next();
  expect(controller.getState().position.captures.black).toBe(1);
  const link=createShareLink(controller.getState(),base,{kind:'position'});if (!link.ok) throw Error(link.message);
  const decoded=decodeShareLink(link.value);if (!decoded.ok) throw Error(decoded.message);
  const reopened=new RecordController({sgf:decoded.value.sgf});expect(reopened.getState().position.captures.black).toBe(0);
  expect(createShareLink(controller.getState(),base,{maxLength:link.value.length-1,kind:'position'})).toMatchObject({ok:false,reason:'too-large'});
  expect(decodeShareLink(link.value,{maxLength:link.value.length-1})).toMatchObject({ok:false,reason:'too-large'});
  expect(createShareLink(controller.getState(),'file:///board')).toMatchObject({ok:false,reason:'invalid-url'});
  for (const maxLength of [0,-1,MAX_SHARE_URL_LENGTH+1,1.5,NaN]) {
    expect(() => createShareLink(controller.getState(),base,{maxLength})).toThrow(RangeError);
    expect(() => decodeShareLink(link.value,{maxLength})).toThrow(RangeError);
  }
  controller.setComment('x'.repeat(20_000));
  expect(createShareLink(controller.getState(),base)).toMatchObject({ok:false,reason:'too-large'});
  reopened.dispose();controller.dispose();
});
