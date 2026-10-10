import { mkdir, readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const root = process.cwd();
const output = resolve(root, 'output/playwright');
await mkdir(output, { recursive: true });
const session = `banora-smoke-${process.pid}`;
const server = Bun.serve({ hostname: '127.0.0.1', port: 0, async fetch(request) {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
  const pathname = decodeURIComponent(new URL(request.url).pathname);
  const sdk = pathname.startsWith('/sdk/');
  const directory = resolve(root, sdk ? 'packages/sdk/dist' : 'dist/examples');
  const relative = sdk ? pathname.slice(5) : pathname.slice(1);
  const path = resolve(directory, relative + (pathname.endsWith('/') ? 'index.html' : ''));
  if (!path.startsWith(directory + sep)) return new Response('Not found', { status: 404 });
  const file = Bun.file(path);
  if (!await file.exists()) return new Response('Not found', { status: 404 });
  return new Response(file, { headers: { 'Cache-Control': 'no-store' } });
} });
async function cli(...args: string[]): Promise<string> {
  const child = Bun.spawn([process.execPath, 'run', 'playwright-cli', `-s=${session}`, ...args], {
    cwd: root, stdout: 'pipe', stderr: 'pipe',
  });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  if (code !== 0 || stdout.includes('### Error')) throw new Error(`Browser command failed:\n${stdout}\n${stderr}`);
  return stdout;
}
async function shareSmoke(): Promise<void> {
  const result=await cli('run-code',await readFile(resolve(root,'scripts/share-scenario.js'),'utf8'));
  if (!result.includes('banora-sharing-complete: studio react vue svelte')) throw new Error(`Sharing scenario did not reach completion:\n${result}`);
  for (const name of ['studio','react','vue','svelte']) {
    const saved=await readFile(resolve(output,`${name}-share-before-open.sgf`),'utf8');
    if (!saved.includes('unsaved sharing note') || !saved.includes('XX[keep]') || !saved.includes('BPN[')) throw new Error(`${name} share guard export lost record content`);
  }
}
async function textureConsumers(): Promise<void> {
  const result=await cli('run-code',await readFile(resolve(root,'scripts/texture-consumer-scenario.js'),'utf8'));
  if (!result.includes('banora-texture-consumers-complete: studio react vue svelte')) throw new Error(`Texture consumers did not complete:\n${result}`);
  for (const name of ['studio','react','vue','svelte']) {
    const png=await readFile(resolve(output,`${name}-texture.png`));
    const svg=await readFile(resolve(output,`${name}-texture.svg`),'utf8');
    if (png.toString('hex',0,8)!=='89504e470d0a1a0a' || (svg.match(/<image /g) ?? []).length!==2 || !svg.includes('data-texture="black"')) throw new Error(`${name} lost texture diagram assets`);
  }
}
try {
  const address = `http://127.0.0.1:${server.port}`;
  await cli('open', `${address}/studio/`);
  // Capture actual UI references before interacting; scenario uses public roles
  // and selectors, never private SDK/controller hooks.
  await cli('snapshot');
  if (process.argv.includes('--animation-only')) {
    const result=await cli('run-code',await readFile(resolve(root,'scripts/animation-scenario.js'),'utf8'));
    if (!result.includes('banora-animation-sdk-complete')) throw new Error('Animation scenario did not complete');
    console.log('Focused animation smoke passed.');
  } else if (process.argv.includes('--texture-only')) {
    const result=await cli('run-code',await readFile(resolve(root,'scripts/texture-scenario.js'),'utf8'));
    if (!result.includes('banora-textures-complete: SDK')) throw new Error('Texture scenario did not complete');
    await textureConsumers();
    console.log('Focused texture smoke passed.');
  } else if (process.argv.includes('--share-only')) {
    await shareSmoke();
    console.log('Focused share smoke passed.');
  } else if (process.argv.includes('--touch-only')) {
    await cli('run-code',await readFile(resolve(root,'scripts/touch-scenario.js'),'utf8'));
    console.log('Focused touch smoke passed.');
  } else if (process.argv.includes('--comparison-only')) {
    await cli('run-code',await readFile(resolve(root,'scripts/comparison-scenario.js'),'utf8'));
    console.log('Focused comparison smoke passed.');
  } else {
  const scenario = await readFile(resolve(root, 'scripts/browser-scenario.js'), 'utf8');
  await cli('run-code', scenario);
  const frameworks = await readFile(resolve(root, 'scripts/framework-scenario.js'), 'utf8');
  await cli('snapshot');
  await cli('run-code', frameworks);
  console.log('Framework browser smoke passed: React Strict Mode, Vue refs, Svelte updates, callbacks, owned/shared controllers and unmount/remount.');
  await cli('snapshot');
  await cli('run-code', await readFile(resolve(root, 'scripts/editing-scenario.js'), 'utf8'));
  const editing = await readFile(resolve(output, 'editing-roundtrip.sgf'), 'utf8');
  if (!editing.includes('XX[preserve]') || !editing.includes('AR[') || !editing.includes('LN[') || !editing.includes('AB[ef]')) throw new Error('Extended edits lost in SGF export');
  console.log('Extended editor smoke passed: setup/turn, line/arrow, inherited CSS tokens, SGF round-trip and branch remove/reorder Undo.');
  await cli('snapshot');
  await cli('run-code', await readFile(resolve(root, 'scripts/global-scenario.js'), 'utf8'));
  console.log('Classic browser distribution passed: navigation, editing/Undo and external-controller remount without modules/frameworks.');
  await cli('snapshot');
  await cli('run-code', await readFile(resolve(root, 'scripts/presentation-scenario.js'), 'utf8'));
  console.log('Presentation smoke passed: eight rectangular/cropped transforms, logical mouse input, screen keyboard axes, upright labels and atomic configuration.');
  await cli('snapshot');
  await cli('run-code', await readFile(resolve(root, 'scripts/diagram-scenario.js'), 'utf8'));
  for (const name of ['studio','react','vue','svelte']) {
    const bytes = await readFile(resolve(output,`${name}-diagram.png`));
    if (bytes.toString('hex',0,8) !== '89504e470d0a1a0a') throw new Error(`${name} exported an invalid PNG signature`);
    const svg = await readFile(resolve(output,`${name}-diagram.svg`),'utf8');
    if (!svg.includes('xmlns="http://www.w3.org/2000/svg"') || svg.includes('data-cursor')) throw new Error(`${name} exported invalid/interactive SVG`);
  }
  console.log('Diagram smoke passed: Studio and three adapters export real SVG/PNG; bounded standalone styles, failure and disposal handling preserve SGF dirty state.');
  await cli('snapshot');
  await cli('run-code', await readFile(resolve(root, 'scripts/ink-scenario.js'), 'utf8'));
  console.log('Ink smoke passed: logical drag/touch/keyboard, cancellation, Undo/reopen, SVG/PNG pixels and React/Vue/Svelte propagation.');
  await cli('snapshot');
  await cli('run-code',await readFile(resolve(root,'scripts/touch-scenario.js'),'utf8'));
  console.log('Touch smoke passed: magnification, release/confirmation, logical transforms, callbacks, cancellation and keyboard.');
  await cli('snapshot');
  await cli('run-code',await readFile(resolve(root,'scripts/comparison-scenario.js'),'utf8'));
  console.log('Comparison smoke passed: pinned branches, highlighted differences, exports, generation/deletion handling and lifecycle.');
  await cli('snapshot');
  await shareSmoke();
  console.log('Sharing smoke passed: exact targets, position privacy, clipboard fallback, Export/Discard/Cancel, bounds and native lifecycle.');
  await cli('snapshot');
  const textures=await cli('run-code',await readFile(resolve(root,'scripts/texture-scenario.js'),'utf8'));
  if (!textures.includes('banora-textures-complete: SDK')) throw new Error('Texture scenario did not complete');
  await textureConsumers();
  console.log('Texture smoke passed: normalized files, reusable SVG paints, PNG pixels, bounds, cancellation and local-only resources.');
  await cli('snapshot');
  const animations=await cli('run-code',await readFile(resolve(root,'scripts/animation-scenario.js'),'utf8'));
  if (!animations.includes('banora-animation-sdk-complete')) throw new Error('Animation scenario did not complete');
  console.log('Animation smoke passed: adjacent placement, cancellation, reduced motion, stable redraws and final diagrams.');
  const exported = await readFile(resolve(output, 'browser-roundtrip.sgf'), 'utf8');
  if (!exported.includes('XG[Banora original sample]')) throw new Error('Unknown property lost in browser export');
  console.log('Browser smoke passed: SGF editing/reopen, guards, keyboard, touch, read-only lifecycle, crop, disposal and local-only requests.');
  console.log((await cli('eval', '() => navigator.userAgent')).trim());
  }
} finally {
  try { await cli('close'); } finally { await server.stop(true); }
}
