import { mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
await mkdir(resolve(root, 'packages/cli/dist'), { recursive: true });
const result = await Bun.build({
  entrypoints: [resolve(root, 'packages/cli/src/main.ts')],
  outdir: resolve(root, 'packages/cli/dist'),
  naming: 'main.js',
  target: 'node',
  packages: 'external',
});
if (!result.success) throw new AggregateError(result.logs, 'CLI build failed');
await copyFile(resolve(root, 'LICENSE'), resolve(root, 'packages/cli/LICENSE'));
