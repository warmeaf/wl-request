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
  // 如果设置了最大延迟，限制延迟时间
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
 * 使用重试机制执行请求函数
 * @param requestFn 请求函数，返回 Promise
 * @param retryConfig 重试配置
 * @returns Promise<T> 请求结果
 */
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  retryConfig: RetryConfig
): Promise<T> {
  const { count, delay: baseDelay, strategy = 'fixed', condition, maxDelay } = retryConfig;

  let lastError: RequestError | Error;
  let retryCount = 0;

  // 执行初始请求
  try {
    return await requestFn();
  } catch (error) {
    lastError = error as RequestError | Error;
  }

  // 重试逻辑
  while (retryCount < count) {
    // 检查自定义重试条件
    if (condition) {
      const shouldRetry = condition(lastError as RequestError, retryCount);
      if (!shouldRetry) {
        throw lastError;
      }
    }

    // 计算延迟时间
    const delayTime = calculateDelay(retryCount, baseDelay, strategy, maxDelay);

    // 等待延迟时间
    await delay(delayTime);

    // 执行重试
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as RequestError | Error;
      retryCount++;
    }
  }

  // 所有重试都失败，抛出最后一次错误
  throw lastError;
}
