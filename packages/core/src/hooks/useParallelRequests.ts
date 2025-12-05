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
  // 为每个配置创建请求实例
  const requestInstances = configs.map((config) => createRequest(config));

  // send 方法
  const send = async (): Promise<Response<T>[]> => {
    try {
      // 调用 onBefore 钩子
      if (hookConfig?.onBefore) {
        await hookConfig.onBefore();
      }

      // 收集所有请求的 send 方法
      const requestFns = requestInstances.map((instance) => () => instance.send());

      // 并行执行所有请求
      const results = await parallelRequests(requestFns);

      // 分离成功和失败的结果
      const successResults: Response<T>[] = [];
      const errors: RequestError[] = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          successResults.push(result.value);
        } else {
          errors.push(result.reason as RequestError);
        }
      }

      // 如果有错误，调用 onError 钩子并抛出第一个错误
      if (errors.length > 0) {
        if (hookConfig?.onError) {
          await hookConfig.onError(errors);
        }
        throw errors[0];
      }

      // 所有请求都成功，调用 onSuccess 钩子
      if (hookConfig?.onSuccess) {
        await hookConfig.onSuccess(successResults);
      }

      return successResults;
    } finally {
      // 调用 onFinally 钩子
      if (hookConfig?.onFinally) {
        await hookConfig.onFinally();
      }
    }
  };

  // cancel 方法
  const cancel = (): void => {
    // 取消所有请求实例
    requestInstances.forEach((instance) => {
      instance.cancel();
    });
  };

  return {
    send,
    cancel,
  };
}
