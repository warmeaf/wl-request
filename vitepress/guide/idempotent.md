# 幂等请求

幂等请求确保相同的请求只执行一次，防止重复提交。

::: warning 幂等 vs 缓存
- **幂等（idempotent）**：主要用于防止**重复提交**（如创建订单、支付等），适用于写操作
- **缓存（cache）**：主要用于**提高性能**（如数据字典、用户信息等），适用于读操作

两者都会使用 cacheAdapter 存储结果，但使用场景不同：
- 幂等关注的是"不要重复执行"
- 缓存关注的是"不要重复请求"
:::

## 基本使用

```typescript
import { useRequest } from '@wl-request/core'

// 创建请求实例
const request = useRequest({
  url: '/orders',
  method: 'POST',
  baseURL: 'https://api.example.com',
  data: { userId: 1 },
  idempotent: {
    key: 'create-order-123',
    ttl: 5000 // 5秒内相同请求只执行一次
  }
})

// 提交订单函数
async function handleSubmit() {
  // 多次调用只会执行一次
  const result1 = request.send()
  const result2 = request.send()

  // result1 和 result2 返回相同的结果
  const [order1, order2] = await Promise.all([result1, result2])
  console.log(order1 === order2) // true
}

// 调用函数（可以在任何事件处理器中调用）
handleSubmit()
```

## 配置选项

### key

- **类型**: `string`
- **必填**

幂等键，用于唯一标识一次请求。可以通过模板字符串或 `JSON.stringify` 自行组合：

```typescript
// 使用固定字符串
const request = useRequest({
  url: '/orders',
  method: 'POST',
  idempotent: {
    key: 'create-order',
    ttl: 5000
  }
})

// 使用动态键（基于请求数据）
const request = useRequest({
  url: '/orders',
  method: 'POST',
  data: { userId: 1, productId: 100 },
  idempotent: {
    key: `create-order-${JSON.stringify({ userId: 1, productId: 100 })}`,
    ttl: 5000
  }
})
```

### ttl

- **类型**: `number`
- **必填**

幂等保护 TTL（毫秒）。在 TTL 时间内，相同 `key` 的请求会共享同一个执行结果，并缓存在对应的 `CacheAdapter` 中：

```typescript
const request = useRequest({
  url: '/orders',
  method: 'POST',
  idempotent: {
    key: 'create-order',
    ttl: 30000 // 30 秒内相同 key 的请求共享结果
  }
})
```

### cacheAdapter

- **类型**: `CacheAdapter`
- **可选**

幂等结果存储适配器。

**三种设置方式**：
1. **请求配置中显式传入**：
   ```typescript
   const request = useRequest({
     url: '/orders',
     method: 'POST',
     data: { userId: 1 },
     idempotent: {
       key: 'create-order-123',
       ttl: 5000,
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

**注意**：如果未设置缓存适配器，使用幂等功能时会抛出错误。

## 工作原理

1. 第一次请求发送时，记录请求的幂等键和对应的 Promise
2. 相同幂等键的后续请求：
   - 如果请求正在进行中，会等待第一次请求完成并返回相同的结果
   - 如果请求已完成且有缓存，直接返回缓存结果
3. 所有相同幂等键的请求返回相同的结果
4. 结果会被缓存直到 TTL 过期，超时后清除幂等记录，允许新请求

::: tip
幂等功能实际上包含两层保护：
- **进行中保护**：防止同一请求重复执行
- **结果缓存**：缓存执行结果供后续请求使用（直到 TTL 过期）
:::

## 清除待处理请求

手动清除所有待处理的幂等请求：

```typescript
import { clearPendingRequests } from '@wl-request/core'

// 清除所有待处理请求
clearPendingRequests()
```

## 使用场景

### 防止表单重复提交

```typescript
import { useRequest } from '@wl-request/core'

// 创建请求实例
const request = useRequest({
  url: '/forms/submit',
  method: 'POST',
  baseURL: 'https://api.example.com',
  data: { formId: 123, data: formData },
  idempotent: {
    key: `submit-form-123`,
    ttl: 5000
  }
})

// 提交表单函数
async function handleSubmit() {
  // 用户快速点击提交按钮，只会执行一次
  const result = await request.send()
  console.log('提交结果:', result.data)
}

// 调用函数（可以在任何事件处理器中调用，如按钮点击、表单提交等）
handleSubmit()
```

### 防止重复支付

```typescript
import { useRequest } from '@wl-request/core'

// 创建请求实例
const request = useRequest({
  url: '/payments',
  method: 'POST',
  baseURL: 'https://api.example.com',
  data: { orderId: 123, amount: 100 },
  idempotent: {
    key: 'payment-123',
    ttl: 10000
  }
})

// 支付函数
async function handlePay() {
  try {
    const payment = await request.send()
    console.log('支付成功:', payment.data)
  } catch (error) {
    console.error('支付失败:', error)
  }
}

// 调用函数（可以在任何事件处理器中调用）
handlePay()
```

### 防止重复创建订单

```typescript
import { useRequest } from '@wl-request/core'

// 创建请求实例
const request = useRequest({
  url: '/orders',
  method: 'POST',
  baseURL: 'https://api.example.com',
  data: { userId: 1, productId: 100 },
  idempotent: {
    key: 'create-order-1-100',
    ttl: 5000
  }
})

// 创建订单函数
async function handleCreateOrder() {
  try {
    const order = await request.send()
    console.log('订单创建成功:', order.data)
  } catch (error) {
    console.error('订单创建失败:', error)
  }
}

// 调用函数（可以在任何事件处理器中调用）
handleCreateOrder()
```

## 与重试结合

幂等请求可以与重试机制结合使用：

```typescript
import { useRequest } from '@wl-request/core'

// 创建请求实例
const request = useRequest({
  url: '/orders',
  method: 'POST',
  baseURL: 'https://api.example.com',
  data: { userId: 1 },
  idempotent: {
    key: 'create-order',
    ttl: 5000
  },
  retry: {
    count: 3,
    delay: 1000
  }
})

// 创建订单函数
async function handleCreateOrder() {
  try {
    const order = await request.send()
    console.log('订单创建成功:', order.data)
  } catch (error) {
    console.error('订单创建失败:', error)
  }
}

// 调用函数
handleCreateOrder()
```

## 注意事项

- 幂等保护在请求进行中和结果缓存期内都有效
- 相同 key 的请求在 TTL 内会返回缓存结果，不会重复执行
- 合理设置超时时间，避免长时间阻塞或返回过时结果
- 幂等键应该能够唯一标识请求
- 不适用于需要每次都获取最新数据的请求（如查询最新数据）
