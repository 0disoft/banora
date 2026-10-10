import { defineConfig } from 'vite';
import { resolve, sep } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';

const output = resolve(import.meta.dirname, '../dist/examples');
const browserArtifact = resolve(import.meta.dirname, '../packages/sdk/dist/banora.global.js');
if (!output.startsWith(resolve(import.meta.dirname, '..') + sep))
  throw new Error('Build output must stay in the repository');

export default defineConfig({
  root: import.meta.dirname,
  plugins: [
    svelte({ configFile: false }),
    {
      name: 'banora-browser-distribution',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'banora.global.js',
          source: readFileSync(browserArtifact),
        });
      },
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url?.split('?')[0] !== '/banora.global.js') return next();
          response.setHeader('Content-Type', 'text/javascript');
          response.end(readFileSync(browserArtifact));
        });
      },
    },
  ],
  base: './',
  server: { host: '127.0.0.1', port: 4317, strictPort: true },
  build: {
    outDir: output,
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        studio: resolve(import.meta.dirname, 'studio/index.html'),
        readonly: resolve(import.meta.dirname, 'readonly/index.html'),
        viewer: resolve(import.meta.dirname, 'viewer/index.html'),
        puzzle: resolve(import.meta.dirname, 'puzzle/index.html'),
        analysis: resolve(import.meta.dirname, 'analysis/index.html'),
        react: resolve(import.meta.dirname, 'react/index.html'),
        vue: resolve(import.meta.dirname, 'vue/index.html'),
        svelte: resolve(import.meta.dirname, 'svelte/index.html'),
        browser: resolve(import.meta.dirname, 'browser/index.html'),
        controlled: resolve(import.meta.dirname, 'controlled/index.html'),
        controlledReact: resolve(import.meta.dirname, 'controlled/react.html'),
        controlledVue: resolve(import.meta.dirname, 'controlled/vue.html'),
        controlledSvelte: resolve(import.meta.dirname, 'controlled/svelte.html'),
      },
    },
  },
});
