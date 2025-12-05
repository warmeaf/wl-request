# 使用示例

> **注意**：以下所有示例均需要在浏览器环境中运行，不支持 Node.js 环境。

## 全局配置

在应用启动时配置全局默认设置，所有请求都会继承这些配置：

```typescript
import { configure } from 'wl-request'
import { axiosAdapter } from '@wl-request/adapter-axios'
import { indexedDBAdapter } from '@wl-request/cache-adapter-indexeddb'

configure({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  adapter: axiosAdapter,
  cacheAdapter: indexedDBAdapter,
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
```

## 请求重试

```typescript
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
```

## 请求缓存

默认使用 localStorage 作为缓存存储，无需额外安装：

```typescript
const { send } = useRequest({
  url: '/api/users',
  cache: {
    key: 'users-list',
    ttl: 5 * 60 * 1000,
  },
  onSuccess: (response) => {
    console.log('用户列表:', response.data)
  },
})
```

## 缓存适配器

项目支持多种缓存适配器，可以根据需求选择合适的存储方式。所有缓存适配器均基于浏览器 API 实现，需要在浏览器环境中使用。

### LocalStorage 适配器（默认）

LocalStorage 适配器是默认的缓存适配器，无需额外安装，适合大多数场景。如果不指定适配器，将自动使用 localStorage。由于是默认适配器，无需单独引入：

```typescript
import { useRequest } from 'wl-request'

const { send } = useRequest({
  url: '/api/users',
  cache: {
    key: 'users-list',
    ttl: 5 * 60 * 1000,
  },
  onSuccess: (response) => {
    console.log('用户列表:', response.data)
  },
})
```

### 内存适配器

内存适配器将数据存储在内存中，页面刷新后数据会丢失，适合临时缓存场景：

```typescript
import { useRequest } from 'wl-request'
import { memoryAdapter } from '@wl-request/cache-adapter-memory'

const { send } = useRequest({
  url: '/api/users',
  cache: {
    key: 'users-list',
    ttl: 5 * 60 * 1000,
    cacheAdapter: memoryAdapter,
  },
  onSuccess: (response) => {
    console.log('用户列表:', response.data)
  },
})
```

### IndexedDB 适配器

IndexedDB 适配器适合存储大量数据，支持更大的存储空间：

```typescript
import { useRequest } from 'wl-request'
import { indexedDBAdapter } from '@wl-request/cache-adapter-indexeddb'

const { send } = useRequest({
  url: '/api/users',
  cache: {
    key: 'users-list',
    ttl: 5 * 60 * 1000,
    cacheAdapter: indexedDBAdapter,
  },
  onSuccess: (response) => {
    console.log('用户列表:', response.data)
  },
})
```

### 全局配置缓存适配器

可以在全局配置中设置默认的缓存适配器，所有使用缓存的请求都会使用该适配器：

```typescript
import { configure } from 'wl-request'
import { indexedDBAdapter } from '@wl-request/cache-adapter-indexeddb'

configure({
  cacheAdapter: indexedDBAdapter,
})
```

### 适配器选择建议

- **LocalStorage**：默认选择，适合大多数场景，存储容量约 5-10MB
- **内存适配器**：适合临时数据，页面刷新后自动清除，性能最好
- **IndexedDB**：适合大量数据缓存，存储容量可达数百 MB，但 API 较复杂

## 并行请求

```typescript
import { useParallelRequests } from 'wl-request'

const { send } = useParallelRequests(
  [{ url: '/api/users' }, { url: '/api/posts' }, { url: '/api/comments' }],
  {
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
```

## 串行请求

```typescript
import { useSerialRequests } from 'wl-request'

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
      console.error(`第 ${index + 1} 个请求失败:`, error)
    },
    onFinally: () => {
      console.log('串行请求完成')
    },
  }
)
```

## 幂等请求

幂等请求使用缓存机制来确保相同请求在指定时间内只执行一次，可以配置缓存适配器：

```typescript
const { send } = useRequest({
  url: '/api/create-order',
  method: 'POST',
  idempotent: {
    key: 'order-123',
    ttl: 10 * 60 * 1000,
  },
  onSuccess: (response) => {
    console.log('订单创建成功:', response.data)
  },
  onError: (err) => {
    console.error('订单创建失败:', err)
  },
})
```

### 使用自定义缓存适配器

幂等请求支持指定缓存适配器，默认使用全局配置的缓存适配器或 localStorage：

```typescript
import { useRequest } from 'wl-request'
import { memoryAdapter } from '@wl-request/cache-adapter-memory'

const { send } = useRequest({
  url: '/api/create-order',
  method: 'POST',
  idempotent: {
    key: 'order-123',
    ttl: 10 * 60 * 1000,
    cacheAdapter: memoryAdapter,
  },
  onSuccess: (response) => {
    console.log('订单创建成功:', response.data)
  },
})
```

使用 IndexedDB 适配器存储幂等请求记录：

```typescript
import { useRequest } from 'wl-request'
import { indexedDBAdapter } from '@wl-request/cache-adapter-indexeddb'

const { send } = useRequest({
  url: '/api/create-order',
  method: 'POST',
  idempotent: {
    key: 'order-123',
    ttl: 10 * 60 * 1000,
    cacheAdapter: indexedDBAdapter,
  },
  onSuccess: (response) => {
    console.log('订单创建成功:', response.data)
  },
})
```

## 使用自定义适配器（Axios）

```typescript
import { useRequest } from 'wl-request'
import { axiosAdapter } from '@wl-request/adapter-axios'

const { send } = useRequest({
  url: '/api/users',
  adapter: axiosAdapter,
  onSuccess: (response) => {
    console.log('数据获取成功:', response.data)
  },
  onError: (err) => {
    console.error('请求失败:', err)
  },
})
```

