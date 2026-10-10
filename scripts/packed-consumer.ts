import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
await mkdir(resolve(root, '.tmp'), { recursive: true });
const directory = await mkdtemp(resolve(root, '.tmp/packed-consumer-'));
const run = (command: string[], cwd: string) => {
  const result = Bun.spawnSync(command, { cwd, stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0) throw new Error(`${command.join(' ')} failed:\n${result.stdout.toString()}${result.stderr.toString()}`);
  return result.stdout.toString();
};
run([process.execPath, 'pm', 'pack', '--filename', resolve(directory, 'sdk.tgz'), '--ignore-scripts'], resolve(root, 'packages/sdk'));
await writeFile(resolve(directory, 'package.json'), JSON.stringify({
  name: 'banora-packed-consumer', private: true, type: 'module',
  dependencies: { '@banora/sdk': './sdk.tgz' },
}));
run([process.execPath, 'install', '--ignore-scripts'], directory);
const consumer = `import { RecordController, createPosition, play, stoneAt } from '@banora/sdk';
import { parseSgf } from '@banora/sdk/sgf';
import { opposite, comparePositions } from '@banora/sdk/core';
import type { ControllerState } from '@banora/sdk/controller';
import { mountViewer } from '@banora/sdk/viewer';
import {mountPuzzle} from '@banora/sdk/puzzle-view';
import type {PuzzleView} from '@banora/sdk/puzzle-view';
import {mountAnalysis} from '@banora/sdk/analysis-view';
import type {AnalysisView} from '@banora/sdk/analysis-view';
import { mountComparison } from '@banora/sdk/comparison';
import { createShareLink, decodeShareLink } from '@banora/sdk/share';
import { createStoneTexture } from '@banora/sdk/textures';
import { prepareStoneTexture } from '@banora/sdk/board';
import type { ComparisonView } from '@banora/sdk/comparison';
import type {PlacementAnimationOptions, BoardOptions} from '@banora/sdk/board';
const placementAnimation:PlacementAnimationOptions={durationMs:160};
const animationConfig:BoardOptions={placementAnimation};
const diagram: ComparisonView['exportSvg'] | undefined = undefined;
if (typeof prepareStoneTexture !== 'function' || createStoneTexture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0ioAAAAASUVORK5CYII=').width !== 1) throw Error('Packed texture exports failed');
if (typeof mountComparison !== 'function') throw Error('Comparison artifact export failed');
if (typeof mountViewer !== 'function') throw Error('Viewer artifact export failed');
const puzzleMount:typeof mountPuzzle=mountPuzzle;
const puzzleView:PuzzleView|undefined=undefined;
if (typeof puzzleMount!=='function') throw Error('Packed SSR-safe puzzle view import failed');
const analysisMount:typeof mountAnalysis=mountAnalysis;
const analysisView:AnalysisView|undefined=undefined;
if (typeof analysisMount!=='function') throw Error('Packed SSR-safe analysis view import failed');
const result = play(createPosition({ width: 9 }), { x: 4, y: 4 });
if (!result.ok || stoneAt(result.position, { x: 4, y: 4 }) !== 'black') throw Error('Core artifact failed');
if (opposite('black') !== 'white') throw Error('Core subpath failed');
const controller = new RecordController({ sgf: '(;SZ[9]XX[preserve];B[aa])' });
controller.next(); controller.setComment('public artifact');
controller.setMarker({ x: 3, y: 3 }, 'label', 'A:B');
const state: ControllerState = controller.getState();
const rootState = controller.inspectNode(state.path[0]!)!;
if (comparePositions(rootState.position,state.position).length !== 1 || controller.getState() !== state || rootState.recordGeneration !== 0) throw Error('Packed comparison/inspection failed');
if (!state.dirty) throw Error('Editing failed');
const shared = createShareLink(state, 'https://example.test/studio/');
if (!shared.ok) throw Error(shared.message);
const decodedShare = decodeShareLink(shared.value);
if (!decodedShare.ok) throw Error(decodedShare.message);
const sharedConsumer = new RecordController();
if (!sharedConsumer.loadSgf(decodedShare.value.sgf,{locator:decodedShare.value.locator}).ok || sharedConsumer.getState().node.properties.C?.[0] !== 'public artifact') throw Error('Packed share target failed');
sharedConsumer.dispose();
const exported = controller.prepareExport();
if (!parseSgf(exported.text).ok) throw Error('SGF subpath failed');
const reopened = new RecordController({ sgf: exported.text }); reopened.next();
if (reopened.getState().node.properties.C?.[0] !== 'public artifact') throw Error('Reopen failed');
const editor = new RecordController({sgf:'(;SZ[9]XX[keep](;B[aa])(;B[bb]))'});
editor.setSetup([{x:4,y:4,color:'white'}], 'black');
editor.setConnection({x:2,y:2},{x:3,y:3}, 'arrow');
if (!editor.addStroke([{x:1.25,y:2},{x:3,y:4.5}], {color:'#cc7733'}).ok) throw Error('Public ink editing failed');
const branch = editor.getState().node.children[1]!.id;
if (!editor.reorderBranch(branch,0).ok || !editor.removeBranch(branch).ok || !editor.undo().ok) throw Error('Extended public editing failed');
const edited = new RecordController({sgf:editor.prepareExport().text});
if (edited.getState().strokes[0]?.points[0]?.x !== 1.25 || edited.getState().strokes[0]?.color !== '#cc7733') throw Error('Packed ink round-trip failed');
if (edited.getState().connections[0]?.kind !== 'arrow' || stoneAt(edited.getState().position,{x:4,y:4}) !== 'white' || edited.getState().node.children[0]?.properties.B?.[0] !== 'bb') throw Error('Extended artifact preservation failed');
editor.dispose(); edited.dispose();
controller.acknowledgeExport(exported.id);
if (controller.getState().dirty) throw Error('Export baseline failed');
controller.dispose(); reopened.dispose();
console.log('Packed public SDK consumer passed');
`;
await writeFile(resolve(directory, 'consumer.ts'), consumer);
await writeFile(resolve(directory, 'tsconfig.json'), JSON.stringify({
  extends: resolve(root, 'tsconfig.json'), compilerOptions: { types: [] }, include: ['consumer.ts'],
}));
run([process.execPath, 'run', 'typecheck', '--project', resolve(directory, 'tsconfig.json')], root);
await writeFile(resolve(directory, 'headless.ts'), `import {createPosition, play} from '@banora/sdk/core';
import type {RepetitionHistory, RulePolicy} from '@banora/sdk/core';
import {getRuleProfile} from '@banora/sdk/rules';
import {scorePosition} from '@banora/sdk/scoring';
import type {ScoreSummary} from '@banora/sdk/scoring';
import {PuzzleSession} from '@banora/sdk/puzzle';
import type {PuzzleDefinition,PuzzleEvent} from '@banora/sdk/puzzle';
import {AnalysisSession} from '@banora/sdk/analysis';
import type {AnalysisProvider,AnalysisCancellation} from '@banora/sdk/analysis';
import {KataGoProvider,createKataGoQuery} from '@banora/sdk/katago';
import type {KataGoTransport} from '@banora/sdk/katago';
import {toDisplayPoint, toLogicalPoint} from '@banora/sdk/geometry';
import {parseSgf} from '@banora/sdk/sgf';
import {RecordController} from '@banora/sdk/controller';
import {createShareLink, decodeShareLink} from '@banora/sdk/share';
import {createStoneTexture} from '@banora/sdk/textures';
if (!play(createPosition(), {x:0,y:0}).ok || !parseSgf('(;SZ[9])').ok) throw Error('Headless imports failed');
const controller = new RecordController();
if (createStoneTexture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0ioAAAAASUVORK5CYII=').height !== 1) throw Error('Headless texture factory failed');
const link = createShareLink(controller.getState(),'https://example.test/board/');
if (!link.ok || !decodeShareLink(link.value).ok) throw Error('Headless share subpath failed');
controller.dispose();
const size = {width:5,height:9}, transform = {rotation:90 as const, flipX:true};
const ko:RulePolicy['ko']='situational-superko';
const passing=createPosition({rules:getRuleProfile('aga-area').play});
if (!passing.rules.passStones || passing.passPrisoners.white!==0 || passing.consecutivePasses!==0) throw Error('Packed rule preset failed');
const score=scorePosition(passing,{profile:'aga-area',komi:0.5,handicap:3});
const report:ScoreSummary|undefined=score.ok ? score.value : undefined;
if (!report || report.white.total!==2.5 || report.black.total!==0 || report.passSequenceComplete) throw Error('Packed scoring subpath failed');
const definition:PuzzleDefinition={schemaVersion:'banora.puzzle/v1',id:'installed',title:'Installed puzzle',prompt:'Pass to finish.',
  sgf:'(;SZ[3])',rules:getRuleProfile('aga-area').play,tree:{id:'root',children:[{id:'pass',move:null,response:'reply',children:[{id:'reply',move:null,result:'correct'}]}]}};
const puzzle=new PuzzleSession(definition),puzzleEvents:PuzzleEvent[]=[];
puzzle.onEvent(event => puzzleEvents.push(event));puzzle.pass();
if (puzzle.getState().status!=='correct' || puzzle.getState().position.passPrisoners.white!==1 || puzzleEvents[0]?.type!=='answer') throw Error('Packed headless puzzle transition failed');
puzzle.restart();if (puzzle.getState().attempts!==0 || puzzle.getState().position.moveNumber!==0) throw Error('Packed puzzle restart failed');
puzzle.dispose();
const analysisRecord=new RecordController({size:5});
const analysisProvider:AnalysisProvider={id:'installed',async analyze(request,cancellation:AnalysisCancellation) {
  if (cancellation.cancelled || request.context.moves.length!==0) throw Error('Unexpected installed analysis context');
  return {requestId:request.id,contextKey:request.context.key,root:{winProbabilityBlack:0.5,scoreLeadBlack:0,visits:10},
    candidates:[{move:null,rank:0,principalVariation:[null],winProbabilityBlack:0.5,scoreLeadBlack:0,visits:10}]};
}};
const analysis=new AnalysisSession(analysisRecord,analysisProvider,{profile:'japanese-territory'});
if (analysis.getState().status!=='idle' || !(await analysis.request()).ok || analysis.getState().result?.candidates[0]?.move!==null) throw Error('Packed headless analysis failed');
analysis.dispose();if (!analysisRecord.play({x:0,y:0}).ok) throw Error('Analysis disposed its borrowed record');analysisRecord.dispose();
const kataRecord=new RecordController({size:5});
let kataLine='';const kataTransport:KataGoTransport={sendLine(line){kataLine=line;}};
const kataProvider=new KataGoProvider(kataTransport,{perspective:'black'});
const kataSession=new AnalysisSession(kataRecord,kataProvider,{profile:'japanese-territory'});
const kataPending=kataSession.request();const kataQuery=JSON.parse(kataLine);
if (kataQuery.boardXSize!==5 || typeof createKataGoQuery!=='function') throw Error('Packed KataGo query failed');
kataProvider.receiveLine(JSON.stringify({id:kataQuery.id,turnNumber:0,isDuringSearch:false,
  rootInfo:{currentPlayer:'B',winrate:0.7,scoreLead:2,visits:100},
  moveInfos:[{move:'C3',order:0,winrate:0.8,scoreLead:3,visits:90,pv:['C3']}]}));
if (!(await kataPending).ok || kataSession.getState().result?.candidates[0]?.move?.x!==2) throw Error('Packed KataGo JSON integration failed');
kataSession.dispose();kataProvider.dispose();if (!kataRecord.play({x:0,y:0}).ok) throw Error('KataGo disposed its borrowed record');kataRecord.dispose();
const repetition=new RecordController({sgf:'(;SZ[5]AW[bb][ac][cc][bd]AB[ab][ba][cb];B[bc];W[];B[])',rules:{ko}});
for (let i=0;i<3;i++) repetition.next();
const before=repetition.getState(),history:RepetitionHistory|null=before.position.repetitionHistory;
const rejected=repetition.play({x:1,y:1});
if (rejected.ok || rejected.reason!=='superko' || repetition.getState()!==before || history?.size!==3) throw Error('Packed superko history/rejection failed');
repetition.setSetup([],'white');
if (!repetition.play({x:1,y:1}).ok) throw Error('Packed superko setup epoch failed');
repetition.dispose();
const shown = toDisplayPoint({x:1,y:2},size,transform);
if (toLogicalPoint(shown,size,transform).x !== 1) throw Error('Headless geometry subpath failed');
`);
await writeFile(resolve(directory, 'headless-tsconfig.json'), JSON.stringify({
  extends: resolve(root, 'tsconfig.json'), compilerOptions: { types: [], lib: ['ES2022'] }, include: ['headless.ts'],
}));
run([process.execPath, 'run', 'typecheck', '--project', resolve(directory, 'headless-tsconfig.json')], root);
run(['node', resolve(directory, 'headless.ts')], directory);
// Node 24 can strip erasable types, so the exact typed consumer runs against the
// installed tarball rather than source files or workspace symlinks.
console.log(run(['node', resolve(directory, 'consumer.ts')], directory).trim());
const installed = JSON.parse(await readFile(resolve(directory, 'node_modules/@banora/sdk/package.json'), 'utf8'));
if (installed.dependencies && Object.keys(installed.dependencies).length) throw new Error('Unexpected SDK runtime dependencies');
await readFile(resolve(directory, 'node_modules/@banora/sdk/LICENSE'));
const globalDirectory = resolve(directory, 'node_modules/@banora/sdk/dist');
const browserSource = await readFile(resolve(globalDirectory,'banora.global.js'),'utf8');
const browserLicense = await readFile(resolve(directory,'node_modules/@banora/sdk/LICENSE'),'utf8');
if (!browserSource.includes(browserLicense.trim())) throw new Error('Standalone browser distribution lost its MIT notice');
await writeFile(resolve(directory, 'global-consumer.ts'), `/// <reference path="./node_modules/@banora/sdk/dist/banora.global.d.ts" />
const model = new Banora.RecordController({size:9});
model.setConnection({x:0,y:0}, {x:1,y:1}, 'arrow');
const viewer: typeof Banora.mountViewer = Banora.mountViewer;
model.dispose();
`);
await writeFile(resolve(directory, 'global-tsconfig.json'), JSON.stringify({
  extends: resolve(root, 'tsconfig.json'), compilerOptions: {types:[], skipLibCheck:false}, include:['global-consumer.ts'],
}));
run([process.execPath, 'run', 'typecheck', '--project', resolve(directory, 'global-tsconfig.json')], root);
await writeFile(resolve(directory, 'global-consumer.js'), `import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const context = {TextEncoder, TextDecoder, console};
runInNewContext(readFileSync(${JSON.stringify(resolve(globalDirectory, 'banora.global.js'))}, 'utf8'), context);
if (typeof context.Banora?.mountViewer !== 'function') throw Error('Missing global viewer');
const model = new context.Banora.RecordController({size:9});
if (!model.play({x:0,y:0}).ok || model.getState().position.moveNumber !== 1) throw Error('Classic artifact failed');
model.dispose(); console.log('Packed classic global and ambient declarations passed');
`);
console.log(run(['node', resolve(directory, 'global-consumer.js')], directory).trim());
console.log(`Packed declarations, entrypoints and license checked in ${directory}`);
