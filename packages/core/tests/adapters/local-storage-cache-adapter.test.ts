// LocalStorage 缓存适配器测试

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageCacheAdapter } from '../../src/adapters/local-storage-cache-adapter';
import type { Response } from '../../src/interfaces';

describe('LocalStorageCacheAdapter', () => {
  let adapter: LocalStorageCacheAdapter;
  const originalLocalStorage = global.localStorage;

  beforeEach(() => {
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
        for (const key of Object.keys(storage)) {
          delete storage[key];
        }
      }),
      get length() {
        return Object.keys(storage).length;
      },
      key: vi.fn((index: number) => Object.keys(storage)[index] || null),
    } as Storage;

    adapter = new LocalStorageCacheAdapter();
  });

  afterEach(() => {
    // 清理 localStorage
    if (global.localStorage.clear) {
      global.localStorage.clear();
    }
    global.localStorage = originalLocalStorage;
  });

  describe('基本功能', () => {
    it('应该能够存储和获取值', async () => {
      const value = { data: 'test' };
      await adapter.set('test-key', value);
      const result = await adapter.get('test-key');
      expect(result).toEqual(value);
    });

    it('应该能够删除缓存', async () => {
      await adapter.set('test-key', 'value');
      await adapter.delete('test-key');
      const result = await adapter.get('test-key');
      expect(result).toBeNull();
    });

    it('应该能够清空所有缓存', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      await adapter.clear();
      expect(await adapter.get('key1')).toBeNull();
      expect(await adapter.get('key2')).toBeNull();
    });
  });

  describe('TTL 过期机制', () => {
    it('缓存在过期后应该返回 null', async () => {
      await adapter.set('test-key', 'value', 100);
      const result1 = await adapter.get('test-key');
      expect(result1).toBe('value');

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 150));

      const result2 = await adapter.get('test-key');
      expect(result2).toBeNull();
    });

    it('过期缓存应该自动清理', async () => {
      await adapter.set('test-key', 'value', 100);
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 获取过期缓存应该返回 null 并删除
      await adapter.get('test-key');
      const stored = global.localStorage.getItem('wl-request:test-key');
      expect(stored).toBeNull();
    });

    it('ttl <= 0 时应该立即过期', async () => {
      await adapter.set('test-key', 'value', 0);
      const result = await adapter.get('test-key');
      expect(result).toBeNull();
    });

    it('未提供 ttl 时应该永不过期', async () => {
      await adapter.set('test-key', 'value');
      const result = await adapter.get('test-key');
      expect(result).toBe('value');
    });
  });

  describe('序列化', () => {
    it('应该能够序列化和反序列化复杂对象', async () => {
      const complexValue = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' },
        },
        date: new Date().toISOString(),
      };
      await adapter.set('complex-key', complexValue);
      const result = await adapter.get<typeof complexValue>('complex-key');
      expect(result).toEqual(complexValue);
    });

    it('应该能够序列化 Response 对象并移除 raw 属性', async () => {
      const response: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
        data: 'test data',
        raw: { some: 'raw data' }, // 这个属性应该被移除
      };

      await adapter.set('response-key', response);
      const result = await adapter.get<Response<string>>('response-key');

      expect(result).toEqual({
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
        data: 'test data',
      });
      expect(result).not.toHaveProperty('raw');
    });
  });

  describe('前缀功能', () => {
    it('应该使用默认前缀 "wl-request:"', async () => {
      await adapter.set('test-key', 'value');
      const stored = global.localStorage.getItem('wl-request:test-key');
      expect(stored).toBeTruthy();
    });

    it('应该支持自定义前缀', async () => {
      const customAdapter = new LocalStorageCacheAdapter('custom-prefix:');
      await customAdapter.set('test-key', 'value');
      const stored = global.localStorage.getItem('custom-prefix:test-key');
      expect(stored).toBeTruthy();
      expect(global.localStorage.getItem('wl-request:test-key')).toBeNull();
    });

    it('get 方法应该使用正确的前缀', async () => {
      await adapter.set('test-key', 'value');
      // 直接设置一个不带前缀的键，应该获取不到
      global.localStorage.setItem(
        'test-key',
        JSON.stringify({ value: 'wrong', expiresAt: Number.MAX_SAFE_INTEGER })
      );
      const result = await adapter.get('test-key');
      expect(result).toBe('value'); // 应该获取到带前缀的值
    });

    it('delete 方法应该使用正确的前缀', async () => {
      await adapter.set('test-key', 'value');
      await adapter.delete('test-key');
      const stored = global.localStorage.getItem('wl-request:test-key');
      expect(stored).toBeNull();
    });

    it('clear 方法应该只清除带前缀的键', async () => {
      // 设置带前缀的键
      await adapter.set('key1', 'value1');
      // 设置不带前缀的键
      global.localStorage.setItem('other-key', 'other-value');
      await adapter.clear();
      expect(global.localStorage.getItem('wl-request:key1')).toBeNull();
      expect(global.localStorage.getItem('other-key')).toBe('other-value');
    });
  });

  describe('错误处理', () => {
    it('localStorage 不可用时应该抛出错误', () => {
      // 保存原始 localStorage
      const originalLocalStorage = global.localStorage;
      // @ts-expect-error - 临时删除 localStorage
      delete global.localStorage;
      expect(() => {
        new LocalStorageCacheAdapter();
      }).toThrow('localStorage is not available in this environment');
      // 恢复 localStorage
      global.localStorage = originalLocalStorage;
    });

    it('存储配额满时应该抛出错误', async () => {
      const errorAdapter = new LocalStorageCacheAdapter();
      // 模拟存储配额满
      global.localStorage.setItem = vi.fn(() => {
        const error = new Error('QuotaExceededError');
        (error as Error & { code?: number }).code = 22;
        throw error;
      });

      await expect(errorAdapter.set('test-key', 'value')).rejects.toThrow();
    });

    it('getItem 失败时应该返回 null', async () => {
      global.localStorage.getItem = vi.fn(() => {
        throw new Error('Storage error');
      });

      const result = await adapter.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('has 方法', () => {
    it('缓存存在且未过期时应该返回 true', async () => {
      await adapter.set('test-key', 'value', 1000);
      const result = await adapter.has('test-key');
      expect(result).toBe(true);
    });

    it('缓存不存在时应该返回 false', async () => {
      const result = await adapter.has('non-existent');
      expect(result).toBe(false);
    });

    it('缓存已过期时应该返回 false 并清理', async () => {
      await adapter.set('test-key', 'value', 100);
      await new Promise((resolve) => setTimeout(resolve, 150));

      const result = await adapter.has('test-key');
      expect(result).toBe(false);

      // 验证缓存已被清理
      const stored = global.localStorage.getItem('wl-request:test-key');
      expect(stored).toBeNull();
    });

    it('应该能够区分 null 值和不存在的缓存', async () => {
      // 缓存 null 值
      await adapter.set('null-key', null);

      // has 应该返回 true（因为缓存存在，虽然值是 null）
      const hasResult = await adapter.has('null-key');
      expect(hasResult).toBe(true);

      // get 返回 null（这是缓存的值）
      const getResult = await adapter.get('null-key');
      expect(getResult).toBeNull();

      // 不存在的键
      const hasNonExistent = await adapter.has('non-existent');
      expect(hasNonExistent).toBe(false);
    });

    it('损坏的 JSON 数据应该返回 false 并清理', async () => {
      global.localStorage.setItem('wl-request:corrupted', 'invalid json');
      const result = await adapter.has('corrupted');
      expect(result).toBe(false);
    });

    it('缺少 expiresAt 的数据应该返回 false 并清理', async () => {
      global.localStorage.setItem('wl-request:old-key', JSON.stringify({ value: 'old-value' }));
      const result = await adapter.has('old-key');
      expect(result).toBe(false);
    });

    it('has 方法中 getItem 抛出非 QuotaExceededError 时应该返回 false', async () => {
      global.localStorage.getItem = vi.fn(() => {
        throw new Error('Random storage error');
      });

      const result = await adapter.has('test-key');
      expect(result).toBe(false);
    });
  });

  describe('边界情况', () => {
    it('应该能够处理 null 值', async () => {
      await adapter.set('null-key', null);
      const result = await adapter.get('null-key');
      expect(result).toBeNull();
    });

    it('应该能够处理 undefined 值', async () => {
      await adapter.set('undefined-key', undefined);
      const result = await adapter.get('undefined-key');
      expect(result).toBeUndefined();
    });

    it('应该能够处理空字符串键', async () => {
      await adapter.set('', 'empty-key-value');
      const result = await adapter.get('');
      expect(result).toBe('empty-key-value');
    });

    it('应该能够处理空对象', async () => {
      await adapter.set('empty-obj', {});
      const result = await adapter.get('empty-obj');
      expect(result).toEqual({});
    });

    it('应该能够处理空数组', async () => {
      await adapter.set('empty-array', []);
      const result = await adapter.get('empty-array');
      expect(result).toEqual([]);
    });

    it('获取不存在的键应该返回 null', async () => {
      const result = await adapter.get('non-existent');
      expect(result).toBeNull();
    });

    it('应该能够处理损坏的 JSON 数据', async () => {
      global.localStorage.setItem('wl-request:corrupted', 'invalid json');
      const result = await adapter.get('corrupted');
      expect(result).toBeNull();
    });

    it('应该能够处理缺少 expiresAt 的旧数据', async () => {
      // 模拟旧格式的数据（没有 expiresAt）
      global.localStorage.setItem('wl-request:old-key', JSON.stringify({ value: 'old-value' }));
      const result = await adapter.get('old-key');
      // 应该能够处理，返回 null 或值（取决于实现）
      expect(result).toBeNull();
    });
  });

  describe('cleanup 方法', () => {
    it('应该清理所有过期的缓存项', async () => {
      await adapter.set('expired-1', 'value1', 50);
      await adapter.set('expired-2', 'value2', 50);
      await adapter.set('valid-1', 'value3', 10000);
      await adapter.set('valid-2', 'value4', 10000);

      // 等待部分缓存过期
      await new Promise((resolve) => setTimeout(resolve, 100));

      await adapter.cleanup();

      // 过期的缓存应该被删除
      expect(await adapter.get('expired-1')).toBeNull();
      expect(await adapter.get('expired-2')).toBeNull();

      // 未过期的缓存应该保留
      expect(await adapter.get('valid-1')).toBe('value3');
      expect(await adapter.get('valid-2')).toBe('value4');
    });

    it('应该保留所有未过期的缓存项', async () => {
      const keys = ['keep-1', 'keep-2', 'keep-3'];
      const values = ['value1', 'value2', 'value3'];

      // 设置多个长期有效的缓存
      for (let i = 0; i < keys.length; i++) {
        await adapter.set(keys[i], values[i], 10000);
      }

      await adapter.cleanup();

      // 所有缓存应该都被保留
      for (let i = 0; i < keys.length; i++) {
        expect(await adapter.get<string>(keys[i])).toBe(values[i]);
      }
    });

    it('cleanup 中遇到损坏的 JSON 应该跳过该项目', async () => {
      await adapter.set('valid-1', 'value1', 10000);
      // 手动添加损坏的缓存数据
      global.localStorage.setItem('wl-request:corrupted', 'invalid json');

      // 不应该抛出错误
      await expect(adapter.cleanup()).resolves.not.toThrow();

      // 有效的缓存应该保留
      expect(await adapter.get('valid-1')).toBe('value1');
    });

    it('cleanup 中遇到 localStorage 错误应该静默处理', async () => {
      await adapter.set('valid-1', 'value1', 10000);

      // 模拟 localStorage.length 抛出错误
      const originalLength = Object.getOwnPropertyDescriptor(localStorage, 'length');
      Object.defineProperty(localStorage, 'length', {
        get: () => {
          throw new Error('Storage error');
        },
      });

      try {
        // 不应该抛出错误
        await expect(adapter.cleanup()).resolves.not.toThrow();
      } finally {
        // 恢复原始属性
        if (originalLength) {
          Object.defineProperty(localStorage, 'length', originalLength);
        }
      }
    });
  });
});
