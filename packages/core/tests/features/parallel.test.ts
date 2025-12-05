// 并行请求功能测试

import { describe, expect, it, vi } from 'vitest';
import { parallelRequests } from '../../src/features/parallel';
import type { Response } from '../../src/interfaces';

describe('parallelRequests', () => {
  describe('多个请求并行执行', () => {
    it('应该同时发起所有请求', async () => {
      const requestFn1 = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'result1',
      } as Response<string>);

      const requestFn2 = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'result2',
      } as Response<string>);

      const requestFn3 = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'result3',
      } as Response<string>);

      await parallelRequests([requestFn1, requestFn2, requestFn3]);

      // 所有请求应该都被调用
      expect(requestFn1).toHaveBeenCalledTimes(1);
      expect(requestFn2).toHaveBeenCalledTimes(1);
      expect(requestFn3).toHaveBeenCalledTimes(1);

      // 如果请求是串行的，总时间会很长；如果是并行的，总时间应该接近单个请求的时间
      // 这里我们主要验证所有请求都被调用了
    });

    it('应该等待所有请求完成', async () => {
      const requestFn1 = vi.fn().mockImplementation(
        () =>
          new Promise<Response<string>>((resolve) => {
            setTimeout(() => {
              resolve({
                status: 200,
                statusText: 'OK',
                headers: {},
                data: 'result1',
              });
            }, 100);
          })
      );

      const requestFn2 = vi.fn().mockImplementation(
        () =>
          new Promise<Response<string>>((resolve) => {
            setTimeout(() => {
              resolve({
                status: 200,
                statusText: 'OK',
                headers: {},
                data: 'result2',
              });
            }, 100);
          })
      );

      const startTime = Date.now();
      await parallelRequests([requestFn1, requestFn2]);
      const endTime = Date.now();

      // 如果并行执行，总时间应该接近100ms，而不是200ms
      expect(endTime - startTime).toBeLessThan(150);
    });
  });

  describe('部分成功/失败处理', () => {
    it('应该正确处理部分请求失败的情况', async () => {
      const requestFn1 = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'result1',
      } as Response<string>);

      const requestFn2 = vi.fn().mockRejectedValue(new Error('Request failed'));

      const requestFn3 = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'result3',
      } as Response<string>);

      const results = await parallelRequests([requestFn1, requestFn2, requestFn3]);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });

    it('应该返回所有请求的结果（成功和失败）', async () => {
      const successResponse: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'success',
      };

      const requestFn1 = vi.fn().mockResolvedValue(successResponse);
      const requestFn2 = vi.fn().mockRejectedValue(new Error('Error 1'));
      const requestFn3 = vi.fn().mockRejectedValue(new Error('Error 2'));

      const results = await parallelRequests([requestFn1, requestFn2, requestFn3]);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('fulfilled');
      if (results[0].status === 'fulfilled') {
        expect(results[0].value).toEqual(successResponse);
      }
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('rejected');
    });
  });

  describe('错误收集和报告', () => {
    it('应该收集所有错误', async () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      const requestFn1 = vi.fn().mockRejectedValue(error1);
      const requestFn2 = vi.fn().mockRejectedValue(error2);

      const results = await parallelRequests([requestFn1, requestFn2]);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('rejected');
      expect(results[1].status).toBe('rejected');

      if (results[0].status === 'rejected') {
        expect(results[0].reason).toEqual(error1);
      }
      if (results[1].status === 'rejected') {
        expect(results[1].reason).toEqual(error2);
      }
    });
  });

  describe('超时处理', () => {
    it('应该等待所有请求完成，包括超时的请求', async () => {
      const requestFn1 = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'result1',
      } as Response<string>);

      const requestFn2 = vi.fn().mockImplementation(
        () =>
          new Promise<Response<string>>((resolve) => {
            setTimeout(() => {
              resolve({
                status: 200,
                statusText: 'OK',
                headers: {},
                data: 'result2',
              });
            }, 200);
          })
      );

      const startTime = Date.now();
      const results = await parallelRequests([requestFn1, requestFn2]);
      const endTime = Date.now();

      expect(results).toHaveLength(2);
      expect(endTime - startTime).toBeGreaterThanOrEqual(200);
    });
  });

  describe('返回结果顺序', () => {
    it('应该保持结果顺序与输入顺序一致', async () => {
      const response1: Response<number> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 1,
      };

      const response2: Response<number> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 2,
      };

      const response3: Response<number> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 3,
      };

      const requestFn1 = vi.fn().mockImplementation(
        () =>
          new Promise<Response<number>>((resolve) => {
            setTimeout(() => resolve(response1), 300);
          })
      );

      const requestFn2 = vi.fn().mockImplementation(
        () =>
          new Promise<Response<number>>((resolve) => {
            setTimeout(() => resolve(response2), 100);
          })
      );

      const requestFn3 = vi.fn().mockImplementation(
        () =>
          new Promise<Response<number>>((resolve) => {
            setTimeout(() => resolve(response3), 200);
          })
      );

      const results = await parallelRequests([requestFn1, requestFn2, requestFn3]);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
      expect(results[2].status).toBe('fulfilled');

      if (
        results[0].status === 'fulfilled' &&
        results[1].status === 'fulfilled' &&
        results[2].status === 'fulfilled'
      ) {
        // 结果顺序应该与输入顺序一致，而不是完成顺序
        expect((results[0].value as Response<number>).data).toBe(1);
        expect((results[1].value as Response<number>).data).toBe(2);
        expect((results[2].value as Response<number>).data).toBe(3);
      }
    });
  });

  describe('空数组处理', () => {
    it('应该返回空结果数组', async () => {
      const results = await parallelRequests([]);
      expect(results).toEqual([]);
    });
  });

  describe('边界情况', () => {
    it('单个请求应该正常工作', async () => {
      const response: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'result',
      };

      const requestFn = vi.fn().mockResolvedValue(response);

      const results = await parallelRequests([requestFn]);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('fulfilled');
      if (results[0].status === 'fulfilled') {
        expect(results[0].value).toEqual(response);
      }
    });
  });
});
