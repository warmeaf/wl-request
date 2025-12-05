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
    // 如果没有提供缓存适配器，直接执行请求
    if (!cacheAdapter) {
      return requestFn();
    }

    // 检查是否已有正在进行的请求（同步检查，避免竞态条件）
    const existingPromise = pendingRequests.get(key);
    if (existingPromise) {
      return existingPromise as Promise<T>;
    }

    // 创建新的请求 Promise，包含缓存检查和请求执行
    // 立即注册到 pendingRequests，确保并发请求能够共享同一个 Promise
    const requestPromise = (async (): Promise<T> => {
      // 检查是否已有缓存的结果
      const cachedResult = await cacheAdapter.get<T>(key);
      if (cachedResult !== null) {
        // 缓存命中，清除 pending 状态并返回
        pendingRequests.delete(key);
        return cachedResult;
      }

      // 缓存未命中，执行请求
      try {
        const result = await requestFn();
        // 请求成功，缓存结果
        await cacheAdapter.set(key, result, ttl);
        return result;
      } finally {
        // 无论成功还是失败，都清除 pending 状态
        pendingRequests.delete(key);
      }
    })();

    // 立即记录正在进行的请求（同步操作，在任何 await 之前）
    pendingRequests.set(key, requestPromise);

    // 设置超时清理机制，防止内存泄漏
    setTimeout(() => {
      // 检查是否仍然是同一个 Promise（可能已经被清理）
      if (pendingRequests.get(key) === requestPromise) {
        pendingRequests.delete(key);
      }
    }, ttl);

    return requestPromise;
  };
}
