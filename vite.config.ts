import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'packages/core/src/index.ts'),
      name: 'WlRequest',
      fileName: (format: string) => `wl-request.${format}.js`,
    },
    rollupOptions: {
      // 外部化所有依赖，避免将依赖打包进库中
      external: (id: string) => {
        // 排除 node_modules 中的依赖
        return !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('\0');
      },
      output: {
        // 为 UMD 格式提供全局变量
        globals: {},
      },
    },
  },
});
