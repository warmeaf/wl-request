// 请求缓存功能

import type { CacheConfig } from '../types';

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

  return async (): Promise<T> => {
    if (!cacheAdapter) {
      return await requestFn();
    }

    const cachedValue = await cacheAdapter.get<T>(key);

    if (cachedValue !== null) {
      return cachedValue;
    }

    const result = await requestFn();

    await cacheAdapter.set(key, result, ttl);

    return result;
  };
}
