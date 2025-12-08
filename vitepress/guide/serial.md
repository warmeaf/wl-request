# 串行请求

串行请求按顺序依次执行多个请求，适用于有依赖关系的请求场景。

## 基本使用

```typescript
import { useSerialRequests } from '@wl-request/core'

// 创建串行请求实例
const { send, cancel } = useSerialRequests([
  { url: '/user', method: 'GET' },
  { url: '/posts', method: 'GET' },
  { url: '/comments', method: 'GET' }
])

// 发送串行请求
async function loadData() {
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

loadData()
```

## 配置选项

### onBefore

- **类型**: `() => void | Promise<void>`

所有请求开始前的回调。

```typescript
const { send } = useSerialRequests(
  [
    { url: '/user', method: 'GET' },
    { url: '/posts', method: 'GET' }
  ],
  {
    onBefore: () => {
      console.log('开始发送串行请求')
    }
  }
)
```

### onSuccess

- **类型**: `(results: Response<T>[]) => void | Promise<void>`

所有请求成功时的回调。

```typescript
const { send } = useSerialRequests(
  [
    { url: '/user', method: 'GET' },
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

- **类型**: `(error: RequestError, index: number) => void | Promise<void>`

某个请求失败时的回调。

```typescript
const { send } = useSerialRequests(
  [
    { url: '/user', method: 'GET' },
    { url: '/posts', method: 'GET' }
  ],
  {
    onError: (error, index) => {
      console.error(`第 ${index} 个请求失败:`, error)
    }
  }
)
```

### onFinally

- **类型**: `() => void | Promise<void>`

所有请求完成后的回调（无论成功或失败）。

```typescript
const { send } = useSerialRequests(
  [
    { url: '/user', method: 'GET' },
    { url: '/posts', method: 'GET' }
  ],
  {
    onFinally: () => {
      console.log('所有请求已完成')
    }
  }
)
```

## 依赖请求

串行请求最常见的用途是处理有依赖关系的请求。可以使用 `useSerialRequests` 或手动顺序调用多个请求：

### 使用 useSerialRequests

```typescript
import { useSerialRequests } from '@wl-request/core'

const { send } = useSerialRequests([
  { url: '/user', method: 'GET', baseURL: 'https://api.example.com' },
  { url: '/posts', method: 'GET', baseURL: 'https://api.example.com' },
  { url: '/comments', method: 'GET', baseURL: 'https://api.example.com' }
])

async function loadData() {
  const results = await send()
  const [user, posts, comments] = results
  console.log('用户:', user.data)
  console.log('帖子:', posts.data)
  console.log('评论:', comments.data)
}

loadData()
```

### 手动顺序调用

对于有依赖关系的请求，可以手动顺序调用：

```typescript
import { useRequest } from '@wl-request/core'

const userRequest = useRequest({
  url: '/user',
  method: 'GET',
  baseURL: 'https://api.example.com'
})

const postsRequest = useRequest({
  url: '/posts',
  method: 'GET',
  baseURL: 'https://api.example.com'
})

const commentsRequest = useRequest({
  url: '/comments',
  method: 'GET',
  baseURL: 'https://api.example.com'
})

async function loadData() {
  // 先获取用户信息
  const userResponse = await userRequest.send()
  const user = userResponse.data
  const userId = user.id

  // 根据用户 ID 获取帖子
  const postsResponse = await postsRequest.send()
  const posts = postsResponse.data
  const postId = posts[0]?.id

  // 根据第一篇帖子获取评论
  if (postId) {
    const commentsResponse = await commentsRequest.send()
    const comments = commentsResponse.data
    console.log('评论:', comments)
  }
}

loadData()
```

## 错误处理

串行请求中，任何一个请求失败都会中断后续请求：

```typescript
import { useRequest } from '@wl-request/core'

const userRequest = useRequest({ url: '/user', method: 'GET', baseURL: 'https://api.example.com' })
const invalidRequest = useRequest({ url: '/invalid', method: 'GET', baseURL: 'https://api.example.com' })
const postsRequest = useRequest({ url: '/posts', method: 'GET', baseURL: 'https://api.example.com' })

async function loadData() {
  try {
    const userResponse = await userRequest.send()
    const invalidResponse = await invalidRequest.send() // 这个请求失败
    const postsResponse = await postsRequest.send() // 不会执行
  } catch (error) {
    console.error('请求失败:', error)
  }
}

loadData()
```

## 使用场景

### 数据依赖查询

```typescript
import { useRequest } from '@wl-request/core'

const userRequest = useRequest({ url: '/user', method: 'GET', baseURL: 'https://api.example.com' })

async function loadUserOrders() {
  // 获取用户 -> 获取用户的订单 -> 获取订单详情
  const userResponse = await userRequest.send()
  const user = userResponse.data
  const userId = user.id
  
  const ordersRequest = useRequest({ 
    url: `/users/${userId}/orders`, 
    method: 'GET',
    baseURL: 'https://api.example.com'
  })
  const ordersResponse = await ordersRequest.send()
  const orders = ordersResponse.data
  const orderId = orders[0]?.id
  
  if (orderId) {
    const orderDetailsRequest = useRequest({ 
      url: `/orders/${orderId}`, 
      method: 'GET',
      baseURL: 'https://api.example.com'
    })
    const orderDetailsResponse = await orderDetailsRequest.send()
    const orderDetails = orderDetailsResponse.data
    console.log('订单详情:', orderDetails)
  }
}

loadUserOrders()
```

### 多步骤操作

```typescript
import { useRequest } from '@wl-request/core'

async function processOrder() {
  // 创建订单 -> 添加订单项 -> 提交支付
  const orderRequest = useRequest({ 
    url: '/orders', 
    method: 'POST',
    baseURL: 'https://api.example.com',
    data: { userId: 1 } 
  })
  const orderResponse = await orderRequest.send()
  const order = orderResponse.data
  const orderId = order.id
  
  const orderItemRequest = useRequest({ 
    url: '/order-items', 
    method: 'POST',
    baseURL: 'https://api.example.com',
    data: { 
      orderId,
      productId: 100
    }
  })
  const orderItemResponse = await orderItemRequest.send()
  
  const paymentRequest = useRequest({ 
    url: '/payments', 
    method: 'POST',
    baseURL: 'https://api.example.com',
    data: { orderId }
  })
  const paymentResponse = await paymentRequest.send()
  
  console.log('订单处理完成:', paymentResponse.data)
}

processOrder()
```

### 分页加载

```typescript
import { useRequest } from '@wl-request/core'

const page1Request = useRequest({ url: '/posts?page=1', method: 'GET', baseURL: 'https://api.example.com' })
const page2Request = useRequest({ url: '/posts?page=2', method: 'GET', baseURL: 'https://api.example.com' })
const page3Request = useRequest({ url: '/posts?page=3', method: 'GET', baseURL: 'https://api.example.com' })

async function loadPages() {
  const page1Response = await page1Request.send()
  const page2Response = await page2Request.send()
  const page3Response = await page3Request.send()
  
  console.log('第1页:', page1Response.data)
  console.log('第2页:', page2Response.data)
  console.log('第3页:', page3Response.data)
}

loadPages()
```

## 性能考虑

- 串行请求总耗时是所有请求时间之和
- 仅在请求间有依赖关系时使用
- 无依赖关系时优先使用并行请求
- 考虑使用缓存减少重复请求
