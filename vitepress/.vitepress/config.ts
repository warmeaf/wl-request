import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'wl-request',
  description: '现代化 TypeScript 请求库',
  base: './',

  themeConfig: {
    nav: [
      { text: '指南', link: '/getting-started' },
      { text: 'API', link: '/api/hooks' },
    ],

    sidebar: {
      '/': [
        {
          text: '介绍',
          items: [{ text: '快速开始', link: '/getting-started' }],
        },
        {
          text: '指南',
          items: [
            { text: '配置', link: '/guide/configuration' },
            { text: '适配器', link: '/guide/adapters' },
            { text: '缓存', link: '/guide/cache' },
            { text: '重试', link: '/guide/retry' },
            { text: '并行请求', link: '/guide/parallel' },
            { text: '串行请求', link: '/guide/serial' },
            { text: '幂等请求', link: '/guide/idempotent' },
          ],
        },
        {
          text: 'API',
          items: [
            { text: 'Hooks', link: '/api/hooks' },
            { text: '配置 API', link: '/api/config' },
            { text: '类型定义', link: '/api/types' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025',
    },

    search: {
      provider: 'local',
    },
  },
});
