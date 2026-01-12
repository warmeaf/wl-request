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
 * 超时追踪器
 * 用于追踪重试过程中的总超时时间
 * 基于时间差计算，无需定时器
 */
class TimeoutTracker {
  private startTime: number;
  private timeoutMs: number | undefined;

  constructor(totalTimeout?: number) {
    this.startTime = Date.now();
    this.timeoutMs = totalTimeout;
  }

  /**
   * 检查是否已超时
   * @returns 是否超时
   */
  isTimeout(): boolean {
    if (this.timeoutMs === undefined) {
      return false;
    }
    const elapsed = Date.now() - this.startTime;
    return elapsed >= this.timeoutMs;
  }

  /**
   * 检查超时，如果超时则抛出错误
   * @throws 如果超时则抛出错误
   */
  checkTimeout(): void {
    if (this.isTimeout()) {
      throw new Error(`Retry total timeout exceeded (${this.timeoutMs}ms)`);
    }
  }

  /**
   * 检查是否可以在指定延迟后执行重试
   * @param delayMs 计划延迟的时间（毫秒）
   * @returns 是否可以在延迟后执行
   */
  canDelayAfter(delayMs: number): boolean {
    if (this.timeoutMs === undefined) {
      return true;
    }
    const elapsed = Date.now() - this.startTime;
    return elapsed + delayMs < this.timeoutMs;
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

  const timeoutTracker = new TimeoutTracker(totalTimeout);

  try {
    const result = await requestFn();
    return result;
  } catch (error) {
    lastError = error as RequestError | Error;
  }

  while (retryCount < count) {
    retryCount++;

    // 检查超时
    timeoutTracker.checkTimeout();

    // 检查自定义重试条件
    if (condition) {
      const shouldRetry = condition(lastError as RequestError, retryCount - 1);
      if (!shouldRetry) {
        throw lastError;
      }
    }

    const delayTime = calculateDelay(retryCount - 1, baseDelay, strategy, maxDelay);

    // 检查延迟后是否会超时
    if (!timeoutTracker.canDelayAfter(delayTime)) {
      throw new Error(`Retry total timeout exceeded (${totalTimeout}ms)`);
    }

    await delay(delayTime);

    // 延迟后再次检查超时
    timeoutTracker.checkTimeout();

    try {
      const result = await requestFn();
      return result;
    } catch (error) {
      lastError = error as RequestError | Error;
    }
  }

  throw lastError;
}
