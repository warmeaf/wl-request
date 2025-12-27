# Hooks API

## useRequest

基础请求 Hook。创建一个请求实例，返回 `send()` 和 `cancel()` 方法。

### 类型签名

```typescript
function useRequest<T = unknown>(config: RequestConfig<T>): RequestInstance<T>
```

### 参数

#### config

- **类型**: `RequestConfig<T>`

请求配置对象。

### 返回值

请求实例，包含 `send()` 和 `cancel()` 方法。

### 示例

```typescript
import { useRequest } from '@wl-request/core'

// 创建请求实例
const request = useRequest({
  url: '/api/users',
  method: 'GET'
})

// 发送请求
async function loadUsers() {
  try {
    const response = await request.send()
    console.log('用户数据:', response.data)
  } catch (error) {
    console.error('请求失败:', error)
  }
}

// 调用函数
loadUsers()
```

## useParallelRequests

并行请求 Hook。创建并行请求实例，可同时发送多个请求。

### 类型签名

```typescript
function useParallelRequests<T = unknown>(
  configs: RequestConfig<T>[],
  hookConfig?: ParallelRequestsHookConfig<T>
): ParallelRequestsHookResult<T>
```

### 参数

#### configs

- **类型**: `RequestConfig<T>[]`

请求配置数组。

#### hookConfig

- **类型**: `ParallelRequestsHookConfig<T>`
- **可选**

钩子配置。

```typescript
interface ParallelRequestsHookConfig<T = unknown> {
  onBefore?: () => void | Promise<void>
  onSuccess?: (results: Response<T>[]) => void | Promise<void>
  onError?: (errors: RequestError[]) => void | Promise<void>
  onFinally?: () => void | Promise<void>
  failFast?: boolean
}
```

### 返回值

```typescript
interface ParallelRequestsHookResult<T = unknown> {
  send: () => Promise<Response<T>[]>
  cancel: () => void
}
```

**`send()` 返回值说明**：
- `failFast: true`（默认）：所有请求成功时返回完整结果数组，任一请求失败时抛出异常
- `failFast: false`：始终返回成功请求的结果数组（可能为空数组）

### 示例

```typescript
import { useParallelRequests } from '@wl-request/core'

// 创建并行请求实例
const { send, cancel } = useParallelRequests(
  [
    { url: '/api/users', method: 'GET' },
    { url: '/api/posts', method: 'GET' },
    { url: '/api/comments', method: 'GET' }
  ],
  {
    onSuccess: (results) => {
      console.log('所有请求完成:', results)
    }
  }
)

// 发送并行请求
async function loadDashboard() {
  try {
    const results = await send()
    const [users, posts, comments] = results
    console.log('用户:', users.data)
    console.log('帖子:', posts.data)
    console.log('评论:', comments.data)
  } catch (error) {
    console.error('请求失败:', error)
  }
}

loadDashboard()
```

## useSerialRequests

串行请求 Hook。创建串行请求实例，按顺序依次执行多个请求。

### 类型签名

```typescript
function useSerialRequests<T = unknown>(
  configs: RequestConfig<T>[],
  hookConfig?: SerialRequestsHookConfig<T>
): SerialRequestsHookResult<T>
```

### 参数

#### configs

- **类型**: `RequestConfig<T>[]`

请求配置数组。

#### hookConfig

- **类型**: `SerialRequestsHookConfig<T>`
- **可选**

钩子配置。

```typescript
interface SerialRequestsHookConfig<T = unknown> {
  onBefore?: () => void | Promise<void>
  onSuccess?: (results: Response<T>[]) => void | Promise<void>
  onError?: (error: RequestError, index: number) => void | Promise<void>
  onFinally?: () => void | Promise<void>
}
```

### 返回值

```typescript
interface SerialRequestsHookResult<T = unknown> {
  send: () => Promise<Response<T>[]>
  cancel: () => void
}
```

### 示例

```typescript
import { useSerialRequests } from '@wl-request/core'

// 创建串行请求实例
const { send, cancel } = useSerialRequests(
  [
    { url: '/api/user', method: 'GET' },
    { url: '/api/user/posts', method: 'GET' },
    { url: '/api/user/comments', method: 'GET' }
  ],
  {
    onError: (error, index) => {
      console.error(`第 ${index} 个请求失败:`, error)
    }
  }
)

// 发送串行请求
async function loadUserProfile() {
  try {
    const results = await send()
    const [user, posts, comments] = results
    console.log('用户:', user.data)
    console.log('帖子:', posts.data)
    console.log('评论:', comments.data)
  } catch (error) {
    console.error('请求失败:', error)
  }
}

loadUserProfile()
```
