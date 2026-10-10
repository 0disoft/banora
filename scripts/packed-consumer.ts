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
import { mountComparison } from '@banora/sdk/comparison';
import { createShareLink, decodeShareLink } from '@banora/sdk/share';
import type { ComparisonView } from '@banora/sdk/comparison';
const diagram: ComparisonView['exportSvg'] | undefined = undefined;
if (typeof mountComparison !== 'function') throw Error('Comparison artifact export failed');
if (typeof mountViewer !== 'function') throw Error('Viewer artifact export failed');
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
import {toDisplayPoint, toLogicalPoint} from '@banora/sdk/geometry';
import {parseSgf} from '@banora/sdk/sgf';
import {RecordController} from '@banora/sdk/controller';
import {createShareLink, decodeShareLink} from '@banora/sdk/share';
if (!play(createPosition(), {x:0,y:0}).ok || !parseSgf('(;SZ[9])').ok) throw Error('Headless imports failed');
const controller = new RecordController();
const link = createShareLink(controller.getState(),'https://example.test/board/');
if (!link.ok || !decodeShareLink(link.value).ok) throw Error('Headless share subpath failed');
controller.dispose();
const size = {width:5,height:9}, transform = {rotation:90 as const, flipX:true};
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
