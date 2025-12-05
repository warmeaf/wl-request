// 串行请求功能测试

import { describe, expect, it, vi } from 'vitest';
import { serialRequests } from '../../src/features/serial';
import type { Response } from '../../src/interfaces';

describe('serialRequests', () => {
  describe('请求按顺序执行', () => {
    it('应该按数组顺序依次执行请求', async () => {
      const callOrder: number[] = [];

      const requestFn1 = vi.fn().mockImplementation(async () => {
        callOrder.push(1);
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: 'result1',
        } as Response<string>;
      });

      const requestFn2 = vi.fn().mockImplementation(async () => {
        callOrder.push(2);
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: 'result2',
        } as Response<string>;
      });

      const requestFn3 = vi.fn().mockImplementation(async () => {
        callOrder.push(3);
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: 'result3',
        } as Response<string>;
      });

      await serialRequests([requestFn1, requestFn2, requestFn3]);

      // 验证调用顺序
      expect(callOrder).toEqual([1, 2, 3]);
      expect(requestFn1).toHaveBeenCalledTimes(1);
      expect(requestFn2).toHaveBeenCalledTimes(1);
      expect(requestFn3).toHaveBeenCalledTimes(1);
    });

    it('应该等待前一个请求完成后再执行下一个', async () => {
      const callOrder: string[] = [];

      const requestFn1 = vi.fn().mockImplementation(async () => {
        callOrder.push('fn1-start');
        await new Promise((resolve) => setTimeout(resolve, 50));
        callOrder.push('fn1-end');
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: 'result1',
        } as Response<string>;
      });

      const requestFn2 = vi.fn().mockImplementation(async () => {
        callOrder.push('fn2-start');
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: 'result2',
        } as Response<string>;
      });

      await serialRequests([requestFn1, requestFn2]);

      // 验证 requestFn2 在 requestFn1 完成后才执行
      expect(callOrder).toEqual(['fn1-start', 'fn1-end', 'fn2-start']);
    });
  });

  describe('中断和错误处理', () => {
    it('某个请求失败后应该停止后续请求', async () => {
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

      await expect(serialRequests([requestFn1, requestFn2, requestFn3])).rejects.toThrow(
        'Request failed'
      );

      // requestFn1 应该被调用
      expect(requestFn1).toHaveBeenCalledTimes(1);
      // requestFn2 应该被调用并失败
      expect(requestFn2).toHaveBeenCalledTimes(1);
      // requestFn3 不应该被调用
      expect(requestFn3).not.toHaveBeenCalled();
    });

    it('第一个请求失败时不应该执行后续请求', async () => {
      const requestFn1 = vi.fn().mockRejectedValue(new Error('First failed'));
      const requestFn2 = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'result2',
      } as Response<string>);

      await expect(serialRequests([requestFn1, requestFn2])).rejects.toThrow('First failed');

      expect(requestFn1).toHaveBeenCalledTimes(1);
      expect(requestFn2).not.toHaveBeenCalled();
    });
  });

  describe('前一个请求失败后的行为', () => {
    it('失败后应该抛出错误', async () => {
      const error = new Error('Request failed');
      const requestFn = vi.fn().mockRejectedValue(error);

      await expect(serialRequests([requestFn])).rejects.toThrow('Request failed');
    });

    it('应该抛出第一个失败的请求的错误', async () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      const requestFn1 = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'result1',
      } as Response<string>);

      const requestFn2 = vi.fn().mockRejectedValue(error1);
      const requestFn3 = vi.fn().mockRejectedValue(error2);

      await expect(serialRequests([requestFn1, requestFn2, requestFn3])).rejects.toThrow('Error 1');

      // requestFn3 不应该被调用
      expect(requestFn3).not.toHaveBeenCalled();
    });
  });

  describe('超时处理', () => {
    it('应该等待超时的请求完成', async () => {
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
            }, 200);
          })
      );

      const requestFn2 = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'result2',
      } as Response<string>);

      const startTime = Date.now();
      await serialRequests([requestFn1, requestFn2]);
      const endTime = Date.now();

      // 总时间应该至少是200ms（第一个请求的延迟时间）
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

      const requestFn1 = vi.fn().mockResolvedValue(response1);
      const requestFn2 = vi.fn().mockResolvedValue(response2);
      const requestFn3 = vi.fn().mockResolvedValue(response3);

      const results = await serialRequests([requestFn1, requestFn2, requestFn3]);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(response1);
      expect(results[1]).toEqual(response2);
      expect(results[2]).toEqual(response3);
    });
  });

  describe('空数组处理', () => {
    it('应该返回空结果数组', async () => {
      const results = await serialRequests([]);
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

      const results = await serialRequests([requestFn]);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(response);
    });

    it('所有请求都成功时应该返回所有结果', async () => {
      const response1: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'result1',
      };

      const response2: Response<string> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'result2',
      };

      const requestFn1 = vi.fn().mockResolvedValue(response1);
      const requestFn2 = vi.fn().mockResolvedValue(response2);

      const results = await serialRequests([requestFn1, requestFn2]);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(response1);
      expect(results[1]).toEqual(response2);
    });
  });
});
