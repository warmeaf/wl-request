// 接口定义

import type {
  CacheConfig,
  IdempotentConfig,
  RequestHooks,
  RequestMethod,
  ResponseData,
  ResponseHeaders,
  RetryConfig,
} from '../types';

/**
 * HTTP 响应
 */
export interface Response<T = unknown> {
  /** HTTP 状态码 */
  status: number;
  /** HTTP 状态文本 */
  statusText: string;
  /** 响应头 */
  headers: ResponseHeaders;
  /** 响应数据 */
  data: ResponseData<T>;
  /** 原始响应对象（适配器特定） */
  raw?: unknown;
}

/**
 * 请求配置
 */
export interface RequestConfig<T = unknown> extends RequestHooks<T> {
  /** 请求 URL */
  url: string;
  /** HTTP 方法 */
  method?: RequestMethod;
  /** 基础 URL */
  baseURL?: string;
  /** 请求头 */
  headers?: Record<string, string>;
  /** URL 参数 */
  params?: Record<string, string | number | boolean | null | undefined>;
  /** 请求体数据 */
  data?: unknown;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 请求适配器实例 */
  adapter?: RequestAdapter;
  /** 重试配置 */
  retry?: RetryConfig;
  /** 缓存配置 */
  cache?: CacheConfig;
  /** 幂等配置 */
  idempotent?: IdempotentConfig;
  /** 缓存适配器实例（用于缓存和幂等功能） */
  cacheAdapter?: CacheAdapter;
}

/**
 * 请求适配器接口
 * 适配器需要实现此接口以支持不同的请求库（fetch、axios 等）
 */
export interface RequestAdapter {
  /**
   * 执行请求
   * @param config 请求配置
   * @returns Promise<Response<T>>
   */
  request<T = unknown>(config: RequestConfig<T>): Promise<Response<T>>;
}

/**
 * 缓存适配器接口
 * 缓存适配器需要实现此接口以支持不同的存储方式（内存、localStorage、IndexedDB 等）
 */
export interface CacheAdapter {
  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns Promise<T | null> 缓存值，不存在时返回 null
   */
  get<T = unknown>(key: string): Promise<T | null>;

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（毫秒），可选
   * @returns Promise<void>
   */
  set<T = unknown>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * 删除缓存值
   * @param key 缓存键
   * @returns Promise<void>
   */
  delete(key: string): Promise<void>;

  /**
   * 清空所有缓存
   * @returns Promise<void>
   */
  clear(): Promise<void>;

  /**
   * 检查缓存是否存在
   * @param key 缓存键
   * @returns Promise<boolean> 缓存存在返回 true，否则返回 false
   */
  has(key: string): Promise<boolean>;
}

/**
 * 请求实例接口
 * 用于封装单个请求的执行和取消
 */
export interface RequestInstance<T = unknown> {
  /**
   * 发送请求
   * @returns Promise<Response<T>>
   */
  send(): Promise<Response<T>>;

  /**
   * 取消请求
   */
  cancel(): void;
}

/**
 * 全局配置类型
 * 全局配置与请求配置使用相同的类型定义
 */
export type { GlobalConfig } from '../types';
