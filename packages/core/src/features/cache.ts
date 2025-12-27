// 请求缓存功能

import {
  getDefaultCacheAdapter,
  resetDefaultCacheAdapter,
  setDefaultCacheAdapter,
} from '../adapters';
import type { CacheConfig } from '../types';

// 重新导出缓存适配器注册表函数，保持向后兼容
export { setDefaultCacheAdapter, resetDefaultCacheAdapter, getDefaultCacheAdapter };

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
  const { key, ttl, cacheAdapter: configAdapter } = cacheConfig;

  const adapter = configAdapter || getDefaultCacheAdapter();

  if (!adapter) {
    throw new Error(
      'No cache adapter provided. Please either pass a cacheAdapter in config, set a default adapter via configure(), or call setDefaultCacheAdapter() to set a default adapter.'
    );
  }

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
