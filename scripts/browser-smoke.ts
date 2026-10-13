import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, sep } from 'node:path';
import { requireScenarioResult, scenarioExpression } from './scenario-result.js';
import { releaseInput } from './release-artifacts.js';
import { syntheticReview } from './performance.js';
import { browserMemory } from './browser-memory.js';
import { browserZoom } from './browser-zoom.js';

const root = process.cwd();
const browserOptions = process.argv.slice(2).filter((arg) => arg.startsWith('--browser'));
const browser = browserOptions[0]?.slice('--browser='.length) ?? 'chrome';
if (
  browserOptions.length > 1 ||
  (browserOptions.length && !browserOptions[0]!.startsWith('--browser=')) ||
  !['chrome', 'msedge', 'firefox', 'webkit'].includes(browser)
)
  throw Error('Use one --browser=chrome|msedge|firefox|webkit option.');
const engine = browser === 'firefox' || browser === 'webkit' ? browser : 'chromium';
if (process.argv.includes('--zoom-only') && browser !== 'chrome')
  throw Error('Native zoom verification requires --browser=chrome.');
if (
  process.argv.some((arg) => ['--performance-only', '--memory-only'].includes(arg)) &&
  engine !== 'chromium'
)
  throw Error('Browser measurement requires a Chromium engine for CDP measurements.');
const release = await releaseInput();
const output = resolve(root, 'output/playwright');
await mkdir(output, { recursive: true });
const session = `banora-smoke-${process.pid}`;
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    if (!['GET', 'HEAD'].includes(request.method))
      return new Response('Method not allowed', { status: 405 });
    const pathname = decodeURIComponent(new URL(request.url).pathname);
    const stress = /^\/performance\/(300|5000)\.sgf$/.exec(pathname);
    if (
      stress &&
      process.argv.some((arg) => ['--performance-only', '--memory-only'].includes(arg))
    ) {
      const moves = Number(stress[1]);
      return new Response(
        syntheticReview(moves).replace(
          'XG[Authored benchmark]',
          `XG[Authored benchmark]GN[Browser review ${moves}]`,
        ),
        { headers: { 'Content-Type': 'application/x-go-sgf' } },
      );
    }
    const sdk = pathname.startsWith('/sdk/');
    const directory = release
      ? resolve(release, sdk ? 'browser-sdk' : 'examples')
      : resolve(root, sdk ? 'packages/sdk/dist' : 'dist/examples');
    const relative = sdk ? pathname.slice(5) : pathname.slice(1);
    const path = resolve(directory, relative + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!path.startsWith(directory + sep)) return new Response('Not found', { status: 404 });
    const file = Bun.file(path);
    if (!(await file.exists())) return new Response('Not found', { status: 404 });
    return new Response(file, { headers: { 'Cache-Control': 'no-store' } });
  },
});
async function cli(...args: string[]): Promise<string> {
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
    throw new Error(`Browser command failed:\n${stdout}\n${stderr}`);
  return stdout;
}
async function scenario(file: string, expected: string): Promise<void> {
  const result = await cli(
    'run-code',
    scenarioExpression(await readFile(resolve(root, `scripts/${file}-scenario.js`), 'utf8')),
  );
  requireScenarioResult(result, expected);
}
async function browserPerformance(): Promise<void> {
  if (release) throw Error('Browser performance measures the current built checkout only.');
  const sourceHashes = async () => {
    const hashes: Record<string, string> = {};
    for (const name of ['packages/sdk/src/controller.ts', 'examples/studio/main.ts'])
      hashes[name] = createHash('sha256')
        .update(await readFile(resolve(root, name)))
        .digest('hex');
    return hashes;
  };
  const hashes = await sourceHashes();
  await scenario('browser-performance', 'banora-browser-performance-complete');
  if (JSON.stringify(hashes) !== JSON.stringify(await sourceHashes()))
    throw Error('Browser benchmark source changed during measurement. Rebuild and rerun.');
  const measured = JSON.parse(
    await readFile(resolve(output, 'browser-performance-samples.json'), 'utf8'),
  );
  if (measured.workloads?.length !== 4 || measured.samples !== 5 || measured.warmups !== 1)
    throw Error('Incomplete browser performance report.');
  const dimensions = new Set<string>();
  for (const workload of measured.workloads) {
    const key = `${workload.moves}/${workload.cpuRate}`;
    if (
      ![300, 5000].includes(workload.moves) ||
      ![1, 4].includes(workload.cpuRate) ||
      dimensions.has(key) ||
      workload.samples?.length !== 5
    )
      throw Error('Invalid browser performance workload.');
    dimensions.add(key);
    for (const sample of workload.samples)
      for (const value of Object.values(sample))
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
          throw Error('Invalid browser performance sample.');
  }
  const git = (args: string[]) => {
    const result = spawnSync('git', args, { encoding: 'utf8', timeout: 5000 });
    if (result.status !== 0) throw Error('Cannot identify browser benchmark source.');
    return result.stdout.trim();
  };
  const report = {
    schemaVersion: 'banora.browser-performance/v1',
    source: { commit: git(['rev-parse', 'HEAD']), dirty: !!git(['status', '--porcelain']), hashes },
    runtime: { platform: process.platform, arch: process.arch },
    method: {
      timing:
        'Native file change to rendered record heading plus two animation frames; navigation DOM click through two animation frames. Driver polling excluded.',
      memory:
        'Chromium JSHeapUsedSize snapshots before import, after import and after navigation; DOM counter after navigation. Not peak memory or retained memory after disposal.',
      limits:
        'Fresh contexts, one warmup and five samples per workload/profile. CPU rate 4 is emulation, not a physical low-spec device. Frame availability is not physical display latency. No timing pass/fail threshold.',
      autosave: false,
    },
    ...measured,
  };
  await writeFile(
    resolve(output, 'browser-performance.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    'Browser performance measured: 4 workload/profile pairs, 20 samples; report in output/playwright/browser-performance.json.',
  );
}
async function treeNavigation(): Promise<void> {
  await scenario('tree-navigation', 'banora-tree-navigation-complete');
  const saved = await readFile(resolve(output, 'tree-reused.sgf'), 'utf8');
  for (const value of [
    'XG[tree reuse]',
    'C[tail original]',
    'MN[700]',
    'GN[Second]',
    'C[second comment]',
  ])
    if (!saved.includes(value)) throw Error('Tree navigation/export lost authored record content.');
}
async function dropSmoke(): Promise<void> {
  await scenario('drop', 'banora-drop-complete');
  const saved = await readFile(resolve(output, 'drop-preserved.sgf'), 'utf8');
  for (const value of [
    'CA[UTF-8]',
    'HA[2]',
    'KM[6.5]',
    'XX[drop-preserve]',
    'Unsaved drop note',
    'Black & 日本',
    'LB[ee:A]',
  ]) {
    if (!saved.includes(value)) throw new Error(`Dropped SGF export lost ${value}`);
  }
}
async function scoringSmoke(): Promise<void> {
  await scenario('scoring', 'banora-scoring-complete');
  const before = await readFile(resolve(output, 'scoring-before.sgf'), 'utf8');
  const after = await readFile(resolve(output, 'scoring-after.sgf'), 'utf8');
  if (before !== after || !after.includes('XX[score-preserve]'))
    throw new Error('Scoring changed the exported source record');
}
async function puzzleSmoke(): Promise<void> {
  await scenario('puzzle', 'banora-puzzle-complete');
  const diagram = await readFile(resolve(output, 'puzzle.svg'), 'utf8');
  if (
    !diagram.includes('xmlns="http://www.w3.org/2000/svg"') ||
    diagram.includes('data-cursor') ||
    (diagram.match(/data-stone=/g) ?? []).length !== 6
  )
    throw new Error('Puzzle diagram lost final stones or retained interactive cursor');
}
async function analysisSmoke(): Promise<void> {
  await scenario('analysis', 'banora-analysis-complete');
  const before = await readFile(resolve(output, 'analysis-before.sgf'), 'utf8'),
    after = await readFile(resolve(output, 'analysis-after.sgf'), 'utf8');
  if (before !== after || !after.includes('XX[analysis-preserve]'))
    throw Error('Analysis preview changed the exported source SGF');
  const diagram = await readFile(resolve(output, 'analysis.svg'), 'utf8');
  if (
    (diagram.match(/data-stone=/g) ?? []).length !== 6 ||
    diagram.includes('data-analysis-') ||
    diagram.includes('data-cursor')
  )
    throw Error('Analysis diagram lost PV stones or retained prediction/cursor overlays');
}
async function shareSmoke(): Promise<void> {
  await scenario('share', 'banora-sharing-complete: studio react vue svelte');
  for (const name of ['studio', 'react', 'vue', 'svelte']) {
    const saved = await readFile(resolve(output, `${name}-share-before-open.sgf`), 'utf8');
    if (
      !saved.includes('unsaved sharing note') ||
      !saved.includes('XX[keep]') ||
      !saved.includes('BPN[')
    )
      throw new Error(`${name} share guard export lost record content`);
  }
}
async function textureConsumers(): Promise<void> {
  await scenario('texture-consumer', 'banora-texture-consumers-complete: studio react vue svelte');
  for (const name of ['studio', 'react', 'vue', 'svelte']) {
    const png = await readFile(resolve(output, `${name}-texture.png`));
    const svg = await readFile(resolve(output, `${name}-texture.svg`), 'utf8');
    if (
      png.toString('hex', 0, 8) !== '89504e470d0a1a0a' ||
      (svg.match(/<image /g) ?? []).length !== 2 ||
      !svg.includes('data-texture="black"')
    )
      throw new Error(`${name} lost texture diagram assets`);
  }
}
async function animationConsumers(): Promise<void> {
  await scenario(
    'animation-consumer',
    'banora-animation-consumers-complete: studio react vue svelte',
  );
  for (const name of ['studio', 'react', 'vue', 'svelte']) {
    const png = await readFile(resolve(output, `${name}-animation.png`));
    const svg = await readFile(resolve(output, `${name}-animation.svg`), 'utf8');
    if (
      png.toString('hex', 0, 8) !== '89504e470d0a1a0a' ||
      svg.includes('data-placement-animation') ||
      svg.includes('<animate')
    )
      throw new Error(`${name} diagram retained transient motion`);
  }
}
async function controlledConsumers(): Promise<void> {
  await scenario(
    'controlled-consumer',
    'banora-controlled-consumers-complete: vanilla react vue svelte',
  );
  for (const name of ['vanilla', 'react', 'vue', 'svelte']) {
    const png = await readFile(resolve(output, `controlled-${name}.png`));
    const svg = await readFile(resolve(output, `controlled-${name}.svg`), 'utf8');
    if (
      png.toString('hex', 0, 8) !== '89504e470d0a1a0a' ||
      !svg.includes('xmlns="http://www.w3.org/2000/svg"') ||
      svg.includes('data-cursor') ||
      (svg.match(/data-stone=/g) ?? []).length !== 3
    )
      throw new Error(
        `${name} controlled diagram lost accepted host stones or retained interaction`,
      );
  }
}
async function localeSmoke(): Promise<void> {
  await scenario('locale', 'banora-locale-complete');
  const passes = await readFile(resolve(output, 'localized-pass-preserved.sgf'), 'utf8');
  for (const value of ['XX[pass-locale]', 'B[]', 'W[tt]', 'MN[9]'])
    if (!passes.includes(value)) throw Error('Localized pass export lost authored move data');
  if (passes.includes('KM[')) throw Error('Missing komi presentation inserted an authored value');
  const sgf = await readFile(resolve(output, 'localized-preserved.sgf'), 'utf8');
  if (
    !sgf.includes('Authored English <tag> note') ||
    !sgf.includes('GN[Opening study]') ||
    !sgf.includes('PB[Black]')
  )
    throw Error('Localized export changed authored content');
}
async function playbackSmoke(): Promise<void> {
  await scenario('playback', 'banora-playback-complete: studio viewer react vue svelte browser');
  const sgf = await readFile(resolve(output, 'playback-preserved.sgf'), 'utf8');
  if (
    !sgf.includes('XX[retain]') ||
    !sgf.includes('0.47 0.53 -0.5 v=1015') ||
    (sgf.match(/;[BW]\[/g) ?? []).length !== 162
  )
    throw new Error('Timed playback changed the original SGF or recorded moves');
}
async function recoverySmoke(): Promise<void> {
  await scenario('recovery', 'banora-recovery-complete');
  const backup = JSON.parse(await readFile(resolve(output, 'recovery.banora.json'), 'utf8'));
  const denied = JSON.parse(await readFile(resolve(output, 'recovery-denied.banora.json'), 'utf8'));
  const future = JSON.parse(await readFile(resolve(output, 'recovery-future.banora.json'), 'utf8'));
  if (future.schemaVersion !== 'banora.studio-draft/v2')
    throw Error('Unknown draft backup was silently migrated or lost');
  const before = await readFile(resolve(output, 'recovery-before-restore.sgf'), 'utf8');
  const after = await readFile(resolve(output, 'recovery-reopened.sgf'), 'utf8');
  if (
    !backup.checkpoint.sgf.includes('unfinished 한국어 <tag>') ||
    !backup.checkpoint.baselineSgf.includes('C[original]') ||
    !denied.checkpoint.sgf.includes('denied but editable') ||
    !before.includes('C[before restore]') ||
    !after.includes('XX[keep]') ||
    !after.includes('unfinished 한국어 <tag>')
  )
    throw Error('Recovery backup/export downloads lost authored content or baseline');
}
async function preferencesSmoke(): Promise<void> {
  await scenario('preferences', 'banora-preferences-complete');
  const before = JSON.parse(
    await readFile(resolve(output, 'preferences-before.banora.json'), 'utf8'),
  );
  const after = JSON.parse(
    await readFile(resolve(output, 'preferences-after.banora.json'), 'utf8'),
  );
  if (
    JSON.stringify(before.checkpoint) !== JSON.stringify(after.checkpoint) ||
    before.filename !== after.filename ||
    !before.checkpoint?.sgf.includes('Preference reset keeps this 한국어 note')
  )
    throw Error('Settings reset changed the actual downloaded checkpoint');
}
async function searchSmoke() {
  await scenario('search', 'banora-search-complete');
  const sgf = await readFile(resolve(output, 'search-edited.sgf'), 'utf8');
  if (
    !sgf.includes('XX[keep]') ||
    !sgf.includes('MN[700]') ||
    (sgf.match(/C\[Edited <img> 한국어\]/g) ?? []).length !== 4
  )
    throw Error('Search batch SGF export lost content');
}
async function editingSmoke(): Promise<void> {
  await scenario('editing', 'banora-editing-complete');
  const editing = await readFile(resolve(output, 'editing-roundtrip.sgf'), 'utf8');
  if (
    !editing.includes('XX[preserve]') ||
    !editing.includes('AR[') ||
    !editing.includes('LN[') ||
    !editing.includes('AB[ef]')
  )
    throw new Error('Extended edits lost in SGF export');
}
async function diagramSmoke(): Promise<void> {
  await scenario('diagram', 'banora-diagrams-complete');
  for (const name of ['studio', 'react', 'vue', 'svelte']) {
    const bytes = await readFile(resolve(output, `${name}-diagram.png`));
    if (bytes.toString('hex', 0, 8) !== '89504e470d0a1a0a')
      throw new Error(`${name} exported an invalid PNG signature`);
    const svg = await readFile(resolve(output, `${name}-diagram.svg`), 'utf8');
    if (!svg.includes('xmlns="http://www.w3.org/2000/svg"') || svg.includes('data-cursor'))
      throw new Error(`${name} exported invalid/interactive SVG`);
  }
}
async function desktopSmoke(address: string): Promise<void> {
  // Preserve each scenario and its artifact assertions; CDP input scopes stay in full smoke.
  const checks: readonly [string, () => Promise<void>][] = [
    ['workspace', () => scenario('workspace', 'banora-workspace-complete')],
    ['sound', () => scenario('sound', 'banora-sound-complete')],
    ['sizing', () => scenario('sizing', 'banora-sizing-complete')],
    ['accessibility', () => scenario('accessibility', 'banora-accessibility-complete')],
    ['tree', treeNavigation],
    ['support', supportSmoke],
    ['search', searchSmoke],
    ['preferences', preferencesSmoke],
    ['recovery', recoverySmoke],
    ['locale', localeSmoke],
    ['playback', playbackSmoke],
    ['controlled', () => scenario('controlled', 'banora-controlled-complete')],
    ['drop', dropSmoke],
    ['rules', () => scenario('rules', 'banora-rules-complete')],
    ['frameworks', () => scenario('framework', 'banora-frameworks-complete')],
    ['editing', editingSmoke],
    ['classic', () => scenario('global', 'banora-global-complete')],
    ['presentation', () => scenario('presentation', 'banora-presentation-complete')],
    ['diagrams', diagramSmoke],
    ['scoring', scoringSmoke],
    ['puzzle', puzzleSmoke],
    ['analysis', analysisSmoke],
    ['sharing', shareSmoke],
    ['texture-consumers', textureConsumers],
    ['animation-consumers', animationConsumers],
  ];
  for (const [name, run] of checks) {
    await cli('goto', `${address}/studio/`);
    await cli(
      'run-code',
      'async (page) => { await page.locator("#language").selectOption("en"); return "english-fixture"; }',
    );
    await run();
    console.log(`Desktop ${name} passed.`);
  }
  console.log(`Desktop browser smoke passed: ${checks.length} scopes on ${engine}.`);
}
async function supportSmoke() {
  await scenario('support', 'banora-support-complete');
  const json = await readFile(resolve(output, 'support-diagnostics.json'), 'utf8');
  const report = JSON.parse(json);
  if (
    report.schemaVersion !== 'banora.diagnostics/v1' ||
    !report.events.some(
      (event: { failure?: { code: string } }) => event.failure?.code === 'property',
    ) ||
    json.includes('Private')
  )
    throw Error('Downloaded support diagnostics failed validation');
}
try {
  const address = `http://127.0.0.1:${server.port}`;
  if (!process.argv.includes('--zoom-only')) {
    await cli('open', `${address}/studio/`, '--browser', browser);
    requireScenarioResult(
      await cli(
        'run-code',
        `async (page) => { if (page.context().browser().browserType().name() !== '${engine}') throw Error('Unexpected browser engine'); return 'banora-engine-${engine}'; }`,
      ),
      `banora-engine-${engine}`,
    );
    console.log(`Browser engine: ${engine} (${browser})`);
    console.log((await cli('eval', '() => navigator.userAgent')).trim());
    // Capture actual UI references before interacting; scenario uses public roles
    // and selectors, never private SDK/controller hooks.
    await cli('snapshot');
    // Pin English for existing role-based fixtures; Studio itself follows host preferences.
    await cli(
      'run-code',
      'async (page) => { await page.locator("#language").selectOption("en"); return "english-fixture"; }',
    );
  }
  if (process.argv.includes('--zoom-only')) {
    if (release) throw Error('Native zoom verification uses the current built checkout only.');
    await browserZoom(root, address);
  } else if (process.argv.includes('--memory-only')) {
    if (release) throw Error('Browser memory measures the current built checkout only.');
    await browserMemory(root, () => scenario('browser-memory', 'banora-browser-memory-complete'));
  } else if (process.argv.includes('--performance-only')) {
    await browserPerformance();
  } else if (process.argv.includes('--desktop-only')) {
    await desktopSmoke(address);
  } else if (process.argv.includes('--sizing-only')) {
    await scenario('sizing', 'banora-sizing-complete');
    if (
      (await readFile(resolve(output, 'resize-before.sgf'), 'utf8')) !==
      (await readFile(resolve(output, 'resize-after.sgf'), 'utf8'))
    )
      throw Error('Resizing changed the exported SGF');
    console.log(
      'Focused sizing smoke passed: vertical controls, visible presets, four corners, keyboard/cancel, exports and responsive layout.',
    );
  } else if (process.argv.includes('--sound-only')) {
    await scenario('sound', 'banora-sound-complete');
    console.log(
      'Focused sound smoke passed: actual native audio, mute, replay, silent history/tabs/imports, locales and preferences.',
    );
  } else if (process.argv.includes('--workspace-only')) {
    await scenario('workspace', 'banora-workspace-complete');
    const first = await readFile(resolve(output, 'workspace-first.sgf'), 'utf8');
    const second = await readFile(resolve(output, 'workspace-second.sgf'), 'utf8');
    if (
      !first.includes('SZ[19]') ||
      !first.includes('First board note') ||
      !second.includes('SZ[13]') ||
      !second.includes('Second board note')
    )
      throw Error('Workspace export lost independent content');
    console.log(
      'Focused workspace smoke passed: default size, tabs, independent history, close/export guards, playback, locales and narrow layouts.',
    );
  } else if (process.argv.includes('--tree-only')) {
    await treeNavigation();
    console.log(
      'Focused variation tree smoke passed: keyboard focus, bounded tail rows, game/record/language changes, comment Undo and export/reopen.',
    );
  } else if (process.argv.includes('--accessibility-only')) {
    await scenario('accessibility', 'banora-accessibility-complete');
    console.log(
      'Focused accessibility smoke passed: localized guard names, modal keyboard/cancel, narrow layouts and three framework sharing consumers.',
    );
  } else if (process.argv.includes('--support-only')) {
    await supportSmoke();
    console.log(
      'Focused support smoke passed: consent/privacy, actual operation evidence/download, clear/reload, discovery, locale/mobile/menu and no remote requests.',
    );
  } else if (process.argv.includes('--search-only')) {
    await searchSmoke();
    console.log(
      'Focused search smoke passed: all games/branches, paging, long paths, preview/apply/Undo, freshness, bounds and locale/mobile/menu.',
    );
  } else if (process.argv.includes('--preferences-only')) {
    await preferencesSmoke();
    console.log(
      'Focused preferences smoke passed: migration, presentation, reset, record/draft retention, tabs, versions and denied storage.',
    );
  } else if (process.argv.includes('--recovery-only')) {
    await recoverySmoke();
    console.log(
      'Focused recovery smoke passed: real IndexedDB, reload, two tabs, quotas/cap, backups, guards, deletion and locale/mobile controls.',
    );
  } else if (process.argv.includes('--locale-only')) {
    await localeSmoke();
    console.log('Focused UI localization smoke passed.');
  } else if (process.argv.includes('--playback-only')) {
    await playbackSmoke();
    console.log(
      'Playback smoke passed: speed/pause/end, keyboard guards, import, SGF preservation and six consumer lifecycles.',
    );
  } else if (process.argv.includes('--controlled-only')) {
    await scenario('controlled', 'banora-controlled-complete');
    await controlledConsumers();
    console.log(
      'Focused controlled-board smoke passed: common surface, four native consumers, host decisions, lifecycle, diagrams and touch confirmation.',
    );
  } else if (process.argv.includes('--analysis-only')) {
    await analysisSmoke();
    console.log(
      'Focused analysis smoke passed: candidate metrics/PVs/ownership, keyboard/touch, exact freshness, manual JSON, source preservation and lifecycle.',
    );
  } else if (process.argv.includes('--puzzle-only')) {
    await puzzleSmoke();
    console.log(
      'Focused puzzle smoke passed: authored answers/responses, hints, keyboard/touch, diagrams and owned/borrowed lifecycle.',
    );
  } else if (process.argv.includes('--menu-only')) {
    await scenario('menu', 'banora-menu-complete');
    console.log(
      'Focused board menu smoke passed: control restoration, keyboard, shared Undo, scoring session and mobile zoom.',
    );
  } else if (process.argv.includes('--scoring-only')) {
    await scoringSmoke();
    console.log(
      'Focused scoring smoke passed: groups, counting presets, adjustments, touch, lifecycle and unchanged SGF.',
    );
  } else if (process.argv.includes('--rules-only')) {
    await scenario('rules', 'banora-rules-complete');
    console.log('Focused repetition rules smoke passed.');
  } else if (process.argv.includes('--drop-only')) {
    await dropSmoke();
    console.log('Focused file-drop smoke passed.');
  } else if (process.argv.includes('--animation-only')) {
    await scenario('animation', 'banora-animation-sdk-complete');
    await animationConsumers();
    console.log('Focused animation smoke passed.');
  } else if (process.argv.includes('--texture-only')) {
    await scenario('texture', 'banora-textures-complete: SDK');
    await textureConsumers();
    console.log('Focused texture smoke passed.');
  } else if (process.argv.includes('--share-only')) {
    await shareSmoke();
    await scenario('accessibility', 'banora-accessibility-complete');
    console.log('Focused share smoke passed.');
  } else if (process.argv.includes('--touch-only')) {
    await scenario('touch', 'banora-touch-complete');
    console.log('Focused touch smoke passed.');
  } else if (process.argv.includes('--comparison-only')) {
    await scenario('comparison', 'banora-comparison-complete');
    console.log('Focused comparison smoke passed.');
  } else {
    await scenario('workspace', 'banora-workspace-complete');
    await scenario('sound', 'banora-sound-complete');
    await scenario('sizing', 'banora-sizing-complete');
    await scenario('accessibility', 'banora-accessibility-complete');
    await treeNavigation();
    await supportSmoke();
    await searchSmoke();
    await preferencesSmoke();
    await recoverySmoke();
    await cli('goto', `${address}/studio/`);
    await localeSmoke();
    await scenario('menu', 'banora-menu-complete');
    await playbackSmoke();
    await scenario('controlled', 'banora-controlled-complete');
    await controlledConsumers();
    await cli('goto', `${address}/studio/`);
    console.log(
      'Controlled-board smoke passed: external state, immutable intentions, masks/overlays, transforms, diagrams and lifecycle.',
    );
    await scenario('browser', 'banora-browser-complete');
    await dropSmoke();
    console.log(
      'File-drop smoke passed: metadata/setup, branch selection, guards, encoding failures and actual export/reopen.',
    );
    await scenario('rules', 'banora-rules-complete');
    console.log(
      'Repetition rules smoke passed: mounted legal/rejected moves, announcements, setup epochs, recorded navigation and controller disposal.',
    );
    await cli('snapshot');
    await scenario('framework', 'banora-frameworks-complete');
    console.log(
      'Framework browser smoke passed: React Strict Mode, Vue refs, Svelte updates, callbacks, owned/shared controllers and unmount/remount.',
    );
    await cli('snapshot');
    await editingSmoke();
    console.log(
      'Extended editor smoke passed: setup/turn, line/arrow, inherited CSS tokens, SGF round-trip and branch remove/reorder Undo.',
    );
    await cli('snapshot');
    await scenario('global', 'banora-global-complete');
    console.log(
      'Classic browser distribution passed: navigation, editing/Undo and external-controller remount without modules/frameworks.',
    );
    await cli('snapshot');
    await scenario('presentation', 'banora-presentation-complete');
    console.log(
      'Presentation smoke passed: eight rectangular/cropped transforms, logical mouse input, screen keyboard axes, upright labels and atomic configuration.',
    );
    await cli('snapshot');
    await diagramSmoke();
    console.log(
      'Diagram smoke passed: Studio and three adapters export real SVG/PNG; bounded standalone styles, failure and disposal handling preserve SGF dirty state.',
    );
    await cli('snapshot');
    await scenario('ink', 'banora-ink-complete');
    console.log(
      'Ink smoke passed: logical drag/touch/keyboard, cancellation, Undo/reopen, SVG/PNG pixels and React/Vue/Svelte propagation.',
    );
    await cli('snapshot');
    await scenario('touch', 'banora-touch-complete');
    console.log(
      'Touch smoke passed: magnification, release/confirmation, logical transforms, callbacks, cancellation and keyboard.',
    );
    await cli('snapshot');
    await scenario('comparison', 'banora-comparison-complete');
    console.log(
      'Comparison smoke passed: pinned branches, highlighted differences, exports, generation/deletion handling and lifecycle.',
    );
    await cli('snapshot');
    await shareSmoke();
    console.log(
      'Sharing smoke passed: exact targets, position privacy, clipboard fallback, Export/Discard/Cancel, bounds and native lifecycle.',
    );
    await cli('snapshot');
    await scenario('texture', 'banora-textures-complete: SDK');
    await textureConsumers();
    console.log(
      'Texture smoke passed: normalized files, reusable SVG paints, PNG pixels, bounds, cancellation and local-only resources.',
    );
    await cli('snapshot');
    await scenario('animation', 'banora-animation-sdk-complete');
    await animationConsumers();
    console.log(
      'Animation smoke passed: adjacent placement, cancellation, reduced motion, stable redraws and final diagrams.',
    );
    await cli('snapshot');
    await scoringSmoke();
    console.log(
      'Scoring smoke passed: groups, counting presets, adjustments, touch, lifecycle and unchanged SGF.',
    );
    await cli('snapshot');
    await puzzleSmoke();
    console.log(
      'Puzzle smoke passed: authored answers/responses, hints, keyboard/touch, diagrams and owned/borrowed lifecycle.',
    );
    await analysisSmoke();
    console.log(
      'Analysis smoke passed: candidate metrics/PVs/ownership, exact freshness, manual JSON, source preservation and lifecycle.',
    );
    const exported = await readFile(resolve(output, 'browser-roundtrip.sgf'), 'utf8');
    if (!exported.includes('XG[Banora original sample]'))
      throw new Error('Unknown property lost in browser export');
    console.log(
      'Browser smoke passed: SGF editing/reopen, guards, keyboard, touch, read-only lifecycle, crop, disposal and local-only requests.',
    );
  }
} finally {
  try {
    if (!process.argv.includes('--zoom-only')) await cli('close');
  } finally {
    await server.stop(true);
  }
}
