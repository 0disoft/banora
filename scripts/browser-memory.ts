import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

interface MemorySample {
  heapBytes: number;
  documents: number;
  nodes: number;
  listeners: number;
  controllers?: number;
}
interface MemoryReport {
  browserVersion: string;
  viewport: { width: number; height: number };
  warmups: number;
  iterations: number;
  cases: {
    id: string;
    baseline: MemorySample;
    samples: { iteration: number; active: MemorySample; released: MemorySample }[];
  }[];
}
const caseIds = [
  'framework/react',
  'framework/vue',
  'framework/svelte',
  ...[300, 5000].flatMap((moves) => [
    `viewer/owned/${moves}`,
    `viewer/borrowed/${moves}`,
    `studio/${moves}`,
  ]),
];

/** Refuse partial/stale or invalid metrics before publishing benchmark evidence. */
export function validateMemoryReport(value: unknown): MemoryReport {
  const report = value as MemoryReport;
  const fail = () => {
    throw Error('Incomplete or invalid browser memory report.');
  };
  if (
    !report ||
    typeof report.browserVersion !== 'string' ||
    !report.browserVersion ||
    report.viewport?.width !== 1280 ||
    report.viewport?.height !== 900 ||
    report.warmups !== 3 ||
    report.iterations !== 15 ||
    !Array.isArray(report.cases) ||
    report.cases.length !== caseIds.length
  )
    fail();
  const remaining = new Set(caseIds);
  const metrics = (sample: MemorySample) => {
    if (
      !sample ||
      !Number.isFinite(sample.heapBytes) ||
      sample.heapBytes <= 0 ||
      ![sample.documents, sample.nodes, sample.listeners].every(
        (n) => Number.isSafeInteger(n) && n >= 0,
      ) ||
      sample.documents < 1 ||
      sample.nodes < 1
    )
      fail();
  };
  for (const item of report.cases) {
    if (
      !item ||
      !remaining.delete(item.id) ||
      !Array.isArray(item.samples) ||
      item.samples.length !== 15
    )
      fail();
    metrics(item.baseline);
    for (const [index, sample] of item.samples.entries()) {
      if (!sample || sample.iteration !== index + 1) fail();
      metrics(sample.active);
      metrics(sample.released);
    }
    if (item.id.startsWith('viewer/')) {
      const released = item.id.includes('/borrowed/') ? 2 : 1;
      if (
        item.baseline.controllers !== released ||
        item.samples.some(
          (sample) => sample.active.controllers !== 2 || sample.released.controllers !== released,
        )
      )
        fail();
    }
  }
  return report;
}
const git = (root: string, args: string[]) => {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 5000 });
  if (result.status !== 0) throw Error('Cannot identify browser memory source.');
  return result.stdout.trim();
};
async function fingerprints(root: string) {
  const source = git(root, [
    'ls-files',
    '-z',
    '--',
    'packages/sdk/src',
    'packages/react/src',
    'packages/vue/src',
    'packages/svelte/src',
    'examples',
    'scripts/browser-memory-scenario.js',
  ]);
  const sourcePaths = source.split('\0').filter(Boolean).sort();
  // Include a newly authored uncommitted scenario in exploratory runs too.
  if (!sourcePaths.includes('scripts/browser-memory-scenario.js'))
    sourcePaths.push('scripts/browser-memory-scenario.js');
  const artifacts: string[] = [];
  const walk = async (directory: string) => {
    for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw Error('Browser memory artifacts must not be links.');
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) artifacts.push(path);
    }
  };
  await walk('dist/examples');
  const digest = async (paths: string[]) => {
    const hash = createHash('sha256');
    for (const path of paths.sort()) {
      hash.update(path + '\0');
      const bytes = await readFile(resolve(root, path));
      hash.update(String(bytes.length) + '\0');
      hash.update(bytes);
    }
    return hash.digest('hex');
  };
  return { sourceSha256: await digest(sourcePaths), productionSha256: await digest(artifacts) };
}
export async function browserMemory(root: string, run: () => Promise<void>): Promise<void> {
  const source = {
    commit: git(root, ['rev-parse', 'HEAD']),
    dirty: !!git(root, ['status', '--porcelain']),
    ...(await fingerprints(root)),
  };
  await run();
  if (
    source.commit !== git(root, ['rev-parse', 'HEAD']) ||
    JSON.stringify({
      sourceSha256: source.sourceSha256,
      productionSha256: source.productionSha256,
    }) !== JSON.stringify(await fingerprints(root))
  )
    throw Error('Browser memory source/artifacts changed during measurement. Rebuild and rerun.');
  const measured = validateMemoryReport(
    JSON.parse(
      await readFile(resolve(root, 'output/playwright/browser-memory-samples.json'), 'utf8'),
    ),
  );
  const report = {
    schemaVersion: 'banora.browser-memory/v1',
    source,
    runtime: { platform: process.platform, arch: process.arch },
    method: {
      memory:
        'Two HeapProfiler.collectGarbage calls after two animation frames at baseline, active and released phases; Performance JSHeapUsedSize and Memory DOM documents/nodes/listener counters. Classic Viewer cases also query public RecordController prototype instance counts and immediately release all debugger references.',
      limits:
        'Three warmup cycles, fifteen measured cycles per fresh case context. Forced collection changes normal scheduling. Active snapshots are not allocation peaks; retained heap includes browser/framework/host caches and instrumentation. No universal leak-free, device, RSS, GPU or timing guarantee and no byte/timing threshold.',
      autosave: false,
      budgets: 'UNDECIDED',
    },
    ...measured,
  };
  await writeFile(
    resolve(root, 'output/playwright/browser-memory.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    'Browser memory measured: 9 lifecycle cases, 135 cycles; report in output/playwright/browser-memory.json.',
  );
}
