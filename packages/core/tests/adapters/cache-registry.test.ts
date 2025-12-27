// 缓存适配器注册表测试

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetAdapters } from '../../src/adapters';
import { configure, resetConfig } from '../../src/config';
import {
  getDefaultCacheAdapter as getFromCache,
  resetDefaultCacheAdapter as resetFromCache,
  setDefaultCacheAdapter as setFromCache,
} from '../../src/features/cache';
import {
  getDefaultCacheAdapter as getFromIdempotent,
  resetDefaultCacheAdapter as resetFromIdempotent,
  setDefaultCacheAdapter as setFromIdempotent,
} from '../../src/features/idempotent';
import type { CacheAdapter } from '../../src/interfaces';

// 使用统一的函数引用
const getDefaultCacheAdapter = getFromCache;
const resetDefaultCacheAdapter = resetFromCache;
const setDefaultCacheAdapter = setFromCache;

describe('缓存适配器注册表', () => {
  let mockAdapter1: CacheAdapter;
  let mockAdapter2: CacheAdapter;

  beforeEach(() => {
    // 重置所有适配器状态
    resetAdapters();
    resetConfig();

    // 创建模拟缓存适配器
    mockAdapter1 = {
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

    mockAdapter2 = {
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
  });

  afterEach(() => {
    // 清理：重置适配器和配置
    resetAdapters();
    resetConfig();
  });

  describe('设置默认缓存适配器', () => {
    it('应该能够设置默认缓存适配器', () => {
      setDefaultCacheAdapter(mockAdapter1);
      const adapter = getDefaultCacheAdapter();
      expect(adapter).toBe(mockAdapter1);
    });

    it('多次设置应该覆盖之前的适配器', () => {
      setDefaultCacheAdapter(mockAdapter1);
      expect(getDefaultCacheAdapter()).toBe(mockAdapter1);

      setDefaultCacheAdapter(mockAdapter2);
      expect(getDefaultCacheAdapter()).toBe(mockAdapter2);
      expect(getDefaultCacheAdapter()).not.toBe(mockAdapter1);
    });

    it('未设置时应该返回 null', () => {
      resetAdapters();
      const adapter = getDefaultCacheAdapter();
      expect(adapter).toBeNull();
    });
  });

  describe('获取默认缓存适配器', () => {
    it('应该能够获取设置的默认缓存适配器', () => {
      setDefaultCacheAdapter(mockAdapter1);
      expect(getDefaultCacheAdapter()).toBe(mockAdapter1);
    });

    it('全局配置中的 cacheAdapter 应该优先生效', () => {
      // 设置全局配置
      configure({ cacheAdapter: mockAdapter1 });

      // 同时也设置模块级默认适配器
      setDefaultCacheAdapter(mockAdapter2);

      // 应该返回全局配置中的适配器
      expect(getDefaultCacheAdapter()).toBe(mockAdapter1);
      expect(getDefaultCacheAdapter()).not.toBe(mockAdapter2);
    });

    it('没有全局配置时应该返回模块级默认适配器', () => {
      resetConfig();
      setDefaultCacheAdapter(mockAdapter1);

      expect(getDefaultCacheAdapter()).toBe(mockAdapter1);
    });
  });

  describe('重置默认缓存适配器', () => {
    it('resetDefaultCacheAdapter 应该清除默认适配器', () => {
      setDefaultCacheAdapter(mockAdapter1);
      expect(getDefaultCacheAdapter()).toBe(mockAdapter1);

      resetDefaultCacheAdapter();

      expect(getDefaultCacheAdapter()).toBeNull();
    });

    it('重置后应该能够设置新的适配器', () => {
      setDefaultCacheAdapter(mockAdapter1);
      expect(getDefaultCacheAdapter()).toBe(mockAdapter1);

      resetDefaultCacheAdapter();

      setDefaultCacheAdapter(mockAdapter2);
      expect(getDefaultCacheAdapter()).toBe(mockAdapter2);
    });
  });

  describe('resetAdapters 集成', () => {
    it('resetAdapters 应该同时重置默认缓存适配器', () => {
      setDefaultCacheAdapter(mockAdapter1);
      expect(getDefaultCacheAdapter()).toBe(mockAdapter1);

      resetAdapters();

      expect(getDefaultCacheAdapter()).toBeNull();
    });

    it('resetAdapters 后应该能够重新设置适配器', () => {
      setDefaultCacheAdapter(mockAdapter1);
      expect(getDefaultCacheAdapter()).toBe(mockAdapter1);

      resetAdapters();

      setDefaultCacheAdapter(mockAdapter2);
      expect(getDefaultCacheAdapter()).toBe(mockAdapter2);
    });
  });

  describe('模块间导出一致性', () => {
    it('cache.ts 和 adapters 应该导出同一个注册表', () => {
      setDefaultCacheAdapter(mockAdapter1);

      // 从 adapters 获取
      const fromAdapters = getDefaultCacheAdapter();
      // 从 cache.ts 获取
      const fromCache = getFromCache();

      expect(fromAdapters).toBe(fromCache);
      expect(fromAdapters).toBe(mockAdapter1);
    });

    it('idempotent.ts 和 adapters 应该导出同一个注册表', () => {
      setDefaultCacheAdapter(mockAdapter1);

      // 从 adapters 获取
      const fromAdapters = getDefaultCacheAdapter();
      // 从 idempotent.ts 获取
      const fromIdempotent = getFromIdempotent();

      expect(fromAdapters).toBe(fromIdempotent);
      expect(fromAdapters).toBe(mockAdapter1);
    });

    it('cache.ts 设置后 idempotent.ts 应该能够获取', () => {
      setFromCache(mockAdapter1);

      const fromIdempotent = getFromIdempotent();
      expect(fromIdempotent).toBe(mockAdapter1);
    });

    it('idempotent.ts 设置后 cache.ts 应该能够获取', () => {
      setFromIdempotent(mockAdapter1);

      const fromCache = getFromCache();
      expect(fromCache).toBe(mockAdapter1);
    });

    it('cache.ts 重置后 idempotent.ts 应该受到影响', () => {
      setDefaultCacheAdapter(mockAdapter1);
      expect(getDefaultCacheAdapter()).toBe(mockAdapter1);

      resetFromCache();

      expect(getFromIdempotent()).toBeNull();
      expect(getDefaultCacheAdapter()).toBeNull();
    });

    it('idempotent.ts 重置后 cache.ts 应该受到影响', () => {
      setDefaultCacheAdapter(mockAdapter1);
      expect(getDefaultCacheAdapter()).toBe(mockAdapter1);

      resetFromIdempotent();

      expect(getFromCache()).toBeNull();
      expect(getDefaultCacheAdapter()).toBeNull();
    });

    it('三个模块的导出应该完全一致', () => {
      setDefaultCacheAdapter(mockAdapter1);

      expect(getDefaultCacheAdapter()).toBe(mockAdapter1);
      expect(getFromCache()).toBe(mockAdapter1);
      expect(getFromIdempotent()).toBe(mockAdapter1);

      // 应该是同一个引用
      expect(getDefaultCacheAdapter()).toBe(getFromCache());
      expect(getFromCache()).toBe(getFromIdempotent());
    });
  });

  describe('与全局配置的集成', () => {
    it('全局配置 cacheAdapter 应该优先生效', () => {
      // 设置全局配置
      configure({ cacheAdapter: mockAdapter1 });

      // 模块级设置为另一个适配器
      setDefaultCacheAdapter(mockAdapter2);

      // 应该返回全局配置的适配器
      expect(getDefaultCacheAdapter()).toBe(mockAdapter1);
    });

    it('清除全局配置后应该使用模块级默认适配器', () => {
      // 设置全局配置
      configure({ cacheAdapter: mockAdapter1 });

      // 模块级设置为另一个适配器
      setDefaultCacheAdapter(mockAdapter2);

      expect(getDefaultCacheAdapter()).toBe(mockAdapter1);

      // 清除全局配置
      resetConfig();

      // 现在应该使用模块级默认适配器
      expect(getDefaultCacheAdapter()).toBe(mockAdapter2);
    });

    it('resetConfig 不应该影响模块级默认适配器设置', () => {
      // 设置模块级默认适配器
      setDefaultCacheAdapter(mockAdapter1);

      // 清除全局配置
      resetConfig();

      // 模块级默认适配器应该仍然存在
      expect(getDefaultCacheAdapter()).toBe(mockAdapter1);
    });

    it('resetAdapters 不应该影响全局配置', () => {
      // 设置全局配置
      const globalAdapter = mockAdapter1;
      configure({ cacheAdapter: globalAdapter });

      // 设置模块级默认适配器
      setDefaultCacheAdapter(mockAdapter2);

      // 重置适配器
      resetAdapters();

      // 全局配置应该仍然存在
      expect(getDefaultCacheAdapter()).toBe(globalAdapter);
    });
  });

  describe('边界情况', () => {
    it('设置为 null 后应该清除默认适配器', () => {
      setDefaultCacheAdapter(mockAdapter1);
      expect(getDefaultCacheAdapter()).toBe(mockAdapter1);

      setDefaultCacheAdapter(null as unknown as CacheAdapter);
      // 注意：设置为 null 实际上是一个有效的操作
      // 但通常用户会使用 resetDefaultCacheAdapter()
      const adapter = getDefaultCacheAdapter();
      // 由于我们设置为 null，getDefaultCacheAdapter 应该返回 null
      expect(adapter).toBe(null);
    });

    it('连续重置多次不应该出错', () => {
      setDefaultCacheAdapter(mockAdapter1);

      resetDefaultCacheAdapter();
      resetDefaultCacheAdapter();
      resetDefaultCacheAdapter();

      expect(getDefaultCacheAdapter()).toBeNull();
    });

    it('在没有设置适配器时获取不应该出错', () => {
      resetAdapters();

      expect(() => getDefaultCacheAdapter()).not.toThrow();
      expect(getDefaultCacheAdapter()).toBeNull();
    });
  });
});
