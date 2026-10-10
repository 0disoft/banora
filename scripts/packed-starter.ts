import { copyFile, mkdir, mkdtemp, readFile, realpath } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { smokeStarter } from './starter-browser-smoke.js';

const root = resolve(import.meta.dirname, '..');
await mkdir(resolve(root, '.tmp'), { recursive: true });
const directory = await mkdtemp(resolve(root, '.tmp/standalone-consumer-'));
const files = [
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'index.html',
  'main.ts',
  'style.css',
  'sample.sgf',
  'README.md',
  'LICENSE',
];
for (const file of files)
  await copyFile(resolve(root, 'examples/standalone', file), resolve(directory, file));
if (
  (await readFile(resolve(directory, 'LICENSE'), 'utf8')) !==
  (await readFile(resolve(root, 'LICENSE'), 'utf8'))
) {
  throw Error('Copyable starter lost its original MIT notice');
}

async function run(command: string[], cwd: string): Promise<void> {
  const child = Bun.spawn(command, { cwd, stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0) throw new Error(`${command.join(' ')} failed:\n${stdout}\n${stderr}`);
  console.log(stdout.trim());
}

await run(
  [process.execPath, 'pm', 'pack', '--filename', resolve(directory, 'sdk.tgz'), '--ignore-scripts'],
  resolve(root, 'packages/sdk'),
);
await run(
  ['npm', 'install', '--ignore-scripts', '--no-audit', '--no-fund', './sdk.tgz'],
  directory,
);

// Assert this app actually resolves installed copies, not parent workspace links.
const consumerRoot = await realpath(directory);
for (const name of ['@banora/sdk', 'typescript', 'vite']) {
  const installed = await realpath(resolve(directory, 'node_modules', name));
  if (!installed.startsWith(consumerRoot + sep))
    throw Error(`Dependency escaped the standalone installation: ${name}`);
}
const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
if (manifest.workspaces || !manifest.dependencies?.['@banora/sdk']?.includes('sdk.tgz'))
  throw Error('Starter did not install the local SDK tarball');
const config = JSON.parse(await readFile(resolve(directory, 'tsconfig.json'), 'utf8'));
if (config.extends || config.compilerOptions.paths)
  throw Error('Starter must have an independent TypeScript configuration');
const metadata = JSON.parse(
  await readFile(resolve(directory, 'node_modules/@banora/sdk/package.json'), 'utf8'),
);
if (Object.keys(metadata.dependencies ?? {}).length)
  throw Error('Standalone SDK acquired runtime dependencies');
await readFile(resolve(directory, 'node_modules/@banora/sdk/LICENSE'));
await run(['npm', 'run', 'build'], directory);
const html = await readFile(resolve(directory, 'dist/index.html'), 'utf8');
if (!html.includes('My Go record editor') || !html.includes('./assets/'))
  throw Error('Standalone build did not emit relative static assets');
console.log(
  `Standalone installed SDK, local tools, strict types and production build passed: ${directory}`,
);
if (process.argv.includes('--browser')) await smokeStarter(directory);
