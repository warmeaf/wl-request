// useParallelRequests Hook 测试

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAdapters, setDefaultAdapter } from '../../src/adapters';
import { resetConfig } from '../../src/config';
import { clearPendingRequests } from '../../src/features/idempotent';
import { useParallelRequests } from '../../src/hooks/useParallelRequests';
import type { RequestAdapter, RequestConfig, Response } from '../../src/interfaces';

describe('useParallelRequests', () => {
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

  describe('并行请求执行', () => {
    it('应该返回 send 和 cancel 方法', () => {
      const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

      const { send, cancel } = useParallelRequests(configs);

      expect(typeof send).toBe('function');
      expect(typeof cancel).toBe('function');
    });

    it('应该并行执行所有请求', async () => {
      const callOrder: number[] = [];

      mockAdapter = {
        async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
          const index = config.url === '/api/users' ? 1 : config.url === '/api/posts' ? 2 : 3;
          callOrder.push(index);
          await new Promise((resolve) => setTimeout(resolve, 50));
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

      const { send } = useParallelRequests(configs);
      await send();

      // 所有请求应该都被调用
      expect(callOrder.length).toBe(2);
    });

    it('应该等待所有请求完成', async () => {
      const startTime = Date.now();
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

      const { send } = useParallelRequests(configs);
      await send();

      const endTime = Date.now();
      // 如果并行执行，总时间应该接近100ms，而不是200ms
      expect(endTime - startTime).toBeLessThan(150);
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

      const { send } = useParallelRequests(configs);
      await send();

      expect(onBefore1).toHaveBeenCalledTimes(1);
      expect(onBefore2).toHaveBeenCalledTimes(1);
    });

    it('应该调用整体的 onBefore 钩子', async () => {
      const onBefore = vi.fn();
      const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

      const { send } = useParallelRequests(configs, { onBefore });
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

      const { send } = useParallelRequests(configs, { onBefore });
      await send();

      expect(callOrder[0]).toBe('onBefore');
    });

    it('应该调用整体的 onSuccess 钩子，传递成功结果数组', async () => {
      const onSuccess = vi.fn();
      const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

      const { send } = useParallelRequests(configs, { onSuccess });
      await send();

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ status: 200 }),
          expect.objectContaining({ status: 200 }),
        ])
      );
    });

    it('应该调用整体的 onError 钩子，传递错误数组', async () => {
      const error = new Error('Request failed');
      mockAdapter = {
        async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
          if (config.url === '/api/users') {
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

      const { send } = useParallelRequests(configs, { onError });

      try {
        await send();
      } catch {
        // 忽略错误
      }

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ message: 'Request failed' })])
      );
    });

    it('应该调用整体的 onFinally 钩子', async () => {
      const onFinally = vi.fn();
      const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

      const { send } = useParallelRequests(configs, { onFinally });
      await send();

      expect(onFinally).toHaveBeenCalledTimes(1);
    });
  });

  describe('错误处理', () => {
    it('应该正确处理部分请求失败的情况', async () => {
      const error = new Error('Request failed');
      mockAdapter = {
        async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
          if (config.url === '/api/users') {
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

      const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

      const { send } = useParallelRequests(configs);

      // 应该抛出错误，因为至少有一个请求失败
      await expect(send()).rejects.toThrow();
    });

    it('应该收集所有错误', async () => {
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

      const { send } = useParallelRequests(configs, { onError });

      try {
        await send();
      } catch {
        // 忽略错误
      }

      expect(onError).toHaveBeenCalledTimes(1);
      const errors = onError.mock.calls[0][0];
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('failFast 配置', () => {
    describe('failFast: true（默认行为）', () => {
      it('部分请求失败时应该抛出错误', async () => {
        const error = new Error('Request failed');
        mockAdapter = {
          async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
            if (config.url === '/api/users') {
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

        const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

        const { send } = useParallelRequests(configs, { failFast: true });

        await expect(send()).rejects.toThrow();
      });

      it('所有请求失败时应该抛出错误', async () => {
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

        const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

        const { send } = useParallelRequests(configs, { failFast: true });

        await expect(send()).rejects.toThrow();
      });

      it('应该调用 onError 钩子', async () => {
        const error = new Error('Request failed');
        mockAdapter = {
          async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
            if (config.url === '/api/users') {
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

        const { send } = useParallelRequests(configs, { failFast: true, onError });

        try {
          await send();
        } catch {
          // 忽略错误
        }

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(
          expect.arrayContaining([expect.objectContaining({ message: 'Request failed' })])
        );
      });

      it('不应该调用 onSuccess 钩子', async () => {
        const error = new Error('Request failed');
        mockAdapter = {
          async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
            if (config.url === '/api/users') {
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

        const onSuccess = vi.fn();
        const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

        const { send } = useParallelRequests(configs, { failFast: true, onSuccess });

        try {
          await send();
        } catch {
          // 忽略错误
        }

        expect(onSuccess).not.toHaveBeenCalled();
      });
    });

    describe('failFast: false（允许部分失败）', () => {
      it('部分请求失败时应该返回成功的结果，不抛出错误', async () => {
        const error = new Error('Request failed');
        mockAdapter = {
          async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
            if (config.url === '/api/users') {
              throw error;
            }
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

        const { send } = useParallelRequests(configs, { failFast: false });

        const results = await send();

        expect(results).toHaveLength(1);
        expect(results[0].data).toEqual({ url: '/api/posts' });
      });

      it('所有请求失败时应该返回空数组，不抛出错误', async () => {
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

        const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

        const { send } = useParallelRequests(configs, { failFast: false });

        const results = await send();

        expect(results).toHaveLength(0);
      });

      it('应该调用 onError 钩子（如果有错误）', async () => {
        const error = new Error('Request failed');
        mockAdapter = {
          async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
            if (config.url === '/api/users') {
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

        const { send } = useParallelRequests(configs, { failFast: false, onError });

        await send();

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(
          expect.arrayContaining([expect.objectContaining({ message: 'Request failed' })])
        );
      });

      it('应该调用 onSuccess 钩子（如果有成功的结果）', async () => {
        const error = new Error('Request failed');
        mockAdapter = {
          async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
            if (config.url === '/api/users') {
              throw error;
            }
            return {
              status: 200,
              statusText: 'OK',
              headers: {},
              data: { url: config.url } as T,
            };
          },
        };
        setDefaultAdapter(mockAdapter);

        const onSuccess = vi.fn();
        const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

        const { send } = useParallelRequests(configs, { failFast: false, onSuccess });

        await send();

        expect(onSuccess).toHaveBeenCalledTimes(1);
        const results = onSuccess.mock.calls[0][0];
        expect(results).toHaveLength(1);
        expect(results[0].data).toEqual({ url: '/api/posts' });
      });

      it('返回的结果应该只包含成功的请求', async () => {
        const error1 = new Error('Error 1');
        mockAdapter = {
          async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
            if (config.url === '/api/users') {
              throw error1;
            }
            return {
              status: 200,
              statusText: 'OK',
              headers: {},
              data: { url: config.url } as T,
            };
          },
        };
        setDefaultAdapter(mockAdapter);

        const configs: RequestConfig[] = [
          { url: '/api/users' },
          { url: '/api/posts' },
          { url: '/api/comments' },
        ];

        const { send } = useParallelRequests(configs, { failFast: false });

        const results = await send();

        expect(results).toHaveLength(2);
        expect(results[0].data).toEqual({ url: '/api/posts' });
        expect(results[1].data).toEqual({ url: '/api/comments' });
      });
    });

    describe('边界情况', () => {
      it('failFast: false 且所有请求都成功时，行为应该与 failFast: true 一致', async () => {
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

        const { send } = useParallelRequests(configs, { failFast: false });

        const results = await send();

        expect(results).toHaveLength(2);
        expect(results[0].data).toEqual({ url: '/api/users' });
        expect(results[1].data).toEqual({ url: '/api/posts' });
      });

      it('failFast: false 且所有请求都失败时，应该返回空数组并调用 onSuccess（空数组）', async () => {
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
        const onSuccess = vi.fn();
        const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

        const { send } = useParallelRequests(configs, {
          failFast: false,
          onError,
          onSuccess,
        });

        const results = await send();

        expect(results).toHaveLength(0);
        expect(onError).toHaveBeenCalledTimes(1);
        // failFast: false 时，即使没有成功结果也应该调用 onSuccess（空数组）
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(onSuccess).toHaveBeenCalledWith([]);
      });

      it('默认行为（不设置 failFast）应该等同于 failFast: true', async () => {
        const error = new Error('Request failed');
        mockAdapter = {
          async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
            if (config.url === '/api/users') {
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

        const configs: RequestConfig[] = [{ url: '/api/users' }, { url: '/api/posts' }];

        const { send } = useParallelRequests(configs);

        await expect(send()).rejects.toThrow();
      });
    });
  });

  describe('取消功能', () => {
    it('应该能够取消所有正在进行的请求', async () => {
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

      const { send, cancel } = useParallelRequests(configs);

      // 启动请求
      const requestPromise = send();

      // 立即取消
      cancel();

      // 应该抛出取消错误
      await expect(requestPromise).rejects.toThrow('Request cancelled');
    });
  });

  describe('钩子参数正确性', () => {
    it('onSuccess 应该接收到所有成功的结果', async () => {
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

      const { send } = useParallelRequests(configs, { onSuccess });
      await send();

      expect(onSuccess).toHaveBeenCalledTimes(1);
      const results = onSuccess.mock.calls[0][0];
      expect(results).toHaveLength(2);
      expect(results[0].data).toEqual({ url: '/api/users' });
      expect(results[1].data).toEqual({ url: '/api/posts' });
    });

    it('onError 应该接收到所有错误', async () => {
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

      const { send } = useParallelRequests(configs, { onError });

      try {
        await send();
      } catch {
        // 忽略错误
      }

      expect(onError).toHaveBeenCalledTimes(1);
      const errors = onError.mock.calls[0][0];
      expect(errors.length).toBe(2);
    });
  });
});
