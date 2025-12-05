// 请求缓存功能测试

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withCache } from '../../src/features/cache';
import type { CacheAdapter, Response } from '../../src/interfaces';
import type { CacheConfig } from '../../src/types';

describe('withCache', () => {
  let mockCacheAdapter: CacheAdapter;

  beforeEach(() => {
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
  });

  describe('缓存写入和读取', () => {
    it('应该能够正确存储和获取缓存值', async () => {
      const response: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'cached data',
      };

      const requestFn = vi.fn().mockResolvedValue(response);
      const cacheConfig: CacheConfig = {
        key: 'test-key',
        ttl: 1000,
        cacheAdapter: mockCacheAdapter,
      };

      const cachedRequest = withCache(requestFn, cacheConfig);

      // 第一次调用应该执行请求
      const result1 = await cachedRequest();
      expect(result1).toEqual(response);
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 第二次调用应该从缓存读取
      const result2 = await cachedRequest();
      expect(result2).toEqual(response);
      expect(requestFn).toHaveBeenCalledTimes(1); // 不应该再次调用
    });
  });

  describe('TTL 过期机制', () => {
    it('缓存在过期后应该返回 null 并重新执行请求', async () => {
      const response1: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'first data',
      };

      const response2: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'second data',
      };

      const requestFn = vi.fn().mockResolvedValueOnce(response1).mockResolvedValueOnce(response2);

      const cacheConfig: CacheConfig = {
        key: 'test-key',
        ttl: 100, // 很短的TTL
        cacheAdapter: mockCacheAdapter,
      };

      const cachedRequest = withCache(requestFn, cacheConfig);

      // 第一次调用
      const result1 = await cachedRequest();
      expect(result1).toEqual(response1);
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 等待TTL过期
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 第二次调用应该重新执行请求
      const result2 = await cachedRequest();
      expect(result2).toEqual(response2);
      expect(requestFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('缓存键生成策略', () => {
    it('应该使用配置的缓存键', async () => {
      const response: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'data',
      };

      const requestFn = vi.fn().mockResolvedValue(response);
      const cacheConfig: CacheConfig = {
        key: 'custom-key',
        ttl: 1000,
        cacheAdapter: mockCacheAdapter,
      };

      const cachedRequest = withCache(requestFn, cacheConfig);

      await cachedRequest();

      // 验证缓存中确实使用了配置的键
      const cachedValue = await mockCacheAdapter.get<Response<string>>('custom-key');
      expect(cachedValue).toEqual(response);
    });
  });

  describe('缓存失效处理', () => {
    it('删除缓存后应该重新执行请求', async () => {
      const response1: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'first data',
      };

      const response2: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'second data',
      };

      const requestFn = vi.fn().mockResolvedValueOnce(response1).mockResolvedValueOnce(response2);

      const cacheConfig: CacheConfig = {
        key: 'test-key',
        ttl: 1000,
        cacheAdapter: mockCacheAdapter,
      };

      const cachedRequest = withCache(requestFn, cacheConfig);

      // 第一次调用
      await cachedRequest();
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 删除缓存
      await mockCacheAdapter.delete('test-key');

      // 第二次调用应该重新执行请求
      const result2 = await cachedRequest();
      expect(result2).toEqual(response2);
      expect(requestFn).toHaveBeenCalledTimes(2);
    });

    it('清空缓存后应该重新执行请求', async () => {
      const response1: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'first data',
      };

      const response2: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'second data',
      };

      const requestFn = vi.fn().mockResolvedValueOnce(response1).mockResolvedValueOnce(response2);

      const cacheConfig: CacheConfig = {
        key: 'test-key',
        ttl: 1000,
        cacheAdapter: mockCacheAdapter,
      };

      const cachedRequest = withCache(requestFn, cacheConfig);

      // 第一次调用
      await cachedRequest();
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 清空缓存
      await mockCacheAdapter.clear();

      // 第二次调用应该重新执行请求
      const result2 = await cachedRequest();
      expect(result2).toEqual(response2);
      expect(requestFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('不同缓存适配器的兼容性', () => {
    it('应该能够与不同的缓存适配器正常工作', async () => {
      const customAdapter: CacheAdapter = {
        async get<_T>() {
          return null;
        },
        async set() {
          // 空实现
        },
        async delete() {
          // 空实现
        },
        async clear() {
          // 空实现
        },
      };

      const response: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'data',
      };

      const requestFn = vi.fn().mockResolvedValue(response);
      const cacheConfig: CacheConfig = {
        key: 'test-key',
        ttl: 1000,
        cacheAdapter: customAdapter,
      };

      const cachedRequest = withCache(requestFn, cacheConfig);

      // 由于自定义适配器总是返回null，应该每次都执行请求
      await cachedRequest();
      expect(requestFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('缓存命中时直接返回', () => {
    it('缓存命中时不应该执行实际请求', async () => {
      const response: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'cached data',
      };

      const requestFn = vi.fn().mockResolvedValue(response);
      const cacheConfig: CacheConfig = {
        key: 'test-key',
        ttl: 1000,
        cacheAdapter: mockCacheAdapter,
      };

      const cachedRequest = withCache(requestFn, cacheConfig);

      // 第一次调用
      await cachedRequest();
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 多次调用，都应该从缓存读取
      await cachedRequest();
      await cachedRequest();
      await cachedRequest();

      expect(requestFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('缓存未命中时执行请求并缓存', () => {
    it('缓存未命中时应该执行请求并缓存结果', async () => {
      const response: Response<number> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 42,
      };

      const requestFn = vi.fn().mockResolvedValue(response);
      const cacheConfig: CacheConfig = {
        key: 'test-key',
        ttl: 1000,
        cacheAdapter: mockCacheAdapter,
      };

      const cachedRequest = withCache(requestFn, cacheConfig);

      // 第一次调用，缓存未命中
      const result = await cachedRequest();
      expect(result).toEqual(response);
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 验证缓存中确实存储了结果
      const cachedValue = await mockCacheAdapter.get<Response<number>>('test-key');
      expect(cachedValue).toEqual(response);
    });
  });

  describe('边界情况', () => {
    it('没有提供缓存适配器时应该直接执行请求', async () => {
      const response: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'data',
      };

      const requestFn = vi.fn().mockResolvedValue(response);
      const cacheConfig: CacheConfig = {
        key: 'test-key',
        ttl: 1000,
        // 没有提供 cacheAdapter
      };

      const cachedRequest = withCache(requestFn, cacheConfig);

      // 应该直接执行请求，不进行缓存
      await cachedRequest();
      await cachedRequest();
      await cachedRequest();

      expect(requestFn).toHaveBeenCalledTimes(3);
    });

    it('请求失败时不应该缓存错误结果', async () => {
      const error = new Error('Request failed');
      const requestFn = vi.fn().mockRejectedValue(error);
      const cacheConfig: CacheConfig = {
        key: 'test-key',
        ttl: 1000,
        cacheAdapter: mockCacheAdapter,
      };

      const cachedRequest = withCache(requestFn, cacheConfig);

      // 第一次调用失败
      await expect(cachedRequest()).rejects.toThrow('Request failed');

      // 验证缓存中没有存储错误
      const cachedValue = await mockCacheAdapter.get('test-key');
      expect(cachedValue).toBeNull();

      // 第二次调用应该再次执行请求
      await expect(cachedRequest()).rejects.toThrow('Request failed');
      expect(requestFn).toHaveBeenCalledTimes(2);
    });
  });
});
