// 适配器集成测试

import { FetchAdapter } from '@wl-request/adapter-fetch';
import { MemoryCacheAdapter } from '@wl-request/cache-adapter-memory';
import type { RequestConfig, Response } from '@wl-request/core';
import {
  configure,
  resetAdapters,
  resetConfig,
  setDefaultAdapter,
  useRequest,
} from '@wl-request/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('适配器集成测试', () => {
  beforeEach(() => {
    resetConfig();
    resetAdapters();
  });

  afterEach(() => {
    resetConfig();
    resetAdapters();
    vi.restoreAllMocks();
  });

  describe('Fetch 适配器的集成使用', () => {
    it('应该能够使用 Fetch 适配器发送请求', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ message: 'success' }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const adapter = new FetchAdapter();
      setDefaultAdapter(adapter);

      const { send } = useRequest({
        url: '/api/users',
        method: 'GET',
      });

      const response = await send();
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ message: 'success' });
      expect(global.fetch).toHaveBeenCalled();
    });

    it('应该能够使用 Fetch 适配器发送 POST 请求', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ id: 1 }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const adapter = new FetchAdapter();
      setDefaultAdapter(adapter);

      const { send } = useRequest({
        url: '/api/users',
        method: 'POST',
        data: { name: 'John' },
      });

      const response = await send();
      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'John' }),
        })
      );
    });

    it('应该能够处理 Fetch 适配器的错误', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const adapter = new FetchAdapter();
      setDefaultAdapter(adapter);

      const { send } = useRequest({
        url: '/api/users',
      });

      await expect(send()).rejects.toThrow();
    });
  });

  describe('缓存适配器的集成使用', () => {
    it('应该能够使用内存缓存适配器', async () => {
      const mockAdapter = {
        async request<T>(config: RequestConfig<T>): Promise<Response<T>> {
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { url: config.url, timestamp: Date.now() } as T,
          };
        },
      };

      setDefaultAdapter(mockAdapter);

      const cacheAdapter = new MemoryCacheAdapter();

      const { send } = useRequest({
        url: '/api/users',
        cache: {
          key: 'users-list',
          ttl: 1000,
          cacheAdapter,
        },
      });

      // 第一次请求
      const response1 = await send();
      const timestamp1 = (response1.data as { timestamp: number }).timestamp;

      // 第二次请求（应该使用缓存）
      const response2 = await send();
      const timestamp2 = (response2.data as { timestamp: number }).timestamp;

      // 时间戳应该相同（使用缓存）
      expect(timestamp1).toBe(timestamp2);
    });

    it('应该能够在全局配置中使用缓存适配器', async () => {
      const mockAdapter = {
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

      const cacheAdapter = new MemoryCacheAdapter();

      configure({
        cacheAdapter,
      });

      const { send } = useRequest({
        url: '/api/users',
        cache: {
          key: 'users-list',
          ttl: 1000,
        },
      });

      const response = await send();
      expect(response.status).toBe(200);
    });

    it('应该能够在幂等请求中使用缓存适配器', async () => {
      let requestCount = 0;
      const mockAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          requestCount++;
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { count: requestCount } as T,
          };
        },
      };

      setDefaultAdapter(mockAdapter);

      const cacheAdapter = new MemoryCacheAdapter();

      const { send } = useRequest({
        url: '/api/create-order',
        method: 'POST',
        idempotent: {
          key: 'order-123',
          ttl: 1000,
          cacheAdapter,
        },
      });

      // 第一次请求
      await send();
      expect(requestCount).toBe(1);

      // 第二次相同请求（应该使用幂等）
      await send();
      expect(requestCount).toBe(1); // 不应该再次请求
    });
  });

  describe('适配器切换', () => {
    it('应该能够在运行时切换适配器', async () => {
      const adapter1 = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { adapter: 'adapter1' } as T,
          };
        },
      };

      const adapter2 = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { adapter: 'adapter2' } as T,
          };
        },
      };

      setDefaultAdapter(adapter1);

      const instance1 = useRequest({ url: '/api/test' });
      const response1 = await instance1.send();
      expect((response1.data as { adapter: string }).adapter).toBe('adapter1');

      setDefaultAdapter(adapter2);

      const instance2 = useRequest({ url: '/api/test' });
      const response2 = await instance2.send();
      expect((response2.data as { adapter: string }).adapter).toBe('adapter2');
    });

    it('单个请求应该能够使用不同的适配器', async () => {
      const defaultAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { adapter: 'default' } as T,
          };
        },
      };

      const customAdapter = {
        async request<T>(_config: RequestConfig<T>): Promise<Response<T>> {
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { adapter: 'custom' } as T,
          };
        },
      };

      setDefaultAdapter(defaultAdapter);

      const instance1 = useRequest({ url: '/api/test' });
      const response1 = await instance1.send();
      expect((response1.data as { adapter: string }).adapter).toBe('default');

      const instance2 = useRequest({
        url: '/api/test',
        adapter: customAdapter,
      });
      const response2 = await instance2.send();
      expect((response2.data as { adapter: string }).adapter).toBe('custom');
    });
  });
});
