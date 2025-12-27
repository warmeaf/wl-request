// useRequest Hook 测试

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAdapters, setDefaultAdapter } from '../../src/adapters';
import { resetConfig } from '../../src/config';
import { clearPendingRequests } from '../../src/features/idempotent';
import { createRequestHook, useRequest } from '../../src/hooks/useRequest';
import type { CacheAdapter, RequestAdapter, RequestConfig, Response } from '../../src/interfaces';

describe('useRequest', () => {
  let mockAdapter: RequestAdapter;
  let mockCacheAdapter: CacheAdapter;

  beforeEach(() => {
    // 重置所有状态
    resetConfig();
    resetAdapters();
    clearPendingRequests();

    // 创建模拟适配器
    mockAdapter = {
      async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: { message: 'success' } as T,
        };
      },
    };

    // 创建模拟缓存适配器
    const cache = new Map<string, { value: unknown; expiresAt: number }>();
    mockCacheAdapter = {
      async get<T>(key: string): Promise<T | null> {
        const item = cache.get(key);
        if (!item) {
          return null;
        }
        if (Date.now() > item.expiresAt) {
          cache.delete(key);
          return null;
        }
        return item.value as T;
      },

      async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        const expiresAt = ttl ? Date.now() + ttl : Number.MAX_SAFE_INTEGER;
        cache.set(key, { value, expiresAt });
      },

      async delete(key: string): Promise<void> {
        cache.delete(key);
      },

      async clear(): Promise<void> {
        cache.clear();
      },

      async has(key: string): Promise<boolean> {
        const item = cache.get(key);
        if (!item) {
          return false;
        }
        if (Date.now() > item.expiresAt) {
          cache.delete(key);
          return false;
        }
        return true;
      },
    };

    // 设置默认适配器
    setDefaultAdapter(mockAdapter);
  });

  afterEach(() => {
    // 清理状态
    resetConfig();
    resetAdapters();
    clearPendingRequests();
  });

  describe('基础请求功能', () => {
    it('应该返回 send 和 cancel 方法', () => {
      const config: RequestConfig = {
        url: '/api/users',
      };

      const { send, cancel } = useRequest(config);

      expect(typeof send).toBe('function');
      expect(typeof cancel).toBe('function');
    });

    it('调用 send() 应该能够执行请求', async () => {
      const config: RequestConfig = {
        url: '/api/users',
      };

      const { send } = useRequest(config);
      const response = await send();

      expect(response.status).toBe(200);
      expect(response.statusText).toBe('OK');
      expect(response.data).toEqual({ message: 'success' });
    });

    it('调用 cancel() 应该能够取消请求', async () => {
      const config: RequestConfig = {
        url: '/api/users',
      };

      const { send, cancel } = useRequest(config);

      // 启动请求
      const requestPromise = send();

      // 立即取消
      cancel();

      // 应该抛出取消错误
      await expect(requestPromise).rejects.toThrow('Request cancelled');
    });
  });

  describe('生命周期钩子调用', () => {
    it('应该调用 onBefore 钩子', async () => {
      const onBefore = vi.fn();
      const config: RequestConfig = {
        url: '/api/users',
        onBefore,
      };

      const { send } = useRequest(config);
      await send();

      expect(onBefore).toHaveBeenCalledTimes(1);
      expect(onBefore).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/users',
        })
      );
    });

    it('应该调用 onSuccess 钩子', async () => {
      const onSuccess = vi.fn();
      const config: RequestConfig = {
        url: '/api/users',
        onSuccess,
      };

      const { send } = useRequest(config);
      const response = await send();

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(response);
    });

    it('应该调用 onError 钩子', async () => {
      const error = new Error('Request failed');
      mockAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          throw error;
        },
      };
      setDefaultAdapter(mockAdapter);

      const onError = vi.fn();
      const config: RequestConfig = {
        url: '/api/users',
        onError,
      };

      const { send } = useRequest(config);

      try {
        await send();
      } catch {
        // 忽略错误
      }

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Request failed',
          config: expect.objectContaining({ url: '/api/users' }),
        })
      );
    });

    it('应该调用 onFinally 钩子（成功时）', async () => {
      const onFinally = vi.fn();
      const config: RequestConfig = {
        url: '/api/users',
        onFinally,
      };

      const { send } = useRequest(config);
      await send();

      expect(onFinally).toHaveBeenCalledTimes(1);
    });

    it('应该调用 onFinally 钩子（失败时）', async () => {
      const error = new Error('Request failed');
      mockAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          throw error;
        },
      };
      setDefaultAdapter(mockAdapter);

      const onFinally = vi.fn();
      const config: RequestConfig = {
        url: '/api/users',
        onFinally,
      };

      const { send } = useRequest(config);

      try {
        await send();
      } catch {
        // 忽略错误
      }

      expect(onFinally).toHaveBeenCalledTimes(1);
    });

    it('应该按正确顺序调用钩子', async () => {
      const callOrder: string[] = [];

      const onBefore = vi.fn(() => {
        callOrder.push('onBefore');
        return undefined;
      });
      const onSuccess = vi.fn(() => {
        callOrder.push('onSuccess');
      });
      const onFinally = vi.fn(() => {
        callOrder.push('onFinally');
      });

      const config: RequestConfig = {
        url: '/api/users',
        onBefore,
        onSuccess,
        onFinally,
      };

      const { send } = useRequest(config);
      await send();

      expect(callOrder).toEqual(['onBefore', 'onSuccess', 'onFinally']);
    });
  });

  describe('重试功能集成', () => {
    it('应该支持重试功能', async () => {
      let attemptCount = 0;
      mockAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          attemptCount++;
          if (attemptCount < 2) {
            throw new Error('Request failed');
          }
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { message: 'success' } as T,
          };
        },
      };
      setDefaultAdapter(mockAdapter);

      const config: RequestConfig = {
        url: '/api/users',
        retry: {
          count: 2,
          delay: 10,
        },
      };

      const { send } = useRequest(config);
      const response = await send();

      expect(attemptCount).toBe(2);
      expect(response.status).toBe(200);
    });
  });

  describe('缓存功能集成', () => {
    it('应该支持缓存功能', async () => {
      let requestCount = 0;
      mockAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          requestCount++;
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { message: 'success', count: requestCount } as T,
          };
        },
      };
      setDefaultAdapter(mockAdapter);

      const config: RequestConfig = {
        url: '/api/users',
        cache: {
          key: 'test-cache',
          ttl: 1000,
          cacheAdapter: mockCacheAdapter,
        },
      };

      const { send } = useRequest(config);

      // 第一次请求
      const response1 = await send();
      expect(requestCount).toBe(1);

      // 第二次请求应该从缓存读取
      const response2 = await send();
      expect(requestCount).toBe(1); // 不应该再次请求
      expect(response2.data).toEqual(response1.data);
    });
  });

  describe('幂等功能集成', () => {
    it('应该支持幂等功能', async () => {
      let requestCount = 0;
      mockAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          requestCount++;
          await new Promise((resolve) => setTimeout(resolve, 50));
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { message: 'success', count: requestCount } as T,
          };
        },
      };
      setDefaultAdapter(mockAdapter);

      const config: RequestConfig = {
        url: '/api/users',
        idempotent: {
          key: 'test-idempotent',
          ttl: 1000,
          cacheAdapter: mockCacheAdapter,
        },
      };

      const { send } = useRequest(config);

      // 同时发起两个请求
      const [response1, response2] = await Promise.all([send(), send()]);

      // 应该只执行一次请求
      expect(requestCount).toBe(1);
      // 两个响应应该相同
      expect(response1.data).toEqual(response2.data);
    });
  });

  describe('钩子执行顺序和参数传递', () => {
    it('onBefore 应该能够修改配置', async () => {
      const onBefore = vi.fn((config) => {
        return {
          ...config,
          headers: {
            ...config.headers,
            'X-Custom-Header': 'custom-value',
          },
        };
      });

      const config: RequestConfig = {
        url: '/api/users',
        onBefore,
      };

      const { send } = useRequest(config);
      const requestSpy = vi.spyOn(mockAdapter, 'request');

      await send();

      expect(requestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/users',
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });

    it('onSuccess 应该接收到正确的响应', async () => {
      const responseData = { message: 'success', id: 123 };
      mockAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: responseData as T,
          };
        },
      };
      setDefaultAdapter(mockAdapter);

      const onSuccess = vi.fn();
      const config: RequestConfig = {
        url: '/api/users',
        onSuccess,
      };

      const { send } = useRequest(config);
      await send();

      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          statusText: 'OK',
          data: responseData,
        })
      );
    });

    it('onError 应该接收到正确的错误信息', async () => {
      const error = new Error('Network error');
      mockAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          throw error;
        },
      };
      setDefaultAdapter(mockAdapter);

      const onError = vi.fn();
      const config: RequestConfig = {
        url: '/api/users',
        onError,
      };

      const { send } = useRequest(config);

      try {
        await send();
      } catch {
        // 忽略错误
      }

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Network error',
          config: expect.objectContaining({ url: '/api/users' }),
        })
      );
    });
  });

  describe('命名说明', () => {
    it('createRequestHook 应该与 useRequest 功能相同', () => {
      const config: RequestConfig = {
        url: '/api/users',
      };

      const result1 = useRequest(config);
      const result2 = createRequestHook(config);

      // 两者应该返回相同结构
      expect(typeof result2.send).toBe('function');
      expect(typeof result2.cancel).toBe('function');
      expect(typeof result1.send).toBe(typeof result2.send);
      expect(typeof result1.cancel).toBe(typeof result2.cancel);
    });
  });
});
