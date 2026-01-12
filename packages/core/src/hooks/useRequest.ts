// useRequest Hook 实现

import type { RequestConfig, RequestInstance } from '../interfaces';
import { createRequest } from '../request';

/**
 * 创建请求实例工厂函数
 * 这是该模块的核心函数，用于创建请求实例
 * @param config 请求配置
 * @returns 请求实例，包含 send 和 cancel 方法
 */
export function createRequestHook<T = unknown>(config: RequestConfig<T>): RequestInstance<T> {
  return createRequest(config);
}

/**
 * useRequest（向后兼容别名）
 *
 * @deprecated 请使用 `createRequest` 或 `createRequestHook` 代替。此函数将在 v2.0 版本中移除或重命名。
 *
 * 注意：此函数不是真正的 React Hook，它是一个简单的工厂函数。
 * 命名以 `use` 开头是历史遗留问题，与 React Hook 命名约定不符。
 *
 * @param config 请求配置
 * @returns 请求实例，包含 send 和 cancel 方法
 * @note 推荐使用 `createRequestHook` 以避免与 React Hook 命名约定混淆
 *       但 `useRequest` 保持导出以确保向后兼容性
 */
export function useRequest<T = unknown>(config: RequestConfig<T>): RequestInstance<T> {
  // 开发环境发出废弃警告
  const _global = globalThis as { process?: { env?: { NODE_ENV?: string } } };
  if (typeof _global.process !== 'undefined' && _global.process.env?.NODE_ENV !== 'production') {
    console.warn(
      '[wl-request] useRequest is deprecated and will be removed in v2.0. ' +
        'Use `createRequest` or `createRequestHook` instead. ' +
        'Note: Despite the "use" prefix, this is NOT a React Hook.'
    );
  }

  return createRequest(config);
}
