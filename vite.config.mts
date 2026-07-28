import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import swc from 'unplugin-swc';

const rootDir = dirname(fileURLToPath(import.meta.url));
const tsconfig = JSON.parse(readFileSync(resolve(rootDir, 'tsconfig.base.json'), 'utf8')) as {
  compilerOptions?: { paths?: Record<string, string[]> };
};

const alias = Object.entries(tsconfig.compilerOptions?.paths ?? {})
  .sort(([left], [right]) => right.length - left.length)
  .map(([find, targets]) => ({
    find,
    replacement: resolve(rootDir, targets[0]),
  }));

export default defineConfig({
  resolve: { alias },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2020',
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)', '**/*.e2e-spec.ts'],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 120000,
    hookTimeout: 120000,
  },
});
