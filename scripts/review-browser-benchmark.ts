import { build } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve, sep } from 'node:path';
import { cpus, totalmem, release } from 'node:os';
import { syntheticReview } from './performance.js';
import { studioControl } from './studio-control.js';
import { requireScenarioResult } from './scenario-result.js';

// Compare the reviewed production changes, never checkout/reset the live main.
const root = process.cwd();
const quick = process.argv.includes('--quick');
if (process.argv.slice(2).some((arg) => arg !== '--quick')) throw Error('Use optional --quick.');
const run = resolve(root, '.tmp', `review-browser-${Date.now()}`);
await mkdir(run, { recursive: true });
const git = (...args: string[]) => {
  const result = spawnSync('git', args, {
    cwd: root,
    timeout: 10_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) throw Error('Local source snapshot command failed.');
  return result.stdout;
};
const originalHead = git('rev-parse', 'HEAD').toString().trim();
const versions = { before: '6ecd86c', after: '165ce03' };
const source: Record<string, { commit: string; archiveSha256: string }> = {};
const probe = `import { StudioWorkspace } from 'review-workspace';
const refs = [];
const close = StudioWorkspace.prototype.close;
StudioWorkspace.prototype.close = function(id, discard) {
  const board = this.boards.find(b => b.id === id);
  const ref = board && {id, controller: new WeakRef(board.controller), record: new WeakRef(board.controller.getState().record)};
  const result = close.call(this, id, discard);
  if (result && ref) refs.push(ref);
  return result;
};
globalThis.__reviewClosed = () => refs.map(r => ({id:r.id, controller:r.controller.deref() !== undefined, record:r.record.deref() !== undefined}));`;
for (const [name, ref] of Object.entries(versions)) {
  const commit = git('rev-parse', `${ref}^{commit}`).toString().trim();
  const archive = git('archive', '--format=tar', commit);
  source[name] = { commit, archiveSha256: createHash('sha256').update(archive).digest('hex') };
  const directory = resolve(run, 'sources', name);
  await mkdir(directory, { recursive: true });
  const tar = resolve(run, `${name}.tar`);
  await writeFile(tar, archive);
  if (spawnSync('tar', ['-xf', tar, '-C', directory], { timeout: 10_000 }).status !== 0)
    throw Error('Source snapshot extraction failed.');
  await build({
    configFile: false,
    root: resolve(directory, 'examples'),
    base: './',
    logLevel: 'warn',
    resolve: {
      alias: {
        '@0disoft/banora': resolve(directory, 'packages/sdk/src'),
        'review-workspace': resolve(directory, 'examples/studio/workspace.ts'),
      },
    },
    plugins: [
      {
        name: 'isolated-memory-probe',
        resolveId(id) {
          if (id === 'review-memory-probe') return '\0review-memory-probe';
        },
        load(id) {
          if (id === '\0review-memory-probe') return probe;
        },
      },
    ],
    build: {
      outDir: resolve(run, 'sites', name),
      emptyOutDir: true,
      manifest: true,
      rolldownOptions: {
        input: {
          studio: resolve(directory, 'examples/studio/index.html'),
          'memory-probe': 'review-memory-probe',
        },
        output: {
          entryFileNames: (chunk) =>
            chunk.name === 'memory-probe' ? 'memory-probe.js' : 'assets/[name]-[hash].js',
        },
      },
    },
  });
}
function fixture(moves: number, comment: number): string {
  return syntheticReview(moves)
    .replaceAll('C[review note]', '')
    .replace(/;[BW]\[[a-z]*\]/g, (move) => `${move}C[${'x'.repeat(comment)}]`);
}
const sgfs: Record<string, string> = {
  normal: fixture(300, 20),
  large: fixture(5000, 500),
  memory: fixture(5000, 200),
  collection: fixture(300, 20) + fixture(4700, 500),
  small: '(;SZ[19])',
};
const backups: Record<string, string> = {};
for (const [name, moves, different] of [
  ['normal', 300, false],
  ['large', 5000, true],
] as const) {
  const baselineSgf = sgfs[name]!;
  backups[name] = JSON.stringify({
    schemaVersion: 'banora.studio-draft/v1',
    id: 'review-backup',
    filename: 'review.sgf',
    updatedAt: 1,
    revision: 1,
    checkpoint: {
      schemaVersion: 'banora.checkpoint/v1',
      baselineSgf,
      sgf: different ? baselineSgf.replace('Authored benchmark', 'Working benchmark') : baselineSgf,
      selection: { gameIndex: 0, path: Array.from({ length: moves }, () => 0) },
      rules: { suicide: 'forbid', ko: 'simple', passStones: false },
    },
  });
}
const output = resolve(root, 'output/playwright');
await mkdir(output, { recursive: true });
const reportPath = resolve(output, `review-browser-${quick ? 'pilot' : 'comparison'}.json`);
const fixtures: Record<string, string> = Object.fromEntries([
  ...Object.entries(sgfs).map(([k, v]) => [`${k}.sgf`, v] as const),
  ...Object.entries(backups).map(([k, v]) => [`${k}.json`, v] as const),
]);
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    if (!['GET', 'HEAD'].includes(request.method))
      return new Response('Method not allowed', { status: 405 });
    const url = new URL(request.url);
    if (url.pathname === '/progress') {
      const stage = url.searchParams.get('stage');
      if (['memory', 'numbers', 'restore'].includes(stage ?? ''))
        console.log(`Browser phase complete: ${stage}`);
      return new Response('ok');
    }
    if (url.pathname.startsWith('/fixtures/')) {
      const data = fixtures[url.pathname.slice('/fixtures/'.length)];
      return data === undefined ? new Response('Not found', { status: 404 }) : new Response(data);
    }
    const target = resolve(run, 'sites', '.' + decodeURIComponent(url.pathname));
    if (!target.startsWith(resolve(run, 'sites') + sep))
      return new Response('Not found', { status: 404 });
    const file = Bun.file(target);
    return (await file.exists())
      ? new Response(file, { headers: { 'Cache-Control': 'no-store' } })
      : new Response('Not found', { status: 404 });
  },
});
const session = `banora-review-${process.pid}`;
async function cli(...args: string[]) {
  const child = Bun.spawn([process.execPath, 'run', 'playwright-cli', `-s=${session}`, ...args], {
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0 || stdout.includes('### Error'))
    throw Error(`Browser benchmark command failed:\n${stdout}\n${stderr}`);
  return stdout;
}
try {
  const address = `http://127.0.0.1:${server.port}`;
  await cli('open', `${address}/after/studio/index.html`, '--browser', 'chrome');
  await cli('snapshot');
  const scenario = (await readFile(resolve(root, 'scripts/review-browser-scenario.js'), 'utf8'))
    .trimEnd()
    .replace(/;$/, '');
  const config = {
    warmups: quick ? 1 : 2,
    samples: quick ? 2 : 8,
    memorySamples: quick ? 1 : 3,
    output: reportPath.replaceAll('\\', '/'),
    quick,
  };
  const expression = `async (page) => { const studioControl = ${studioControl.toString()}; return (${scenario})(page, studioControl, ${JSON.stringify(config)}); }`;
  requireScenarioResult(await cli('run-code', expression), 'banora-review-comparison-complete');
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  if (
    report.schemaVersion !== 'banora.review-browser-comparison/v1' ||
    report.memory.length !== config.memorySamples * 2 ||
    report.numbers.length !== 4 * 2 * 2 * config.samples ||
    report.restore.length !== 3 * 2 * config.samples
  )
    throw Error('Incomplete browser comparison report.');
  report.source = source;
  report.harness = { commit: originalHead, sha256: {} as Record<string, string> };
  for (const file of [
    'scripts/review-browser-benchmark.ts',
    'scripts/review-browser-scenario.js',
    'scripts/studio-control.ts',
    'scripts/performance.ts',
  ])
    report.harness.sha256[file] = createHash('sha256')
      .update(await readFile(resolve(root, file)))
      .digest('hex');
  report.environment = {
    bun: Bun.version,
    vite: JSON.parse(await readFile(resolve(root, 'node_modules/vite/package.json'), 'utf8'))
      .version,
    lockfileSha256: createHash('sha256')
      .update(await readFile(resolve(root, 'bun.lock')))
      .digest('hex'),
    cpu: cpus()[0]?.model,
    logicalCpus: cpus().length,
    ramBytes: totalmem(),
    os: `${process.platform} ${release()}`,
  };
  report.fixtures = Object.fromEntries(
    Object.entries(fixtures).map(([name, value]) => [
      name,
      { bytes: Buffer.byteLength(value), sha256: createHash('sha256').update(value).digest('hex') },
    ]),
  );
  report.scope =
    'Same production Vite settings and committed sources; SDK source aliases isolate each version. Memory-only close wrapper holds WeakRefs and is not imported for timing. Local authored fixtures, native CPU rate, no disk picker/network latency. No remote operations.';
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  if (git('rev-parse', 'HEAD').toString().trim() !== originalHead)
    throw Error('Checkout HEAD changed during measurement.');
  console.log(`Browser comparison complete: ${reportPath}`);
  console.log(JSON.stringify(report.summary, null, 2));
} finally {
  try {
    await cli('close');
  } finally {
    server.stop(true);
  }
}
