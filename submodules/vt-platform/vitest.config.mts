import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@vt\/([^/]+)\/browser$/, replacement: resolve(__dirname, 'packages/$1/src/browser.ts') },
      { find: /^@vt\/(.*)$/, replacement: resolve(__dirname, 'packages/$1/src/index.ts') },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.spec.ts', 'packages/**/*.test.ts'],
    setupFiles: ['./packages/setup.vitest.ts'],
    environmentMatchGlobs: [
      ['packages/ui-components/**/*.spec.ts', 'jsdom'],
      ['packages/ui-components/**/*.test.ts', 'jsdom']
    ]
  },
});
