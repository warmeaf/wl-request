# 并行请求

并行请求允许同时发送多个请求，提高请求效率。

## 基本使用

```typescript
import { useParallelRequests } from '@wl-request/core'

// 创建并行请求实例
const { send, cancel } = useParallelRequests([
  { url: '/users', method: 'GET' },
  { url: '/posts', method: 'GET' },
  { url: '/comments', method: 'GET' }
])

// 发送并行请求
async function loadData() {
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

loadData()
```

## 配置选项

### onBefore

- **类型**: `() => void | Promise<void>`

所有请求开始前的回调。

```typescript
const { send } = useParallelRequests(
  [
    { url: '/users', method: 'GET' },
    { url: '/posts', method: 'GET' }
  ],
  {
    onBefore: () => {
      console.log('开始发送并行请求')
    }
  }
)
```

### onSuccess

- **类型**: `(results: Response<T>[]) => void | Promise<void>`

所有请求成功时的回调。

```typescript
const { send } = useParallelRequests(
  [
    { url: '/users', method: 'GET' },
    { url: '/posts', method: 'GET' }
  ],
  {
    onSuccess: (results) => {
      console.log('所有请求完成:', results)
    }
  }
)
```

### onError

- **类型**: `(errors: RequestError[]) => void | Promise<void>`

有请求失败时的回调。

```typescript
const { send } = useParallelRequests(
  [
    { url: '/users', method: 'GET' },
    { url: '/posts', method: 'GET' }
  ],
  {
    onError: (errors) => {
      console.error('有请求失败:', errors)
    }
  }
)
```

### failFast

- **类型**: `boolean`
- **默认值**: `true`

失败策略：`true` 表示有一个失败就整体失败（默认），`false` 表示允许部分失败，只返回成功的结果。

```typescript
const { send } = useParallelRequests(
  [
    { url: '/users', method: 'GET' },
    { url: '/posts', method: 'GET' }
  ],
  {
    failFast: false // 允许部分失败
  }
)
```

### onFinally

- **类型**: `() => void | Promise<void>`

所有请求完成后的回调（无论成功或失败）。

```typescript
const { send } = useParallelRequests(
  [
    { url: '/users', method: 'GET' },
    { url: '/posts', method: 'GET' }
  ],
  {
    onFinally: () => {
      console.log('所有请求已完成')
    }
  }
)
```

## 错误处理

并行请求中，默认情况下任何一个请求失败都会导致整体失败：

```typescript
import { useParallelRequests } from '@wl-request/core'

const { send } = useParallelRequests([
  { url: '/users', method: 'GET', baseURL: 'https://api.example.com' },
  { url: '/posts', method: 'GET', baseURL: 'https://api.example.com' },
  { url: '/invalid', method: 'GET', baseURL: 'https://api.example.com' } // 这个请求失败
])

async function loadData() {
  try {
    const results = await send()
    console.log('所有请求成功:', results)
  } catch (error) {
    console.error('有请求失败:', error)
  }
}

loadData()
```

## 部分失败处理

如需处理部分失败，设置 `failFast: false`：

```typescript
import { useParallelRequests } from '@wl-request/core'

const { send } = useParallelRequests(
  [
    { url: '/users', method: 'GET', baseURL: 'https://api.example.com' },
    { url: '/posts', method: 'GET', baseURL: 'https://api.example.com' },
    { url: '/invalid', method: 'GET', baseURL: 'https://api.example.com' }
  ],
  {
    failFast: false // 允许部分失败
  }
)

async function loadData() {
  try {
    const results = await send()
    // 只返回成功的请求结果
    console.log('成功的请求:', results)
  } catch (error) {
    console.error('请求失败:', error)
  }
}

loadData()
```

或者使用 `Promise.allSettled` 手动处理：

```typescript
import { createRequest } from '@wl-request/core'

const usersRequest = createRequest({ url: '/users', method: 'GET', baseURL: 'https://api.example.com' })
const postsRequest = createRequest({ url: '/posts', method: 'GET', baseURL: 'https://api.example.com' })
const invalidRequest = createRequest({ url: '/invalid', method: 'GET', baseURL: 'https://api.example.com' })

async function loadData() {
  const results = await Promise.allSettled([
    usersRequest.send(),
    postsRequest.send(),
    invalidRequest.send()
  ])

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`请求 ${index} 成功:`, result.value)
    } else {
      console.error(`请求 ${index} 失败:`, result.reason)
    }
  })
}

loadData()
```

## 使用场景

### 首屏数据加载

```typescript
import { useParallelRequests } from '@wl-request/core'

const { send } = useParallelRequests([
  { url: '/user/profile', method: 'GET', baseURL: 'https://api.example.com' },
  { url: '/config', method: 'GET', baseURL: 'https://api.example.com' },
  { url: '/notifications', method: 'GET', baseURL: 'https://api.example.com' }
])

async function loadDashboard() {
  const [userResponse, configResponse, notificationsResponse] = await send()
  
  const user = userResponse.data
  const config = configResponse.data
  const notifications = notificationsResponse.data
  
  console.log('用户:', user)
  console.log('配置:', config)
  console.log('通知:', notifications)
}

loadDashboard()
```

### 批量数据查询

```typescript
import { useParallelRequests } from '@wl-request/core'

const userIds = [1, 2, 3, 4, 5]
const configs = userIds.map(id => ({
  url: `/users/${id}`,
  method: 'GET' as const,
  baseURL: 'https://api.example.com'
}))

const { send } = useParallelRequests(configs)

async function loadUsers() {
  const userResponses = await send()
  const users = userResponses.map(res => res.data)
  console.log('用户列表:', users)
}

loadUsers()
```

### 多接口聚合

```typescript
import { useParallelRequests } from '@wl-request/core'

const { send } = useParallelRequests([
  { url: '/orders', method: 'GET', baseURL: 'https://api.example.com' },
  { url: '/products', method: 'GET', baseURL: 'https://api.example.com' },
  { url: '/customers', method: 'GET', baseURL: 'https://api.example.com' }
])

async function loadData() {
  const [ordersResponse, productsResponse, customersResponse] = await send()
  
  const orders = ordersResponse.data
  const products = productsResponse.data
  const customers = customersResponse.data
  
  console.log('订单:', orders)
  console.log('产品:', products)
  console.log('客户:', customers)
}

loadData()
```

## 性能考虑

- 并行请求可以显著减少总体加载时间
- 注意服务器并发限制
- 考虑使用请求池控制并发数量
- 大量并行请求可能影响浏览器性能
