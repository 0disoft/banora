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
try {
  const address = `http://127.0.0.1:${server.port}`;
  await cli('open', `${address}/studio/`);
  // Capture actual UI references before interacting; scenario uses public roles
  // and selectors, never private SDK/controller hooks.
  await cli('snapshot');
  const scenario = await readFile(resolve(root, 'scripts/browser-scenario.js'), 'utf8');
  await cli('run-code', scenario);
  const exported = await readFile(resolve(output, 'browser-roundtrip.sgf'), 'utf8');
  if (!exported.includes('XG[Banora original sample]')) throw new Error('Unknown property lost in browser export');
  console.log('Browser smoke passed: SGF editing/reopen, guards, keyboard, touch, read-only lifecycle, crop, disposal and local-only requests.');
  console.log((await cli('eval', '() => navigator.userAgent')).trim());
} finally {
  try { await cli('close'); } finally { await server.stop(true); }
}
