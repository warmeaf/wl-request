// 文档示例验证测试

import { MemoryCacheAdapter } from '@wl-request/cache-adapter-memory';
import type { RequestAdapter, RequestConfig, Response } from '@wl-request/core';
import {
  configure,
  FetchAdapter,
  resetAdapters,
  resetConfig,
  setDefaultAdapter,
  useParallelRequests,
  useRequest,
  useSerialRequests,
} from '@wl-request/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('文档示例验证测试', () => {
  let mockAdapter: RequestAdapter;
  let mockCacheAdapter: MemoryCacheAdapter;

  beforeEach(() => {
    resetConfig();
    resetAdapters();

    // 模拟 localStorage
    const storage: Record<string, string> = {};
    global.localStorage = {
      getItem: vi.fn((key: string) => storage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        storage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete storage[key];
      }),
      clear: vi.fn(() => {
        Object.keys(storage).forEach((key) => {
          delete storage[key];
        });
      }),
      get length() {
        return Object.keys(storage).length;
      },
      key: vi.fn((index: number) => Object.keys(storage)[index] || null),
    } as unknown as Storage;

    mockAdapter = {
      async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: { url: config.url, method: config.method || 'GET' } as T,
        };
      },
    };

    mockCacheAdapter = new MemoryCacheAdapter();
    setDefaultAdapter(mockAdapter);
  });

  afterEach(() => {
    resetConfig();
    resetAdapters();
    vi.restoreAllMocks();
  });

  describe('全局配置示例', () => {
    it('应该能够配置全局设置', () => {
      configure({
        baseURL: 'https://api.example.com',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
        retry: {
          count: 3,
          delay: 1000,
        },
        onBefore: (config) => {
          const token = localStorage.getItem('token');
          if (token) {
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${token}`,
            };
          }
          return config;
        },
        onSuccess: (response) => {
          expect(response.status).toBe(200);
        },
        onError: (err) => {
          if (err.status === 401) {
            localStorage.removeItem('token');
          }
        },
        onFinally: () => {
          // 请求完成
        },
      });

      const config = configure({});
      expect(config).toBeUndefined();
    });

    it('单个请求应该能够覆盖全局配置', async () => {
      configure({
        baseURL: 'https://api.example.com',
        timeout: 10000,
      });

      const { send } = useRequest({
        url: '/api/users',
        timeout: 5000,
        headers: {
          'X-Custom-Header': 'custom-value',
        },
        onSuccess: (response) => {
          expect(response.status).toBe(200);
        },
      });

      const response = await send();
      expect(response.status).toBe(200);
    });
  });

  describe('请求重试示例', () => {
    it('应该能够配置重试', async () => {
      let attemptCount = 0;
      const errorAdapter: RequestAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Network error');
          }
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { success: true } as T,
          };
        },
      };

      setDefaultAdapter(errorAdapter);

      const { send } = useRequest({
        url: '/api/data',
        retry: {
          count: 3,
          delay: 10,
        },
        onSuccess: (response) => {
          expect(response.data).toHaveProperty('success', true);
        },
        onError: (err) => {
          expect(err).toBeDefined();
        },
      });

      const response = await send();
      expect(response.status).toBe(200);
      expect(attemptCount).toBe(3);
    });
  });

  describe('请求缓存示例', () => {
    it('应该能够使用缓存', async () => {
      const { send } = useRequest({
        url: '/api/users',
        cache: {
          key: 'users-list',
          ttl: 5 * 60 * 1000,
          cacheAdapter: mockCacheAdapter,
        },
        onSuccess: (response) => {
          expect(response.status).toBe(200);
        },
      });

      const response = await send();
      expect(response.status).toBe(200);
    });

    it('应该能够使用内存缓存适配器', async () => {
      const { send } = useRequest({
        url: '/api/users',
        cache: {
          key: 'users-list',
          ttl: 5 * 60 * 1000,
          cacheAdapter: mockCacheAdapter,
        },
        onSuccess: (response) => {
          expect(response.status).toBe(200);
        },
      });

      const response = await send();
      expect(response.status).toBe(200);
    });
  });

  describe('并行请求示例', () => {
    it('应该能够执行并行请求', async () => {
      const { send } = useParallelRequests(
        [{ url: '/api/users' }, { url: '/api/posts' }, { url: '/api/comments' }],
        {
          onBefore: () => {
            // 开始并行请求
          },
          onSuccess: (results) => {
            expect(results.length).toBe(3);
          },
          onError: (errors) => {
            expect(errors).toBeDefined();
          },
          onFinally: () => {
            // 并行请求完成
          },
        }
      );

      const results = await send();
      expect(results.length).toBe(3);
    });
  });

  describe('串行请求示例', () => {
    it('应该能够执行串行请求', async () => {
      const { send } = useSerialRequests(
        [{ url: '/api/step1' }, { url: '/api/step2' }, { url: '/api/step3' }],
        {
          onBefore: () => {
            // 开始串行请求
          },
          onSuccess: (results) => {
            expect(results.length).toBe(3);
          },
          onError: (error, index) => {
            expect(error).toBeDefined();
            expect(typeof index).toBe('number');
          },
          onFinally: () => {
            // 串行请求完成
          },
        }
      );

      const results = await send();
      expect(results.length).toBe(3);
    });
  });

  describe('幂等请求示例', () => {
    it('应该能够使用幂等请求', async () => {
      const { send } = useRequest({
        url: '/api/create-order',
        method: 'POST',
        idempotent: {
          key: 'order-123',
          ttl: 10 * 60 * 1000,
          cacheAdapter: mockCacheAdapter,
        },
        onSuccess: (response) => {
          expect(response.status).toBe(200);
        },
        onError: (err) => {
          expect(err).toBeDefined();
        },
      });

      const response = await send();
      expect(response.status).toBe(200);
    });

    it('应该能够使用自定义缓存适配器的幂等请求', async () => {
      const { send } = useRequest({
        url: '/api/create-order',
        method: 'POST',
        idempotent: {
          key: 'order-123',
          ttl: 10 * 60 * 1000,
          cacheAdapter: mockCacheAdapter,
        },
        onSuccess: (response) => {
          expect(response.status).toBe(200);
        },
      });

      const response = await send();
      expect(response.status).toBe(200);
    });
  });

  describe('使用自定义适配器示例', () => {
    it('应该能够使用 Fetch 适配器', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ message: 'success' }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const adapter = new FetchAdapter();
      const { send } = useRequest({
        url: '/api/users',
        adapter,
        onSuccess: (response) => {
          expect(response.status).toBe(200);
        },
        onError: (err) => {
          expect(err).toBeDefined();
        },
      });

      const response = await send();
      expect(response.status).toBe(200);
    });
  });

  describe('全局配置缓存适配器示例', () => {
    it('应该能够在全局配置中设置缓存适配器', () => {
      configure({
        cacheAdapter: mockCacheAdapter,
      });

      const { send } = useRequest({
        url: '/api/users',
        cache: {
          key: 'users-list',
          ttl: 5 * 60 * 1000,
        },
      });

      expect(send).toBeDefined();
    });
  });
});
