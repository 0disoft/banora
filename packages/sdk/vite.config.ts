import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    target: 'es2022',
    outDir: resolve(import.meta.dirname, 'dist'),
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'src/index.ts'),
        core: resolve(import.meta.dirname, 'src/core.ts'),
        geometry: resolve(import.meta.dirname, 'src/geometry.ts'),
        sgf: resolve(import.meta.dirname, 'src/sgf.ts'),
        controller: resolve(import.meta.dirname, 'src/controller.ts'),
        board: resolve(import.meta.dirname, 'src/board.ts'),
        'board-state': resolve(import.meta.dirname, 'src/board-state.ts'),
        viewer: resolve(import.meta.dirname, 'src/viewer.ts'),
        comparison: resolve(import.meta.dirname, 'src/comparison.ts'),
        share: resolve(import.meta.dirname, 'src/share.ts'),
        textures: resolve(import.meta.dirname, 'src/textures.ts'),
        rules: resolve(import.meta.dirname, 'src/rules.ts'),
        scoring: resolve(import.meta.dirname, 'src/scoring.ts'),
        puzzle: resolve(import.meta.dirname, 'src/puzzle.ts'),
        'puzzle-view': resolve(import.meta.dirname, 'src/puzzle-view.ts'),
        analysis: resolve(import.meta.dirname, 'src/analysis.ts'),
        katago: resolve(import.meta.dirname, 'src/katago.ts'),
        'analysis-view': resolve(import.meta.dirname, 'src/analysis-view.ts'),
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
  },
});
