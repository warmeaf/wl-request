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
  const globalConfig = getGlobalConfig();
  const mergedConfig = mergeConfig<T>(globalConfig, config);

  const adapter: RequestAdapter = mergedConfig.adapter || getDefaultAdapter();

  let abortController: AbortController | null = null;
  let isCancelled = false;

  const buildRequestFn = (finalConfig: RequestConfig<T>): (() => Promise<Response<T>>) => {
    return async (): Promise<Response<T>> => {
      if (isCancelled) {
        throw createCancelledError();
      }

      return await adapter.request<T>(finalConfig);
    };
  };

  const send = async (): Promise<Response<T>> => {
    isCancelled = false;
    abortController = new AbortController();

    let abortHandler: (() => void) | null = null;

    try {
      if (isCancelled) {
        throw createCancelledError();
      }

      let finalConfig = mergedConfig;
      if (mergedConfig.onBefore) {
        const beforeResult = await mergedConfig.onBefore(finalConfig);
        if (beforeResult) {
          finalConfig = beforeResult;
        }
      }

      if (isCancelled) {
        throw createCancelledError();
      }

      let requestFn = buildRequestFn(finalConfig);

      if (finalConfig.idempotent) {
        requestFn = withIdempotent(requestFn, finalConfig.idempotent);
      }

      if (finalConfig.cache) {
        requestFn = withCache(requestFn, finalConfig.cache);
      }

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

      if (isCancelled) {
        throw createCancelledError();
      }

      if (finalConfig.onSuccess) {
        await finalConfig.onSuccess(response);
      }

      return response;
    } catch (error) {
      if (isCancelled || (error as RequestError).code === 'CANCELLED') {
        const requestError = createCancelledError();
        if (mergedConfig.onFinally) {
          await mergedConfig.onFinally();
        }
        throw requestError;
      }

      const requestError = createRequestError<T>(error, mergedConfig);

      if (mergedConfig.onError) {
        await mergedConfig.onError(requestError);
      }

      throw requestError;
    } finally {
      if (abortHandler && abortController) {
        abortController.signal.removeEventListener('abort', abortHandler);
      }
      if (!isCancelled && mergedConfig.onFinally) {
        await mergedConfig.onFinally();
      }
      abortController = null;
    }
  };

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
