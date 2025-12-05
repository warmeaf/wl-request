// Fetch 适配器实现

import type { RequestAdapter, RequestConfig, RequestError, Response } from '@wl-request/core';

/**
 * 序列化 URL 参数
 * @param params URL 参数对象
 * @returns 序列化后的查询字符串
 */
function serializeParams(
  params: Record<string, string | number | boolean | null | undefined>
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    // 跳过 null 和 undefined
    if (value === null || value === undefined) {
      continue;
    }
    searchParams.append(key, String(value));
  }

  return searchParams.toString();
}

/**
 * 构建完整 URL
 * @param baseURL 基础 URL
 * @param url 请求 URL
 * @returns 完整 URL
 */
function buildURL(baseURL: string | undefined, url: string): string {
  if (!baseURL) {
    return url;
  }

  // 移除 baseURL 末尾的斜杠
  const normalizedBaseURL = baseURL.replace(/\/+$/, '');
  // 确保 url 以斜杠开头
  const normalizedURL = url.startsWith('/') ? url : `/${url}`;

  return `${normalizedBaseURL}${normalizedURL}`;
}

/**
 * 解析响应头
 * @param headers Headers 对象
 * @returns 响应头对象
 */
function parseHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};

  headers.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

/**
 * 解析响应数据
 * @param fetchResponse fetch Response 对象
 * @returns Promise<unknown> 解析后的数据
 */
async function parseResponseData(fetchResponse: globalThis.Response): Promise<unknown> {
  const contentType = fetchResponse.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return await fetchResponse.json();
  }

  if (contentType.startsWith('text/')) {
    return await fetchResponse.text();
  }

  // 先获取文本，再尝试解析 JSON（因为 body 只能读取一次）
  const text = await fetchResponse.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * 创建请求错误
 * @param message 错误消息
 * @param status HTTP 状态码
 * @param statusText HTTP 状态文本
 * @param config 请求配置
 * @param originalError 原始错误
 * @returns RequestError
 */
function createRequestError<T = unknown>(
  message: string,
  status?: number,
  statusText?: string,
  config?: RequestConfig<T>,
  originalError?: unknown
): RequestError {
  const error = new Error(message) as RequestError;
  error.status = status;
  error.statusText = statusText;
  // 将 RequestConfig<T> 转换为 RequestConfig<unknown> 以匹配 RequestError 接口
  error.config = config as RequestConfig<unknown> | undefined;
  error.originalError = originalError;
  error.code = status ? `HTTP_${status}` : 'NETWORK_ERROR';

  return error;
}

/**
 * Fetch 适配器
 * 基于原生 fetch API 实现请求适配器
 */
export class FetchAdapter implements RequestAdapter {
  /**
   * 执行请求
   * @param config 请求配置
   * @returns Promise<Response<T>>
   */
  async request<T = unknown>(config: RequestConfig<T>): Promise<Response<T>> {
    const { url, method = 'GET', baseURL, headers = {}, params, data, timeout } = config;

    // 构建完整 URL
    let fullURL = buildURL(baseURL, url);

    // 添加查询参数
    if (params && Object.keys(params).length > 0) {
      const queryString = serializeParams(params);
      const separator = fullURL.includes('?') ? '&' : '?';
      fullURL = `${fullURL}${separator}${queryString}`;
    }

    // 构建请求选项
    const headersRecord: Record<string, string> = { ...headers };
    const fetchOptions: RequestInit = {
      method,
      headers: headersRecord,
    };

    // 添加请求体（非 GET/HEAD 请求）
    if (data && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(data);
      // 如果没有设置 Content-Type，默认设置为 application/json
      if (!headersRecord['Content-Type'] && !headersRecord['content-type']) {
        headersRecord['Content-Type'] = 'application/json';
        fetchOptions.headers = headersRecord;
      }
    }

    // 创建 AbortController 用于超时控制
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    // 设置超时
    if (timeout) {
      timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);
    }

    fetchOptions.signal = controller.signal;

    try {
      // 执行请求
      const response = await fetch(fullURL, fetchOptions);

      // 清除超时定时器
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // 解析响应数据
      const responseData = await parseResponseData(response);

      // 检查 HTTP 状态码
      if (!response.ok) {
        throw createRequestError(
          `Request failed with status ${response.status}`,
          response.status,
          response.statusText,
          config
        );
      }

      // 构建响应对象
      const result: Response<T> = {
        status: response.status,
        statusText: response.statusText,
        headers: parseHeaders(response.headers),
        data: responseData as T,
        raw: response,
      };

      return result;
    } catch (error) {
      // 清除超时定时器
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // 处理 AbortError（超时）
      if (error instanceof Error && error.name === 'AbortError') {
        throw createRequestError('Request timeout', undefined, undefined, config, error);
      }

      // 处理其他错误
      if (error instanceof Error && 'status' in error) {
        // 已经是 RequestError，直接抛出
        throw error;
      }

      // 网络错误或其他错误
      throw createRequestError(
        error instanceof Error ? error.message : 'Request failed',
        undefined,
        undefined,
        config,
        error
      );
    }
  }
}
