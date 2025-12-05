// 请求实例创建

import { getDefaultAdapter } from './adapters';
import { getGlobalConfig, mergeConfig } from './config';
import { withCache } from './features/cache';
import { withIdempotent } from './features/idempotent';
import { retryRequest } from './features/retry';
import type { RequestAdapter, RequestConfig, RequestInstance, Response } from './interfaces';
import type { RequestError } from './types';

/**
 * 创建取消错误对象
 * @returns RequestError
 */
function createCancelledError(): RequestError {
  const error: RequestError = new Error('Request cancelled') as RequestError;
  error.code = 'CANCELLED';
  return error;
}

/**
 * 创建请求错误对象
 * @param error 原始错误
 * @param config 请求配置
 * @returns RequestError
 */
function createRequestError<T = unknown>(error: unknown, config?: RequestConfig<T>): RequestError {
  if (error instanceof Error) {
    const requestError = error as RequestError;
    if (!requestError.config && config) {
      requestError.config = config as RequestConfig<unknown>;
    }
    return requestError;
  }

  const requestError = new Error(String(error)) as RequestError;
  requestError.originalError = error;
  if (config) {
    requestError.config = config as RequestConfig<unknown>;
  }
  return requestError;
}

/**
 * 创建请求实例
 * @param config 请求配置
 * @returns 请求实例
 */
export function createRequest<T = unknown>(config: RequestConfig<T>): RequestInstance<T> {
  // 合并全局配置和请求配置
  const globalConfig = getGlobalConfig();
  const mergedConfig = mergeConfig<T>(globalConfig, config);

  // 获取适配器
  const adapter: RequestAdapter = mergedConfig.adapter || getDefaultAdapter();

  // 创建 AbortController 用于请求取消
  let abortController: AbortController | null = null;
  let isCancelled = false;

  // 构建请求函数
  const buildRequestFn = (finalConfig: RequestConfig<T>): (() => Promise<Response<T>>) => {
    return async (): Promise<Response<T>> => {
      // 检查是否已取消
      if (isCancelled) {
        throw createCancelledError();
      }

      // 执行适配器请求
      return await adapter.request<T>(finalConfig);
    };
  };

  // send 方法
  const send = async (): Promise<Response<T>> => {
    // 重置取消状态
    isCancelled = false;
    abortController = new AbortController();

    // 存储 abort 事件处理器，用于清理
    let abortHandler: (() => void) | null = null;

    try {
      // 检查是否已取消
      if (isCancelled) {
        throw createCancelledError();
      }

      // 执行 onBefore 钩子（可能修改配置）
      let finalConfig = mergedConfig;
      if (mergedConfig.onBefore) {
        const beforeResult = await mergedConfig.onBefore(finalConfig);
        if (beforeResult) {
          finalConfig = beforeResult;
        }
      }

      // 检查是否已取消（在 onBefore 之后）
      if (isCancelled) {
        throw createCancelledError();
      }

      // 构建基础请求函数
      let requestFn = buildRequestFn(finalConfig);

      // 应用功能模块（装饰器模式，实际执行顺序为：重试 → 缓存 → 幂等 → 原始请求）
      if (finalConfig.idempotent) {
        requestFn = withIdempotent(requestFn, finalConfig.idempotent);
      }

      if (finalConfig.cache) {
        requestFn = withCache(requestFn, finalConfig.cache);
      }

      // 执行请求（可能包含重试）
      // 使用 Promise.race 来支持取消
      const requestPromise = finalConfig.retry
        ? retryRequest(requestFn, finalConfig.retry)
        : requestFn();

      const cancelPromise = new Promise<never>((_, reject) => {
        abortHandler = () => {
          reject(createCancelledError());
        };
        abortController?.signal.addEventListener('abort', abortHandler);
      });

      const response = await Promise.race([requestPromise, cancelPromise]);

      // 检查是否已取消
      if (isCancelled) {
        throw createCancelledError();
      }

      // 执行 onSuccess 钩子
      if (finalConfig.onSuccess) {
        await finalConfig.onSuccess(response);
      }

      return response;
    } catch (error) {
      // 检查是否已取消
      if (isCancelled || (error as RequestError).code === 'CANCELLED') {
        const requestError = createCancelledError();
        // 取消时不执行 onError，但执行 onFinally
        if (mergedConfig.onFinally) {
          await mergedConfig.onFinally();
        }
        throw requestError;
      }

      // 创建请求错误对象
      const requestError = createRequestError<T>(error, mergedConfig);

      // 执行 onError 钩子
      if (mergedConfig.onError) {
        await mergedConfig.onError(requestError);
      }

      throw requestError;
    } finally {
      // 清理 abort 事件监听器，防止内存泄漏
      if (abortHandler && abortController) {
        abortController.signal.removeEventListener('abort', abortHandler);
      }
      // 执行 onFinally 钩子（除非是取消的情况，已在 catch 中处理）
      if (!isCancelled && mergedConfig.onFinally) {
        await mergedConfig.onFinally();
      }
      abortController = null;
    }
  };

  // cancel 方法
  const cancel = (): void => {
    isCancelled = true;
    if (abortController) {
      abortController.abort();
    }
  };

  return {
    send,
    cancel,
  };
}
