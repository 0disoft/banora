import { build } from 'vite';
import { resolve, sep } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

const directory = resolve(import.meta.dirname, '../packages/sdk');
const output = resolve(directory, 'dist');
if (!output.startsWith(directory + sep)) throw new Error('Browser output must stay inside the SDK package');
const license = await readFile(resolve(directory,'LICENSE'),'utf8');
await build({ configFile: false, build: {
  target: 'es2022', outDir: output, emptyOutDir: false,
  lib: { entry: resolve(directory, 'src/index.ts'), name: 'Banora', formats: ['iife'], fileName: () => 'banora.global.js' },
} });
// Packaging follows minification so no downstream optimizer can discard the notice.
const artifact = resolve(output,'banora.global.js');
await writeFile(artifact,`/*! Banora\n${license.replaceAll('*/','* /')}*/\n${await readFile(artifact,'utf8')}`);
await writeFile(resolve(output, 'banora.global.d.ts'), "export as namespace Banora;\nexport * from './index.js';\n");
