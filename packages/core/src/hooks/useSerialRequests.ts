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
  // 为每个配置创建请求实例
  const requestInstances = configs.map((config) => createRequest(config));

  // send 方法
  const send = async (): Promise<Response<T>[]> => {
    try {
      // 调用 onBefore 钩子
      if (hookConfig?.onBefore) {
        await hookConfig.onBefore();
      }

      // 收集所有请求的 send 方法，并包装以支持错误钩子
      const requestFns = requestInstances.map(
        (instance, index) => async (): Promise<Response<T>> => {
          try {
            const result = await instance.send();
            return result;
          } catch (error) {
            // 调用 onError 钩子
            if (hookConfig?.onError) {
              await hookConfig.onError(error as RequestError, index);
            }

            // 重新抛出错误，让 serialRequests 处理中断逻辑
            throw error;
          }
        }
      );

      // 串行执行所有请求
      const results = await serialRequests(requestFns);

      // 所有请求都成功，调用 onSuccess 钩子
      if (hookConfig?.onSuccess) {
        await hookConfig.onSuccess(results);
      }

      return results;
    } finally {
      // 调用 onFinally 钩子
      if (hookConfig?.onFinally) {
        await hookConfig.onFinally();
      }
    }
  };

  // cancel 方法
  const cancel = (): void => {
    // 取消所有请求实例（包括当前和后续的）
    requestInstances.forEach((instance) => {
      instance.cancel();
    });
  };

  return {
    send,
    cancel,
  };
}
