// 基础集成测试

import type { RequestAdapter, RequestConfig, Response } from '@wl-request/core';
import {
  configure,
  createRequest,
  getGlobalConfig,
  resetAdapters,
  resetConfig,
  setDefaultAdapter,
  useRequest,
} from '@wl-request/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('基础集成测试', () => {
  let mockAdapter: RequestAdapter;

  beforeEach(() => {
    resetConfig();
    resetAdapters();

    mockAdapter = {
      async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: { url: config.url, method: config.method || 'GET' } as T,
        };
      },
    };

    setDefaultAdapter(mockAdapter);
  });

  afterEach(() => {
    resetConfig();
    resetAdapters();
  });

  describe('全局配置和单个请求的集成', () => {
    it('应该使用全局配置', async () => {
      configure({
        baseURL: 'https://api.example.com',
        headers: {
          'X-Global-Header': 'global-value',
        },
      });

      const { send } = useRequest({
        url: '/users',
      });

      const response = await send();
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('url');
    });

    it('单个请求应该能够覆盖全局配置', async () => {
      configure({
        baseURL: 'https://api.example.com',
        headers: {
          'X-Global-Header': 'global-value',
        },
      });

      const { send } = useRequest({
        url: '/users',
        headers: {
          'X-Local-Header': 'local-value',
        },
      });

      const response = await send();
      expect(response.status).toBe(200);
    });

    it('应该能够获取全局配置', () => {
      configure({
        baseURL: 'https://api.example.com',
        timeout: 5000,
      });

      const config = getGlobalConfig();
      expect(config.baseURL).toBe('https://api.example.com');
      expect(config.timeout).toBe(5000);
    });
  });

  describe('请求生命周期钩子的完整调用流程', () => {
    it('应该按顺序调用所有生命周期钩子', async () => {
      const hooks = {
        onBefore: vi.fn((config) => {
          expect(config.url).toBe('/users');
          return config;
        }),
        onSuccess: vi.fn((response) => {
          expect(response.status).toBe(200);
        }),
        onError: vi.fn(),
        onFinally: vi.fn(),
      };

      const { send } = useRequest({
        url: '/users',
        ...hooks,
      });

      await send();

      expect(hooks.onBefore).toHaveBeenCalledTimes(1);
      expect(hooks.onSuccess).toHaveBeenCalledTimes(1);
      expect(hooks.onError).not.toHaveBeenCalled();
      expect(hooks.onFinally).toHaveBeenCalledTimes(1);

      // 验证调用顺序
      const onBeforeCall = hooks.onBefore.mock.invocationCallOrder[0];
      const onSuccessCall = hooks.onSuccess.mock.invocationCallOrder[0];
      const onFinallyCall = hooks.onFinally.mock.invocationCallOrder[0];

      expect(onBeforeCall).toBeLessThan(onSuccessCall);
      expect(onSuccessCall).toBeLessThan(onFinallyCall);
    });

    it('错误时应该调用 onError 钩子', async () => {
      const errorAdapter: RequestAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          throw new Error('Network error');
        },
      };

      setDefaultAdapter(errorAdapter);

      const hooks = {
        onBefore: vi.fn(),
        onSuccess: vi.fn(),
        onError: vi.fn((error) => {
          expect(error.message).toBe('Network error');
        }),
        onFinally: vi.fn(),
      };

      const { send } = useRequest({
        url: '/users',
        ...hooks,
      });

      try {
        await send();
      } catch {
        // 忽略错误
      }

      expect(hooks.onBefore).toHaveBeenCalledTimes(1);
      expect(hooks.onSuccess).not.toHaveBeenCalled();
      expect(hooks.onError).toHaveBeenCalledTimes(1);
      expect(hooks.onFinally).toHaveBeenCalledTimes(1);
    });

    it('onBefore 钩子可以修改配置', async () => {
      const { send } = useRequest({
        url: '/users',
        onBefore: (config) => {
          return {
            ...config,
            headers: {
              ...config.headers,
              'X-Modified': 'true',
            },
          };
        },
      });

      const response = await send();
      expect(response.status).toBe(200);
    });
  });

  describe('配置合并和继承机制', () => {
    it('应该合并全局配置和请求配置', async () => {
      configure({
        baseURL: 'https://api.example.com',
        timeout: 10000,
        headers: {
          'X-Global': 'global',
        },
      });

      const { send } = useRequest({
        url: '/users',
        timeout: 5000,
        headers: {
          'X-Local': 'local',
        },
      });

      const response = await send();
      expect(response.status).toBe(200);
    });

    it('请求配置应该覆盖全局配置', async () => {
      configure({
        timeout: 10000,
      });

      const { send } = useRequest({
        url: '/users',
        timeout: 5000,
      });

      const response = await send();
      expect(response.status).toBe(200);
    });

    it('应该能够创建独立的请求实例', async () => {
      configure({
        baseURL: 'https://api.example.com',
      });

      const instance1 = createRequest({
        url: '/users/1',
      });

      const instance2 = createRequest({
        url: '/users/2',
      });

      const response1 = await instance1.send();
      const response2 = await instance2.send();

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });
});
