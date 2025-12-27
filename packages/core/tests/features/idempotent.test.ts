// 幂等请求功能测试

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageCacheAdapter } from '../../src/adapters/local-storage-cache-adapter';
import { configure, resetConfig } from '../../src/config';
import {
  clearPendingRequests,
  resetDefaultCacheAdapter,
  setDefaultCacheAdapter,
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
    describe('错误处理', () => {
      it('adapter.get() 抛出错误时应该正确传播错误', async () => {
        const errorAdapter: CacheAdapter = {
          async get<T>(): Promise<T | null> {
            throw new Error('Adapter get error');
          },
          async set<_T>(): Promise<void> {},
          async delete(): Promise<void> {},
          async clear(): Promise<void> {},
          async has(): Promise<boolean> {
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
          key: 'error-key',
          ttl: 1000,
          cacheAdapter: errorAdapter,
        };

        const idempotentRequest = withIdempotent(requestFn, idempotentConfig);

        // 应该抛出 adapter 的错误
        await expect(idempotentRequest()).rejects.toThrow('Adapter get error');
      });

      it('adapter.set() 抛出错误时不应该影响请求结果返回', async () => {
        const errorOnSetAdapter: CacheAdapter = {
          async get<T>(): Promise<T | null> {
            return null; // 缓存未命中
          },
          async set<_T>(): Promise<void> {
            throw new Error('Adapter set error');
          },
          async delete(): Promise<void> {},
          async clear(): Promise<void> {},
          async has(): Promise<boolean> {
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
          key: 'set-error-key',
          ttl: 1000,
          cacheAdapter: errorOnSetAdapter,
        };

        const idempotentRequest = withIdempotent(requestFn, idempotentConfig);

        // 请求应该成功返回（set 错误不应该影响结果）
        const result = await idempotentRequest();
        expect(result).toEqual(response);

        // 请求函数应该被调用
        expect(requestFn).toHaveBeenCalledTimes(1);
      });

      it('并发请求在缓存命中时应该都能正确返回结果', async () => {
        const response: Response<string> = {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: 'result',
        };

        // 预填充缓存
        const cache = new Map<string, { value: unknown; expiresAt: number }>();
        cache.set('idempotent-key', {
          value: response,
          expiresAt: Date.now() + 1000,
        });

        const preFilledAdapter: CacheAdapter = {
          async get<T>(key: string): Promise<T | null> {
            const item = cache.get(key);
            if (!item) return null;
            if (Date.now() > item.expiresAt) {
              cache.delete(key);
              return null;
            }
            return item.value as T;
          },
          async set<T>(key: string, value: T): Promise<void> {
            cache.set(key, { value, expiresAt: Date.now() + 1000 });
          },
          async delete(key: string): Promise<void> {
            cache.delete(key);
          },
          async clear(): Promise<void> {
            cache.clear();
          },
          async has(key: string): Promise<boolean> {
            const item = cache.get(key);
            if (!item) return false;
            if (Date.now() > item.expiresAt) {
              cache.delete(key);
              return false;
            }
            return true;
          },
        };

        const requestFn = vi.fn().mockResolvedValue(response);
        const idempotentConfig: IdempotentConfig = {
          key: 'idempotent-key',
          ttl: 1000,
          cacheAdapter: preFilledAdapter,
        };

        const idempotentRequest = withIdempotent(requestFn, idempotentConfig);

        // 并发调用 - 缓存命中
        const results = await Promise.all([
          idempotentRequest(),
          idempotentRequest(),
          idempotentRequest(),
        ]);

        // 所有结果应该相同
        expect(results[0]).toEqual(response);
        expect(results[1]).toEqual(response);
        expect(results[2]).toEqual(response);

        // 请求函数应该从未被调用（缓存命中）
        expect(requestFn).toHaveBeenCalledTimes(0);
      });

      it('请求失败时 pendingRequests 应该被正确清理', async () => {
        const error = new Error('Request failed');
        const requestFn = vi.fn().mockRejectedValue(error);
        const idempotentConfig: IdempotentConfig = {
          key: 'fail-key',
          ttl: 1000,
          cacheAdapter: mockCacheAdapter,
        };

        const idempotentRequest = withIdempotent(requestFn, idempotentConfig);

        // 第一次调用失败
        await expect(idempotentRequest()).rejects.toThrow('Request failed');

        // 再次调用应该能够再次执行请求（pendingRequests 已被清理）
        await expect(idempotentRequest()).rejects.toThrow('Request failed');

        // 请求函数应该被调用两次
        expect(requestFn).toHaveBeenCalledTimes(2);
      });
    });

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

        // 重置配置
        resetConfig();
        resetDefaultCacheAdapter();
        global.localStorage?.clear();
      });

      afterEach(() => {
        // 清理 localStorage 和默认适配器
        if (global.localStorage?.clear) {
          global.localStorage.clear();
        }
        resetConfig();
        resetDefaultCacheAdapter();
      });

      it('没有提供缓存适配器时应该使用模块级默认缓存适配器', async () => {
        // 设置模块级默认缓存适配器
        setDefaultCacheAdapter(new LocalStorageCacheAdapter());

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

      it('config 中的 cacheAdapter 应该覆盖全局配置的 cacheAdapter', async () => {
        // 设置全局配置使用 localStorage 适配器
        configure({ cacheAdapter: new LocalStorageCacheAdapter() });

        // 创建一个内存适配器来跟踪调用
        const memoryCache = new Map<string, { value: unknown; expiresAt: number }>();
        const memoryAdapter: CacheAdapter = {
          async get<T>(key: string): Promise<T | null> {
            const item = memoryCache.get(key);
            if (!item) return null;
            if (Date.now() > item.expiresAt) {
              memoryCache.delete(key);
              return null;
            }
            return item.value as T;
          },
          async set<T>(key: string, value: T, ttl?: number): Promise<void> {
            const expiresAt = ttl ? Date.now() + ttl : Number.MAX_SAFE_INTEGER;
            memoryCache.set(key, { value, expiresAt });
          },
          async delete(key: string): Promise<void> {
            memoryCache.delete(key);
          },
          async clear(): Promise<void> {
            memoryCache.clear();
          },
          async has(key: string): Promise<boolean> {
            const item = memoryCache.get(key);
            if (!item) return false;
            if (Date.now() > item.expiresAt) {
              memoryCache.delete(key);
              return false;
            }
            return true;
          },
        };

        const response: Response<string> = {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: 'result from memory adapter',
        };

        const requestFn = vi.fn().mockResolvedValue(response);
        const idempotentConfig: IdempotentConfig = {
          key: 'override-key',
          ttl: 1000,
          cacheAdapter: memoryAdapter, // 覆盖全局配置
        };

        const idempotentRequest = withIdempotent(requestFn, idempotentConfig);

        // 第一次调用
        const result1 = await idempotentRequest();
        expect(result1).toEqual(response);
        expect(requestFn).toHaveBeenCalledTimes(1);

        // 验证内存适配器中存储了缓存
        expect(memoryCache.has('override-key')).toBe(true);

        // 第二次调用应该从缓存读取
        const result2 = await idempotentRequest();
        expect(result2).toEqual(response);
        expect(requestFn).toHaveBeenCalledTimes(1); // 不应该再次调用
      });

      it('模块级默认缓存适配器应该支持 TTL 过期', async () => {
        // 设置模块级默认缓存适配器
        setDefaultCacheAdapter(new LocalStorageCacheAdapter());

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

      it('config 中的 cacheAdapter 应该覆盖全局配置的 cacheAdapter', async () => {
        // 清理之前的配置
        resetConfig();
        resetDefaultCacheAdapter();
        if (global.localStorage?.clear) {
          global.localStorage.clear();
        }

        // 创建一个内存适配器来跟踪调用
        const memoryCache = new Map<string, { value: unknown; expiresAt: number }>();
        const memoryAdapter: CacheAdapter = {
          async get<T>(key: string): Promise<T | null> {
            const item = memoryCache.get(key);
            if (!item) return null;
            if (Date.now() > item.expiresAt) {
              memoryCache.delete(key);
              return null;
            }
            return item.value as T;
          },
          async set<T>(key: string, value: T, ttl?: number): Promise<void> {
            const expiresAt = ttl ? Date.now() + ttl : Number.MAX_SAFE_INTEGER;
            memoryCache.set(key, { value, expiresAt });
          },
          async delete(key: string): Promise<void> {
            memoryCache.delete(key);
          },
          async clear(): Promise<void> {
            memoryCache.clear();
          },
          async has(key: string): Promise<boolean> {
            const item = memoryCache.get(key);
            if (!item) return false;
            if (Date.now() > item.expiresAt) {
              memoryCache.delete(key);
              return false;
            }
            return true;
          },
        };

        // 设置全局配置使用 localStorage 适配器
        configure({ cacheAdapter: new LocalStorageCacheAdapter() });

        const response: Response<string> = {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: 'result from memory adapter',
        };

        const requestFn = vi.fn().mockResolvedValue(response);
        const idempotentConfig: IdempotentConfig = {
          key: 'override-key',
          ttl: 1000,
          cacheAdapter: memoryAdapter, // 覆盖全局配置
        };

        const idempotentRequest = withIdempotent(requestFn, idempotentConfig);

        // 第一次调用
        const result1 = await idempotentRequest();
        expect(result1).toEqual(response);
        expect(requestFn).toHaveBeenCalledTimes(1);

        // 验证内存适配器中存储了缓存
        expect(memoryCache.has('override-key')).toBe(true);

        // 第二次调用应该从缓存读取
        const result2 = await idempotentRequest();
        expect(result2).toEqual(response);
        expect(requestFn).toHaveBeenCalledTimes(1); // 不应该再次调用
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
