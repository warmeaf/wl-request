// useSerialRequests Hook 测试

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAdapters, setDefaultAdapter } from '../../src/adapters';
import { resetConfig } from '../../src/config';
import { clearPendingRequests } from '../../src/features/idempotent';
import { useSerialRequests } from '../../src/hooks/useSerialRequests';
import type { RequestAdapter, RequestConfig, Response } from '../../src/interfaces';

describe('useSerialRequests', () => {
  let mockAdapter: RequestAdapter;

  beforeEach(() => {
    // 重置所有状态
    resetConfig();
    resetAdapters();
    clearPendingRequests();

    // 创建模拟适配器
    mockAdapter = {
      async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: { message: 'success' } as T,
        };
      },
    };

    // 设置默认适配器
    setDefaultAdapter(mockAdapter);
  });

  afterEach(() => {
    // 清理状态
    resetConfig();
    resetAdapters();
    clearPendingRequests();
  });

  describe('串行请求执行', () => {
    it('应该返回 send 和 cancel 方法', () => {
      const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

      const { send, cancel } = useSerialRequests(configs);

      expect(typeof send).toBe('function');
      expect(typeof cancel).toBe('function');
    });

    it('应该按数组顺序依次执行请求', async () => {
      const callOrder: number[] = [];

      mockAdapter = {
        async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
          const index = config.url === '/api/users' ? 1 : config.url === '/api/posts' ? 2 : 3;
          callOrder.push(index);
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { message: `success-${index}` } as T,
          };
        },
      };
      setDefaultAdapter(mockAdapter);

      const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

      const { send } = useSerialRequests(configs);
      await send();

      // 验证调用顺序
      expect(callOrder).toEqual([1, 2]);
    });

    it('应该等待前一个请求完成后再执行下一个', async () => {
      const callOrder: string[] = [];

      mockAdapter = {
        async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
          if (config.url === '/api/users') {
            callOrder.push('fn1-start');
            await new Promise((resolve) => setTimeout(resolve, 50));
            callOrder.push('fn1-end');
          } else {
            callOrder.push('fn2-start');
          }
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { message: 'success' } as T,
          };
        },
      };
      setDefaultAdapter(mockAdapter);

      const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

      const { send } = useSerialRequests(configs);
      await send();

      // 验证 requestFn2 在 requestFn1 完成后才执行
      expect(callOrder).toEqual(['fn1-start', 'fn1-end', 'fn2-start']);
    });
  });

  describe('生命周期钩子调用', () => {
    it('应该调用每个请求的 onBefore 钩子', async () => {
      const onBefore1 = vi.fn();
      const onBefore2 = vi.fn();

      const configs: RequestConfig[] = [
        { url: '/api/users', onBefore: onBefore1 },
        { url: '/api/posts', onBefore: onBefore2 },
      ];

      const { send } = useSerialRequests(configs);
      await send();

      expect(onBefore1).toHaveBeenCalledTimes(1);
      expect(onBefore2).toHaveBeenCalledTimes(1);
    });

    it('应该调用整体的 onBefore 钩子', async () => {
      const onBefore = vi.fn();
      const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

      const { send } = useSerialRequests(configs, { onBefore });
      await send();

      expect(onBefore).toHaveBeenCalledTimes(1);
    });

    it('整体的 onBefore 钩子应该在所有请求之前调用', async () => {
      const callOrder: string[] = [];

      const onBefore = vi.fn(() => {
        callOrder.push('onBefore');
      });

      mockAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          callOrder.push('request');
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { message: 'success' } as T,
          };
        },
      };
      setDefaultAdapter(mockAdapter);

      const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

      const { send } = useSerialRequests(configs, { onBefore });
      await send();

      expect(callOrder[0]).toBe('onBefore');
    });

    it('应该调用每个请求的 onSuccess 钩子', async () => {
      const onSuccess1 = vi.fn();
      const onSuccess2 = vi.fn();

      const configs: RequestConfig[] = [
        { url: '/api/users', onSuccess: onSuccess1 },
        { url: '/api/posts', onSuccess: onSuccess2 },
      ];

      const { send } = useSerialRequests(configs);
      await send();

      expect(onSuccess1).toHaveBeenCalledTimes(1);
      expect(onSuccess2).toHaveBeenCalledTimes(1);
    });

    it('应该调用整体的 onSuccess 钩子，传递结果和索引', async () => {
      const onSuccess = vi.fn();
      mockAdapter = {
        async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { url: config.url } as T,
          };
        },
      };
      setDefaultAdapter(mockAdapter);

      const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

      const { send } = useSerialRequests(configs, { onSuccess });
      await send();

      expect(onSuccess).toHaveBeenCalledTimes(2);
      expect(onSuccess).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ data: { url: '/api/users' } }),
        0
      );
      expect(onSuccess).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ data: { url: '/api/posts' } }),
        1
      );
    });

    it('应该调用整体的 onError 钩子，传递错误和索引', async () => {
      const error = new Error('Request failed');
      mockAdapter = {
        async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
          if (config.url === '/api/posts') {
            throw error;
          }
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { message: 'success' } as T,
          };
        },
      };
      setDefaultAdapter(mockAdapter);

      const onError = vi.fn();
      const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

      const { send } = useSerialRequests(configs, { onError });

      try {
        await send();
      } catch {
        // 忽略错误
      }

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Request failed' }),
        1
      );
    });

    it('应该调用整体的 onFinally 钩子', async () => {
      const onFinally = vi.fn();
      const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

      const { send } = useSerialRequests(configs, { onFinally });
      await send();

      expect(onFinally).toHaveBeenCalledTimes(1);
    });

    it('即使有错误也应该调用 onFinally 钩子', async () => {
      const error = new Error('Request failed');
      mockAdapter = {
        async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
          if (config.url === '/api/posts') {
            throw error;
          }
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { message: 'success' } as T,
          };
        },
      };
      setDefaultAdapter(mockAdapter);

      const onFinally = vi.fn();
      const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

      const { send } = useSerialRequests(configs, { onFinally });

      try {
        await send();
      } catch {
        // 忽略错误
      }

      expect(onFinally).toHaveBeenCalledTimes(1);
    });
  });

  describe('错误处理', () => {
    it('某个请求失败后应该停止后续请求', async () => {
      const error = new Error('Request failed');
      mockAdapter = {
        async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
          if (config.url === '/api/posts') {
            throw error;
          }
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { message: 'success' } as T,
          };
        },
      };
      setDefaultAdapter(mockAdapter);

      const requestSpy = vi.spyOn(mockAdapter, 'request');
      const configs: RequestConfig[] = [
        { url: '/api/users' },
        { url: '/api/posts' },
        { url: '/api/comments' },
      ];

      const { send } = useSerialRequests(configs);

      await expect(send()).rejects.toThrow('Request failed');

      // 应该只调用前两个请求
      expect(requestSpy).toHaveBeenCalledTimes(2);
    });

    it('第一个请求失败时不应该执行后续请求', async () => {
      const error = new Error('First failed');
      mockAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          throw error;
        },
      };
      setDefaultAdapter(mockAdapter);

      const requestSpy = vi.spyOn(mockAdapter, 'request');
      const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

      const { send } = useSerialRequests(configs);

      await expect(send()).rejects.toThrow('First failed');

      expect(requestSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('取消功能', () => {
    it('应该能够取消当前和后续请求', async () => {
      mockAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { message: 'success' } as T,
          };
        },
      };
      setDefaultAdapter(mockAdapter);

      const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

      const { send, cancel } = useSerialRequests(configs);

      // 启动请求
      const requestPromise = send();

      // 立即取消
      cancel();

      // 应该抛出取消错误
      await expect(requestPromise).rejects.toThrow('Request cancelled');
    });
  });

  describe('钩子参数正确性', () => {
    it('onSuccess 应该接收到正确的结果和索引', async () => {
      const onSuccess = vi.fn();
      mockAdapter = {
        async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { url: config.url, index: config.url === '/api/users' ? 0 : 1 } as T,
          };
        },
      };
      setDefaultAdapter(mockAdapter);

      const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

      const { send } = useSerialRequests(configs, { onSuccess });
      await send();

      expect(onSuccess).toHaveBeenCalledTimes(2);
      expect(onSuccess).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ data: { url: '/api/users', index: 0 } }),
        0
      );
      expect(onSuccess).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ data: { url: '/api/posts', index: 1 } }),
        1
      );
    });

    it('onError 应该接收到正确的错误和索引', async () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      mockAdapter = {
        async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
          if (config.url === '/api/users') {
            throw error1;
          }
          if (config.url === '/api/posts') {
            throw error2;
          }
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { message: 'success' } as T,
          };
        },
      };
      setDefaultAdapter(mockAdapter);

      const onError = vi.fn();
      const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

      const { send } = useSerialRequests(configs, { onError });

      try {
        await send();
      } catch {
        // 忽略错误
      }

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error 1' }), 0);
    });
  });
});
