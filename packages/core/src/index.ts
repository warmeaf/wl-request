// wl-request 核心包入口文件

// ============================================================================
// 适配器 API
// ============================================================================

export {
  getAdapter,
  getDefaultAdapter,
  registerAdapter,
  resetAdapters,
  setDefaultAdapter,
} from './adapters';

export { LocalStorageCacheAdapter } from './adapters/local-storage-cache-adapter';

// ============================================================================
// 配置 API
// ============================================================================

export { configure, getGlobalConfig, mergeConfig, resetConfig } from './config';

// ============================================================================
// 功能模块

export {
  getDefaultCacheAdapter,
  resetDefaultCacheAdapter,
  setDefaultCacheAdapter,
  withCache,
} from './features/cache';
export { clearPendingRequests, withIdempotent } from './features/idempotent';
export { parallelRequests } from './features/parallel';
export { retryRequest } from './features/retry';
export { serialRequests } from './features/serial';

// ============================================================================
// Hooks
// ============================================================================

export type {
  ParallelRequestsHookConfig,
  ParallelRequestsHookResult,
} from './hooks/useParallelRequests';
export { useParallelRequests } from './hooks/useParallelRequests';
export { useRequest } from './hooks/useRequest';
export type {
  SerialRequestsHookConfig,
  SerialRequestsHookResult,
} from './hooks/useSerialRequests';
export { useSerialRequests } from './hooks/useSerialRequests';

// ============================================================================
// 请求实例
// ============================================================================

export { createRequest } from './request';

// ============================================================================
// 接口类型
// ============================================================================

export type {
  CacheAdapter,
  RequestAdapter,
  RequestConfig,
  RequestInstance,
  Response,
} from './interfaces';

// ============================================================================
// 类型定义
// ============================================================================

export type {
  CacheConfig,
  GlobalConfig,
  IdempotentConfig,
  OnBeforeHook,
  OnErrorHook,
  OnFinallyHook,
  OnSuccessHook,
  RequestError,
  RequestHooks,
  RequestMethod,
  ResponseData,
  ResponseHeaders,
  RetryCondition,
  RetryConfig,
  RetryStrategy,
} from './types';

// ============================================================================
// 常量
// ============================================================================

export { RETRY_STRATEGY } from './types';
