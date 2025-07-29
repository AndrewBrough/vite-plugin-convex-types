import { defineConfig } from 'vite';
import { convexTypesPlugin } from '../src/index';

export default defineConfig({
  plugins: [
    convexTypesPlugin({
      outputPath: './src/types/convex.ts',
      convexPath: 'convex',
      importPath: 'convex',
      generateQueries: true,
      queriesPath: './src/types/convexQueries.ts',
    }),
  ],
}); 