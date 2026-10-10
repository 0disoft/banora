import {expect, test} from 'bun:test';
import {RecordController} from '../src/controller.js';
const root='(;SZ[5]AW[bb][ac][cc][bd]AB[ab][ba][cb]XX[retain]';
const policies=['positional-superko','situational-superko'] as const;

test('controller legal play, rejected repetition and Undo/Redo use the selected path history', () => {
  for (const ko of policies) {
    const model=new RecordController({sgf:root+')',rules:{ko}});
    let events=0;const unsubscribe=model.subscribe(() => events++);
    expect(model.play({x:1,y:2}).ok).toBe(true);expect(model.play(null).ok).toBe(true);expect(model.play(null).ok).toBe(true);
    const before=model.getState(),notified=events,text=model.prepareExport().text;
    expect(model.play({x:1,y:1})).toEqual({ok:false,reason:'superko'});
    expect(model.getState()).toBe(before);expect(events).toBe(notified);expect(model.prepareExport().text).toBe(text);
    for (let i=0;i<3;i++) expect(model.undo().ok).toBe(true);
    expect(model.getState().dirty).toBe(false);expect(model.getState().position.repetitionHistory?.size).toBe(1);
    expect(model.redo().ok).toBe(true);expect(model.play({x:1,y:1})).toEqual({ok:false,reason:'superko'});
    expect(model.undo().ok).toBe(true);expect(model.play({x:1,y:2}).ok).toBe(true);
    unsubscribe();model.dispose();
  }
});
test('inspection, sibling navigation and game selection cannot contaminate superko membership', () => {
  for (const ko of policies) {
    const model=new RecordController({sgf:root+'(;B[bc];W[];B[])(;B[];W[]))'+root+')',rules:{ko}});
    const record=model.getState().record,first=record.games[0]!,visited=first.children[0]!.children[0]!.children[0]!,other=first.children[1]!.children[0]!;
    model.goTo(visited.id);const before=model.getState();
    expect(model.inspectNode(other.id)?.position.repetitionHistory?.size).toBe(2);
    expect(model.getState()).toBe(before);expect(model.play({x:1,y:1})).toEqual({ok:false,reason:'superko'});
    model.goTo(other.id);expect(model.play({x:1,y:2}).ok).toBe(true);
    model.goTo(record.games[1]!.id);expect(model.getState().position.repetitionHistory?.size).toBe(1);
    expect(model.play({x:1,y:2}).ok).toBe(true);model.dispose();
  }
});
test('recorded repetitions stay navigable but an existing child cannot bypass legal play validation', () => {
  for (const ko of policies) {
    const sgf=root+'RU[Unknown preserved policy];B[bc];W[];B[];W[bb])';
    const model=new RecordController({sgf,rules:{ko}});
    for (let i=0;i<3;i++) model.next();
    expect(model.play({x:1,y:1})).toEqual({ok:false,reason:'superko'});
    expect(model.next().ok).toBe(true);expect(model.getState().position.rules.ko).toBe(ko);
    expect(model.getState().dirty).toBe(false);expect(model.play({x:1,y:2})).toEqual({ok:false,reason:'superko'});
    const exported=model.prepareExport().text;expect(exported).toContain('RU[Unknown preserved policy]');
    const reopened=new RecordController({sgf:exported,rules:{ko}});
    reopened.goTo(reopened.getState().record.games[0]!.children[0]!.children[0]!.children[0]!.children[0]!.id);
    expect(reopened.play({x:1,y:2})).toEqual({ok:false,reason:'superko'});
    reopened.dispose();model.dispose();
    const defaults=new RecordController({sgf});expect(defaults.getState().position.rules.ko).toBe('simple');defaults.dispose();
  }
});
test('cache eviction and record edits preserve superko; an explicit setup/PL epoch survives Undo/Redo', () => {
  for (const ko of policies) {
    const model=new RecordController({sgf:root+';B[bc]'+(';W[];B[]'.repeat(100))+')',rules:{ko}});
    let last=model.getState().node;while (last.children.length) last=last.children[0]!;
    model.goTo(last.id);model.goTo(model.getState().record.games[0]!.id);model.goTo(last.id);
    expect(model.play({x:1,y:1})).toEqual({ok:false,reason:'superko'});
    model.setComment('Invalidate replay cache');expect(model.play({x:1,y:1})).toEqual({ok:false,reason:'superko'});
    expect(model.setSetup([],'white').ok).toBe(true);expect(model.getState().position.repetitionHistory?.size).toBe(1);
    expect(model.play({x:1,y:1}).ok).toBe(true);
    model.undo();model.undo();expect(model.play({x:1,y:1})).toEqual({ok:false,reason:'superko'});
    model.redo();expect(model.getState().position.repetitionHistory?.size).toBe(1);
    model.redo();expect(model.play({x:1,y:2})).toEqual({ok:false,reason:'superko'});
    model.dispose();
  }
});
test('invalid/guarded imports retain history; successful import establishes a fresh epoch under the same host policy', () => {
  for (const ko of policies) {
    const model=new RecordController({sgf:root+')',rules:{ko}});model.play({x:1,y:2});
    const before=model.getState(),fresh='(;SZ[5]AB[ab][ba][cb][bc]AW[ac][cc][bd]PL[W])';
    expect(model.loadSgf('(bad',{discardChanges:true}).ok).toBe(false);expect(model.getState()).toBe(before);
    expect(model.loadSgf(fresh)).toEqual({ok:false,reason:'unsaved-changes'});expect(model.getState()).toBe(before);
    expect(model.loadSgf(fresh,{discardChanges:true}).ok).toBe(true);
    expect(model.getState().recordGeneration).toBe(1);expect(model.getState().position.repetitionHistory?.size).toBe(1);
    expect(model.getState().position.rules.ko).toBe(ko);expect(model.play({x:1,y:1}).ok).toBe(true);model.dispose();
  }
});
