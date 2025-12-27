// useParallelRequests Hook 实现

import { parallelRequests } from '../features/parallel';
import type { RequestConfig, Response } from '../interfaces';
import { createRequest } from '../request';
import type { RequestError } from '../types';

/**
 * 并行请求 Hook 配置
 */
export interface ParallelRequestsHookConfig<T = unknown> {
  /** 所有请求开始前的钩子 */
  onBefore?: () => void | Promise<void>;
  /** 所有请求成功后的钩子 */
  onSuccess?: (results: Response<T>[]) => void | Promise<void>;
  /** 有请求失败时的钩子 */
  onError?: (errors: RequestError[]) => void | Promise<void>;
  /** 所有请求完成后的钩子 */
  onFinally?: () => void | Promise<void>;
  /** 失败策略：true=有一个失败就整体失败（默认），false=允许部分失败，只返回成功的结果 */
  failFast?: boolean;
}

/**
 * 并行请求 Hook 返回值
 */
export interface ParallelRequestsHookResult<T = unknown> {
  /** 发送所有请求 */
  send: () => Promise<Response<T>[]>;
  /** 取消所有请求 */
  cancel: () => void;
}

/**
 * useParallelRequests Hook
 * 并行执行多个请求，返回 send 和 cancel 方法
 * 不维护内部状态，状态由使用者通过生命周期钩子管理
 * @param configs 请求配置数组
 * @param hookConfig 钩子配置
 * @returns 并行请求实例，包含 send 和 cancel 方法
 */
export function useParallelRequests<T = unknown>(
  configs: RequestConfig<T>[],
  hookConfig?: ParallelRequestsHookConfig<T>
): ParallelRequestsHookResult<T> {
  const requestInstances = configs.map((config) => createRequest(config));
  const abortController = new AbortController();

  const send = async (): Promise<Response<T>[]> => {
    try {
      if (hookConfig?.onBefore) {
        await hookConfig.onBefore();
      }

      const requestFns = requestInstances.map((instance) => () => instance.send());

      const results = await parallelRequests(requestFns);

      const successResults: Response<T>[] = [];
      const errors: RequestError[] = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          successResults.push(result.value);
        } else {
          errors.push(result.reason as RequestError);
        }
      }

      if (errors.length > 0) {
        if (hookConfig?.onError) {
          await hookConfig.onError(errors);
        }

        if (hookConfig?.failFast !== false) {
          throw errors[0];
        }
      }

      // failFast: false 时，即使没有成功结果也调用 onSuccess（空数组）
      if (hookConfig?.onSuccess) {
        await hookConfig.onSuccess(successResults);
      }

      return successResults;
    } finally {
      if (hookConfig?.onFinally) {
        await hookConfig.onFinally();
      }
    }
  };

  const cancel = (): void => {
    abortController.abort();
    requestInstances.forEach((instance) => {
      instance.cancel();
    });
  };

  return {
    send,
    cancel,
  };
}
