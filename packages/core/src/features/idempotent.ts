// 幂等请求功能

import type { CacheAdapter } from '../interfaces';
import type { IdempotentConfig } from '../types';

// 存储正在进行的请求 Promise（每个 key 对应一个 Promise）
const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * 默认缓存适配器
 * 必须通过 setDefaultCacheAdapter 设置，否则使用幂等功能时会抛出错误
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
 * 清除所有正在进行的请求记录
 * 主要用于测试环境清理状态
 */
export function clearPendingRequests(): void {
  pendingRequests.clear();
}

/**
 * 使用幂等机制包装请求函数
 * 相同请求在 TTL 内不会重复执行，而是返回缓存的 Promise 或结果
 * @param requestFn 请求函数，返回 Promise
 * @param idempotentConfig 幂等配置
 * @returns 包装后的请求函数
 */
export function withIdempotent<T>(
  requestFn: () => Promise<T>,
  idempotentConfig: IdempotentConfig
): () => Promise<T> {
  const { key, ttl, cacheAdapter } = idempotentConfig;

  const adapter = cacheAdapter || defaultCacheAdapter;

  if (!adapter) {
    throw new Error(
      'No cache adapter provided for idempotent. Please either pass a cacheAdapter in the config or call setDefaultCacheAdapter() to set a default adapter.'
    );
  }

  return (): Promise<T> => {
    const existingPromise = pendingRequests.get(key);
    if (existingPromise) {
      return existingPromise as Promise<T>;
    }

    const requestPromise = (async (): Promise<T> => {
      const cachedResult = await adapter.get<T>(key);
      if (cachedResult !== null) {
        pendingRequests.delete(key);
        return cachedResult;
      }

      try {
        const result = await requestFn();
        await adapter.set(key, result, ttl);
        return result;
      } finally {
        pendingRequests.delete(key);
      }
    })();

    pendingRequests.set(key, requestPromise);

    return requestPromise;
  };
}
