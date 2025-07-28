import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VitePluginConvexTypes',
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['vite', 'fs', 'path'],
      output: {
        exports: 'named',
      },
    },
    sourcemap: true,
    target: 'es2020',
  },
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
}); 