# 重试

请求重试机制可以提高系统的健壮性，自动处理临时性故障。

## 基本使用

```typescript
import { useRequest, RETRY_STRATEGY } from '@wl-request/core'

const request = useRequest({
  url: '/api/users',
  method: 'GET',
  baseURL: 'https://api.example.com',
  retry: {
    count: 3,
    delay: 1000,
    strategy: RETRY_STRATEGY.EXPONENTIAL
  }
})

async function loadData() {
  try {
    const response = await request.send()
    console.log('数据:', response.data)
  } catch (error) {
    console.error('错误:', error)
  }
}

loadData()
```

## 重试配置

### count

- **类型**: `number`

重试次数（必填）。表示在初次请求失败后，最多还会尝试的重试次数。

### delay

- **类型**: `number`

基础延迟时间（毫秒，必填）。配合重试策略计算每次真正的等待时间。

### strategy

- **类型**: `RetryStrategy`
- **默认值**: `'fixed'`

重试策略（'exponential' | 'linear' | 'fixed'）。

### maxDelay

- **类型**: `number`
- **可选**

最大延迟时间（毫秒），用于限制指数退避和线性退避的最大延迟。

### condition

- **类型**: `(error: RequestError, retryCount: number) => boolean`
- **可选**

自定义重试条件。

### totalTimeout

- **类型**: `number`
- **可选**

所有重试操作的总超时时间（毫秒）。

如果配置了此选项，则所有重试（包括初始请求）必须在总超时时间内完成，否则会抛出超时错误。

```typescript
import { useRequest } from '@wl-request/core'

const request = useRequest({
  url: '/api/users',
  method: 'GET',
  baseURL: 'https://api.example.com',
  retry: {
    count: 5,
    delay: 1000,
    strategy: RETRY_STRATEGY.EXPONENTIAL,
    totalTimeout: 10000 // 所有重试在 10 秒内完成
  }
})

async function loadData() {
  try {
    const response = await request.send()
    console.log('数据:', response.data)
  } catch (error) {
    console.error('错误:', error)
  }
}

loadData()
```

**使用场景**：
- 限制重试总时长
- 避免长时间等待多次重试
- 确保用户体验的及时性

## 重试策略

### 线性策略

每次重试延迟时间相同。

```typescript
import { useRequest, RETRY_STRATEGY } from '@wl-request/core'

const request = useRequest({
  url: '/api/users',
  method: 'GET',
  baseURL: 'https://api.example.com',
  retry: {
    count: 3,
    delay: 1000,
    strategy: RETRY_STRATEGY.LINEAR
  }
})

async function loadData() {
  const response = await request.send()
  console.log('数据:', response.data)
}

loadData()
```

### 指数退避策略

延迟时间呈指数增长。

```typescript
import { useRequest, RETRY_STRATEGY } from '@wl-request/core'

const request = useRequest({
  url: '/api/users',
  method: 'GET',
  baseURL: 'https://api.example.com',
  retry: {
    count: 3,
    delay: 1000,
    strategy: RETRY_STRATEGY.EXPONENTIAL
  }
})

async function loadData() {
  const response = await request.send()
  console.log('数据:', response.data)
}

loadData()
```

### 固定策略

每次重试使用固定的延迟时间（`delay` 配置项的值）。

```typescript
import { useRequest, RETRY_STRATEGY } from '@wl-request/core'

const request = useRequest({
  url: '/api/users',
  method: 'GET',
  baseURL: 'https://api.example.com',
  retry: {
    count: 3,
    delay: 1000,      // 每次重试延迟 1000 毫秒
    strategy: RETRY_STRATEGY.FIXED
  }
})

async function loadData() {
  const response = await request.send()
  console.log('数据:', response.data)
}

loadData()
```

如果需要立即重试（不延迟），可以将 `delay` 设置为 `0`：

```typescript
const request = useRequest({
  url: '/api/users',
  method: 'GET',
  baseURL: 'https://api.example.com',
  retry: {
    count: 3,
    delay: 0,         // 不延迟，立即重试
    strategy: RETRY_STRATEGY.FIXED
  }
})
```

## 自定义重试条件

只在特定情况下重试：

```typescript
import { useRequest } from '@wl-request/core'

const request = useRequest({
  url: '/api/users',
  method: 'GET',
  baseURL: 'https://api.example.com',
  retry: {
    count: 3,
    delay: 1000,
    condition: (error, retryCount) => {
      // 仅在 503 或网络错误时重试
      return error.status === 503 || error.code === 'NETWORK_ERROR'
    }
  }
})

async function loadData() {
  const response = await request.send()
  console.log('数据:', response.data)
}

loadData()
```

## 使用场景

### API 网关超时

```typescript
import { useRequest, RETRY_STRATEGY } from '@wl-request/core'

const request = useRequest({
  url: '/api/data',
  method: 'GET',
  baseURL: 'https://api.example.com',
  retry: {
    count: 3,
    delay: 1000,
    strategy: RETRY_STRATEGY.EXPONENTIAL,
    condition: (error, retryCount) => error.status === 504
  }
})

async function loadData() {
  const response = await request.send()
  console.log('数据:', response.data)
}

loadData()
```

### 临时服务不可用

```typescript
import { useRequest, RETRY_STRATEGY } from '@wl-request/core'

const request = useRequest({
  url: '/api/data',
  method: 'GET',
  baseURL: 'https://api.example.com',
  retry: {
    count: 5,
    delay: 2000,
    strategy: RETRY_STRATEGY.EXPONENTIAL,
    condition: (error, retryCount) => error.status === 503
  }
})

async function loadData() {
  const response = await request.send()
  console.log('数据:', response.data)
}

loadData()
```

### 网络波动

```typescript
import { useRequest, RETRY_STRATEGY } from '@wl-request/core'

const request = useRequest({
  url: '/api/data',
  method: 'GET',
  baseURL: 'https://api.example.com',
  retry: {
    count: 3,
    delay: 500,
    strategy: RETRY_STRATEGY.LINEAR,
    condition: (error, retryCount) => error.code === 'NETWORK_ERROR'
  }
})

async function loadData() {
  const response = await request.send()
  console.log('数据:', response.data)
}

loadData()
```

## 注意事项

- 重试会增加总体请求时间，注意控制 `count` 和 `delay`
- 建议仅对幂等请求（如 GET、PUT、DELETE）启用重试，避免对非幂等操作（如创建订单）造成重复副作用
- 对于 POST 等非幂等请求，只有在服务端具备幂等保障（例如幂等键）时才建议配置重试
