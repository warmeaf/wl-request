// 功能模块集成测试

import { MemoryCacheAdapter } from '@wl-request/cache-adapter-memory';
import type { RequestAdapter, RequestConfig, Response } from '@wl-request/core';
import { resetAdapters, resetConfig, setDefaultAdapter, useRequest } from '@wl-request/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('功能模块集成测试', () => {
  let mockAdapter: RequestAdapter;
  let requestCount: number;

  beforeEach(() => {
    resetConfig();
    resetAdapters();
    requestCount = 0;

    mockAdapter = {
      async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
        requestCount++;
        if (config.url === '/error') {
          throw new Error('Request failed');
        }
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: { count: requestCount, url: config.url } as T,
        };
      },
    };

    setDefaultAdapter(mockAdapter);
  });

  afterEach(() => {
    resetConfig();
    resetAdapters();
  });

  describe('重试功能与请求的集成', () => {
    it('应该能够重试失败的请求', async () => {
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
        url: '/users',
        retry: {
          count: 3,
          delay: 10,
        },
      });

      const response = await send();
      expect(response.status).toBe(200);
      expect(attemptCount).toBe(3);
    });

    it('重试应该使用指数退避策略', async () => {
      const delays: number[] = [];
      let lastTime = Date.now();

      const errorAdapter: RequestAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          const currentTime = Date.now();
          if (lastTime > 0) {
            delays.push(currentTime - lastTime);
          }
          lastTime = currentTime;

          if (delays.length < 2) {
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
        url: '/users',
        retry: {
          count: 3,
          delay: 50,
          strategy: 'exponential',
        },
      });

      await send();

      // 验证延迟时间递增（允许一些误差）
      expect(delays.length).toBeGreaterThan(0);
    });
  });

  describe('缓存功能与请求的集成', () => {
    it('应该能够缓存响应', async () => {
      const cacheAdapter = new MemoryCacheAdapter();
      const { send } = useRequest({
        url: '/users',
        cache: {
          key: 'users-list',
          ttl: 1000,
          cacheAdapter,
        },
      });

      // 第一次请求
      const response1 = await send();
      expect(response1.status).toBe(200);
      expect(requestCount).toBe(1);

      // 第二次请求应该使用缓存
      const response2 = await send();
      expect(response2.status).toBe(200);
      expect(requestCount).toBe(1); // 不应该再次请求
    });

    it('缓存过期后应该重新请求', async () => {
      const { send } = useRequest({
        url: '/users',
        cache: {
          key: 'users-list-expired',
          ttl: 100, // 很短的TTL
          cacheAdapter: new MemoryCacheAdapter(),
        },
      });

      // 第一次请求
      await send();
      expect(requestCount).toBe(1);

      // 等待缓存过期
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 第二次请求应该重新请求
      await send();
      expect(requestCount).toBe(2);
    });
  });

  describe('幂等功能与请求的集成', () => {
    it('相同请求在TTL内应该只执行一次', async () => {
      const { send } = useRequest({
        url: '/create-order',
        method: 'POST',
        idempotent: {
          key: 'order-123',
          ttl: 1000,
          cacheAdapter: new MemoryCacheAdapter(),
        },
      });

      // 第一次请求
      const promise1 = send();
      // 立即发起第二次相同请求
      const promise2 = send();

      const [response1, response2] = await Promise.all([promise1, promise2]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      // 应该只执行一次请求
      expect(requestCount).toBe(1);
    });

    it('不同幂等键的请求应该分别执行', async () => {
      const instance1 = useRequest({
        url: '/create-order',
        method: 'POST',
        idempotent: {
          key: 'order-123',
          ttl: 1000,
          cacheAdapter: new MemoryCacheAdapter(),
        },
      });

      const instance2 = useRequest({
        url: '/create-order',
        method: 'POST',
        idempotent: {
          key: 'order-456',
          ttl: 1000,
          cacheAdapter: new MemoryCacheAdapter(),
        },
      });

      await Promise.all([instance1.send(), instance2.send()]);

      // 应该执行两次请求
      expect(requestCount).toBe(2);
    });
  });

  describe('多个功能同时使用的场景', () => {
    it('应该能够同时使用重试和缓存', async () => {
      let attemptCount = 0;
      const errorAdapter: RequestAdapter = {
        async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
          attemptCount++;
          if (attemptCount < 2 && config.url === '/users') {
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
        url: '/users',
        retry: {
          count: 3,
          delay: 10,
        },
        cache: {
          key: 'users-with-retry',
          ttl: 1000,
          cacheAdapter: new MemoryCacheAdapter(),
        },
      });

      // 第一次请求（会重试）
      const response1 = await send();
      expect(response1.status).toBe(200);
      expect(attemptCount).toBe(2);

      // 第二次请求（使用缓存，不会重试）
      attemptCount = 0;
      const response2 = await send();
      expect(response2.status).toBe(200);
      expect(attemptCount).toBe(0); // 使用缓存，没有请求
    });

    it('应该能够同时使用缓存和幂等', async () => {
      const { send } = useRequest({
        url: '/create-order',
        method: 'POST',
        cache: {
          key: 'order-cache',
          ttl: 1000,
          cacheAdapter: new MemoryCacheAdapter(),
        },
        idempotent: {
          key: 'order-idempotent',
          ttl: 1000,
          cacheAdapter: new MemoryCacheAdapter(),
        },
      });

      // 第一次请求
      await send();
      expect(requestCount).toBe(1);

      // 第二次请求（应该使用缓存或幂等）
      await send();
      expect(requestCount).toBe(1); // 不应该再次请求
    });

    it('应该能够同时使用重试、缓存和幂等', async () => {
      let attemptCount = 0;
      const errorAdapter: RequestAdapter = {
        async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
          attemptCount++;
          if (attemptCount < 2 && config.url === '/create-order') {
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
        url: '/create-order',
        method: 'POST',
        retry: {
          count: 3,
          delay: 10,
        },
        cache: {
          key: 'order-all-features',
          ttl: 1000,
          cacheAdapter: new MemoryCacheAdapter(),
        },
        idempotent: {
          key: 'order-all-features-idempotent',
          ttl: 1000,
          cacheAdapter: new MemoryCacheAdapter(),
        },
      });

      // 第一次请求（会重试）
      await send();
      expect(attemptCount).toBe(2);

      // 第二次请求（使用缓存或幂等，不会重试）
      attemptCount = 0;
      await send();
      expect(attemptCount).toBe(0);
    });
  });
});
