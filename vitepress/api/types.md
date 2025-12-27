# 类型定义

## RequestConfig

请求配置接口。

```typescript
interface RequestConfig<T = unknown> extends RequestHooks<T> {
  url: string
  method?: RequestMethod
  baseURL?: string
  headers?: Record<string, string>
  data?: unknown
  params?: Record<string, string | number | boolean | null | undefined>
  timeout?: number
  adapter?: RequestAdapter
  retry?: RetryConfig
  cache?: CacheConfig
  idempotent?: IdempotentConfig
  cacheAdapter?: CacheAdapter
}
```

## RequestMethod

HTTP 请求方法。

```typescript
type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
```

## Response

响应接口。

```typescript
interface Response<T = unknown> {
  status: number
  statusText: string
  headers: ResponseHeaders
  data: T
  raw?: unknown
}
```

## ResponseHeaders

响应头类型。

```typescript
type ResponseHeaders = Record<string, string>
```

## RequestError

请求错误类型。

```typescript
interface RequestError extends Error {
  code?: string
  status?: number
  statusText?: string
  config?: RequestConfig<unknown>
  originalError?: unknown
}
```

## RequestHooks

请求钩子接口。

```typescript
interface RequestHooks<T = unknown> {
  onBefore?: OnBeforeHook<T>
  onSuccess?: OnSuccessHook<T>
  onError?: OnErrorHook
  onFinally?: OnFinallyHook
}
```

### OnBeforeHook

```typescript
type OnBeforeHook<T = unknown> = (
  config: RequestConfig<T>
) => RequestConfig<T> | Promise<RequestConfig<T> | undefined> | undefined
```

### OnSuccessHook

```typescript
type OnSuccessHook<T = unknown> = (response: Response<T>) => void | Promise<void>
```

### OnErrorHook

```typescript
type OnErrorHook = (error: RequestError) => void | Promise<void>
```

### OnFinallyHook

```typescript
type OnFinallyHook = () => void | Promise<void>
```

## RequestInstance

请求实例接口。

```typescript
interface RequestInstance<T = unknown> {
  send(): Promise<Response<T>>
  cancel(): void
}
```

## GlobalConfig

全局配置接口。

```typescript
type GlobalConfig<T = unknown> = RequestConfig<T>
```

## CacheConfig

缓存配置接口。

```typescript
interface CacheConfig {
  key: string
  ttl: number
  cacheAdapter?: CacheAdapter
}
```

## RetryConfig

重试配置接口。

```typescript
interface RetryConfig {
  count: number
  delay: number
  strategy?: RetryStrategy
  maxDelay?: number
  condition?: RetryCondition
  totalTimeout?: number
}
```

## RetryStrategy

重试策略类型与常量。

```typescript
const RETRY_STRATEGY = {
  EXPONENTIAL: 'exponential',
  LINEAR: 'linear',
  FIXED: 'fixed'
} as const

type RetryStrategy = (typeof RETRY_STRATEGY)[keyof typeof RETRY_STRATEGY]
```

## RetryCondition

重试条件函数类型。

```typescript
type RetryCondition = (error: RequestError, retryCount: number) => boolean
```

## IdempotentConfig

幂等配置接口。

```typescript
interface IdempotentConfig {
  key: string
  ttl: number
  cacheAdapter?: CacheAdapter
}
```

## RequestAdapter

请求适配器接口。

```typescript
interface RequestAdapter {
  request<T>(config: RequestConfig): Promise<Response<T>>
}
```

## CacheAdapter

缓存适配器接口。

```typescript
interface CacheAdapter {
  get<T = unknown>(key: string): Promise<T | null>
  set<T = unknown>(key: string, value: T, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  has(key: string): Promise<boolean>
  cleanup?(): Promise<void>
}
```

## ResponseData

响应数据类型。

```typescript
type ResponseData<T = unknown> = T
```
