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
    // 如果没有提供缓存适配器，直接执行请求
    if (!cacheAdapter) {
      return await requestFn();
    }

    // 尝试从缓存获取
    const cachedValue = await cacheAdapter.get<T>(key);

    // 如果缓存命中，直接返回
    if (cachedValue !== null) {
      return cachedValue;
    }

    // 缓存未命中，执行请求
    const result = await requestFn();

    // 请求成功，缓存结果
    await cacheAdapter.set(key, result, ttl);

    return result;
  };
}
