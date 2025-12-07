// 请求缓存功能

import { LocalStorageCacheAdapter } from '../adapters/local-storage-cache-adapter';
import type { CacheAdapter } from '../interfaces';
import type { CacheConfig } from '../types';

/**
 * 默认 LocalStorageCacheAdapter 实例（延迟加载）
 */
let defaultCacheAdapter: CacheAdapter | null = null;

/**
 * 获取默认缓存适配器
 * 使用延迟加载避免在非浏览器环境或未使用缓存时创建
 * @returns LocalStorageCacheAdapter 实例
 */
function getDefaultCacheAdapter(): CacheAdapter {
  if (defaultCacheAdapter) {
    return defaultCacheAdapter;
  }

  defaultCacheAdapter = new LocalStorageCacheAdapter();
  return defaultCacheAdapter;
}

/**
 * 重置默认缓存适配器
 * 用于测试或需要切换默认适配器的场景
 */
export function resetDefaultCacheAdapter(): void {
  defaultCacheAdapter = null;
}

/**
 * 使用缓存包装请求函数
 * @param requestFn 请求函数，返回 Promise
 * @param cacheConfig 缓存配置
 * @returns 包装后的请求函数
 */
export function withCache<T>(
  requestFn: () => Promise<T>,
  cacheConfig: CacheConfig
): () => Promise<T> {
  const { key, ttl, cacheAdapter } = cacheConfig;

  const adapter = cacheAdapter || getDefaultCacheAdapter();

  return async (): Promise<T> => {
    const cachedValue = await adapter.get<T>(key);

    if (cachedValue !== null) {
      return cachedValue;
    }

    const result = await requestFn();

    await adapter.set(key, result, ttl);

    return result;
  };
}
