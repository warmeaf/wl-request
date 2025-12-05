// 幂等请求功能

import type { IdempotentConfig } from '../types';

// 存储正在进行的请求 Promise（每个 key 对应一个 Promise）
const pendingRequests = new Map<string, Promise<unknown>>();

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

  return (): Promise<T> => {
    if (!cacheAdapter) {
      return requestFn();
    }

    const existingPromise = pendingRequests.get(key);
    if (existingPromise) {
      return existingPromise as Promise<T>;
    }

    const requestPromise = (async (): Promise<T> => {
      const cachedResult = await cacheAdapter.get<T>(key);
      if (cachedResult !== null) {
        pendingRequests.delete(key);
        return cachedResult;
      }

      try {
        const result = await requestFn();
        await cacheAdapter.set(key, result, ttl);
        return result;
      } finally {
        pendingRequests.delete(key);
      }
    })();

    pendingRequests.set(key, requestPromise);

    setTimeout(() => {
      if (pendingRequests.get(key) === requestPromise) {
        pendingRequests.delete(key);
      }
    }, ttl);

    return requestPromise;
  };
}
