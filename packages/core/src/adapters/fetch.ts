import type { RequestAdapter, RequestConfig, Response } from '../interfaces';
import type { RequestError } from '../types';

function serializeParams(
  params: Record<string, string | number | boolean | null | undefined>
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      continue;
    }
    searchParams.append(key, String(value));
  }

  return searchParams.toString();
}

function buildURL(baseURL: string | undefined, url: string): string {
  if (!baseURL) {
    return url;
  }

  const normalizedBaseURL = baseURL.replace(/\/+$/, '');
  const normalizedURL = url.startsWith('/') ? url : `/${url}`;

  return `${normalizedBaseURL}${normalizedURL}`;
}

function parseHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};

  headers.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

async function parseResponseData(fetchResponse: globalThis.Response): Promise<unknown> {
  const contentType = fetchResponse.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return await fetchResponse.json();
  }

  if (contentType.startsWith('text/')) {
    return await fetchResponse.text();
  }

  const text = await fetchResponse.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

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
  error.config = config as RequestConfig<unknown> | undefined;
  error.originalError = originalError;
  error.code = status ? `HTTP_${status}` : 'NETWORK_ERROR';

  return error;
}

export class FetchAdapter implements RequestAdapter {
  async request<T = unknown>(config: RequestConfig<T>): Promise<Response<T>> {
    const { url, method = 'GET', baseURL, headers = {}, params, data, timeout } = config;

    let fullURL = buildURL(baseURL, url);

    if (params && Object.keys(params).length > 0) {
      const queryString = serializeParams(params);
      const separator = fullURL.includes('?') ? '&' : '?';
      fullURL = `${fullURL}${separator}${queryString}`;
    }

    const headersRecord: Record<string, string> = { ...headers };
    const fetchOptions: RequestInit = {
      method,
      headers: headersRecord,
    };

    if (data && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(data);
      if (!headersRecord['Content-Type'] && !headersRecord['content-type']) {
        headersRecord['Content-Type'] = 'application/json';
        fetchOptions.headers = headersRecord;
      }
    }

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (timeout) {
      timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);
    }

    fetchOptions.signal = controller.signal;

    try {
      const response = await fetch(fullURL, fetchOptions);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const responseData = await parseResponseData(response);

      if (!response.ok) {
        throw createRequestError(
          `Request failed with status ${response.status}`,
          response.status,
          response.statusText,
          config
        );
      }

      const result: Response<T> = {
        status: response.status,
        statusText: response.statusText,
        headers: parseHeaders(response.headers),
        data: responseData as T,
        raw: response,
      };

      return result;
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw createRequestError('Request timeout', undefined, undefined, config, error);
      }

      if (error instanceof Error && 'status' in error) {
        throw error;
      }

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
