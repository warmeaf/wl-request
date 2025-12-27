# 配置

## 全局配置

使用 `configure` 函数设置全局配置：

```typescript
import { configure } from '@wl-request/core'

configure({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
})
```

## 请求配置

在请求实例中指定配置：

```typescript
import { useRequest } from '@wl-request/core'

// 创建请求实例并指定配置
const request = useRequest({
  url: '/api/users',
  method: 'GET',
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 发送请求
async function loadData() {
  const response = await request.send()
  console.log('数据:', response.data)
}

loadData()
```

## 配置选项

### baseURL

- **类型**: `string`

所有请求的基础 URL。  
如果未配置，则直接使用 `url`，不会拼接基础路径。

### timeout

- **类型**: `number`

请求超时时间（毫秒）。  
如果未配置，则不启用超时控制，请求是否超时由底层 HTTP 客户端（如 `fetch`、`axios`）自行决定。

### headers

- **类型**: `Record<string, string>`

默认请求头。  
如果未配置，则不会额外添加任何请求头。

### adapter

- **类型**: `RequestAdapter`
- **可选**

请求适配器实例。

### cacheAdapter

- **类型**: `CacheAdapter`
- **可选**

默认缓存适配器。

可以通过三种方式设置：
1. 在请求配置中传递 `cache.cacheAdapter`
2. 在全局配置中设置
3. 调用 `setDefaultCacheAdapter()` API

```typescript
// 方式一：请求配置
const request = useRequest({
  cache: { cacheAdapter: new MemoryCacheAdapter() }
})

// 方式二：全局配置
import { configure } from '@wl-request/core'
import { MemoryCacheAdapter } from '@wl-request/cache-adapter-memory'

configure({ cacheAdapter: new MemoryCacheAdapter() })

// 方式三：API 设置
import { setDefaultCacheAdapter } from '@wl-request/core'
import { LocalStorageCacheAdapter } from '@wl-request/core'
setDefaultCacheAdapter(new LocalStorageCacheAdapter())
```

**优先级**：请求配置 > 全局配置 > API 设置的全局默认值

**注意**：如果未设置缓存适配器，使用缓存或幂等功能时会抛出错误。

### 请求钩子

可以配置全局或实例级别的请求钩子：

```typescript
import { useRequest } from '@wl-request/core'

// 创建请求实例并配置钩子
const request = useRequest({
  url: '/api/users',
  method: 'GET',
  baseURL: 'https://api.example.com',
  onBefore: (config) => {
    console.log('请求前:', config)
    return config
  },
  onSuccess: (response) => {
    console.log('请求成功:', response)
  },
  onError: (error) => {
    console.error('请求失败:', error)
  },
  onFinally: () => {
    console.log('请求完成')
  }
})

// 加载数据函数
async function handleLoad() {
  try {
    await request.send()
  } catch (error) {
    console.error('加载失败:', error)
  }
}

// 调用函数（可以在任何事件处理器中调用）
handleLoad()
```

### 钩子类型

#### onBefore

在请求发送前执行，可修改请求配置。

```typescript
onBefore: (config: RequestConfig<T>) => RequestConfig<T> | Promise<RequestConfig<T> | undefined> | undefined
```

**返回值**：
- 返回新配置对象：使用新配置发送请求
- 返回 `undefined` 或 `null`：使用原配置发送请求

#### onSuccess

请求成功时执行。

```typescript
onSuccess: (response: Response<T>) => void | Promise<void>
```

#### onError

请求失败时执行，可处理错误。

```typescript
onError: (error: RequestError) => void | Promise<void>
```

#### onFinally

请求完成后执行（无论成功或失败）。

```typescript
onFinally: () => void | Promise<void>
```

## 合并配置

配置合并优先级（从高到低）：

1. 请求实例配置（`useRequest` / `createRequest` 传入的 `config`）
2. 全局配置（通过 `configure` 设置）

```typescript
import { configure, useRequest } from '@wl-request/core'

// 全局配置
configure({
  baseURL: 'https://api.example.com',
  timeout: 5000
})

// 请求实例配置（覆盖全局配置）
const request = useRequest({
  url: '/api/users',
  method: 'GET',
  timeout: 10000 // 覆盖全局的 5000ms，使用 10000ms
})

// 另一个请求实例配置（覆盖全局配置）
const request2 = useRequest({
  url: '/api/posts',
  method: 'GET',
  timeout: 3000 // 覆盖全局的 5000ms，使用 3000ms
})

// 发送请求
async function loadUsers() {
  const response = await request.send()
  console.log('用户数据:', response.data)
}

async function loadPosts() {
  const response = await request2.send()
  console.log('帖子数据:', response.data)
}

loadUsers()
loadPosts()
```

## 重置配置

```typescript
import { resetConfig } from '@wl-request/core'

// 重置为默认配置
resetConfig()
```

## 获取当前配置

```typescript
import { getGlobalConfig } from '@wl-request/core'

const config = getGlobalConfig()
console.log(config)
```
