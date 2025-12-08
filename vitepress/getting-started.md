# 快速开始

## 安装

```bash
# 安装核心包
pnpm add @wl-request/core

# 可选：安装额外的适配器
pnpm add @wl-request/adapter-axios
pnpm add @wl-request/cache-adapter-memory
pnpm add @wl-request/cache-adapter-indexeddb
```

## 基本使用

### 使用 Hook API

```typescript
import { useRequest } from '@wl-request/core'

// 创建请求实例
const request = useRequest({
  url: '/api/users',
  method: 'GET'
})

// 发送请求
async function loadData() {
  try {
    const response = await request.send()
    console.log('数据:', response.data)
  } catch (error) {
    console.error('错误:', error)
  }
}

// 调用函数
loadData()
```

## 配置适配器

默认使用 fetch 适配器，可以切换到其他适配器：

### 方式一：在请求配置中直接传入适配器（推荐）

```typescript
import { useRequest } from '@wl-request/core'
import { AxiosAdapter } from '@wl-request/adapter-axios'

// 创建请求实例并指定适配器
const request = useRequest({
  url: '/users',
  method: 'GET',
  baseURL: 'https://api.example.com',
  adapter: new AxiosAdapter() // 直接传入适配器
})

// 发送请求
async function loadData() {
  const response = await request.send()
  console.log('数据:', response.data)
}

loadData()
```

### 方式二：注册并设置为默认适配器

```typescript
import { registerAdapter, setDefaultAdapter } from '@wl-request/core'
import { AxiosAdapter } from '@wl-request/adapter-axios'

// 创建并注册 axios 适配器
const axiosAdapter = new AxiosAdapter()
registerAdapter('axios', axiosAdapter)
setDefaultAdapter(axiosAdapter)
```

## 启用缓存

```typescript
import { useRequest } from '@wl-request/core'

const request = useRequest({
  url: '/users',
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

## 启用重试

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

## 下一步

- [配置](/guide/configuration) - 了解如何配置请求库
- [适配器](/guide/adapters) - 了解适配器系统
- [缓存](/guide/cache) - 了解缓存功能
- [重试](/guide/retry) - 了解重试机制
