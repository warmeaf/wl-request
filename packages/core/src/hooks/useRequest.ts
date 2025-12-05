// useRequest Hook 实现

import type { RequestConfig, RequestInstance } from '../interfaces';
import { createRequest } from '../request';

/**
 * useRequest Hook
 * 创建请求实例，返回 send 和 cancel 方法
 * 不维护内部状态，状态由使用者通过生命周期钩子管理
 * @param config 请求配置
 * @returns 请求实例，包含 send 和 cancel 方法
 */
export function useRequest<T = unknown>(config: RequestConfig<T>): RequestInstance<T> {
  return createRequest(config);
}
