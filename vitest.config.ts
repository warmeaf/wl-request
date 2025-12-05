import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'packages/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', '.idea', '.git', '.cache'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '**/*.config.*', '**/dist/**', '**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './packages/core/src'),
      '@wl-request/core': resolve(__dirname, './packages/core/src'),
      '@wl-request/adapter-fetch': resolve(__dirname, './packages/adapter-fetch/src'),
      '@wl-request/adapter-axios': resolve(__dirname, './packages/adapter-axios/src'),
      '@wl-request/cache-adapter-memory': resolve(__dirname, './packages/cache-adapter-memory/src'),
      '@wl-request/cache-adapter-indexeddb': resolve(
        __dirname,
        './packages/cache-adapter-indexeddb/src'
      ),
    },
  },
});
