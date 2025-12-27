// 幂等请求功能

import {
  getDefaultCacheAdapter,
  resetDefaultCacheAdapter,
  setDefaultCacheAdapter,
} from '../adapters';
import type { IdempotentConfig } from '../types';

// 存储正在进行的请求 Promise（每个 key 对应一个 Promise）
const pendingRequests = new Map<string, Promise<unknown>>();

// 重新导出缓存适配器注册表函数，保持向后兼容
export { setDefaultCacheAdapter, resetDefaultCacheAdapter, getDefaultCacheAdapter };

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

  const adapter = cacheAdapter || getDefaultCacheAdapter();

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
      try {
        const cachedResult = await adapter.get<T>(key);
        if (cachedResult !== null) {
          return cachedResult;
        }

        const result = await requestFn();
        try {
          await adapter.set(key, result, ttl);
        } catch {
          // 缓存设置失败不应该阻止结果返回
        }
        return result;
      } finally {
        pendingRequests.delete(key);
      }
    })();

    pendingRequests.set(key, requestPromise);

    return requestPromise;
  };
}
