// Fetch 适配器测试

import type { RequestAdapter, RequestConfig, Response } from '@wl-request/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FetchAdapter } from '../src/index';

describe('FetchAdapter', () => {
  let adapter: RequestAdapter;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    adapter = new FetchAdapter();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('基本 GET 请求', () => {
    it('应该能够正确发送 GET 请求并返回响应', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ data: 'test' }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const config: RequestConfig = {
        url: '/api/test',
        method: 'GET',
      };

      const response = await adapter.request(config);

      expect(response.status).toBe(200);
      expect(response.statusText).toBe('OK');
      expect(response.data).toEqual({ data: 'test' });
      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {},
        signal: expect.any(AbortSignal),
      });
    });

    it('默认方法应该是 GET', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({}),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const config: RequestConfig = {
        url: '/api/test',
      };

      await adapter.request(config);

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {},
        signal: expect.any(AbortSignal),
      });
    });
  });

  describe('POST/PUT/DELETE 请求', () => {
    it('应该能够发送 POST 请求', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ success: true }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const config: RequestConfig = {
        url: '/api/test',
        method: 'POST',
        data: { name: 'test' },
      };

      const response = await adapter.request(config);

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'test' }),
        signal: expect.any(AbortSignal),
      });
    });

    it('应该能够发送 PUT 请求', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({}),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const config: RequestConfig = {
        url: '/api/test',
        method: 'PUT',
        data: { id: 1, name: 'test' },
      };

      await adapter.request(config);

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: 1, name: 'test' }),
        signal: expect.any(AbortSignal),
      });
    });

    it('应该能够发送 DELETE 请求', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({}),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const config: RequestConfig = {
        url: '/api/test/1',
        method: 'DELETE',
      };

      await adapter.request(config);

      expect(global.fetch).toHaveBeenCalledWith('/api/test/1', {
        method: 'DELETE',
        headers: {},
        signal: expect.any(AbortSignal),
      });
    });
  });

  describe('请求头设置', () => {
    it('应该能够设置自定义请求头', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({}),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const config: RequestConfig = {
        url: '/api/test',
        headers: {
          Authorization: 'Bearer token',
          'X-Custom-Header': 'custom-value',
        },
      };

      await adapter.request(config);

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer token',
          'X-Custom-Header': 'custom-value',
        },
        signal: expect.any(AbortSignal),
      });
    });
  });

  describe('URL 参数处理', () => {
    it('应该能够将 params 序列化为 URL 查询参数', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({}),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const config: RequestConfig = {
        url: '/api/test',
        params: {
          page: 1,
          limit: 10,
          search: 'test',
          active: true,
        },
      };

      await adapter.request(config);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test?page=1&limit=10&search=test&active=true',
        expect.any(Object)
      );
    });

    it('应该能够处理 null 和 undefined 参数', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({}),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const config: RequestConfig = {
        url: '/api/test',
        params: {
          a: 'value',
          b: null,
          c: undefined,
        },
      };

      await adapter.request(config);

      // null 和 undefined 应该被忽略或转换为空字符串
      const callUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callUrl).toContain('a=value');
    });
  });

  describe('baseURL 处理', () => {
    it('应该能够正确拼接 baseURL 和 url', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({}),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const config: RequestConfig = {
        baseURL: 'https://api.example.com',
        url: '/api/test',
      };

      await adapter.request(config);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/test',
        expect.any(Object)
      );
    });

    it('baseURL 末尾的斜杠应该正确处理', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({}),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const config: RequestConfig = {
        baseURL: 'https://api.example.com/',
        url: '/api/test',
      };

      await adapter.request(config);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/test',
        expect.any(Object)
      );
    });
  });

  describe('请求体数据', () => {
    it('应该能够序列化请求体为 JSON', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({}),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const config: RequestConfig = {
        url: '/api/test',
        method: 'POST',
        data: {
          name: 'test',
          count: 42,
        },
      };

      await adapter.request(config);

      const callBody = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]?.body;
      expect(callBody).toBe(JSON.stringify({ name: 'test', count: 42 }));
    });

    it('GET 请求不应该包含请求体', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({}),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const config: RequestConfig = {
        url: '/api/test',
        method: 'GET',
        data: { should: 'not be sent' },
      };

      await adapter.request(config);

      const callOptions = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callOptions.body).toBeUndefined();
    });
  });

  describe('超时控制', () => {
    it('应该能够在超时后抛出错误', async () => {
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Headers(),
                json: vi.fn().mockResolvedValue({}),
              } as unknown as Response);
            }, 200);
          })
      );

      const config: RequestConfig = {
        url: '/api/test',
        timeout: 100,
      };

      await expect(adapter.request(config)).rejects.toThrow();
    });

    it('应该能够在超时时间内正常返回', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ data: 'test' }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const config: RequestConfig = {
        url: '/api/test',
        timeout: 5000,
      };

      const response = await adapter.request(config);

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ data: 'test' });
    });
  });

  describe('响应数据解析', () => {
    it('应该能够解析 JSON 响应', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ data: 'test' }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const config: RequestConfig = {
        url: '/api/test',
      };

      const response = await adapter.request(config);

      expect(response.data).toEqual({ data: 'test' });
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('应该能够处理文本响应', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: vi.fn().mockResolvedValue('plain text'),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const config: RequestConfig = {
        url: '/api/test',
      };

      const response = await adapter.request(config);

      expect(response.data).toBe('plain text');
    });
  });

  describe('错误处理', () => {
    it('应该能够处理网络错误', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const config: RequestConfig = {
        url: '/api/test',
      };

      await expect(adapter.request(config)).rejects.toThrow('Network error');
    });

    it('应该能够处理 HTTP 错误状态码', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ error: 'Not found' }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const config: RequestConfig = {
        url: '/api/test',
      };

      await expect(adapter.request(config)).rejects.toThrow();
    });

    it('应该能够处理 500 错误', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ error: 'Server error' }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const config: RequestConfig = {
        url: '/api/test',
      };

      await expect(adapter.request(config)).rejects.toThrow();
    });
  });

  describe('响应头解析', () => {
    it('应该能够正确解析响应头', async () => {
      const headers = new Headers();
      headers.set('content-type', 'application/json');
      headers.set('x-custom-header', 'custom-value');

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers,
        json: vi.fn().mockResolvedValue({}),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const config: RequestConfig = {
        url: '/api/test',
      };

      const response = await adapter.request(config);

      expect(response.headers['content-type']).toBe('application/json');
      expect(response.headers['x-custom-header']).toBe('custom-value');
    });
  });

  describe('原始响应对象', () => {
    it('raw 字段应该包含原始 fetch Response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({}),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);

      const config: RequestConfig = {
        url: '/api/test',
      };

      const response = await adapter.request(config);

      expect(response.raw).toBeDefined();
      expect(response.raw).toBe(mockResponse);
    });
  });
});
