// FetchAdapter 测试

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FetchAdapter } from '../../src/adapters/fetch';
import type { RequestConfig } from '../../src/interfaces';

describe('FetchAdapter', () => {
  let adapter: FetchAdapter;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    adapter = new FetchAdapter();
    // 模拟 fetch API
    mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基础请求功能', () => {
    it('应该能够发送 GET 请求', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ data: 'test' }),
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const config: RequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      const response = await adapter.request(config);

      expect(response.status).toBe(200);
      expect(response.statusText).toBe('OK');
      expect(response.data).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('应该能够发送 POST 请求', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        statusText: 'Created',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ id: 1 }),
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const config: RequestConfig = {
        url: '/api/users',
        method: 'POST',
        data: { name: 'test' },
      };

      const response = await adapter.request(config);

      expect(response.status).toBe(201);
      expect(response.data).toEqual({ id: 1 });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('应该能够处理带 headers 的请求', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ success: true }),
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const config: RequestConfig = {
        url: '/api/users',
        headers: {
          Authorization: 'Bearer token',
          'X-Custom-Header': 'custom-value',
        },
      };

      await adapter.request(config);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token',
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });

    it('应该能够处理带 params 的请求', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ data: [] }),
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const config: RequestConfig = {
        url: '/api/users',
        params: {
          page: 1,
          limit: 10,
        },
      };

      await adapter.request(config);

      expect(mockFetch).toHaveBeenCalledWith('/api/users?page=1&limit=10', expect.any(Object));
    });

    it('应该正确处理 baseURL', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ success: true }),
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const config: RequestConfig = {
        url: '/api/users',
        baseURL: 'https://api.example.com',
      };

      await adapter.request(config);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/users',
        expect.any(Object)
      );
    });

    it('baseURL 应该正确处理末尾斜杠', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ success: true }),
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const config: RequestConfig = {
        url: '/api/users',
        baseURL: 'https://api.example.com/',
      };

      await adapter.request(config);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/users',
        expect.any(Object)
      );
    });
  });

  describe('params 处理', () => {
    it('应该过滤掉 null 和 undefined 的 params', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ success: true }),
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const config: RequestConfig = {
        url: '/api/users',
        params: {
          page: 1,
          limit: undefined as unknown as number,
          search: null as unknown as string,
        },
      };

      await adapter.request(config);

      expect(mockFetch).toHaveBeenCalledWith('/api/users?page=1', expect.any(Object));
    });

    it('URL 中已有 query 参数时应该使用 &', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ success: true }),
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const config: RequestConfig = {
        url: '/api/users?existing=param',
        params: {
          page: 1,
        },
      };

      await adapter.request(config);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users?existing=param&page=1',
        expect.any(Object)
      );
    });
  });

  describe('响应解析', () => {
    it('应该解析 JSON 响应', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ message: 'success' }),
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const config: RequestConfig = {
        url: '/api/data',
      };

      const response = await adapter.request(config);

      expect(response.data).toEqual({ message: 'success' });
    });

    it('应该解析 text 响应', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'text/plain' }),
        text: async () => 'plain text response',
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const config: RequestConfig = {
        url: '/api/text',
      };

      const response = await adapter.request(config);

      expect(response.data).toBe('plain text response');
    });

    it('应该尝试解析非标准类型的响应为 JSON', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/octet-stream' }),
        text: async () => '{"key":"value"}',
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const config: RequestConfig = {
        url: '/api/data',
      };

      const response = await adapter.request(config);

      expect(response.data).toEqual({ key: 'value' });
    });

    it('当无法解析为 JSON 时应该返回文本', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/octet-stream' }),
        text: async () => 'not valid json',
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const config: RequestConfig = {
        url: '/api/data',
      };

      const response = await adapter.request(config);

      expect(response.data).toBe('not valid json');
    });

    it('应该正确解析响应 headers', async () => {
      const mockHeaders = new Headers({
        'Content-Type': 'application/json',
        'X-Custom-Header': 'custom-value',
      });
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: mockHeaders,
        json: async () => ({ success: true }),
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const config: RequestConfig = {
        url: '/api/data',
      };

      const response = await adapter.request(config);

      expect(response.headers).toEqual({
        'content-type': 'application/json',
        'x-custom-header': 'custom-value',
      });
    });
  });

  describe('错误处理', () => {
    it('HTTP 错误状态码应该抛出错误', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ error: 'Not found' }),
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const config: RequestConfig = {
        url: '/api/not-found',
      };

      await expect(adapter.request(config)).rejects.toThrow('Request failed with status 404');
    });

    it('HTTP 500 错误应该抛出错误', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ error: 'Server error' }),
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const config: RequestConfig = {
        url: '/api/error',
      };

      await expect(adapter.request(config)).rejects.toThrow('Request failed with status 500');
    });

    it('网络错误应该抛出错误', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const config: RequestConfig = {
        url: '/api/users',
      };

      await expect(adapter.request(config)).rejects.toThrow('Network error');
    });

    it('带 status 的 Error 应该直接抛出', async () => {
      const error = new Error('Request failed') as Error & { status?: number };
      error.status = 400;
      mockFetch.mockRejectedValue(error);

      const config: RequestConfig = {
        url: '/api/users',
      };

      await expect(adapter.request(config)).rejects.toThrow('Request failed');
    });
  });

  describe('超时处理', () => {
    it('应该在超时后取消请求', async () => {
      let controllerAborted = false;
      const originalAbortController = global.AbortController;

      class MockAbortController extends AbortController {
        abort() {
          controllerAborted = true;
          super.abort();
        }
      }

      global.AbortController = MockAbortController;

      mockFetch.mockImplementation(
        (_url: string, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            // 当 abort 时 reject
            options.signal?.addEventListener('abort', () => {
              const error = new Error('Aborted') as Error & { name?: string };
              error.name = 'AbortError';
              reject(error);
            });
          })
      );

      const config: RequestConfig = {
        url: '/api/users',
        timeout: 100,
      };

      await expect(adapter.request(config)).rejects.toThrow('Request timeout');
      expect(controllerAborted).toBe(true);

      global.AbortController = originalAbortController;
    }, 10000);

    it('超时时应该清除 timeout', async () => {
      let controllerAborted = false;
      const originalAbortController = global.AbortController;

      class MockAbortController extends AbortController {
        abort() {
          controllerAborted = true;
          super.abort();
        }
      }

      global.AbortController = MockAbortController;

      mockFetch.mockImplementation(
        (_url: string, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            // 当 abort 时 reject
            options.signal?.addEventListener('abort', () => {
              const error = new Error('Aborted') as Error & { name?: string };
              error.name = 'AbortError';
              reject(error);
            });
          })
      );

      const config: RequestConfig = {
        url: '/api/users',
        timeout: 50,
      };

      await expect(adapter.request(config)).rejects.toThrow('Request timeout');
      expect(controllerAborted).toBe(true);

      global.AbortController = originalAbortController;
    }, 10000);
  });

  describe('其他 edge cases', () => {
    it('GET 和 HEAD 请求不应该包含 body', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ success: true }),
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const config: RequestConfig = {
        url: '/api/users',
        method: 'GET',
        data: { test: 'data' },
      };

      await adapter.request(config);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users',
        expect.not.objectContaining({
          body: expect.anything(),
        })
      );
    });

    it('HEAD 请求不应该包含 body', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ success: true }),
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const config: RequestConfig = {
        url: '/api/users',
        method: 'HEAD',
        data: { test: 'data' },
      };

      await adapter.request(config);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users',
        expect.not.objectContaining({
          body: expect.anything(),
        })
      );
    });

    it('应该保留自定义的 Content-Type header', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ success: true }),
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const config: RequestConfig = {
        url: '/api/users',
        method: 'POST',
        data: { name: 'test' },
        headers: {
          'Content-Type': 'text/plain',
        },
      };

      await adapter.request(config);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'text/plain',
          }),
          body: JSON.stringify({ name: 'test' }),
        })
      );
    });

    it('响应没有 content-type 时应该尝试解析为 JSON', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({}),
        text: async () => '{"success":true}',
      } as unknown as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const config: RequestConfig = {
        url: '/api/data',
      };

      const response = await adapter.request(config);

      expect(response.data).toEqual({ success: true });
    });

    it('非 Error 对象应该转换为 Error', async () => {
      const error = new Error('string error') as Error & { originalError?: unknown };
      error.originalError = 'string error';
      mockFetch.mockRejectedValue(error);

      const config: RequestConfig = {
        url: '/api/users',
      };

      await expect(adapter.request(config)).rejects.toThrow('string error');
    });
  });
});
