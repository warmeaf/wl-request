// 请求实例创建测试

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAdapters, setDefaultAdapter } from '../src/adapters';
import { configure, resetConfig } from '../src/config';
import { clearPendingRequests } from '../src/features/idempotent';
import type { CacheAdapter, RequestAdapter, RequestConfig, Response } from '../src/interfaces';
import { createRequest } from '../src/request';
import type { RequestError } from '../src/types';

describe('createRequest', () => {
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

  describe('请求实例创建', () => {
    it('应该能够创建请求实例', () => {
      const config: RequestConfig = {
        url: '/api/users',
      };

      const instance = createRequest(config);

      expect(instance).toBeDefined();
      expect(typeof instance.send).toBe('function');
      expect(typeof instance.cancel).toBe('function');
    });

    it('调用 send() 应该能够执行请求', async () => {
      const config: RequestConfig = {
        url: '/api/users',
      };

      const instance = createRequest(config);
      const response = await instance.send();

      expect(response.status).toBe(200);
      expect(response.statusText).toBe('OK');
      expect(response.data).toEqual({ message: 'success' });
    });
  });

  describe('配置继承', () => {
    beforeEach(() => {
      configure({
        baseURL: 'https://api.example.com',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('请求配置应该继承全局配置', async () => {
      const config: RequestConfig = {
        url: '/api/users',
      };

      const instance = createRequest(config);
      const requestSpy = vi.spyOn(mockAdapter, 'request');

      await instance.send();

      expect(requestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/users',
          baseURL: 'https://api.example.com',
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('请求配置应该能够覆盖全局配置', async () => {
      const config: RequestConfig = {
        url: '/api/users',
        timeout: 10000,
      };

      const instance = createRequest(config);
      const requestSpy = vi.spyOn(mockAdapter, 'request');

      await instance.send();

      expect(requestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/users',
          baseURL: 'https://api.example.com',
          timeout: 10000, // 被覆盖
        })
      );
    });

    it('配置合并逻辑应该正确（headers、params等）', async () => {
      const config: RequestConfig = {
        url: '/api/users',
        headers: {
          Authorization: 'Bearer token',
        },
        params: {
          page: 1,
        },
      };

      const instance = createRequest(config);
      const requestSpy = vi.spyOn(mockAdapter, 'request');

      await instance.send();

      expect(requestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token',
          },
          params: {
            page: 1,
          },
        })
      );
    });
  });

  describe('适配器集成', () => {
    it('应该使用配置中指定的适配器', async () => {
      const customAdapter: RequestAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          return {
            status: 201,
            statusText: 'Created',
            headers: {},
            data: { custom: true } as T,
          };
        },
      };

      const config: RequestConfig = {
        url: '/api/users',
        adapter: customAdapter,
      };

      const instance = createRequest(config);
      const response = await instance.send();

      expect(response.status).toBe(201);
      expect(response.data).toEqual({ custom: true });
    });

    it('未指定适配器时应该使用默认适配器', async () => {
      const config: RequestConfig = {
        url: '/api/users',
      };

      const instance = createRequest(config);
      const requestSpy = vi.spyOn(mockAdapter, 'request');

      await instance.send();

      expect(requestSpy).toHaveBeenCalled();
    });

    it('适配器应该正确执行请求', async () => {
      const config: RequestConfig = {
        url: '/api/users',
        method: 'POST',
        data: { name: 'test' },
      };

      const instance = createRequest(config);
      const requestSpy = vi.spyOn(mockAdapter, 'request');

      await instance.send();

      expect(requestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/users',
          method: 'POST',
          data: { name: 'test' },
        })
      );
    });
  });

  describe('功能模块集成', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('应该集成重试功能（当配置了 retry 时）', async () => {
      let callCount = 0;
      const failingAdapter: RequestAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          callCount++;
          if (callCount < 3) {
            const error: RequestError = new Error('Request failed') as RequestError;
            error.status = 500;
            throw error;
          }
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { success: true } as T,
          };
        },
      };

      const config: RequestConfig = {
        url: '/api/users',
        adapter: failingAdapter,
        retry: {
          count: 2,
          delay: 100,
        },
      };

      const instance = createRequest(config);
      const promise = instance.send();

      // 推进时间以完成重试
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(100);
      await vi.runAllTimersAsync();

      const response = await promise;

      expect(callCount).toBe(3); // 初始请求 + 2次重试
      expect(response.status).toBe(200);
    });

    it('应该集成缓存功能（当配置了 cache 时）', async () => {
      let callCount = 0;
      const countingAdapter: RequestAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          callCount++;
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { count: callCount } as T,
          };
        },
      };

      const config: RequestConfig = {
        url: '/api/users',
        adapter: countingAdapter,
        cache: {
          key: 'test-cache',
          ttl: 1000,
          cacheAdapter: mockCacheAdapter,
        },
      };

      const instance1 = createRequest(config);
      const response1 = await instance1.send();

      expect(response1.data).toEqual({ count: 1 });
      expect(callCount).toBe(1);

      // 第二次请求应该从缓存获取
      const instance2 = createRequest(config);
      const response2 = await instance2.send();

      expect(response2.data).toEqual({ count: 1 }); // 缓存值
      expect(callCount).toBe(1); // 没有再次调用适配器
    });

    it('应该集成幂等功能（当配置了 idempotent 时）', async () => {
      let callCount = 0;
      const countingAdapter: RequestAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          callCount++;
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { count: callCount } as T,
          };
        },
      };

      const config: RequestConfig = {
        url: '/api/users',
        adapter: countingAdapter,
        idempotent: {
          key: 'test-idempotent',
          ttl: 1000,
          cacheAdapter: mockCacheAdapter,
        },
      };

      // 并发请求
      const instance1 = createRequest(config);
      const instance2 = createRequest(config);
      const instance3 = createRequest(config);

      const [response1, response2, response3] = await Promise.all([
        instance1.send(),
        instance2.send(),
        instance3.send(),
      ]);

      // 所有响应应该相同（幂等）
      expect(response1.data).toEqual(response2.data);
      expect(response2.data).toEqual(response3.data);
      // 应该只调用一次适配器
      expect(callCount).toBe(1);
    });

    it('应该支持多个功能模块同时使用', async () => {
      let callCount = 0;
      const failingAdapter: RequestAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          callCount++;
          if (callCount < 2) {
            const error: RequestError = new Error('Request failed') as RequestError;
            error.status = 500;
            throw error;
          }
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { count: callCount } as T,
          };
        },
      };

      const config: RequestConfig = {
        url: '/api/users',
        adapter: failingAdapter,
        retry: {
          count: 1,
          delay: 100,
        },
        cache: {
          key: 'test-multi',
          ttl: 1000,
          cacheAdapter: mockCacheAdapter,
        },
      };

      const instance = createRequest(config);
      const promise = instance.send();

      await vi.advanceTimersByTimeAsync(100);
      await vi.runAllTimersAsync();

      const response = await promise;

      expect(response.status).toBe(200);
      expect(callCount).toBe(2); // 初始失败 + 1次重试

      // 第二次请求应该从缓存获取
      const instance2 = createRequest(config);
      const response2 = await instance2.send();

      expect(response2.data).toEqual({ count: 2 });
      expect(callCount).toBe(2); // 没有再次调用适配器
    });
  });

  describe('生命周期钩子', () => {
    it('onBefore 钩子应该在请求前执行', async () => {
      const onBefore = vi.fn();

      const config: RequestConfig = {
        url: '/api/users',
        onBefore,
      };

      const instance = createRequest(config);
      const requestSpy = vi.spyOn(mockAdapter, 'request');

      await instance.send();

      expect(onBefore).toHaveBeenCalledTimes(1);
      expect(requestSpy).toHaveBeenCalledTimes(1);
      // 验证 onBefore 在 request 之前被调用（通过调用顺序）
      expect(onBefore.mock.invocationCallOrder[0]).toBeLessThan(
        requestSpy.mock.invocationCallOrder[0]
      );
    });

    it('onSuccess 钩子应该在请求成功时执行', async () => {
      const onSuccess = vi.fn();

      const config: RequestConfig = {
        url: '/api/users',
        onSuccess,
      };

      const instance = createRequest(config);
      await instance.send();

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          statusText: 'OK',
          data: { message: 'success' },
        })
      );
    });

    it('onError 钩子应该在请求失败时执行', async () => {
      const onError = vi.fn();
      const errorAdapter: RequestAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          const error: RequestError = new Error('Request failed') as RequestError;
          error.status = 500;
          throw error;
        },
      };

      const config: RequestConfig = {
        url: '/api/users',
        adapter: errorAdapter,
        onError,
      };

      const instance = createRequest(config);

      await expect(instance.send()).rejects.toThrow();

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Request failed',
          status: 500,
        })
      );
    });

    it('onFinally 钩子应该总是执行', async () => {
      const onFinally = vi.fn();

      const config: RequestConfig = {
        url: '/api/users',
        onFinally,
      };

      const instance = createRequest(config);
      await instance.send();

      expect(onFinally).toHaveBeenCalledTimes(1);
    });

    it('onFinally 钩子在请求失败时也应该执行', async () => {
      const onFinally = vi.fn();
      const errorAdapter: RequestAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          throw new Error('Request failed');
        },
      };

      const config: RequestConfig = {
        url: '/api/users',
        adapter: errorAdapter,
        onFinally,
      };

      const instance = createRequest(config);

      await expect(instance.send()).rejects.toThrow();

      expect(onFinally).toHaveBeenCalledTimes(1);
    });

    it('钩子函数应该能够修改配置（onBefore）', async () => {
      const onBefore = vi.fn((config) => {
        return {
          ...config,
          headers: {
            ...config.headers,
            'X-Custom': 'modified',
          },
        };
      });

      const config: RequestConfig = {
        url: '/api/users',
        headers: {
          'Content-Type': 'application/json',
        },
        onBefore,
      };

      const instance = createRequest(config);
      const requestSpy = vi.spyOn(mockAdapter, 'request');

      await instance.send();

      expect(requestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'X-Custom': 'modified',
          },
        })
      );
    });
  });

  describe('错误处理', () => {
    it('请求失败时应该正确抛出错误', async () => {
      const errorAdapter: RequestAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          const error: RequestError = new Error('Network error') as RequestError;
          error.code = 'NETWORK_ERROR';
          throw error;
        },
      };

      const config: RequestConfig = {
        url: '/api/users',
        adapter: errorAdapter,
      };

      const instance = createRequest(config);

      await expect(instance.send()).rejects.toThrow('Network error');
    });

    it('错误对象应该包含正确的信息', async () => {
      const errorAdapter: RequestAdapter = {
        async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
          const error: RequestError = new Error('Request failed') as RequestError;
          error.status = 500;
          error.statusText = 'Internal Server Error';
          error.code = 'SERVER_ERROR';
          error.config = config as RequestConfig<unknown>;
          throw error;
        },
      };

      const config: RequestConfig = {
        url: '/api/users',
        adapter: errorAdapter,
      };

      const instance = createRequest(config);

      try {
        await instance.send();
        expect.fail('应该抛出错误');
      } catch (error) {
        const requestError = error as RequestError;
        expect(requestError.message).toBe('Request failed');
        expect(requestError.status).toBe(500);
        expect(requestError.statusText).toBe('Internal Server Error');
        expect(requestError.code).toBe('SERVER_ERROR');
        expect(requestError.config).toBeDefined();
      }
    });
  });

  describe('请求取消', () => {
    it('调用 cancel() 应该能够取消请求', async () => {
      const pendingAdapter: RequestAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          return new Promise(() => {
            // 永远不resolve，用于测试取消
          }) as Promise<Response<T>>;
        },
      };

      const config: RequestConfig = {
        url: '/api/users',
        adapter: pendingAdapter,
      };

      const instance = createRequest(config);
      const sendPromise = instance.send();

      // 立即取消请求
      instance.cancel();

      await expect(sendPromise).rejects.toThrow('Request cancelled');
    }, 1000);

    it('取消后的请求不应该执行回调', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const onFinally = vi.fn();

      const pendingAdapter: RequestAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          return new Promise(() => {
            // 永远不resolve，用于测试取消
          }) as Promise<Response<T>>;
        },
      };

      const config: RequestConfig = {
        url: '/api/users',
        adapter: pendingAdapter,
        onSuccess,
        onError,
        onFinally,
      };

      const instance = createRequest(config);
      const sendPromise = instance.send();

      // 立即取消请求
      instance.cancel();

      try {
        await sendPromise;
      } catch {
        // 忽略错误
      }

      // 等待一下确保回调执行完成
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      // onFinally 应该被调用（取消时也会调用）
      expect(onFinally).toHaveBeenCalledTimes(1);
    }, 1000);

    it('取消后再次调用 send() 应该能够重新发送请求', async () => {
      let callCount = 0;
      const countingAdapter: RequestAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          callCount++;
          if (callCount === 1) {
            // 第一次请求模拟挂起
            return new Promise(() => {}) as Promise<Response<T>>;
          }
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { count: callCount } as T,
          };
        },
      };

      const config: RequestConfig = {
        url: '/api/users',
        adapter: countingAdapter,
      };

      const instance = createRequest(config);

      // 第一次发送，然后取消
      const firstPromise = instance.send();
      instance.cancel();

      try {
        await firstPromise;
      } catch {
        // 忽略取消错误
      }

      // 第二次发送应该能正常执行
      const response = await instance.send();

      expect(callCount).toBe(2);
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ count: 2 });
    }, 1000);
  });

  describe('边缘情况', () => {
    it('重复调用 send() 应该能够多次执行请求', async () => {
      let callCount = 0;
      const countingAdapter: RequestAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          callCount++;
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { count: callCount } as T,
          };
        },
      };

      const config: RequestConfig = {
        url: '/api/users',
        adapter: countingAdapter,
      };

      const instance = createRequest(config);

      // 多次调用 send()
      const response1 = await instance.send();
      const response2 = await instance.send();
      const response3 = await instance.send();

      expect(callCount).toBe(3);
      expect(response1.data).toEqual({ count: 1 });
      expect(response2.data).toEqual({ count: 2 });
      expect(response3.data).toEqual({ count: 3 });
    });

    it('onBefore 返回 undefined 时应该使用原始配置', async () => {
      const onBefore = vi.fn(() => undefined);

      const config: RequestConfig = {
        url: '/api/users',
        headers: {
          'Content-Type': 'application/json',
        },
        onBefore,
      };

      const instance = createRequest(config);
      const requestSpy = vi.spyOn(mockAdapter, 'request');

      await instance.send();

      expect(onBefore).toHaveBeenCalledTimes(1);
      expect(requestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/users',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('异步 onBefore 钩子应该正确处理', async () => {
      const onBefore = vi.fn(async (config) => {
        // 模拟异步操作
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          ...config,
          headers: {
            ...config.headers,
            'X-Async': 'true',
          },
        };
      });

      const config: RequestConfig = {
        url: '/api/users',
        onBefore,
      };

      const instance = createRequest(config);
      const requestSpy = vi.spyOn(mockAdapter, 'request');

      await instance.send();

      expect(onBefore).toHaveBeenCalledTimes(1);
      expect(requestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            'X-Async': 'true',
          },
        })
      );
    });

    it('异步 onBefore 返回 undefined 时应该使用原始配置', async () => {
      const onBefore = vi.fn(async () => {
        // 模拟异步操作
        await new Promise((resolve) => setTimeout(resolve, 10));
        return undefined;
      });

      const config: RequestConfig = {
        url: '/api/users',
        headers: {
          'Content-Type': 'application/json',
        },
        onBefore,
      };

      const instance = createRequest(config);
      const requestSpy = vi.spyOn(mockAdapter, 'request');

      await instance.send();

      expect(onBefore).toHaveBeenCalledTimes(1);
      expect(requestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/users',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('非 Error 类型的错误应该被正确包装', async () => {
      const errorAdapter: RequestAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          throw 'string error';
        },
      };

      const config: RequestConfig = {
        url: '/api/users',
        adapter: errorAdapter,
      };

      const instance = createRequest(config);

      try {
        await instance.send();
        expect.fail('应该抛出错误');
      } catch (error) {
        const requestError = error as RequestError;
        expect(requestError.message).toBe('string error');
        expect(requestError.originalError).toBe('string error');
        expect(requestError.config).toBeDefined();
      }
    });

    it('错误对象已有 config 时不应覆盖', async () => {
      const originalConfig: RequestConfig = {
        url: '/api/original',
      };

      const errorAdapter: RequestAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          const error: RequestError = new Error('Request failed') as RequestError;
          error.config = originalConfig as RequestConfig<unknown>;
          throw error;
        },
      };

      const config: RequestConfig = {
        url: '/api/users',
        adapter: errorAdapter,
      };

      const instance = createRequest(config);

      try {
        await instance.send();
        expect.fail('应该抛出错误');
      } catch (error) {
        const requestError = error as RequestError;
        expect(requestError.config?.url).toBe('/api/original');
      }
    });
  });
});
