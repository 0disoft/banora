import { mkdir, mkdtemp, writeFile, readFile, access, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const root = resolve(import.meta.dirname, '..');
await mkdir(resolve(root, '.tmp'), { recursive: true });
const directory = await mkdtemp(resolve(root, '.tmp/packed-adapters-'));
function run(command: string[], cwd: string) {
  const result = Bun.spawnSync(command, { cwd, stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0) throw new Error(`${command.join(' ')} failed:\n${result.stdout.toString()}${result.stderr.toString()}`);
  return result.stdout.toString();
}
run([process.execPath, 'pm', 'pack', '--filename', resolve(directory, 'sdk.tgz'), '--ignore-scripts'], resolve(root, 'packages/sdk'));
for (const framework of ['react', 'vue', 'svelte'] as const) {
  const consumer = resolve(directory, framework);
  await mkdir(consumer);
  await copyFile(resolve(directory, 'sdk.tgz'), resolve(consumer, 'sdk.tgz'));
  run([process.execPath, 'pm', 'pack', '--filename', resolve(consumer, 'adapter.tgz'), '--ignore-scripts'], resolve(root, 'packages', framework));
  const dependencies = {
    '@banora/sdk': './sdk.tgz', [`@banora/${framework}`]: './adapter.tgz', '@types/node': '24.x',
    ...(framework === 'react' ? { react: '19.x', 'react-dom': '19.x', '@types/react': '19.x', '@types/react-dom': '19.x' } :
      framework === 'vue' ? { vue: '3.x' } : { svelte: '5.x' }),
  };
  await writeFile(resolve(consumer, 'package.json'), JSON.stringify({ name: `banora-${framework}-consumer`, private: true, type: 'module', dependencies }));
  // Exercise npm consumers independently of workspace resolution. Bun 1.4.2's
  // simultaneous local-tarball peer resolution attempts a registry lookup for
  // the unpublished SDK; npm correctly binds the provided local artifact.
  run(['npm', 'install', '--ignore-scripts', '--no-audit', '--no-fund'], consumer);
  // Read each isolated install, rather than resolving up to the workspace.
  for (const other of ['react', 'vue', 'svelte'].filter(name => name !== framework)) {
    let present = false;
    try { await access(resolve(consumer, 'node_modules', other, 'package.json')); present = true; } catch { /* Absent is expected. */ }
    if (present) throw new Error(`${framework} consumer unexpectedly installed ${other}`);
  }
  const installed = resolve(consumer, 'node_modules/@banora', framework);
  for (const file of ['LICENSE', 'README.md', 'dist/index.d.ts']) await readFile(resolve(installed, file));
  const metadata = JSON.parse(await readFile(resolve(installed, 'package.json'), 'utf8'));
  if (metadata.dependencies && Object.keys(metadata.dependencies).length) throw new Error('Adapters must use peers, not bundled framework dependencies');
  const prelude = `import { RecordController } from '@banora/sdk';
import type {BoardView, ViewerView} from '@banora/sdk';
const controller = new RecordController({sgf:'(;SZ[9];B[aa])'}); controller.next();
let bindings = 0;
const onView = (view: BoardView | ViewerView | null) => { bindings++; view?.exportSvg({width:128}); };
`;
  const source = framework === 'react' ? `${prelude}
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
import {Board, Viewer, useRecordState} from '@banora/react';
function App() {
  const state = useRecordState(controller);
  return createElement('main', null, createElement('p', null, 'Move ' + state.position.moveNumber),
    createElement(Board, {controller, nodeId:controller.getState().path[0],compareTo:controller.getState().node.id,referenceGeneration:controller.getState().recordGeneration, transform:{rotation:90}, drawing:{color:'#cc5522',width:0.12}, touch:{mode:'confirm',magnifier:true}, onView, theme:'flat', onStateChange: state => void state.strokes}),
    createElement(Viewer, {controller, onView, editable:false,board:{touch:{mode:'release'}}}));
}
const html = renderToString(createElement(App));
` : framework === 'vue' ? `${prelude}
import {createSSRApp, defineComponent, h, ref} from 'vue';
import {renderToString} from 'vue/server-renderer';
import {Board, Viewer, useRecordState} from '@banora/vue';
const App = defineComponent({setup() {
  const selected = ref(controller);
  const state = useRecordState(selected);
  return () => h('main', [h('p', 'Move ' + state.value.position.moveNumber),
    h(Board, {controller:selected.value, nodeId:controller.getState().path[0],compareTo:controller.getState().node.id,referenceGeneration:controller.getState().recordGeneration, transform:{rotation:90}, drawing:{color:'#cc5522',width:0.12}, touch:{mode:'confirm',magnifier:true}, onView, theme:'flat', onStateChange: state => void state.strokes}),
    h(Viewer, {controller:selected.value, onView, editable:false,board:{touch:{mode:'release'}}})]);
}});
const html = await renderToString(createSSRApp(App));
` : `${prelude}
import {render} from 'svelte/server';
import App from './App.svelte';
const html = render(App, {props:{controller,onView}}).body;
`;
  const checks = `
if (!html.includes('Move 1') || !html.includes('Banora board') || !html.includes('Banora viewer') || html.includes('<svg')) throw Error('SSR/client mount boundary failed: ' + html);
if (bindings !== 0) throw Error('SSR invoked a browser view binding');
controller.dispose(); console.log('${framework} packed types and SSR host rendering passed');
`;
  await writeFile(resolve(consumer, 'consumer.ts'), source + checks);
  await writeFile(resolve(consumer, 'tsconfig.json'), JSON.stringify({
    extends: resolve(root, 'tsconfig.json'), compilerOptions: { types: ['node'], skipLibCheck: false },
    include: ['consumer.ts', '*.svelte'], exclude: ['node_modules', 'dist'],
  }));
  if (framework === 'svelte') {
    await writeFile(resolve(consumer, 'App.svelte'), `<script lang="ts">
import {Board, Viewer, createRecordStore} from '@banora/svelte';
import type {BoardView, RecordController, ViewerView} from '@banora/sdk';
let {controller,onView}: {controller:RecordController, onView:(view:BoardView | ViewerView | null) => void} = $props();
const record = $derived(createRecordStore(controller));
</script>
<main><p>Move {$record.position.moveNumber}</p>
<Board {controller} {onView} nodeId={controller.getState().path[0]} compareTo={controller.getState().node.id} referenceGeneration={controller.getState().recordGeneration} transform={{rotation:90}} drawing={{color:'#cc5522',width:0.12}} touch={{mode:'confirm',magnifier:true}} theme="flat" ariaLabel="Banora board" onStateChange={state => void state.strokes}/>
<Viewer {controller} {onView} editable={false} board={{touch:{mode:'release'}}} ariaLabel="Banora viewer"/></main>
`);
    for (const file of ['dist/Board.svelte', 'dist/Viewer.svelte', 'dist/Board.svelte.d.ts', 'dist/Viewer.svelte.d.ts']) await readFile(resolve(installed, file));
    run([process.execPath, 'run', '--cwd', resolve(root, 'packages/svelte'), 'svelte-check', '--tsconfig', resolve(consumer, 'tsconfig.json')], root);
    await build({ configFile: false, root: consumer, plugins: [svelte({ configFile: false })],
      ssr: { noExternal: ['@banora/svelte', '@banora/sdk'] },
      build: { ssr: resolve(consumer, 'consumer.ts'), outDir: resolve(consumer, 'dist'), emptyOutDir: true } });
    console.log(run(['node', resolve(consumer, 'dist/consumer.js')], consumer).trim());
  } else {
    run([process.execPath, 'run', 'typecheck', '--project', resolve(consumer, 'tsconfig.json')], root);
    console.log(run(['node', resolve(consumer, 'consumer.ts')], consumer).trim());
  }
  console.log(`${framework}: isolated artifact, peers, declarations and license checked`);
}
