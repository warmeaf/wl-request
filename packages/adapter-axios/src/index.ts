// Axios 适配器实现

import type { RequestAdapter, RequestConfig, RequestError, Response } from '@wl-request/core';
import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';

/**
 * 将 RequestConfig 转换为 axios 配置
 * @param config RequestConfig
 * @returns AxiosRequestConfig
 */
function toAxiosConfig<T>(config: RequestConfig<T>): AxiosRequestConfig {
  const axiosConfig: AxiosRequestConfig = {
    url: config.url,
    method: config.method || 'GET',
    baseURL: config.baseURL,
    headers: config.headers,
    params: config.params,
    data: config.data,
    timeout: config.timeout,
  };

  return axiosConfig;
}

/**
 * 将 axios 响应转换为 Response<T>
 * @param axiosResponse axios 响应对象
 * @returns Response<T>
 */
function toResponse<T>(axiosResponse: AxiosResponse<T>): Response<T> {
  // 将 axios headers 对象转换为普通对象
  const headers: Record<string, string> = {};
  if (axiosResponse.headers) {
    Object.keys(axiosResponse.headers).forEach((key) => {
      const value = axiosResponse.headers[key];
      if (value !== undefined) {
        // axios headers 可能是字符串或字符串数组
        headers[key] = Array.isArray(value) ? value.join(', ') : String(value);
      }
    });
  }

  return {
    status: axiosResponse.status,
    statusText: axiosResponse.statusText,
    headers,
    data: axiosResponse.data,
    raw: axiosResponse,
  };
}

/**
 * 将 axios 错误转换为 RequestError
 * @param error axios 错误对象
 * @param config 请求配置
 * @returns RequestError
 */
function toRequestError<T = unknown>(error: unknown, config?: RequestConfig<T>): RequestError {
  const axiosError = error as AxiosError;

  // 如果有响应，说明是 HTTP 错误
  if (axiosError.response) {
    const response = axiosError.response;
    const errorMessage = axiosError.message || `Request failed with status ${response.status}`;

    const requestError = new Error(errorMessage) as RequestError;
    requestError.status = response.status;
    requestError.statusText = response.statusText;
    // 将 RequestConfig<T> 转换为 RequestConfig<unknown> 以匹配 RequestError 接口
    requestError.config = config as RequestConfig<unknown> | undefined;
    requestError.originalError = error;
    requestError.code = `HTTP_${response.status}`;

    return requestError;
  }

  // 网络错误或其他错误
  const errorMessage = axiosError.message || 'Request failed';
  const requestError = new Error(errorMessage) as RequestError;
  // 将 RequestConfig<T> 转换为 RequestConfig<unknown> 以匹配 RequestError 接口
  requestError.config = config as RequestConfig<unknown> | undefined;
  requestError.originalError = error;

  // 根据错误代码设置 code
  if (axiosError.code) {
    requestError.code = axiosError.code;
  } else if (axiosError.message?.includes('timeout')) {
    requestError.code = 'TIMEOUT_ERROR';
  } else {
    requestError.code = 'NETWORK_ERROR';
  }

  return requestError;
}

/**
 * Axios 适配器
 * 基于 axios 库实现请求适配器
 */
export class AxiosAdapter implements RequestAdapter {
  /**
   * 执行请求
   * @param config 请求配置
   * @returns Promise<Response<T>>
   */
  async request<T = unknown>(config: RequestConfig<T>): Promise<Response<T>> {
    try {
      const axiosConfig = toAxiosConfig(config);
      const axiosResponse = await axios.request<T>(axiosConfig);
      return toResponse(axiosResponse);
    } catch (error) {
      // 如果是 axios 错误，转换为 RequestError
      if (axios.isAxiosError(error)) {
        throw toRequestError(error, config);
      }

      // 其他错误，包装为 RequestError
      const requestError = new Error(
        error instanceof Error ? error.message : 'Request failed'
      ) as RequestError;
      // 将 RequestConfig<T> 转换为 RequestConfig<unknown> 以匹配 RequestError 接口
      requestError.config = config as RequestConfig<unknown>;
      requestError.originalError = error;
      requestError.code = 'UNKNOWN_ERROR';

      throw requestError;
    }
  }
}
