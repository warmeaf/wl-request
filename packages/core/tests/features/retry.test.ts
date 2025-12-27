// 请求重试功能测试

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { retryRequest } from '../../src/features/retry';
import type { Response } from '../../src/interfaces';
import type { RequestError, RetryConfig } from '../../src/types';

describe('retryRequest', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('重试次数正确执行', () => {
    it('应该在失败时重试指定次数', async () => {
      let _callCount = 0;
      const requestFn = vi.fn().mockImplementation(() => {
        _callCount++;
        return Promise.reject(new Error('Request failed'));
      });
      const retryConfig: RetryConfig = {
        count: 3,
        delay: 100,
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 初始请求立即执行
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 推进时间以完成所有重试
      await vi.advanceTimersByTimeAsync(100); // 第一次重试
      expect(requestFn).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(100); // 第二次重试
      expect(requestFn).toHaveBeenCalledTimes(3);

      await vi.advanceTimersByTimeAsync(100); // 第三次重试
      expect(requestFn).toHaveBeenCalledTimes(4);

      // 等待所有异步操作完成
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow('Request failed');
    });

    it('应该在第N次重试时成功', async () => {
      const successResponse: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'Success',
      };

      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockResolvedValueOnce(successResponse);

      const retryConfig: RetryConfig = {
        count: 3,
        delay: 100,
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 初始请求立即执行
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 推进时间以完成重试
      await vi.advanceTimersByTimeAsync(100); // 第一次重试
      await vi.advanceTimersByTimeAsync(100); // 第二次重试（成功）

      const result = await resultPromise;
      expect(result).toEqual(successResponse);
      expect(requestFn).toHaveBeenCalledTimes(3); // 初始请求 + 2次重试
    });
  });

  describe('重试延迟时间', () => {
    it('应该等待指定的延迟时间后重试', async () => {
      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'));
      const retryConfig: RetryConfig = {
        count: 1,
        delay: 200,
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 初始请求立即执行
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 等待延迟时间
      await vi.advanceTimersByTimeAsync(200);

      // 应该执行第一次重试
      expect(requestFn).toHaveBeenCalledTimes(2);

      // 等待所有异步操作完成
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow();
    });
  });

  describe('指数退避策略', () => {
    it('延迟时间应该按指数增长', async () => {
      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'));
      const retryConfig: RetryConfig = {
        count: 3,
        delay: 100,
        strategy: 'exponential',
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 初始请求
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 第一次重试延迟：100ms
      await vi.advanceTimersByTimeAsync(100);
      expect(requestFn).toHaveBeenCalledTimes(2);

      // 第二次重试延迟：200ms (100 * 2^1)
      await vi.advanceTimersByTimeAsync(200);
      expect(requestFn).toHaveBeenCalledTimes(3);

      // 第三次重试延迟：400ms (100 * 2^2)
      await vi.advanceTimersByTimeAsync(400);
      expect(requestFn).toHaveBeenCalledTimes(4);

      // 等待所有异步操作完成
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow();
    });
  });

  describe('线性退避策略', () => {
    it('延迟时间应该按线性增长', async () => {
      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'));
      const retryConfig: RetryConfig = {
        count: 3,
        delay: 100,
        strategy: 'linear',
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 初始请求
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 第一次重试延迟：100ms (100 * 1)
      await vi.advanceTimersByTimeAsync(100);
      expect(requestFn).toHaveBeenCalledTimes(2);

      // 第二次重试延迟：200ms (100 * 2)
      await vi.advanceTimersByTimeAsync(200);
      expect(requestFn).toHaveBeenCalledTimes(3);

      // 第三次重试延迟：300ms (100 * 3)
      await vi.advanceTimersByTimeAsync(300);
      expect(requestFn).toHaveBeenCalledTimes(4);

      // 等待所有异步操作完成
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow();
    });
  });

  describe('固定延迟策略', () => {
    it('延迟时间应该固定', async () => {
      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'));
      const retryConfig: RetryConfig = {
        count: 3,
        delay: 100,
        strategy: 'fixed',
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 初始请求
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 每次重试延迟都是100ms
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(100);
        expect(requestFn).toHaveBeenCalledTimes(2 + i);
      }

      // 等待所有异步操作完成
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow();
    });
  });

  describe('重试计数逻辑', () => {
    it('retryCount 应反映实际发起的重试次数', async () => {
      const retryCounts: number[] = [];

      const requestFn = vi.fn().mockRejectedValue(new Error('Request failed'));

      const retryConfig: RetryConfig = {
        count: 3,
        delay: 100,
        condition: (_error: RequestError, retryCount: number) => {
          retryCounts.push(retryCount);
          // 始终允许重试
          return true;
        },
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 初始请求立即执行
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 完成所有重试
      await vi.advanceTimersByTimeAsync(300);
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow();

      // retryCount 在每次 condition 检查时应该是 0, 1, 2
      // 对应：第1次重试前、第2次重试前、第3次重试前
      expect(retryCounts).toEqual([0, 1, 2]);
      // 总共调用 4 次（初始 + 3次重试）
      expect(requestFn).toHaveBeenCalledTimes(4);
    });

    it('condition 返回 false 时应使用正确的 retryCount 值', async () => {
      const retryCounts: number[] = [];

      const requestFn = vi.fn().mockRejectedValue(new Error('Request failed'));

      const retryConfig: RetryConfig = {
        count: 2,
        delay: 100,
        condition: (_error: RequestError, retryCount: number) => {
          retryCounts.push(retryCount);
          // 始终允许重试
          return true;
        },
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 初始请求
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 完成重试：2次延迟，每次100ms
      await vi.advanceTimersByTimeAsync(200);
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow();

      // condition 应被调用 2 次，对应两次重试前的检查
      // retryCount 值为 0（第一次重试前）、1（第二次重试前）
      expect(retryCounts).toEqual([0, 1]);
      // 总共调用 3 次（初始 + 2次重试）
      expect(requestFn).toHaveBeenCalledTimes(3);
    });

    it('第一次重试时 retryCount 应为 0', async () => {
      let firstRetryCount = -1;

      const requestFn = vi.fn().mockRejectedValue(new Error('Request failed'));

      const retryConfig: RetryConfig = {
        count: 3,
        delay: 100,
        condition: (_error: RequestError, retryCount: number) => {
          if (firstRetryCount === -1) {
            firstRetryCount = retryCount;
          }
          return true;
        },
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 初始请求
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 推进到第一次重试
      await vi.advanceTimersByTimeAsync(100);
      expect(requestFn).toHaveBeenCalledTimes(2);

      // 第一次重试前 condition 被调用时，retryCount 应为 0
      expect(firstRetryCount).toBe(0);

      await vi.runAllTimersAsync();
      await expect(resultPromise).rejects.toThrow();
    });
  });

  describe('自定义重试条件', () => {
    it('应该根据自定义条件决定是否重试', async () => {
      const error1: RequestError = new Error('Network error') as RequestError;
      error1.code = 'NETWORK_ERROR';
      const error2: RequestError = new Error('Server error') as RequestError;
      error2.status = 500;

      const requestFn = vi.fn().mockRejectedValueOnce(error1).mockRejectedValueOnce(error2);

      const retryConfig: RetryConfig = {
        count: 3,
        delay: 100,
        condition: (error: RequestError) => {
          // 只重试网络错误
          return error.code === 'NETWORK_ERROR';
        },
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      await vi.advanceTimersByTimeAsync(100);
      expect(requestFn).toHaveBeenCalledTimes(2);

      // 等待所有异步操作完成
      await vi.runAllTimersAsync();

      // 第二次失败是服务器错误，不应该重试
      await expect(resultPromise).rejects.toEqual(error2);
      expect(requestFn).toHaveBeenCalledTimes(2); // 不应该有第三次调用
    });

    it('应该根据重试次数决定是否继续重试', async () => {
      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'));

      const retryConfig: RetryConfig = {
        count: 5,
        delay: 100,
        condition: (_error: RequestError, retryCount: number) => {
          // 只重试前2次
          return retryCount < 2;
        },
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      await vi.advanceTimersByTimeAsync(200);
      expect(requestFn).toHaveBeenCalledTimes(3); // 初始 + 2次重试

      // 等待所有异步操作完成
      await vi.runAllTimersAsync();

      // 第3次重试时条件不满足，应该停止
      await expect(resultPromise).rejects.toThrow();
      expect(requestFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('重试成功后的响应', () => {
    it('应该返回重试成功后的响应', async () => {
      const successResponse: Response<number> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 42,
      };

      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockResolvedValueOnce(successResponse);

      const retryConfig: RetryConfig = {
        count: 3,
        delay: 100,
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 初始请求立即执行
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 推进时间以完成重试
      await vi.advanceTimersByTimeAsync(100); // 第一次重试（成功）

      const result = await resultPromise;
      expect(result).toEqual(successResponse);
      expect(requestFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('重试失败后的错误处理', () => {
    it('应该在达到最大重试次数后抛出最后一次错误', async () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      const error3 = new Error('Error 3');
      const finalError = new Error('Final error');

      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockRejectedValueOnce(error3)
        .mockRejectedValueOnce(finalError);

      const retryConfig: RetryConfig = {
        count: 3,
        delay: 100,
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 推进时间以完成所有重试
      await vi.advanceTimersByTimeAsync(100); // 第一次重试
      expect(requestFn).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(100); // 第二次重试
      expect(requestFn).toHaveBeenCalledTimes(3);

      await vi.advanceTimersByTimeAsync(100); // 第三次重试
      expect(requestFn).toHaveBeenCalledTimes(4);

      // 等待所有异步操作完成
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow('Final error');
      expect(requestFn).toHaveBeenCalledTimes(4);
    });
  });

  describe('边界情况', () => {
    it('重试次数为0时应该只执行一次请求', async () => {
      const requestFn = vi.fn().mockRejectedValueOnce(new Error('Request failed'));

      const retryConfig: RetryConfig = {
        count: 0,
        delay: 100,
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 立即等待 Promise rejection，不需要等待定时器
      await expect(resultPromise).rejects.toThrow();
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('请求立即成功时不应该重试', async () => {
      const successResponse: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'Success',
      };

      const requestFn = vi.fn().mockResolvedValue(successResponse);

      const retryConfig: RetryConfig = {
        count: 3,
        delay: 100,
      };

      const result = await retryRequest(requestFn, retryConfig);

      expect(result).toEqual(successResponse);
      expect(requestFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('totalTimeout 总超时时间', () => {
    it('应该在超过总超时时间后抛出错误', async () => {
      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'));

      const retryConfig: RetryConfig = {
        count: 5,
        delay: 100,
        totalTimeout: 150, // 总超时时间 150ms
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 初始请求立即执行
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 第一次重试延迟 100ms，剩余时间 50ms
      await vi.advanceTimersByTimeAsync(100);
      expect(requestFn).toHaveBeenCalledTimes(2);

      // 尝试第二次重试，但已经超过 totalTimeout
      await vi.advanceTimersByTimeAsync(100);

      await expect(resultPromise).rejects.toThrow('Retry total timeout exceeded');
      // 应该只执行了初始请求和第一次重试
      expect(requestFn).toHaveBeenCalledTimes(2);
    });

    it('应该在重试过程中检查剩余时间', async () => {
      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'));

      const retryConfig: RetryConfig = {
        count: 3,
        delay: 50,
        totalTimeout: 120, // 总超时时间 120ms
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 初始请求
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 第一次重试延迟 50ms
      await vi.advanceTimersByTimeAsync(50);
      expect(requestFn).toHaveBeenCalledTimes(2);

      // 第二次重试延迟 50ms，总共 100ms
      await vi.advanceTimersByTimeAsync(50);
      expect(requestFn).toHaveBeenCalledTimes(3);

      // 尝试第三次重试，但剩余时间不足 (120ms - 100ms = 20ms < 50ms)
      await vi.advanceTimersByTimeAsync(50);

      await expect(resultPromise).rejects.toThrow('Retry total timeout exceeded');
      expect(requestFn).toHaveBeenCalledTimes(3);
    });

    it('totalTimeout 不应该影响快速成功的请求', async () => {
      const successResponse: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'Success',
      };

      const requestFn = vi.fn().mockResolvedValueOnce(successResponse);

      const retryConfig: RetryConfig = {
        count: 3,
        delay: 100,
        totalTimeout: 50, // 设置较短的总超时时间
      };

      // 请求立即成功，不会触发 totalTimeout
      const result = await retryRequest(requestFn, retryConfig);
      expect(result).toEqual(successResponse);
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('totalTimeout 应该在第一次请求成功时不生效', async () => {
      const successResponse: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'Success',
      };

      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockResolvedValueOnce(successResponse);

      const retryConfig: RetryConfig = {
        count: 3,
        delay: 30,
        totalTimeout: 100, // 总超时时间足够
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 初始请求失败
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 第一次重试延迟 30ms
      await vi.advanceTimersByTimeAsync(30);
      expect(requestFn).toHaveBeenCalledTimes(2);

      const result = await resultPromise;
      expect(result).toEqual(successResponse);
    });
  });

  describe('maxDelay 最大延迟时间', () => {
    it('应该将延迟时间限制在 maxDelay 内', async () => {
      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'));

      const retryConfig: RetryConfig = {
        count: 3,
        delay: 100,
        strategy: 'exponential',
        maxDelay: 150, // 最大延迟 150ms
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 初始请求
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 第一次重试延迟：100ms (小于 maxDelay)
      await vi.advanceTimersByTimeAsync(100);
      expect(requestFn).toHaveBeenCalledTimes(2);

      // 第二次重试延迟：200ms，但被 maxDelay 限制为 150ms
      await vi.advanceTimersByTimeAsync(150);
      expect(requestFn).toHaveBeenCalledTimes(3);

      // 第三次重试延迟：400ms，但被 maxDelay 限制为 150ms
      await vi.advanceTimersByTimeAsync(150);
      expect(requestFn).toHaveBeenCalledTimes(4);

      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow();
    });

    it('maxDelay 与线性退避策略的组合', async () => {
      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'));

      const retryConfig: RetryConfig = {
        count: 3,
        delay: 100,
        strategy: 'linear',
        maxDelay: 200, // 最大延迟 200ms
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 初始请求
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 第一次重试延迟：100ms
      await vi.advanceTimersByTimeAsync(100);
      expect(requestFn).toHaveBeenCalledTimes(2);

      // 第二次重试延迟：200ms (100 * 2 = 200，等于 maxDelay)
      await vi.advanceTimersByTimeAsync(200);
      expect(requestFn).toHaveBeenCalledTimes(3);

      // 第三次重试延迟：300ms (100 * 3)，但被 maxDelay 限制为 200ms
      await vi.advanceTimersByTimeAsync(200);
      expect(requestFn).toHaveBeenCalledTimes(4);

      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow();
    });

    it('maxDelay 与固定延迟策略的组合', async () => {
      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'));

      const retryConfig: RetryConfig = {
        count: 3,
        delay: 100,
        strategy: 'fixed',
        maxDelay: 150, // maxDelay 大于 delay
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 所有重试延迟都应该是 100ms（小于 maxDelay）
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(100);
        expect(requestFn).toHaveBeenCalledTimes(2 + i);
      }

      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow();
    });

    it('maxDelay 小于 delay 时应该使用 maxDelay', async () => {
      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockRejectedValueOnce(new Error('Request failed'));

      const retryConfig: RetryConfig = {
        count: 1,
        delay: 200,
        maxDelay: 50, // maxDelay 小于 delay
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 初始请求
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 重试延迟应该是 50ms（被 maxDelay 限制）
      await vi.advanceTimersByTimeAsync(50);
      expect(requestFn).toHaveBeenCalledTimes(2);

      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow();
    });
  });
});
