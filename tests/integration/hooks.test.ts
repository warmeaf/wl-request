// Hook 集成测试

import type { RequestAdapter, RequestConfig, Response } from '@wl-request/core';
import {
  resetAdapters,
  resetConfig,
  setDefaultAdapter,
  useParallelRequests,
  useRequest,
  useSerialRequests,
} from '@wl-request/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Hook 集成测试', () => {
  let mockAdapter: RequestAdapter;

  beforeEach(() => {
    resetConfig();
    resetAdapters();

    mockAdapter = {
      async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: { url: config.url } as T,
        };
      },
    };

    setDefaultAdapter(mockAdapter);
  });

  afterEach(() => {
    resetConfig();
    resetAdapters();
  });

  describe('useRequest Hook 的完整使用流程', () => {
    it('应该能够发送请求并获取响应', async () => {
      const { send } = useRequest({
        url: '/users',
      });

      const response = await send();
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('url', '/users');
    });

    it('应该能够取消请求', async () => {
      const slowAdapter: RequestAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: {} as T,
          };
        },
      };

      setDefaultAdapter(slowAdapter);

      const { send, cancel } = useRequest({
        url: '/users',
      });

      const promise = send();
      cancel();

      await expect(promise).rejects.toThrow();
    });

    it('应该调用所有生命周期钩子', async () => {
      const hooks = {
        onBefore: vi.fn(),
        onSuccess: vi.fn(),
        onError: vi.fn(),
        onFinally: vi.fn(),
      };

      const { send } = useRequest({
        url: '/users',
        ...hooks,
      });

      await send();

      expect(hooks.onBefore).toHaveBeenCalledTimes(1);
      expect(hooks.onSuccess).toHaveBeenCalledTimes(1);
      expect(hooks.onFinally).toHaveBeenCalledTimes(1);
      expect(hooks.onError).not.toHaveBeenCalled();
    });
  });

  describe('useParallelRequests Hook 的完整使用流程', () => {
    it('应该能够并行执行多个请求', async () => {
      const { send } = useParallelRequests(
        [{ url: '/users' }, { url: '/posts' }, { url: '/comments' }],
        {}
      );

      const results = await send();
      expect(results.length).toBe(3);
      expect(results[0].status).toBe(200);
      expect(results[1].status).toBe(200);
      expect(results[2].status).toBe(200);
    });

    it('应该调用并行请求的生命周期钩子', async () => {
      const hooks = {
        onBefore: vi.fn(),
        onSuccess: vi.fn((results) => {
          expect(results.length).toBe(2);
        }),
        onError: vi.fn(),
        onFinally: vi.fn(),
      };

      const { send } = useParallelRequests([{ url: '/users' }, { url: '/posts' }], hooks);

      await send();

      expect(hooks.onBefore).toHaveBeenCalledTimes(1);
      expect(hooks.onSuccess).toHaveBeenCalledTimes(1);
      expect(hooks.onFinally).toHaveBeenCalledTimes(1);
    });

    it('应该处理部分请求失败的情况', async () => {
      const errorAdapter: RequestAdapter = {
        async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
          if (config.url === '/error') {
            throw new Error('Request failed');
          }
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { url: config.url } as T,
          };
        },
      };

      setDefaultAdapter(errorAdapter);

      const hooks = {
        onError: vi.fn((errors) => {
          expect(errors.length).toBeGreaterThan(0);
        }),
      };

      const { send } = useParallelRequests(
        [{ url: '/users' }, { url: '/error' }, { url: '/posts' }],
        hooks
      );

      try {
        await send();
      } catch {
        // 忽略错误
      }

      expect(hooks.onError).toHaveBeenCalledTimes(1);
    });

    it('应该能够取消并行请求', async () => {
      const slowAdapter: RequestAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: {} as T,
          };
        },
      };

      setDefaultAdapter(slowAdapter);

      const { send, cancel } = useParallelRequests([{ url: '/users' }, { url: '/posts' }], {});

      const promise = send();
      cancel();

      await expect(promise).rejects.toThrow();
    });
  });

  describe('useSerialRequests Hook 的完整使用流程', () => {
    it('应该能够串行执行多个请求', async () => {
      const requestOrder: string[] = [];
      const orderedAdapter: RequestAdapter = {
        async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
          requestOrder.push(config.url);
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { url: config.url } as T,
          };
        },
      };

      setDefaultAdapter(orderedAdapter);

      const { send } = useSerialRequests(
        [{ url: '/step1' }, { url: '/step2' }, { url: '/step3' }],
        {}
      );

      const results = await send();
      expect(results.length).toBe(3);
      expect(requestOrder).toEqual(['/step1', '/step2', '/step3']);
    });

    it('应该调用串行请求的生命周期钩子', async () => {
      const hooks = {
        onBefore: vi.fn(),
        onSuccess: vi.fn((results) => {
          expect(results.length).toBe(2);
        }),
        onError: vi.fn(),
        onFinally: vi.fn(),
      };

      const { send } = useSerialRequests([{ url: '/step1' }, { url: '/step2' }], hooks);

      await send();

      expect(hooks.onBefore).toHaveBeenCalledTimes(1);
      expect(hooks.onSuccess).toHaveBeenCalledTimes(1);
      expect(hooks.onFinally).toHaveBeenCalledTimes(1);
    });

    it('应该在前一个请求失败时中断', async () => {
      const errorAdapter: RequestAdapter = {
        async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
          if (config.url === '/error') {
            throw new Error('Request failed');
          }
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { url: config.url } as T,
          };
        },
      };

      setDefaultAdapter(errorAdapter);

      const hooks = {
        onError: vi.fn((error, index) => {
          expect(error.message).toBe('Request failed');
          expect(index).toBe(1);
        }),
      };

      const { send } = useSerialRequests(
        [{ url: '/step1' }, { url: '/error' }, { url: '/step3' }],
        hooks
      );

      try {
        await send();
      } catch {
        // 忽略错误
      }

      expect(hooks.onError).toHaveBeenCalledTimes(1);
    });

    it('应该能够取消串行请求', async () => {
      const slowAdapter: RequestAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: {} as T,
          };
        },
      };

      setDefaultAdapter(slowAdapter);

      const { send, cancel } = useSerialRequests([{ url: '/step1' }, { url: '/step2' }], {});

      const promise = send();
      cancel();

      await expect(promise).rejects.toThrow();
    });
  });

  describe('Hook 之间的组合使用', () => {
    it('应该能够组合使用 useRequest 和 useParallelRequests', async () => {
      const instance1 = useRequest({ url: '/users' });
      const instance2 = useParallelRequests([{ url: '/posts' }], {});

      const [response1, results2] = await Promise.all([instance1.send(), instance2.send()]);

      expect(response1.status).toBe(200);
      expect(results2.length).toBe(1);
      expect(results2[0].status).toBe(200);
    });

    it('应该能够组合使用 useRequest 和 useSerialRequests', async () => {
      const instance1 = useRequest({ url: '/users' });
      const instance2 = useSerialRequests([{ url: '/posts' }], {});

      const [response1, results2] = await Promise.all([instance1.send(), instance2.send()]);

      expect(response1.status).toBe(200);
      expect(results2.length).toBe(1);
      expect(results2[0].status).toBe(200);
    });
  });
});
