// 类型定义

import type { CacheAdapter } from '../interfaces';

/**
 * HTTP 请求方法
 */
export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * 响应数据类型（泛型）
 */
export type ResponseData<T = unknown> = T;

/**
 * HTTP 响应头
 */
export type ResponseHeaders = Record<string, string>;

/**
 * 请求错误
 */
export interface RequestError extends Error {
  /** HTTP 状态码（如果可用） */
  status?: number;
  /** 错误代码 */
  code?: string;
  /** 请求配置 */
  config?: import('../interfaces').RequestConfig<unknown>;
  /** 原始错误对象 */
  originalError?: unknown;
}

/**
 * 重试策略
 */
export type RetryStrategy = 'exponential' | 'linear' | 'fixed';

/**
 * 重试条件函数
 * @param error 请求错误
 * @param retryCount 当前重试次数
 * @returns 是否应该重试
 */
export type RetryCondition = (error: RequestError, retryCount: number) => boolean;

/**
 * 重试配置
 */
export interface RetryConfig {
  /** 重试次数 */
  count: number;
  /** 延迟时间（毫秒） */
  delay: number;
  /** 退避策略 */
  strategy?: RetryStrategy;
  /** 自定义重试条件函数 */
  condition?: RetryCondition;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  /** 缓存键 */
  key: string;
  /** 过期时间（毫秒） */
  ttl: number;
  /** 可选的缓存适配器实例 */
  cacheAdapter?: CacheAdapter;
}

/**
 * 幂等配置
 */
export interface IdempotentConfig {
  /** 幂等键 */
  key: string;
  /** 过期时间（毫秒） */
  ttl: number;
  /** 可选的缓存适配器实例 */
  cacheAdapter?: CacheAdapter;
}

/**
 * 请求前钩子函数
 * @param config 请求配置
 * @returns 可能修改后的配置或 undefined
 */
export type OnBeforeHook<T = unknown> = (
  config: import('../interfaces').RequestConfig<T>
) =>
  | import('../interfaces').RequestConfig<T>
  | Promise<import('../interfaces').RequestConfig<T> | undefined>
  | undefined;

/**
 * 请求成功钩子函数
 * @param response 响应对象
 */
export type OnSuccessHook<T = unknown> = (
  response: import('../interfaces').Response<T>
) => void | Promise<void>;

/**
 * 请求错误钩子函数
 * @param error 错误对象
 */
export type OnErrorHook = (error: RequestError) => void | Promise<void>;

/**
 * 请求完成钩子函数（无论成功或失败）
 */
export type OnFinallyHook = () => void | Promise<void>;

/**
 * Hook 回调函数集合
 */
export interface RequestHooks<T = unknown> {
  /** 请求前钩子 */
  onBefore?: OnBeforeHook<T>;
  /** 请求成功钩子 */
  onSuccess?: OnSuccessHook<T>;
  /** 请求错误钩子 */
  onError?: OnErrorHook;
  /** 请求完成钩子 */
  onFinally?: OnFinallyHook;
}

/**
 * 全局配置类型
 * 全局配置与请求配置使用相同的类型定义
 */
export type GlobalConfig<T = unknown> = import('../interfaces').RequestConfig<T>;
