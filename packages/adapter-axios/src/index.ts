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
  const headers: Record<string, string> = {};
  if (axiosResponse.headers) {
    Object.keys(axiosResponse.headers).forEach((key) => {
      const value = axiosResponse.headers[key];
      if (value !== undefined) {
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

  if (axiosError.response) {
    const response = axiosError.response;
    const errorMessage = axiosError.message || `Request failed with status ${response.status}`;

    const requestError = new Error(errorMessage) as RequestError;
    requestError.status = response.status;
    requestError.statusText = response.statusText;
    requestError.config = config as RequestConfig<unknown> | undefined;
    requestError.originalError = error;
    requestError.code = `HTTP_${response.status}`;

    return requestError;
  }

  const errorMessage = axiosError.message || 'Request failed';
  const requestError = new Error(errorMessage) as RequestError;
  requestError.config = config as RequestConfig<unknown> | undefined;
  requestError.originalError = error;

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
      if (axios.isAxiosError(error)) {
        throw toRequestError(error, config);
      }

      const requestError = new Error(
        error instanceof Error ? error.message : 'Request failed'
      ) as RequestError;
      requestError.config = config as RequestConfig<unknown>;
      requestError.originalError = error;
      requestError.code = 'UNKNOWN_ERROR';

      throw requestError;
    }
  }
}
