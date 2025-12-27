# 适配器

适配器模式使 wl-request 可以支持多种 HTTP 客户端。

## 内置适配器

### Fetch 适配器

默认适配器，基于浏览器原生 `fetch` API。

```typescript
import { useRequest } from '@wl-request/core'

// 创建请求实例（使用默认的 Fetch 适配器）
const request = useRequest({
  url: '/api/users',
  method: 'GET',
  baseURL: 'https://api.example.com'
})

// 发送请求
async function loadData() {
  const response = await request.send()
  console.log('数据:', response.data)
}

loadData()
```

### Axios 适配器

支持使用 axios 作为底层 HTTP 客户端。

```typescript
import { registerAdapter, setDefaultAdapter } from '@wl-request/core'
import { AxiosAdapter } from '@wl-request/adapter-axios'

// 创建适配器实例
const axiosAdapter = new AxiosAdapter()

// 注册适配器
registerAdapter('axios', axiosAdapter)

// 设置为默认适配器
setDefaultAdapter(axiosAdapter)
```

## 切换适配器

### 全局切换

```typescript
import { setDefaultAdapter } from '@wl-request/core'
import { AxiosAdapter } from '@wl-request/adapter-axios'

setDefaultAdapter(new AxiosAdapter())
```

### 实例级切换

```typescript
import { useRequest } from '@wl-request/core'
import { AxiosAdapter } from '@wl-request/adapter-axios'

// 创建请求实例并指定适配器
const request = useRequest({
  url: '/api/users',
  method: 'GET',
  adapter: new AxiosAdapter(),
  baseURL: 'https://api.example.com'
})

// 发送请求
async function loadData() {
  const response = await request.send()
  console.log('数据:', response.data)
}

loadData()
```

## 缓存适配器

### LocalStorage 适配器

内置的 localStorage 缓存适配器。支持自定义缓存键前缀。

**构造函数参数**：
- `prefix`：缓存键前缀，默认为 'wl-request:'

```typescript
import { useRequest, LocalStorageCacheAdapter } from '@wl-request/core'

// 使用默认前缀
const request1 = useRequest({
  url: '/api/users',
  method: 'GET',
  baseURL: 'https://api.example.com',
  cache: {
    ttl: 60000,
    key: 'users',
    cacheAdapter: new LocalStorageCacheAdapter()
  }
})

// 使用自定义前缀（用于多实例隔离）
const request2 = useRequest({
  url: '/api/posts',
  method: 'GET',
  baseURL: 'https://api.example.com',
  cache: {
    ttl: 60000,
    key: 'posts',
    cacheAdapter: new LocalStorageCacheAdapter('my-app:')
  }
})

// 发送请求
async function loadData() {
  const response = await request1.send()
  console.log('数据:', response.data)
}

loadData()
```

### Memory 适配器

内存缓存适配器，适用于临时缓存。

```typescript
import { useRequest } from '@wl-request/core'
import { MemoryCacheAdapter } from '@wl-request/cache-adapter-memory'

// 创建请求实例并使用 Memory 缓存适配器
const request = useRequest({
  url: '/api/users',
  method: 'GET',
  baseURL: 'https://api.example.com',
  cache: {
    ttl: 60000,
    key: 'users',
    cacheAdapter: new MemoryCacheAdapter()
  }
})

// 发送请求
async function loadData() {
  const response = await request.send()
  console.log('数据:', response.data)
}

loadData()
```

**配置选项**：

```typescript
new MemoryCacheAdapter({ maxEntries: 100 })  // 限制最多缓存 100 个条目
new MemoryCacheAdapter()                     // 无限制
```

- `maxEntries`：最大缓存条目数，超过时淘汰**最早过期**的项（而不是最早添加的项）

::: info
淘汰策略说明：
当缓存数量超过 maxEntries 时，会删除 **expiresAt 最小**（即最早过期）的条目，
而不是最早添加的条目。这种策略可以优先保留更长时间有效的缓存。
:::

### IndexedDB 适配器

IndexedDB 缓存适配器，适用于大数据量缓存。

**构造函数参数**：
- `dbName`：数据库名称，默认为 'wl-request-cache'
- `storeName`：对象存储名称，默认为 'cache'

```typescript
import { useRequest } from '@wl-request/core'
import { IndexedDBCacheAdapter } from '@wl-request/cache-adapter-indexeddb'

// 创建 IndexedDB 缓存适配器（使用默认值）
const cacheAdapter = new IndexedDBCacheAdapter('my-cache-db')

// 或自定义数据库名称和对象存储名称
const cacheAdapter = new IndexedDBCacheAdapter('my-cache-db', 'cache')

// 创建请求实例并使用 IndexedDB 缓存适配器
const request = useRequest({
  url: '/api/users',
  method: 'GET',
  baseURL: 'https://api.example.com',
  cache: {
    ttl: 60000,
    key: 'users',
    cacheAdapter
  }
})

// 发送请求
async function loadData() {
  const response = await request.send()
  console.log('数据:', response.data)
}

// 加载数据
loadData()
```

## 自定义适配器

### 实现请求适配器

```typescript
import type { RequestAdapter, RequestConfig, Response } from '@wl-request/core'

class CustomAdapter implements RequestAdapter {
  async request<T>(config: RequestConfig): Promise<Response<T>> {
    // 实现自定义请求逻辑
    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      body: config.data ? JSON.stringify(config.data) : undefined
    })

    return {
      data: await response.json(),
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    }
  }
}

// 注册自定义适配器
registerAdapter('custom', new CustomAdapter())
```

### 实现缓存适配器

```typescript
import type { CacheAdapter } from '@wl-request/core'

class CustomCacheAdapter implements CacheAdapter {
  async get<T = unknown>(key: string): Promise<T | null> {
    // 从缓存获取数据
    return null
  }

  async set<T = unknown>(key: string, value: T, ttl?: number): Promise<void> {
    // 存储数据到缓存
  }

  async delete(key: string): Promise<void> {
    // 删除缓存数据
  }

  async clear(): Promise<void> {
    // 清空所有缓存
  }

  async has(key: string): Promise<boolean> {
    // 检查缓存是否存在
    return false
  }

  async cleanup(): Promise<void> {  // 新增方法
    // 主动清理所有已过期的缓存项
    // 可选实现，但推荐实现以提高性能
  }
}
```

## 适配器管理

### 获取适配器

```typescript
import { getAdapter } from '@wl-request/core'

const adapter = getAdapter('axios')
if (adapter) {
  // 使用适配器
}
```

### 重置适配器

```typescript
import { resetAdapters } from '@wl-request/core'

// 重置为默认适配器
resetAdapters()
```
