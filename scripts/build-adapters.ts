import { build } from 'vite';
import { resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
for (const name of ['react', 'vue']) {
  const directory = resolve(root, 'packages', name);
  const output = resolve(directory, 'dist');
  if (!output.startsWith(directory + sep)) throw new Error('Adapter output must stay inside its package');
  await build({ configFile: false, build: {
    target: 'es2022', outDir: output, emptyOutDir: true,
    lib: { entry: resolve(directory, 'src/index.ts'), formats: ['es'], fileName: () => 'index.js' },
    rolldownOptions: { external: ['@banora/sdk', 'react', 'vue'] },
  } });
  const typecheck = Bun.spawn([process.execPath, 'run', 'tsc', '-p', resolve(directory, 'tsconfig.build.json')], { stdout: 'inherit', stderr: 'inherit' });
  if (await typecheck.exited !== 0) throw new Error(`${name} declaration build failed`);
}
const svelte = Bun.spawn([process.execPath, 'run', '--cwd', resolve(root, 'packages/svelte'), 'build'], { stdout: 'inherit', stderr: 'inherit' });
if (await svelte.exited !== 0) throw new Error('Svelte package build failed');
