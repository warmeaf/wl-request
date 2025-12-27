// Axios 适配器测试

import type { RequestAdapter, RequestConfig } from '@wl-request/core';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosAdapter } from '../src/index';

// Mock axios
vi.mock('axios', () => {
  const isAxiosError = (error: unknown): boolean => {
    return error !== null && typeof error === 'object' && 'isAxiosError' in error;
  };
  return {
    default: {
      request: vi.fn(),
      isAxiosError,
    },
    isAxiosError,
  };
});

describe('AxiosAdapter', () => {
  let adapter: RequestAdapter;
  let mockAxiosRequest: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    adapter = new AxiosAdapter();
    mockAxiosRequest = vi.mocked(axios.request);
    mockAxiosRequest.mockClear();
  });

  describe('基本请求功能', () => {
    it('应该能够正确发送请求', async () => {
      const mockAxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/json',
        },
        data: { message: 'success' },
      };

      mockAxiosRequest.mockResolvedValue(mockAxiosResponse);

      const config: RequestConfig = {
        url: '/api/test',
        method: 'GET',
      };

      const response = await adapter.request(config);

      expect(response.status).toBe(200);
      expect(response.statusText).toBe('OK');
      expect(response.data).toEqual({ message: 'success' });
      expect(mockAxiosRequest).toHaveBeenCalledTimes(1);
    });

    it('应该能够发送 POST 请求', async () => {
      const mockAxiosResponse = {
        status: 201,
        statusText: 'Created',
        headers: {},
        data: { id: 1 },
      };

      mockAxiosRequest.mockResolvedValue(mockAxiosResponse);

      const config: RequestConfig = {
        url: '/api/test',
        method: 'POST',
        data: { name: 'test' },
      };

      const response = await adapter.request(config);

      expect(response.status).toBe(201);
      expect(response.data).toEqual({ id: 1 });
      expect(mockAxiosRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/test',
          method: 'POST',
          data: { name: 'test' },
        })
      );
    });
  });

  describe('与 axios API 的兼容性', () => {
    it('应该正确转换 RequestConfig 为 axios 配置', async () => {
      const mockAxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
      };

      mockAxiosRequest.mockResolvedValue(mockAxiosResponse);

      const config: RequestConfig = {
        url: '/api/test',
        method: 'PUT',
        baseURL: 'https://api.example.com',
        headers: {
          Authorization: 'Bearer token',
        },
        params: {
          page: 1,
          limit: 10,
        },
        data: { name: 'test' },
        timeout: 5000,
      };

      await adapter.request(config);

      expect(mockAxiosRequest).toHaveBeenCalledWith({
        url: '/api/test',
        method: 'PUT',
        baseURL: 'https://api.example.com',
        headers: {
          Authorization: 'Bearer token',
        },
        params: {
          page: 1,
          limit: 10,
        },
        data: { name: 'test' },
        timeout: 5000,
      });
    });

    it('应该正确处理所有 HTTP 方法', async () => {
      const mockAxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
      };

      mockAxiosRequest.mockResolvedValue(mockAxiosResponse);

      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;

      for (const method of methods) {
        mockAxiosRequest.mockClear();

        const config: RequestConfig = {
          url: '/api/test',
          method,
        };

        await adapter.request(config);

        expect(mockAxiosRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            method,
          })
        );
      }
    });
  });

  describe('响应格式转换', () => {
    it('应该将 axios 响应转换为 Response<T> 格式', async () => {
      const mockAxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'custom-value',
        },
        data: { result: 'success' },
      };

      mockAxiosRequest.mockResolvedValue(mockAxiosResponse);

      const config: RequestConfig<{ result: string }> = {
        url: '/api/test',
      };

      const response = await adapter.request(config);

      expect(response).toEqual({
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'custom-value',
        },
        data: { result: 'success' },
        raw: mockAxiosResponse,
      });
    });

    it('应该正确处理响应头', async () => {
      const mockAxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {
          'set-cookie': ['cookie1=value1', 'cookie2=value2'],
        },
        data: {},
      };

      mockAxiosRequest.mockResolvedValue(mockAxiosResponse);

      const config: RequestConfig = {
        url: '/api/test',
      };

      const response = await adapter.request(config);

      // 数组值会被连接成逗号分隔的字符串
      expect(response.headers).toEqual({
        'set-cookie': 'cookie1=value1, cookie2=value2',
      });
    });

    it('应该正确处理 undefined 的响应头', async () => {
      const mockAxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: undefined,
        data: {},
      };

      mockAxiosRequest.mockResolvedValue(mockAxiosResponse);

      const config: RequestConfig = {
        url: '/api/test',
      };

      const response = await adapter.request(config);

      // headers 为 undefined 时应该返回空对象
      expect(response.headers).toEqual({});
    });

    it('应该正确处理响应头中的 undefined 值', async () => {
      // 使用普通对象模拟 Headers，其中某个值可能是 undefined
      const mockAxiosResponse = {
        status: 200,
        statusText: 'OK',
        // headers 中某些值可能是 undefined
        headers: {
          'content-type': 'application/json',
          // 测试 undefined 值处理
          'undefined-header': undefined as unknown as string,
          'normal-header': 'value',
        },
        data: {},
      };

      mockAxiosRequest.mockResolvedValue(mockAxiosResponse);

      const config: RequestConfig = {
        url: '/api/test',
      };

      const response = await adapter.request(config);

      // undefined 的 header 应该被过滤掉
      expect(response.headers).toEqual({
        'content-type': 'application/json',
        'normal-header': 'value',
      });
    });
  });

  describe('错误处理', () => {
    it('应该将 axios 错误转换为 RequestError', async () => {
      const mockAxiosError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          headers: {},
          data: { error: 'Not found' },
        },
        message: 'Request failed with status code 404',
        isAxiosError: true,
      };

      mockAxiosRequest.mockRejectedValue(mockAxiosError);

      const config: RequestConfig = {
        url: '/api/test',
      };

      await expect(adapter.request(config)).rejects.toThrow();
    });

    it('应该处理网络错误', async () => {
      const mockAxiosError = {
        message: 'Network Error',
        code: 'ERR_NETWORK',
        isAxiosError: true,
      };

      mockAxiosRequest.mockRejectedValue(mockAxiosError);

      const config: RequestConfig = {
        url: '/api/test',
      };

      await expect(adapter.request(config)).rejects.toThrow();
    });

    it('应该处理超时错误', async () => {
      const mockAxiosError = {
        message: 'timeout of 5000ms exceeded',
        code: 'ECONNABORTED',
        isAxiosError: true,
      };

      mockAxiosRequest.mockRejectedValue(mockAxiosError);

      const config: RequestConfig = {
        url: '/api/test',
        timeout: 5000,
      };

      await expect(adapter.request(config)).rejects.toThrow();
    });

    it('应该处理 500 错误', async () => {
      const mockAxiosError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          data: { error: 'Server error' },
        },
        message: 'Request failed with status code 500',
        isAxiosError: true,
      };

      mockAxiosRequest.mockRejectedValue(mockAxiosError);

      const config: RequestConfig = {
        url: '/api/test',
      };

      await expect(adapter.request(config)).rejects.toThrow();
    });

    it('应该处理非 Axios 错误（普通 Error）', async () => {
      const regularError = new Error('Something went wrong');

      mockAxiosRequest.mockRejectedValue(regularError);

      const config: RequestConfig = {
        url: '/api/test',
      };

      const error = await adapter.request(config).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Something went wrong');
      expect((error as { code?: string }).code).toBe('UNKNOWN_ERROR');
    });

    it('应该处理非 Axios 错误（字符串）', async () => {
      mockAxiosRequest.mockRejectedValue('String error');

      const config: RequestConfig = {
        url: '/api/test',
      };

      const error = await adapter.request(config).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Request failed');
      expect((error as { code?: string }).code).toBe('UNKNOWN_ERROR');
    });

    it('应该处理非 Axios 错误（其他对象）', async () => {
      mockAxiosRequest.mockRejectedValue({ custom: 'error' });

      const config: RequestConfig = {
        url: '/api/test',
      };

      const error = await adapter.request(config).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Request failed');
      expect((error as { code?: string }).code).toBe('UNKNOWN_ERROR');
    });

    it('应该正确设置超时错误代码', async () => {
      const mockAxiosError = {
        message: 'timeout exceeded',
        code: undefined,
        isAxiosError: true,
      };

      mockAxiosRequest.mockRejectedValue(mockAxiosError);

      const config: RequestConfig = {
        url: '/api/test',
        timeout: 5000,
      };

      const error = await adapter.request(config).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect((error as { code?: string }).code).toBe('TIMEOUT_ERROR');
    });

    it('应该正确设置网络错误代码（无 code，包含 timeout 消息）', async () => {
      const mockAxiosError = {
        message: 'timeout exceeded',
        code: undefined,
        isAxiosError: true,
      };

      mockAxiosRequest.mockRejectedValue(mockAxiosError);

      const config: RequestConfig = {
        url: '/api/test',
      };

      const error = await adapter.request(config).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect((error as { code?: string }).code).toBe('TIMEOUT_ERROR');
    });

    it('应该正确处理 axiosError.message 为空且有 response 的情况', async () => {
      const mockAxiosError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          data: { error: 'Server error' },
        },
        message: undefined, // message 为空
        isAxiosError: true,
      };

      mockAxiosRequest.mockRejectedValue(mockAxiosError);

      const config: RequestConfig = {
        url: '/api/test',
      };

      const error = await adapter.request(config).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      // 应该使用 fallback 消息
      expect((error as Error).message).toBe('Request failed with status 500');
    });

    it('应该正确处理 axiosError.message 为空且无 response 的情况', async () => {
      const mockAxiosError = {
        message: undefined, // message 为空
        code: undefined,
        isAxiosError: true,
      };

      mockAxiosRequest.mockRejectedValue(mockAxiosError);

      const config: RequestConfig = {
        url: '/api/test',
      };

      const error = await adapter.request(config).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      // 应该使用默认消息
      expect((error as Error).message).toBe('Request failed');
      expect((error as { code?: string }).code).toBe('NETWORK_ERROR');
    });
  });

  describe('原始响应对象', () => {
    it('raw 字段应该包含原始 axios 响应', async () => {
      const mockAxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { test: 'data' },
      };

      mockAxiosRequest.mockResolvedValue(mockAxiosResponse);

      const config: RequestConfig = {
        url: '/api/test',
      };

      const response = await adapter.request(config);

      expect(response.raw).toBe(mockAxiosResponse);
    });
  });
});
