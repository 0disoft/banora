import { describe, expect, test } from 'bun:test';
import { RecordController } from '../src/controller.js';
import { createSgfNode, parseSgf, serializeSgf } from '../src/sgf.js';

const line = [{x:1.12567,y:2}, {x:3.75,y:4.375}];
const wire = (overrides: Record<string, unknown> = {}) => JSON.stringify({v:1, id:'ink1', color:'#206650', width:0.08, points:[[1,2],[3,4]], ...overrides});
const sgf = (values: string[]) => serializeSgf({games:[createSgfNode('root', {SZ:['9'], XX:['keep'], BPN:values})]});

describe('node-local freehand annotations', () => {
  test('copies fractional points, survives SGF reopen, and restores each edit independently of comment groups', () => {
    const controller = new RecordController({sgf:'(;SZ[9]XX[keep];B[aa])'});
    const initial = controller.getState();
    const end = controller.beginEditGroup(); controller.setComment('note');
    expect(controller.addStroke(line, {color:'#AABBCC',width:0.1}).ok).toBe(true);
    const state = controller.getState(), stroke = state.strokes[0]!;
    expect(stroke.points[0]).toEqual({x:1.1257,y:2});
    expect(stroke.color).toBe('#aabbcc');
    expect(Object.isFrozen(stroke.points[0])).toBe(true);
    expect(Object.isFrozen(stroke.points)).toBe(true);
    expect(Object.isFrozen(stroke)).toBe(true);
    expect(state.position.board).toEqual(initial.position.board);
    const reopened = new RecordController({sgf:controller.prepareExport().text});
    expect(reopened.getState().strokes).toEqual(state.strokes);
    expect(reopened.getState().node.properties.XX).toEqual(['keep']);
    end(); controller.undo();
    expect(controller.getState().node.properties.C).toEqual(['note']);
    expect(controller.getState().strokes).toEqual([]);
    controller.undo(); expect(controller.getState().dirty).toBe(false);
    controller.redo(); controller.redo();
    expect(controller.getState().strokes).toEqual(state.strokes);
    controller.next(); expect(controller.getState().strokes).toEqual([]);
    controller.previous(); expect(controller.getState().strokes).toEqual(state.strokes);
  });
  test('removal/clear restore ordered IDs and export baseline; empty operations are no-ops', () => {
    const controller = new RecordController({sgf:sgf([wire()])});
    controller.addStroke(line);
    const strokes = controller.getState().strokes;
    expect(strokes[1]!.id).not.toBe('ink1');
    const ticket = controller.prepareExport(); controller.acknowledgeExport(ticket.id);
    expect(controller.removeStroke('ink1').ok).toBe(true);
    expect(controller.getState().strokes).toEqual([strokes[1]!]);
    controller.undo(); expect(controller.getState().dirty).toBe(false);
    expect(controller.clearStrokes().ok).toBe(true);
    expect(controller.getState().node.properties.BPN).toBeUndefined();
    const empty = controller.getState();
    controller.clearStrokes(); controller.removeStroke('absent');
    expect(controller.getState()).toBe(empty);
    controller.undo(); expect(controller.getState().strokes).toEqual(strokes);
  });
  test('rejects invalid style/geometry and configured SGF limits without notifications or history', () => {
    const controller = new RecordController({size:9});
    let notifications = 0; controller.subscribe(() => notifications++);
    const initial = controller.getState();
    for (const points of [[], [{x:0,y:0}], [{x:0,y:0},{x:0,y:0}], [{x:NaN,y:0},{x:1,y:1}], [{x:-0.01,y:0},{x:1,y:1}], [{x:8.01,y:0},{x:1,y:1}], Array.from({length:513}, (_,i) => ({x:i%8,y:0}))]) {
      expect(controller.addStroke(points)).toEqual({ok:false,reason:'invalid-annotation'});
    }
    for (const style of [{color:'url(https://example.com)'},{width:0},{width:Infinity},{color:'#fff'},{width:0.5001}]) {
      expect(controller.addStroke(line,style)).toEqual({ok:false,reason:'invalid-annotation'});
    }
    expect(controller.getState()).toBe(initial); expect(notifications).toBe(1);
    const limited = new RecordController({size:9,limits:{maxValueLength:40}});
    const before = limited.getState();
    expect(limited.addStroke(line)).toEqual({ok:false,reason:'limit',diagnostics:expect.any(Array)});
    expect(limited.getState()).toBe(before);
  });
  test('bounded imports fail atomically for versions, schemas, IDs, geometry and colors', () => {
    const controller = new RecordController({size:9}); controller.setComment('unsaved');
    const state = controller.getState();
    for (const values of [
      ['{'], [wire({v:2})], [wire({extra:true})], [wire({id:'bad id'})], [wire({color:'red'})],
      [wire({width:0.001})], [wire({points:[[9,0],[1,1]]})], [wire({points:[[1,2,3],[3,4]]})],
      [wire({points:[[1,2],[1,2]]})], [wire(),wire()],
      Array.from({length:65}, (_,i) => wire({id:`ink${i}`})),
      Array.from({length:9}, (_,i) => wire({id:`ink${i}`,points:Array.from({length:512}, (_,p) => [p%8,1])})),
    ]) {
      expect(parseSgf(sgf(values)).ok).toBe(false);
      expect(controller.loadSgf(sgf(values),{discardChanges:true}).ok).toBe(false);
      expect(controller.getState()).toBe(state);
    }
  });
  test('node limits and semantic JSON normalization retain drawing order', () => {
    const full = new RecordController({sgf:sgf(Array.from({length:64}, (_,i) => wire({id:`ink${i}`})))});
    expect(full.addStroke(line)).toEqual({ok:false,reason:'limit'});
    const dense = new RecordController({sgf:sgf(Array.from({length:8}, (_,i) => wire({id:`ink${i}`,points:Array.from({length:512}, (_,p) => [p%8,1])})))});
    expect(dense.addStroke(line)).toEqual({ok:false,reason:'limit'});
    const controller = new RecordController({sgf:sgf([wire()])});
    expect(controller.getState().dirty).toBe(false);
    controller.setComment('x'); controller.undo();
    expect(controller.getState().dirty).toBe(false);
    expect(new RecordController({sgf:controller.prepareExport().text}).getState().strokes).toEqual(controller.getState().strokes);
  });
});
