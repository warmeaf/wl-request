// useSerialRequests Hook 实现

import { serialRequests } from '../features/serial';
import type { RequestConfig, Response } from '../interfaces';
import { createRequest } from '../request';
import type { RequestError } from '../types';

/**
 * 串行请求 Hook 配置
 */
export interface SerialRequestsHookConfig<T = unknown> {
  /** 所有请求开始前的钩子 */
  onBefore?: () => void | Promise<void>;
  /** 所有请求成功后的钩子 */
  onSuccess?: (results: Response<T>[]) => void | Promise<void>;
  /** 某个请求失败时的钩子 */
  onError?: (error: RequestError, index: number) => void | Promise<void>;
  /** 所有请求完成后的钩子 */
  onFinally?: () => void | Promise<void>;
}

/**
 * 串行请求 Hook 返回值
 */
export interface SerialRequestsHookResult<T = unknown> {
  /** 发送所有请求 */
  send: () => Promise<Response<T>[]>;
  /** 取消当前和后续请求 */
  cancel: () => void;
}

/**
 * useSerialRequests Hook
 * 串行执行多个请求，返回 send 和 cancel 方法
 * 不维护内部状态，状态由使用者通过生命周期钩子管理
 * @param configs 请求配置数组
 * @param hookConfig 钩子配置
 * @returns 串行请求实例，包含 send 和 cancel 方法
 */
export function useSerialRequests<T = unknown>(
  configs: RequestConfig<T>[],
  hookConfig?: SerialRequestsHookConfig<T>
): SerialRequestsHookResult<T> {
  const requestInstances = configs.map((config) => createRequest(config));

  const send = async (): Promise<Response<T>[]> => {
    try {
      if (hookConfig?.onBefore) {
        await hookConfig.onBefore();
      }

      const requestFns = requestInstances.map(
        (instance, index) => async (): Promise<Response<T>> => {
          try {
            const result = await instance.send();
            return result;
          } catch (error) {
            if (hookConfig?.onError) {
              await hookConfig.onError(error as RequestError, index);
            }

            throw error;
          }
        }
      );

      const results = await serialRequests(requestFns);

      if (hookConfig?.onSuccess) {
        await hookConfig.onSuccess(results);
      }

      return results;
    } finally {
      if (hookConfig?.onFinally) {
        await hookConfig.onFinally();
      }
    }
  };

  const cancel = (): void => {
    requestInstances.forEach((instance) => {
      instance.cancel();
    });
  };

  return {
    send,
    cancel,
  };
}
