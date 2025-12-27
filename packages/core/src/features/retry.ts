// 请求重试功能

import type { RequestError, RetryConfig, RetryStrategy } from '../types';

/**
 * 计算重试延迟时间
 * @param retryCount 当前重试次数（从0开始）
 * @param baseDelay 基础延迟时间（毫秒）
 * @param strategy 退避策略
 * @param maxDelay 最大延迟时间（毫秒），可选
 * @returns 计算后的延迟时间（毫秒）
 */
function calculateDelay(
  retryCount: number,
  baseDelay: number,
  strategy: RetryStrategy = 'fixed',
  maxDelay?: number
): number {
  let delay: number;
  switch (strategy) {
    case 'exponential':
      delay = baseDelay * 2 ** retryCount;
      break;
    case 'linear':
      delay = baseDelay * (retryCount + 1);
      break;
    default:
      delay = baseDelay;
      break;
  }
  if (maxDelay !== undefined) {
    return Math.min(delay, maxDelay);
  }
  return delay;
}

/**
 * 延迟指定时间
 * @param ms 延迟时间（毫秒）
 * @returns Promise<void>
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * 清理 timeoutId 的辅助函数
 */
function clearTimeoutIfExists(timeoutId: ReturnType<typeof setTimeout> | undefined): void {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
}

/**
 * 使用重试机制执行请求函数
 * @param requestFn 请求函数，返回 Promise
 * @param retryConfig 重试配置
 * @returns Promise<T> 请求结果
 */
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  retryConfig: RetryConfig
): Promise<T> {
  const {
    count,
    delay: baseDelay,
    strategy = 'fixed',
    condition,
    maxDelay,
    totalTimeout,
  } = retryConfig;

  let lastError: RequestError | Error;
  let retryCount = 0;

  const startTime = Date.now();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  // 用于超时时拒绝的 Promise（用于检测超时条件，不直接 await）
  const timeoutRejector = totalTimeout
    ? new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Retry total timeout exceeded (${totalTimeout}ms)`));
        }, totalTimeout);
      })
    : null;

  try {
    const result = await requestFn();
    clearTimeoutIfExists(timeoutId);
    return result;
  } catch (error) {
    lastError = error as RequestError | Error;
  }

  while (retryCount < count) {
    // 先增加计数，确保 condition 和 delay 计算使用正确的值
    retryCount++;

    if (timeoutRejector && totalTimeout) {
      const elapsed = Date.now() - startTime;
      const remaining = totalTimeout - elapsed;
      if (remaining <= 0) {
        clearTimeoutIfExists(timeoutId);
        throw new Error(`Retry total timeout exceeded (${totalTimeout}ms)`);
      }
    }

    if (condition) {
      const shouldRetry = condition(lastError as RequestError, retryCount - 1);
      if (!shouldRetry) {
        clearTimeoutIfExists(timeoutId);
        throw lastError;
      }
    }

    const delayTime = calculateDelay(retryCount - 1, baseDelay, strategy, maxDelay);

    if (timeoutRejector && totalTimeout) {
      const elapsed = Date.now() - startTime;
      const remaining = totalTimeout - elapsed;
      if (delayTime > remaining) {
        clearTimeoutIfExists(timeoutId);
        throw new Error(`Retry total timeout exceeded (${totalTimeout}ms)`);
      }
    }

    await delay(delayTime);

    try {
      const result = await requestFn();
      clearTimeoutIfExists(timeoutId);
      return result;
    } catch (error) {
      lastError = error as RequestError | Error;
    }
  }

  clearTimeoutIfExists(timeoutId);
  throw lastError;
}
