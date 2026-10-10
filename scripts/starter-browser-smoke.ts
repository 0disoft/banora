import {mkdir, readFile, realpath} from 'node:fs/promises';
import {resolve, sep} from 'node:path';
import {requireScenarioResult} from './scenario-result.js';

export async function smokeStarter(directory: string): Promise<void> {
  const root = resolve(import.meta.dirname, '..');
  const consumer = await realpath(directory);
  const temporary = await realpath(resolve(root, '.tmp'));
  if (!consumer.startsWith(temporary + sep)) throw Error('Browser smoke requires an isolated consumer under .tmp');
  const dist = resolve(consumer, 'dist');
  await readFile(resolve(dist, 'index.html'));
  await mkdir(resolve(root, 'output/playwright'), {recursive: true});
  const session = `banora-starter-${process.pid}`;
  const server = Bun.serve({hostname: '127.0.0.1', port: 0, async fetch(request) {
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {status: 405});
    let pathname: string;
    try {pathname = decodeURIComponent(new URL(request.url).pathname);}
    catch {return new Response('Invalid path', {status: 400});}
    const filePath = resolve(dist, pathname.slice(1) + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!filePath.startsWith(dist + sep)) return new Response('Not found', {status: 404});
    const file = Bun.file(filePath);
    return await file.exists() ? new Response(file, {headers: {'Cache-Control': 'no-store'}}) : new Response('Not found', {status: 404});
  }});
  async function cli(...args: string[]): Promise<string> {
    const child = Bun.spawn([process.execPath, 'run', 'playwright-cli', `-s=${session}`, ...args], {cwd: root, stdout: 'pipe', stderr: 'pipe'});
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    if (code !== 0 || stdout.includes('### Error')) throw Error(`Starter browser command failed:\n${stdout}\n${stderr}`);
    return stdout;
  }
  try {
    await cli('open', `http://127.0.0.1:${server.port}/`);
    await cli('snapshot');
    const result = await cli('run-code', await readFile(resolve(root, 'scripts/starter-scenario.js'), 'utf8'));
    requireScenarioResult(result, 'banora-standalone-complete');
    const exported = await readFile(resolve(root, 'output/playwright/standalone-roundtrip.sgf'), 'utf8');
    for (const value of ['XX[standalone-preserve]', 'Black 日本', 'White <tag>', 'W[df]', 'W[ee]', 'B[aa]', 'My saved continuation']) {
      if (!exported.includes(value)) throw Error(`Standalone export lost ${value}`);
    }
    const guarded = await readFile(resolve(root, 'output/playwright/standalone-guarded.sgf'), 'utf8');
    if (!guarded.includes('Guarded local note') || !guarded.includes('My saved continuation') || !guarded.includes('XX[standalone-preserve]')) {
      throw Error('Save & open lost the outgoing record changes');
    }
    console.log('Standalone production browser passed: file opening, original/new variations, comments, guards, actual download/reopen, invalid input, keyboard and emulated touch.');
  } finally {
    try {await cli('close');} finally {server.stop(true);}
  }
}

if (import.meta.main) {
  if (!process.argv[2]) throw Error('Supply the built standalone consumer directory');
  await smokeStarter(resolve(process.argv[2]));
}
