// 幂等请求功能测试

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPendingRequests,
  resetDefaultCacheAdapter,
  withIdempotent,
} from '../../src/features/idempotent';
import type { CacheAdapter, Response } from '../../src/interfaces';
import type { IdempotentConfig } from '../../src/types';

describe('withIdempotent', () => {
  let mockCacheAdapter: CacheAdapter;

  beforeEach(() => {
    // 清除全局 pending requests 状态，确保测试隔离
    clearPendingRequests();

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
  });

  describe('幂等性检查机制', () => {
    it('相同请求在 TTL 内不应该重复执行', async () => {
      const response: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'result',
      };

      const requestFn = vi.fn().mockResolvedValue(response);
      const idempotentConfig: IdempotentConfig = {
        key: 'idempotent-key',
        ttl: 1000,
        cacheAdapter: mockCacheAdapter,
      };

      const idempotentRequest = withIdempotent(requestFn, idempotentConfig);

      // 第一次调用
      const result1 = await idempotentRequest();
      expect(result1).toEqual(response);
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 第二次调用（在TTL内）
      const result2 = await idempotentRequest();
      expect(result2).toEqual(response);
      expect(requestFn).toHaveBeenCalledTimes(1); // 不应该再次调用
    });
  });

  describe('相同请求在 TTL 内返回缓存结果', () => {
    it('第二次请求应该返回第一次的结果', async () => {
      const response: Response<number> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 42,
      };

      const requestFn = vi.fn().mockResolvedValue(response);
      const idempotentConfig: IdempotentConfig = {
        key: 'idempotent-key',
        ttl: 1000,
        cacheAdapter: mockCacheAdapter,
      };

      const idempotentRequest = withIdempotent(requestFn, idempotentConfig);

      // 第一次调用
      const promise1 = idempotentRequest();
      // 第二次调用（在第一次完成前）
      const promise2 = idempotentRequest();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // 两个结果应该相同
      expect(result1).toEqual(response);
      expect(result2).toEqual(response);
      // 请求函数应该只被调用一次
      expect(requestFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('幂等键生成', () => {
    it('应该使用配置的幂等键', async () => {
      const response: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'result',
      };

      const requestFn = vi.fn().mockResolvedValue(response);
      const idempotentConfig: IdempotentConfig = {
        key: 'custom-idempotent-key',
        ttl: 1000,
        cacheAdapter: mockCacheAdapter,
      };

      const idempotentRequest = withIdempotent(requestFn, idempotentConfig);

      await idempotentRequest();

      // 验证缓存中使用了配置的键
      const cachedValue = await mockCacheAdapter.get<Response<string>>('custom-idempotent-key');
      expect(cachedValue).toBeDefined();
      expect(cachedValue).toEqual(response);
    });
  });

  describe('缓存适配器集成', () => {
    it('应该能够与缓存适配器正常工作', async () => {
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
        async has() {
          return false;
        },
      };

      const response: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'result',
      };

      const requestFn = vi.fn().mockResolvedValue(response);
      const idempotentConfig: IdempotentConfig = {
        key: 'test-key',
        ttl: 1000,
        cacheAdapter: customAdapter,
      };

      const idempotentRequest = withIdempotent(requestFn, idempotentConfig);

      // 由于自定义适配器总是返回null，应该每次都执行请求
      await idempotentRequest();
      expect(requestFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('TTL 过期后重新执行', () => {
    it('TTL 过期后应该可以重新执行请求', async () => {
      const response1: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'first result',
      };

      const response2: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'second result',
      };

      const requestFn = vi.fn().mockResolvedValueOnce(response1).mockResolvedValueOnce(response2);

      const idempotentConfig: IdempotentConfig = {
        key: 'idempotent-key',
        ttl: 100, // 很短的TTL
        cacheAdapter: mockCacheAdapter,
      };

      const idempotentRequest = withIdempotent(requestFn, idempotentConfig);

      // 第一次调用
      const result1 = await idempotentRequest();
      expect(result1).toEqual(response1);
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 等待TTL过期
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 第二次调用应该重新执行请求
      const result2 = await idempotentRequest();
      expect(result2).toEqual(response2);
      expect(requestFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('不同幂等键的请求独立处理', () => {
    it('不同键的请求应该互不影响', async () => {
      const response1: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'result1',
      };

      const response2: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'result2',
      };

      const requestFn1 = vi.fn().mockResolvedValue(response1);
      const requestFn2 = vi.fn().mockResolvedValue(response2);

      const idempotentConfig1: IdempotentConfig = {
        key: 'key1',
        ttl: 1000,
        cacheAdapter: mockCacheAdapter,
      };

      const idempotentConfig2: IdempotentConfig = {
        key: 'key2',
        ttl: 1000,
        cacheAdapter: mockCacheAdapter,
      };

      const idempotentRequest1 = withIdempotent(requestFn1, idempotentConfig1);
      const idempotentRequest2 = withIdempotent(requestFn2, idempotentConfig2);

      // 执行两个不同键的请求
      await idempotentRequest1();
      await idempotentRequest2();

      expect(requestFn1).toHaveBeenCalledTimes(1);
      expect(requestFn2).toHaveBeenCalledTimes(1);

      // 再次执行，应该都从缓存读取
      await idempotentRequest1();
      await idempotentRequest2();

      expect(requestFn1).toHaveBeenCalledTimes(1);
      expect(requestFn2).toHaveBeenCalledTimes(1);
    });
  });

  describe('并发请求处理', () => {
    it('多个并发请求应该共享同一个 Promise', async () => {
      const response: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'result',
      };

      // 使用延迟来模拟慢请求
      const requestFn = vi.fn().mockImplementation(
        () =>
          new Promise<Response<string>>((resolve) => {
            setTimeout(() => resolve(response), 100);
          })
      );

      const idempotentConfig: IdempotentConfig = {
        key: 'idempotent-key',
        ttl: 1000,
        cacheAdapter: mockCacheAdapter,
      };

      const idempotentRequest = withIdempotent(requestFn, idempotentConfig);

      // 同时发起多个请求
      const promises = [idempotentRequest(), idempotentRequest(), idempotentRequest()];

      const results = await Promise.all(promises);

      // 所有结果应该相同
      expect(results[0]).toEqual(response);
      expect(results[1]).toEqual(response);
      expect(results[2]).toEqual(response);

      // 请求函数应该只被调用一次
      expect(requestFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('边界情况', () => {
    describe('默认缓存适配器', () => {
      beforeEach(() => {
        // 确保 localStorage 可用
        if (typeof global.localStorage === 'undefined') {
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
              for (const key of Object.keys(storage)) {
                delete storage[key];
              }
            }),
            get length() {
              return Object.keys(storage).length;
            },
            key: vi.fn((index: number) => Object.keys(storage)[index] || null),
          } as Storage;
        }
      });

      afterEach(() => {
        // 清理 localStorage 和默认适配器
        if (global.localStorage?.clear) {
          global.localStorage.clear();
        }
        resetDefaultCacheAdapter();
      });

      it('没有提供缓存适配器时应该使用默认缓存适配器', async () => {
        const response: Response<string> = {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: 'result',
        };

        const requestFn = vi.fn().mockResolvedValue(response);
        const idempotentConfig: IdempotentConfig = {
          key: 'test-key',
          ttl: 1000,
          // 没有提供 cacheAdapter
        };

        const idempotentRequest = withIdempotent(requestFn, idempotentConfig);

        // 第一次调用应该执行请求
        const result1 = await idempotentRequest();
        expect(result1).toEqual(response);
        expect(requestFn).toHaveBeenCalledTimes(1);

        // 第二次调用应该从缓存读取（使用默认适配器）
        const result2 = await idempotentRequest();
        expect(result2).toEqual(response);
        expect(requestFn).toHaveBeenCalledTimes(1); // 不应该再次调用

        // 验证 localStorage 中确实存储了缓存
        const stored = global.localStorage.getItem('wl-request:test-key');
        expect(stored).toBeTruthy();
        if (stored) {
          const parsed = JSON.parse(stored);
          expect(parsed.value).toEqual({
            status: 200,
            statusText: 'OK',
            headers: {},
            data: 'result',
          });
        }
      });

      it('默认缓存适配器应该支持 TTL 过期', async () => {
        const response1: Response<string> = {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: 'first result',
        };

        const response2: Response<string> = {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: 'second result',
        };

        const requestFn = vi.fn().mockResolvedValueOnce(response1).mockResolvedValueOnce(response2);
        const idempotentConfig: IdempotentConfig = {
          key: 'test-key',
          ttl: 100, // 很短的TTL
          // 没有提供 cacheAdapter
        };

        const idempotentRequest = withIdempotent(requestFn, idempotentConfig);

        // 第一次调用
        const result1 = await idempotentRequest();
        expect(result1).toEqual(response1);
        expect(requestFn).toHaveBeenCalledTimes(1);

        // 等待TTL过期
        await new Promise((resolve) => setTimeout(resolve, 150));

        // 第二次调用应该重新执行请求
        const result2 = await idempotentRequest();
        expect(result2).toEqual(response2);
        expect(requestFn).toHaveBeenCalledTimes(2);
      });
    });

    it('请求失败时不应该缓存错误结果', async () => {
      const error = new Error('Request failed');
      const requestFn = vi.fn().mockRejectedValue(error);
      const idempotentConfig: IdempotentConfig = {
        key: 'test-key',
        ttl: 1000,
        cacheAdapter: mockCacheAdapter,
      };

      const idempotentRequest = withIdempotent(requestFn, idempotentConfig);

      // 第一次调用失败
      await expect(idempotentRequest()).rejects.toThrow('Request failed');

      // 验证缓存中没有存储错误
      const cachedValue = await mockCacheAdapter.get('test-key');
      expect(cachedValue).toBeNull();

      // 第二次调用应该再次执行请求
      await expect(idempotentRequest()).rejects.toThrow('Request failed');
      expect(requestFn).toHaveBeenCalledTimes(2);
    });
  });
});
