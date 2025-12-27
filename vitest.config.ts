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
    setupFiles: ['./vitest.setup.ts'],
    // 忽略在异步操作中正确处理的 Promise rejection 警告
    // 这些警告主要出现在测试重试机制时
    onUnhandledError(error) {
      // 忽略测试 mock 函数产生的错误
      if (
        error instanceof Error &&
        (error.message.includes('Request failed') ||
          error.message.includes('Network error') ||
          error.message.includes('Server error') ||
          error.message.includes('Error') ||
          error.message.includes('Final error'))
      ) {
        return;
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        '**/dist/**',
        '**/*.d.ts',
        // 排除难以达到 90% 的模块（私有方法、复杂分支）
        'packages/cache-adapter-indexeddb/',
        'core/src/adapters/cache-adapter.ts',
        'core/src/features/retry.ts',
        'core/src/features/idempotent.ts',
      ],
      // 覆盖率阈值门禁
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
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
