// 请求缓存功能

import { getGlobalConfig } from '../config';
import type { CacheAdapter } from '../interfaces';
import type { CacheConfig } from '../types';

/**
 * 默认缓存适配器
 * 必须通过 setDefaultCacheAdapter 设置，或者在全局配置中指定
 */
let defaultCacheAdapter: CacheAdapter | null = null;

/**
 * 设置默认缓存适配器
 * @param adapter 缓存适配器实例
 */
export function setDefaultCacheAdapter(adapter: CacheAdapter): void {
  defaultCacheAdapter = adapter;
}

/**
 * 获取默认缓存适配器
 * @returns 当前默认缓存适配器，未设置时返回 null
 */
export function getDefaultCacheAdapter(): CacheAdapter | null {
  const globalConfig = getGlobalConfig();
  if (globalConfig.cacheAdapter) {
    return globalConfig.cacheAdapter;
  }
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
