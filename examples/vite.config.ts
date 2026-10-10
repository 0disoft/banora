import { defineConfig } from 'vite';
import { resolve, sep } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const output = resolve(import.meta.dirname, '../dist/examples');
if (!output.startsWith(resolve(import.meta.dirname, '..') + sep)) throw new Error('Build output must stay in the repository');

export default defineConfig({
  root: import.meta.dirname,
  plugins: [svelte({ configFile: false })],
  base: './',
  server: { host: '127.0.0.1', port: 4317, strictPort: true },
  build: {
    outDir: output,
    emptyOutDir: true,
    rolldownOptions: { input: {
      index: resolve(import.meta.dirname, 'index.html'),
      studio: resolve(import.meta.dirname, 'studio/index.html'),
      readonly: resolve(import.meta.dirname, 'readonly/index.html'),
      viewer: resolve(import.meta.dirname, 'viewer/index.html'),
      react: resolve(import.meta.dirname, 'react/index.html'),
      vue: resolve(import.meta.dirname, 'vue/index.html'),
      svelte: resolve(import.meta.dirname, 'svelte/index.html'),
    } },
  },
});
