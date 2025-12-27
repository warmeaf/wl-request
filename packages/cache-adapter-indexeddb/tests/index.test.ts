// IndexedDB 缓存适配器测试

import 'fake-indexeddb/auto';
import type { CacheAdapter, Response } from '@wl-request/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { IndexedDBCacheAdapter } from '../src/index';

describe('IndexedDBCacheAdapter', () => {
  let adapter: CacheAdapter;
  const DB_NAME = 'wl-request-cache-test';
  const STORE_NAME = 'cache';

  beforeEach(async () => {
    // 清理之前的测试数据
    adapter = new IndexedDBCacheAdapter(DB_NAME, STORE_NAME);
    await adapter.clear();
  });

  describe('数据库初始化', () => {
    it('应该能够初始化数据库和对象存储', async () => {
      // 创建适配器实例应该成功
      const newAdapter = new IndexedDBCacheAdapter(DB_NAME, STORE_NAME);
      expect(newAdapter).toBeDefined();

      // 应该能够执行基本操作
      await newAdapter.set('test-key', 'test-value');
      const value = await newAdapter.get<string>('test-key');
      expect(value).toBe('test-value');
    });

    it('应该能够使用不同的数据库名称', async () => {
      const adapter1 = new IndexedDBCacheAdapter('db1', STORE_NAME);
      const adapter2 = new IndexedDBCacheAdapter('db2', STORE_NAME);

      await adapter1.set('key', 'value1');
      await adapter2.set('key', 'value2');

      expect(await adapter1.get<string>('key')).toBe('value1');
      expect(await adapter2.get<string>('key')).toBe('value2');

      await adapter1.clear();
      await adapter2.clear();
    });
  });

  describe('异步缓存操作', () => {
    it('所有操作都应该是异步的', async () => {
      const setPromise = adapter.set('async-key', 'async-value');
      expect(setPromise).toBeInstanceOf(Promise);

      await setPromise;

      const getPromise = adapter.get<string>('async-key');
      expect(getPromise).toBeInstanceOf(Promise);

      const value = await getPromise;
      expect(value).toBe('async-value');
    });
  });

  describe('缓存写入和读取', () => {
    it('应该能够正确存储和获取缓存值', async () => {
      const key = 'test-key';
      const value = { data: 'test value', count: 42 };

      await adapter.set(key, value);
      const result = await adapter.get<typeof value>(key);

      expect(result).toEqual(value);
    });

    it('应该能够存储和获取不同类型的值', async () => {
      // 字符串
      await adapter.set('string-key', 'string value');
      expect(await adapter.get<string>('string-key')).toBe('string value');

      // 数字
      await adapter.set('number-key', 123);
      expect(await adapter.get<number>('number-key')).toBe(123);

      // 布尔值
      await adapter.set('boolean-key', true);
      expect(await adapter.get<boolean>('boolean-key')).toBe(true);

      // 对象
      const obj = { name: 'test', count: 42 };
      await adapter.set('object-key', obj);
      expect(await adapter.get<typeof obj>('object-key')).toEqual(obj);

      // 数组
      const arr = [1, 2, 3];
      await adapter.set('array-key', arr);
      expect(await adapter.get<typeof arr>('array-key')).toEqual(arr);
    });

    it('不存在的键应该返回 null', async () => {
      const result = await adapter.get('non-existent-key');
      expect(result).toBeNull();
    });
  });

  describe('TTL 过期清理', () => {
    it('设置了 TTL 的缓存项在过期后应该返回 null', async () => {
      const key = 'ttl-key';
      const value = 'ttl value';

      // 设置缓存，TTL 为 100ms
      await adapter.set(key, value, 100);

      // 立即获取应该能获取到
      expect(await adapter.get<string>(key)).toBe(value);

      // 等待 TTL 过期
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 过期后应该返回 null
      expect(await adapter.get<string>(key)).toBeNull();
    });

    it('未设置 TTL 的缓存项应该永久有效', async () => {
      const key = 'no-ttl-key';
      const value = 'no ttl value';

      // 设置缓存，不设置 TTL
      await adapter.set(key, value);

      // 等待一段时间
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 应该仍然能获取到
      expect(await adapter.get<string>(key)).toBe(value);
    });

    it('TTL 为 0 的缓存项应该立即过期', async () => {
      const key = 'zero-ttl-key';
      const value = 'zero ttl value';

      await adapter.set(key, value, 0);

      // 立即获取应该返回 null
      expect(await adapter.get<string>(key)).toBeNull();
    });
  });

  describe('缓存删除', () => {
    it('应该能够删除指定的缓存项', async () => {
      const key = 'delete-key';
      const value = 'delete value';

      // 设置缓存
      await adapter.set(key, value);
      expect(await adapter.get<string>(key)).toBe(value);

      // 删除缓存
      await adapter.delete(key);

      // 应该返回 null
      expect(await adapter.get<string>(key)).toBeNull();
    });

    it('删除不存在的键不应该抛出错误', async () => {
      await expect(adapter.delete('non-existent-key')).resolves.not.toThrow();
    });

    it('删除后应该能够重新设置相同的键', async () => {
      const key = 'reuse-key';
      const value1 = 'value 1';
      const value2 = 'value 2';

      // 设置第一个值
      await adapter.set(key, value1);
      expect(await adapter.get<string>(key)).toBe(value1);

      // 删除
      await adapter.delete(key);

      // 设置第二个值
      await adapter.set(key, value2);
      expect(await adapter.get<string>(key)).toBe(value2);
    });
  });

  describe('缓存清空', () => {
    it('应该能够清空所有缓存', async () => {
      // 设置多个缓存项
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      await adapter.set('key3', 'value3');

      // 验证都存在
      expect(await adapter.get<string>('key1')).toBe('value1');
      expect(await adapter.get<string>('key2')).toBe('value2');
      expect(await adapter.get<string>('key3')).toBe('value3');

      // 清空所有缓存
      await adapter.clear();

      // 验证都不存在了
      expect(await adapter.get<string>('key1')).toBeNull();
      expect(await adapter.get<string>('key2')).toBeNull();
      expect(await adapter.get<string>('key3')).toBeNull();
    });

    it('清空后应该能够重新设置缓存', async () => {
      const key = 'after-clear-key';
      const value = 'after clear value';

      // 设置并清空
      await adapter.set(key, value);
      await adapter.clear();

      // 重新设置
      await adapter.set(key, value);
      expect(await adapter.get<string>(key)).toBe(value);
    });
  });

  describe('错误处理', () => {
    it('在 IndexedDB 不可用的环境中应该优雅处理', async () => {
      // 模拟 IndexedDB 不可用的情况
      const originalIDB = global.indexedDB;
      // @ts-expect-error - 测试环境模拟
      global.indexedDB = undefined;

      try {
        // 应该能够创建适配器实例（不抛出错误）
        const testAdapter = new IndexedDBCacheAdapter('test-db', 'test-store');
        expect(testAdapter).toBeDefined();

        // 操作可能会失败，但不应该抛出未捕获的错误
        await expect(testAdapter.set('key', 'value')).rejects.toThrow();
      } finally {
        // 恢复原始 IndexedDB
        global.indexedDB = originalIDB;
      }
    });
  });

  describe('并发操作', () => {
    it('应该能够正确处理并发读写操作', async () => {
      const key = 'concurrent-key';
      const values = Array.from({ length: 10 }, (_, i) => `value-${i}`);

      // 并发写入
      await Promise.all(values.map((value, index) => adapter.set(`${key}-${index}`, value)));

      // 并发读取
      const results = await Promise.all(
        values.map((_, index) => adapter.get<string>(`${key}-${index}`))
      );

      // 验证所有值都正确
      results.forEach((result, index) => {
        expect(result).toBe(values[index]);
      });
    });

    it('应该能够正确处理并发删除操作', async () => {
      const keys = Array.from({ length: 5 }, (_, i) => `delete-key-${i}`);

      // 设置多个缓存项
      await Promise.all(keys.map((key) => adapter.set(key, `value-${key}`)));

      // 并发删除
      await Promise.all(keys.map((key) => adapter.delete(key)));

      // 验证都已删除
      const results = await Promise.all(keys.map((key) => adapter.get<string>(key)));
      results.forEach((result) => {
        expect(result).toBeNull();
      });
    });
  });

  describe('Response 对象序列化', () => {
    it('应该能够存储包含 raw 属性的 Response 对象', async () => {
      const mockRawResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        body: new ReadableStream(), // 模拟不可序列化的流
      };

      const response: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: 'test data',
        raw: mockRawResponse,
      };

      // 应该能够成功存储（不会抛出错误）
      await expect(adapter.set('response-key', response)).resolves.not.toThrow();

      // 读取时应该返回不包含 raw 的对象
      const cached = await adapter.get<Response<string>>('response-key');
      expect(cached).not.toBeNull();
      expect(cached?.status).toBe(200);
      expect(cached?.statusText).toBe('OK');
      expect(cached?.headers).toEqual({ 'content-type': 'application/json' });
      expect(cached?.data).toBe('test data');
      expect(cached?.raw).toBeUndefined(); // raw 应该被移除
    });

    it('应该能够存储不包含 raw 属性的 Response 对象', async () => {
      const response: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'test data',
      };

      await adapter.set('response-key-2', response);
      const cached = await adapter.get<Response<string>>('response-key-2');
      expect(cached).toEqual(response);
    });
  });

  describe('has 方法', () => {
    it('存在的缓存键应该返回 true', async () => {
      const key = 'has-key';
      const value = 'has value';

      await adapter.set(key, value);
      expect(await adapter.has(key)).toBe(true);
    });

    it('不存在的缓存键应该返回 false', async () => {
      expect(await adapter.has('non-existent-key')).toBe(false);
    });

    it('过期的缓存键应该返回 false 并被删除', async () => {
      const key = 'expired-has-key';
      const value = 'expired value';

      // 设置缓存，TTL 为 50ms
      await adapter.set(key, value, 50);

      // 立即检查应该返回 true
      expect(await adapter.has(key)).toBe(true);

      // 等待 TTL 过期
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 过期后应该返回 false
      expect(await adapter.has(key)).toBe(false);

      // 并且缓存应该已被删除
      expect(await adapter.get(key)).toBeNull();
    });

    it('has 方法不应该影响缓存值', async () => {
      const key = 'has-preserve-key';
      const value = { preserved: true };

      await adapter.set(key, value);
      await adapter.has(key);

      expect(await adapter.get(key)).toEqual(value);
    });
  });

  describe('cleanup 方法', () => {
    it('应该清理所有过期的缓存项', async () => {
      // 设置多个缓存项，其中一些会过期
      await adapter.set('expired-1', 'value1', 50);
      await adapter.set('expired-2', 'value2', 50);
      await adapter.set('valid-1', 'value3', 5000);
      await adapter.set('valid-2', 'value4', 5000);

      // 等待部分缓存过期
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 执行清理
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

      // 执行清理
      await adapter.cleanup();

      // 所有缓存应该都被保留
      for (let i = 0; i < keys.length; i++) {
        expect(await adapter.get<string>(keys[i])).toBe(values[i]);
      }
    });

    it('清理后不应该能够获取到被删除的缓存', async () => {
      const key = 'cleanup-delete-key';
      const value = 'cleanup value';

      await adapter.set(key, value, 50);
      await new Promise((resolve) => setTimeout(resolve, 100));

      await adapter.cleanup();
      expect(await adapter.get(key)).toBeNull();
    });

    it('cleanup 不应该抛出错误', async () => {
      await expect(adapter.cleanup()).resolves.not.toThrow();
    });

    it('空缓存执行 cleanup 不应该抛出错误', async () => {
      await adapter.clear();
      await expect(adapter.cleanup()).resolves.not.toThrow();
    });
  });
});
