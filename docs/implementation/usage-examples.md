# 使用示例

> **注意**：以下所有示例均需要在浏览器环境中运行，不支持 Node.js 环境。

## 全局配置

在应用启动时配置全局默认设置，所有请求都会继承这些配置：

```typescript
import { configure, useRequest } from '@wl-request/core'
import { AxiosAdapter } from '@wl-request/adapter-axios'
import { IndexedDBCacheAdapter } from '@wl-request/cache-adapter-indexeddb'

configure({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  adapter: new AxiosAdapter(),
  cacheAdapter: new IndexedDBCacheAdapter(),
  headers: {
    'Content-Type': 'application/json',
  },
  retry: {
    count: 3,
    delay: 1000,
  },
  onBefore: (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      }
    }
    return config
  },
  onSuccess: (response) => {
    console.log('请求成功:', response)
  },
  onError: (err) => {
    if (err.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    console.error('请求失败:', err)
  },
  onFinally: () => {
    console.log('请求完成')
  },
})
```

单个请求可以覆盖全局配置：

```typescript
const { send } = useRequest({
  url: '/api/users',
  timeout: 5000,
  headers: {
    'X-Custom-Header': 'custom-value',
  },
  onSuccess: (response) => {
    console.log('用户数据:', response.data)
  },
})

await send()
```

## 请求重试

### 基本重试

```typescript
import { useRequest } from '@wl-request/core'

const { send } = useRequest({
  url: '/api/data',
  retry: {
    count: 3,
    delay: 1000,
  },
  onSuccess: (response) => {
    console.log('数据获取成功:', response.data)
  },
  onError: (err) => {
    console.error('请求失败:', err)
  },
})

await send()
```

### 指数退避策略

```typescript
import { useRequest, RETRY_STRATEGY } from '@wl-request/core'

const { send } = useRequest({
  url: '/api/data',
  retry: {
    count: 3,
    delay: 200,
    strategy: RETRY_STRATEGY.EXPONENTIAL,
  },
  onSuccess: (response) => {
    console.log('数据获取成功:', response.data)
  },
})

await send()
```

## 请求缓存

使用缓存功能需要显式指定缓存适配器。如果不提供 `cacheAdapter`，缓存功能不会生效。

### 内存适配器

内存适配器将数据存储在内存中，页面刷新后数据会丢失，适合临时缓存场景：

```typescript
import { useRequest } from '@wl-request/core'
import { MemoryCacheAdapter } from '@wl-request/cache-adapter-memory'

const cacheAdapter = new MemoryCacheAdapter()

const { send } = useRequest({
  url: '/api/users',
  cache: {
    key: 'users-list',
    ttl: 5 * 60 * 1000,
    cacheAdapter,
  },
  onSuccess: (response) => {
    console.log('用户列表:', response.data)
  },
})

await send()
```

### IndexedDB 适配器

IndexedDB 适配器适合存储大量数据，支持更大的存储空间：

```typescript
import { useRequest } from '@wl-request/core'
import { IndexedDBCacheAdapter } from '@wl-request/cache-adapter-indexeddb'

const cacheAdapter = new IndexedDBCacheAdapter()

const { send } = useRequest({
  url: '/api/users',
  cache: {
    key: 'users-list',
    ttl: 5 * 60 * 1000,
    cacheAdapter,
  },
  onSuccess: (response) => {
    console.log('用户列表:', response.data)
  },
})

await send()
```

### 全局配置缓存适配器

可以在全局配置中设置默认的缓存适配器，所有使用缓存的请求都会使用该适配器：

```typescript
import { configure } from '@wl-request/core'
import { IndexedDBCacheAdapter } from '@wl-request/cache-adapter-indexeddb'

const cacheAdapter = new IndexedDBCacheAdapter()

configure({
  cacheAdapter,
})
```

### 适配器选择建议

- **内存适配器**：适合临时数据，页面刷新后自动清除，性能最好
- **IndexedDB**：适合大量数据缓存，存储容量可达数百 MB，但 API 较复杂

## 并行请求

### 基本并行请求（failFast: true）

默认情况下，如果有一个请求失败，整个并行请求会失败：

```typescript
import { useParallelRequests } from '@wl-request/core'

const { send } = useParallelRequests(
  [{ url: '/api/users' }, { url: '/api/posts' }, { url: '/api/comments' }],
  {
    failFast: true, // 默认值，有一个失败就整体失败
    onBefore: () => {
      console.log('开始并行请求')
    },
    onSuccess: (results) => {
      console.log('所有请求完成:', results)
    },
    onError: (errors) => {
      console.error('部分请求失败:', errors)
    },
    onFinally: () => {
      console.log('并行请求完成')
    },
  }
)

await send()
```

### 允许部分失败（failFast: false）

设置 `failFast: false` 时，即使部分请求失败，也会返回成功的结果：

```typescript
import { useParallelRequests } from '@wl-request/core'

const { send } = useParallelRequests(
  [{ url: '/api/users' }, { url: '/api/posts' }, { url: '/api/comments' }],
  {
    failFast: false, // 允许部分失败，只返回成功的结果
    onSuccess: (results) => {
      console.log(`成功请求数: ${results.length}`)
    },
    onError: (errors) => {
      console.error(`失败请求数: ${errors.length}`)
    },
  }
)

// failFast: false 时，即使有错误也不会抛出异常
const results = await send()
console.log(`最终返回 ${results.length} 个成功的结果`)
```

## 串行请求

串行请求按顺序执行，如果某个请求失败，后续请求会被中断：

```typescript
import { useSerialRequests } from '@wl-request/core'

const { send } = useSerialRequests(
  [{ url: '/api/step1' }, { url: '/api/step2' }, { url: '/api/step3' }],
  {
    onBefore: () => {
      console.log('开始串行请求')
    },
    onSuccess: (results) => {
      console.log('所有请求完成:', results)
    },
    onError: (error, index) => {
      console.error(`第 ${index + 1} 个请求失败，中断后续请求:`, error)
    },
    onFinally: () => {
      console.log('串行请求完成')
    },
  }
)

await send()
```

## 幂等请求

幂等请求使用缓存机制来确保相同请求在指定时间内只执行一次，需要配置缓存适配器：

```typescript
import { useRequest } from '@wl-request/core'
import { MemoryCacheAdapter } from '@wl-request/cache-adapter-memory'

const cacheAdapter = new MemoryCacheAdapter()

const { send } = useRequest({
  url: '/api/create-order',
  method: 'POST',
  idempotent: {
    key: 'order-123',
    ttl: 10 * 60 * 1000,
    cacheAdapter,
  },
  onSuccess: (response) => {
    console.log('订单创建成功:', response.data)
  },
  onError: (err) => {
    console.error('订单创建失败:', err)
  },
})

await send()
```

使用 IndexedDB 适配器存储幂等请求记录：

```typescript
import { useRequest } from '@wl-request/core'
import { IndexedDBCacheAdapter } from '@wl-request/cache-adapter-indexeddb'

const cacheAdapter = new IndexedDBCacheAdapter()

const { send } = useRequest({
  url: '/api/create-order',
  method: 'POST',
  idempotent: {
    key: 'order-123',
    ttl: 10 * 60 * 1000,
    cacheAdapter,
  },
  onSuccess: (response) => {
    console.log('订单创建成功:', response.data)
  },
})

await send()
```

## 使用自定义适配器（Axios）

```typescript
import { useRequest } from '@wl-request/core'
import { AxiosAdapter } from '@wl-request/adapter-axios'

const { send } = useRequest({
  url: '/api/users',
  adapter: new AxiosAdapter(),
  onSuccess: (response) => {
    console.log('数据获取成功:', response.data)
  },
  onError: (err) => {
    console.error('请求失败:', err)
  },
})

await send()
```

也可以在全局配置中设置默认适配器：

```typescript
import { configure } from '@wl-request/core'
import { AxiosAdapter } from '@wl-request/adapter-axios'

configure({
  adapter: new AxiosAdapter(),
  baseURL: 'https://api.example.com',
})
```

