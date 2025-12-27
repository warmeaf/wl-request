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
 * useRequest Hook（向后兼容别名）
 * 注意：此函数不是真正的 React Hook，没有使用 useCallback 或生命周期管理
 * 它是一个简单的工厂函数，用于创建请求实例
 * @param config 请求配置
 * @returns 请求实例，包含 send 和 cancel 方法
 * @deprecated 建议使用 createRequestHook 以避免与 React Hook 命名约定混淆
 */
export function useRequest<T = unknown>(config: RequestConfig<T>): RequestInstance<T> {
  return createRequest(config);
}
