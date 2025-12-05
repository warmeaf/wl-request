// wl-request 核心包入口文件

export { withCache } from './features/cache';
export { clearPendingRequests, withIdempotent } from './features/idempotent';
export { parallelRequests } from './features/parallel';
// 导出功能模块
export { retryRequest } from './features/retry';
export { serialRequests } from './features/serial';
// 导出接口
export type {
  CacheAdapter,
  RequestAdapter,
  RequestConfig,
  RequestInstance,
  Response,
} from './interfaces';
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
