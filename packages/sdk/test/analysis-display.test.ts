import {expect,test} from 'bun:test';
import {RecordController} from '../src/controller.js';
import {AnalysisSession} from '../src/analysis.js';
import type {AnalysisCandidate} from '../src/analysis.js';
import {analysisCoordinate,analysisDisplaySgf,analysisPreview} from '../src/analysis-display.js';
import {mountAnalysis} from '../src/analysis-view.js';
const candidate=(moves:AnalysisCandidate['principalVariation']):AnalysisCandidate => ({move:moves[0]??null,rank:0,principalVariation:moves,visits:10,winProbabilityBlack:0.7,scoreLeadBlack:3,scoreLoss:0});
test('analysis PV display follows legal captures/passes, numbers only present stones and preserves source history/export', () => {
  const source=new RecordController({sgf:'(;SZ[5]KM[6.5]XX[private]C[Private comment]AB[ab][ba][cb]AW[bb])'}),before=source.getState(),exported=source.prepareExport().text;
  const move=candidate([{x:1,y:2},null,{x:2,y:2}]),initial=analysisPreview(before.position,move,0),capture=analysisPreview(before.position,move,1),passed=analysisPreview(before.position,move,2),last=analysisPreview(before.position,move,3);
  expect(initial.position).toBe(before.position);expect(capture.position.board[6]).toBe(null);expect(capture.position.captures.black).toBe(1);
  expect(passed.position.toPlay).toBe('black');expect(passed.played[1]?.move).toBe(null);expect(last.position.board[12]).toBe('black');
  const sgf=analysisDisplaySgf(last),display=new RecordController({sgf});expect(display.getState().position.board).toEqual(last.position.board);
  expect(display.getState().node.properties.LB).toEqual(['bc:1','cc:3']);expect(sgf).not.toContain('Private');expect(sgf).not.toContain('XX');expect(sgf).not.toContain('KM');
  expect(source.getState()).toBe(before);expect(source.prepareExport().text).toBe(exported);expect(Object.isFrozen(last.played)).toBe(true);
  for (const invalid of [-1,1.5,4]) expect(() => analysisPreview(before.position,move,invalid)).toThrow('PV step');
  expect(() => analysisPreview(before.position,candidate([{x:1,y:1}]),1)).toThrow('legal');display.dispose();source.dispose();
});
test('candidate-only previews, pass labels and root serialization have explicit stable behavior', () => {
  const source=new RecordController({sgf:'(;SZ[9:5]PL[W])'}),position=source.getState().position,move={...candidate([]),move:{x:2,y:1}};
  const preview=analysisPreview(position,move,1);expect(preview.line).toEqual([{x:2,y:1}]);expect(preview.position.board[11]).toBe('white');
  expect(analysisCoordinate(move.move,5)).toBe('C4');expect(analysisCoordinate(null,5)).toBe('Pass');
  expect(analysisDisplaySgf(analysisPreview(position,null,0))).toContain('PL[W]');expect(analysisPreview(position,candidate([]),1).played[0]?.move).toBe(null);source.dispose();
});
test('analysis view imports without browser globals and exposes the session borrowed controller only while live', () => {
  expect(typeof mountAnalysis).toBe('function');const source=new RecordController({size:5}),session=new AnalysisSession(source,{id:'test',async analyze(){return {}; }},{profile:'japanese-territory'});
  expect(session.controller).toBe(source);session.dispose();expect(() => session.controller).toThrow('disposed');expect(source.play({x:0,y:0}).ok).toBe(true);source.dispose();
});
