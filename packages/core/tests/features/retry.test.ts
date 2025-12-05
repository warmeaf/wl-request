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
      const requestFn = vi.fn().mockRejectedValue(new Error('Request failed'));
      const retryConfig: RetryConfig = {
        count: 3,
        delay: 100,
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 初始请求立即执行
      expect(requestFn).toHaveBeenCalledTimes(1);

      // 推进时间以完成所有重试
      await vi.advanceTimersByTimeAsync(100); // 第一次重试
      await vi.advanceTimersByTimeAsync(100); // 第二次重试
      await vi.advanceTimersByTimeAsync(100); // 第三次重试

      // 等待所有异步操作完成
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow('Request failed');
      expect(requestFn).toHaveBeenCalledTimes(4); // 初始请求 + 3次重试
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
      const requestFn = vi.fn().mockRejectedValue(new Error('Request failed'));
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
      const requestFn = vi.fn().mockRejectedValue(new Error('Request failed'));
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
      const requestFn = vi.fn().mockRejectedValue(new Error('Request failed'));
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
      const requestFn = vi.fn().mockRejectedValue(new Error('Request failed'));
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

  describe('自定义重试条件', () => {
    it('应该根据自定义条件决定是否重试', async () => {
      const error1: RequestError = new Error('Network error') as RequestError;
      error1.code = 'NETWORK_ERROR';
      const error2: RequestError = new Error('Server error') as RequestError;
      error2.status = 500;

      const requestFn = vi
        .fn()
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockRejectedValueOnce(error1);

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
      const requestFn = vi.fn().mockRejectedValue(new Error('Request failed'));

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

      await vi.advanceTimersByTimeAsync(600); // 等待所有重试完成

      // 等待所有异步操作完成
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow('Final error');
      expect(requestFn).toHaveBeenCalledTimes(4);
    });
  });

  describe('边界情况', () => {
    it('重试次数为0时应该只执行一次请求', async () => {
      const requestFn = vi.fn().mockRejectedValue(new Error('Request failed'));

      const retryConfig: RetryConfig = {
        count: 0,
        delay: 100,
      };

      const resultPromise = retryRequest(requestFn, retryConfig);

      // 等待所有异步操作完成
      await vi.runAllTimersAsync();

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
});
