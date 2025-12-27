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

默认缓存存储，适用于小数据量。

```typescript
import { useRequest, LocalStorageCacheAdapter } from '@wl-request/core'

const request = useRequest({
  url: '/api/users',
  method: 'GET',
  baseURL: 'https://api.example.com',
  cache: {
    key: 'users',
    ttl: 60000,
    cacheAdapter: new LocalStorageCacheAdapter()
  }
})

async function loadData() {
  const response = await request.send()
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

### IndexedDB

适用于大数据量缓存。

```typescript
import { useRequest } from '@wl-request/core'
import { IndexedDBCacheAdapter } from '@wl-request/cache-adapter-indexeddb'

const cacheAdapter = new IndexedDBCacheAdapter('my-cache-db')

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
