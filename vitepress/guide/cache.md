# 缓存

请求缓存可以显著提高应用性能，减少不必要的网络请求。

## 基本使用

```typescript
import { useRequest } from '@wl-request/core'

const request = useRequest({
  url: '/api/users',
  method: 'GET',
  baseURL: 'https://api.example.com',
  cache: {
    key: 'users-list',
    ttl: 60000 // 缓存 60 秒
  }
})

async function loadData() {
  const response = await request.send()
  console.log('数据:', response.data)
}

loadData()
```

## 缓存配置

### ttl

- **类型**: `number`
- **必填**

缓存有效期（毫秒）。

### key

- **类型**: `string`
- **必填**

缓存键名，用于标识缓存数据。

### cacheAdapter

- **类型**: `CacheAdapter`
- **可选**

缓存存储适配器。

**三种设置方式**：
1. **请求配置中显式传入**：
   ```typescript
   const request = useRequest({
     cache: {
       cacheAdapter: new MemoryCacheAdapter()
     }
   })
   ```

2. **全局配置中设置**：
   ```typescript
   import { configure } from '@wl-request/core'
   import { MemoryCacheAdapter } from '@wl-request/cache-adapter-memory'

   configure({
     cacheAdapter: new MemoryCacheAdapter()
   })
   ```

3. **通过 API 设置全局默认适配器**：
   ```typescript
   import { setDefaultCacheAdapter } from '@wl-request/core'
   import { LocalStorageCacheAdapter } from '@wl-request/core'
   setDefaultCacheAdapter(new LocalStorageCacheAdapter())
   ```

**优先级**：请求配置 > 全局配置 > API 设置的全局默认值

**注意**：如果未设置缓存适配器，使用缓存或幂等功能时会抛出错误。

## 缓存存储

### LocalStorage

默认缓存存储，适用于小数据量。支持自定义缓存键前缀。

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
    key: 'users',
    ttl: 60000,
    cacheAdapter: new LocalStorageCacheAdapter()
  }
})

// 使用自定义前缀（用于多实例隔离）
const request2 = useRequest({
  url: '/api/posts',
  method: 'GET',
  baseURL: 'https://api.example.com',
  cache: {
    key: 'posts',
    ttl: 60000,
    cacheAdapter: new LocalStorageCacheAdapter('my-app:')
  }
})

async function loadData() {
  const response = await request1.send()
  console.log('数据:', response.data)
}

loadData()
```

### Memory

内存缓存，数据不持久化。

```typescript
import { useRequest } from '@wl-request/core'
import { MemoryCacheAdapter } from '@wl-request/cache-adapter-memory'

const request = useRequest({
  url: '/api/users',
  method: 'GET',
  baseURL: 'https://api.example.com',
  cache: {
    key: 'users',
    ttl: 60000,
    cacheAdapter: new MemoryCacheAdapter()
  }
})

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

### IndexedDB

适用于大数据量缓存。

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

const request = useRequest({
  url: '/api/users',
  method: 'GET',
  baseURL: 'https://api.example.com',
  cache: {
    key: 'users',
    ttl: 60000,
    cacheAdapter
  }
})

async function loadData() {
  const response = await request.send()
  console.log('数据:', response.data)
}

loadData()
```


## 缓存管理

### 手动清除缓存

```typescript
import { LocalStorageCacheAdapter } from '@wl-request/core'

const cacheAdapter = new LocalStorageCacheAdapter()

// 清除指定键的缓存
await cacheAdapter.delete('users')

// 清空所有缓存
await cacheAdapter.clear()
```

## 使用场景

### 数据字典

适用于不经常变化的数据：

```typescript
import { useRequest } from '@wl-request/core'

const request = useRequest({
  url: '/api/dictionary',
  method: 'GET',
  baseURL: 'https://api.example.com',
  cache: {
    key: 'dictionary',
    ttl: 3600000 // 1 小时
  }
})

async function loadDictionary() {
  const response = await request.send()
  console.log('数据:', response.data)
}

loadDictionary()
```

### 用户信息

适用于会话期间相对稳定的数据：

```typescript
const request = useRequest({
  url: '/api/user/profile',
  method: 'GET',
  cache: {
    key: 'user-profile',
    ttl: 600000 // 10 分钟
  }
})

const handleLoad = async () => {
  const response = await request.send()
  console.log('数据:', response.data)
}
```

### 列表数据

适用于短期内重复访问的列表：

```typescript
const request = useRequest({
  url: '/api/products',
  method: 'GET',
  cache: {
    key: 'products-list',
    ttl: 60000 // 1 分钟
  }
})

const handleLoad = async () => {
  const response = await request.send()
  console.log('数据:', response.data)
}
```
