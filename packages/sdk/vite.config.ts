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
        sgf: resolve(import.meta.dirname, 'src/sgf.ts'),
        controller: resolve(import.meta.dirname, 'src/controller.ts'),
        board: resolve(import.meta.dirname, 'src/board.ts'),
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
  },
});
