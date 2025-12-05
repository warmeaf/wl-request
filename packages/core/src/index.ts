// wl-request 核心包入口文件

// 导出适配器相关 API
export {
  getAdapter,
  getDefaultAdapter,
  registerAdapter,
  resetAdapters,
  setDefaultAdapter,
} from './adapters';
// 导出配置相关 API
export { configure, getGlobalConfig, mergeConfig, resetConfig } from './config';
export { withCache } from './features/cache';
export { clearPendingRequests, withIdempotent } from './features/idempotent';
export { parallelRequests } from './features/parallel';
// 导出功能模块
export { retryRequest } from './features/retry';
export { serialRequests } from './features/serial';
// 导出 Hook
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
// 导出接口
export type {
  CacheAdapter,
  RequestAdapter,
  RequestConfig,
  RequestInstance,
  Response,
} from './interfaces';
// 导出请求实例创建函数
export { createRequest } from './request';
// 导出类型
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
