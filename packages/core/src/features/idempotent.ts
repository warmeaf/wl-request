// 幂等请求功能

import {
  getDefaultCacheAdapter,
  resetDefaultCacheAdapter,
  setDefaultCacheAdapter,
} from '../adapters';
import type { RequestConfig } from '../interfaces';
import type { IdempotentConfig } from '../types';

/**
 * 存储正在进行的请求 Promise（每个 key 对应一个 Promise）
 *
 * ## 内存泄漏防护说明
 *
 * 模块级 Map 会持有 Promise 引用，但通过以下机制确保不会内存泄漏：
 *
 * 1. **finally 块清理**：无论请求成功、失败还是抛出异常，finally 块都会执行，
 *    确保 pendingRequests.delete(key) 被调用。
 *
 * 2. **测试环境支持**：提供了 clearPendingRequests() 函数用于测试清理。
 *
 * 3. **正常使用场景**：
 *    - 请求成功 → Promise resolve → finally 执行清理
 *    - 请求失败 → Promise reject → finally 执行清理
 *    - 请求取消 → Promise reject → finally 执行清理
 *
 * 注意：如果程序被强制终止（如进程被 kill），finally 块可能不会执行，
 * 但这种情况下所有内存都会被操作系统回收，不会造成长期泄漏。
 */
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
 * @param requestConfig 请求配置（用于获取顶层的 cacheAdapter）
 * @returns 包装后的请求函数
 */
export function withIdempotent<T, C = unknown>(
  requestFn: () => Promise<T>,
  idempotentConfig: IdempotentConfig,
  requestConfig?: RequestConfig<C>
): () => Promise<T> {
  const { key, ttl, cacheAdapter } = idempotentConfig;

  // 优先级：idempotent.cacheAdapter > RequestConfig.cacheAdapter > getDefaultCacheAdapter()
  const adapter = cacheAdapter || requestConfig?.cacheAdapter || getDefaultCacheAdapter();

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
