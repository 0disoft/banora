import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { requireScenarioResult, scenarioExpression } from './scenario-result.js';

/** Native Chrome page zoom in fresh, exclusively owned profiles; no device emulation. */
export async function browserZoom(root: string, address: string): Promise<void> {
  const git = (args: string[]) => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 5000 });
    if (result.status !== 0) throw Error('Cannot identify zoom evidence source.');
    return result.stdout.trim();
  };
  const fingerprints = async () => {
    const sourcePaths = git([
      'ls-files',
      '-z',
      '--',
      'packages/sdk/src',
      'packages/react/src',
      'packages/vue/src',
      'packages/svelte/src',
      'examples',
    ])
      .split('\0')
      .filter(Boolean);
    sourcePaths.push('scripts/browser-zoom.ts', 'scripts/zoom-scenario.js');
    const artifactPaths: string[] = [];
    const walk = async (directory: string) => {
      for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
        if (entry.isSymbolicLink()) throw Error('Zoom artifacts must not be links.');
        const path = `${directory}/${entry.name}`;
        if (entry.isDirectory()) await walk(path);
        else if (entry.isFile()) artifactPaths.push(path);
      }
    };
    await walk('dist/examples');
    await walk('packages/sdk/dist');
    const digest = async (paths: string[]) => {
      const hash = createHash('sha256');
      for (const path of paths.sort()) {
        const bytes = await readFile(resolve(root, path));
        hash.update(path + '\0' + bytes.length + '\0');
        hash.update(bytes);
      }
      return hash.digest('hex');
    };
    return {
      sourceSha256: await digest(sourcePaths),
      productionSha256: await digest(artifactPaths),
    };
  };
  const identity = {
    commit: git(['rev-parse', 'HEAD']),
    dirty: !!git(['status', '--porcelain']),
    ...(await fingerprints()),
  };
  await mkdir(resolve(root, '.tmp'), { recursive: true });
  const temporary = await mkdtemp(resolve(root, '.tmp/browser-zoom-'));
  const source = await readFile(resolve(root, 'scripts/zoom-scenario.js'), 'utf8');
  const samples: Record<string, number | string>[] = [];
  for (const factor of [1, 2, 4]) {
    const session = `banora-zoom-${process.pid}-${factor}`;
    const profile = resolve(temporary, `profile-${factor}`);
    await mkdir(resolve(profile, 'Default'), { recursive: true });
    const level = Math.log(factor) / Math.log(1.2);
    await writeFile(
      resolve(profile, 'Default/Preferences'),
      JSON.stringify({ partition: { default_zoom_level: { x: level, '0': level } } }),
      { flag: 'wx' },
    );
    const config = resolve(temporary, `config-${factor}.json`);
    await writeFile(
      config,
      JSON.stringify({
        browser: {
          browserName: 'chromium',
          isolated: false,
          userDataDir: profile,
          launchOptions: { channel: 'chrome', headless: true, args: ['--window-size=1280,900'] },
          contextOptions: { viewport: null },
        },
      }),
      { flag: 'wx' },
    );
    const cli = async (...args: string[]) => {
      const child = Bun.spawn(
        [process.execPath, 'run', 'playwright-cli', `-s=${session}`, ...args],
        {
          cwd: root,
          stdout: 'pipe',
          stderr: 'pipe',
        },
      );
      const [stdout, stderr, code] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      if (code !== 0 || stdout.includes('### Error'))
        throw Error(`Zoom command failed:\n${stdout}\n${stderr}`);
      return stdout;
    };
    try {
      await cli(
        'open',
        `${address}/studio/?zoom=${factor}`,
        '--config',
        config,
        '--persistent',
        '--profile',
        profile,
      );
      await cli('snapshot');
      requireScenarioResult(
        await cli('run-code', scenarioExpression(source)),
        `banora-zoom-${factor}-complete`,
      );
      const measured = JSON.parse(
        await readFile(resolve(root, `output/playwright/zoom-${factor}.json`), 'utf8'),
      );
      if (measured.factor !== factor || measured.scale !== 1 || measured.bodyZoom !== '1')
        throw Error('Invalid native zoom measurement.');
      if (
        ['width', 'height', 'outerWidth', 'outerHeight', 'dpr'].some(
          (key) =>
            typeof measured[key] !== 'number' ||
            !Number.isFinite(measured[key]) ||
            measured[key] <= 0,
        )
      )
        throw Error('Incomplete native zoom dimensions.');
      const exported = await readFile(
        resolve(root, `output/playwright/zoom-${factor}-roundtrip.sgf`),
        'utf8',
      );
      if (
        !exported.includes('XX[preserve]') ||
        !exported.includes('한국어 中文 日本語') ||
        !exported.includes(`Authored ${factor * 100}% zoom`)
      )
        throw Error('Downloaded zoom SGF lost authored data.');
      samples.push(measured);
      console.log(
        `Native Chrome ${factor * 100}% zoom passed: ${measured.width} × ${measured.height} CSS pixels.`,
      );
    } finally {
      await cli('close');
    }
  }
  const baseline = samples[0]!;
  for (const sample of samples) {
    const factor = Number(sample.factor);
    if (
      Math.abs(Number(sample.dpr) / Number(baseline.dpr) - factor) > 0.01 ||
      Math.abs(Number(sample.width) * factor - Number(baseline.width)) > factor ||
      Math.abs(Number(sample.height) * factor - Number(baseline.height)) > factor ||
      sample.outerWidth !== baseline.outerWidth ||
      sample.outerHeight !== baseline.outerHeight
    )
      throw Error('Native page zoom did not preserve the outer window and scale the CSS viewport.');
  }
  const after = await fingerprints();
  if (
    identity.commit !== git(['rev-parse', 'HEAD']) ||
    identity.sourceSha256 !== after.sourceSha256 ||
    identity.productionSha256 !== after.productionSha256
  )
    throw Error('Zoom source/artifacts changed during verification. Rebuild and rerun.');
  await writeFile(
    resolve(root, 'output/playwright/browser-zoom.json'),
    JSON.stringify(
      {
        schemaVersion: 'banora.browser-zoom/v1',
        createdAt: new Date().toISOString(),
        source: {
          ...identity,
          scenarioSha256: createHash('sha256').update(source).digest('hex'),
        },
        runtime: { platform: process.platform, arch: process.arch },
        method:
          'Fresh Chrome profiles with native default page zoom; fixed 1280×900 outer window; viewport:null; no CSS zoom, pinch or device emulation.',
        limits:
          'Headless desktop Chrome only. No physical devices, assistive technology, other engines or exhaustive feature certification.',
        samples,
      },
      null,
      2,
    ) + '\n',
  );
}
