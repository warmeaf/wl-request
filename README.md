# wl-request

一个基于 TypeScript 的浏览器端请求增强库，采用分层架构设计，通过「适配器 + Hooks」的方式，在不绑定具体请求库的前提下，为你的前端应用提供统一、可扩展的请求能力。

> ⚠️ 本库仅支持 **浏览器环境**，暂不支持 Node.js 运行时。

## 特性一览

- 🌐 **与请求库解耦**：通过适配器机制支持 `fetch`、`axios` 等实现
- 🔁 **请求增强能力**：内置重试、缓存、幂等、并行/串行请求等功能
- 🧩 **高度可插拔**：核心包只关心协议与流程，适配器与缓存实现可按需替换
- 🪝 **友好的 Hooks API**：为 Vue/其他框架提供类似 `useRequest`、`useParallelRequests` 等钩子
- 🧪 **完善的测试与类型**：基于 TypeScript 与 Vitest，类型安全且易于维护

## 包结构

本仓库采用 monorepo 结构，核心能力与适配器拆分为多个独立 package：

- `@wl-request/core`：核心请求流程、特性（重试、缓存、并行/串行、幂等）、Hooks 等
- `@wl-request/adapter-axios`：基于 axios 的请求适配器
- `@wl-request/adapter-fetch`：基于浏览器 `fetch` 的请求适配器
- `@wl-request/cache-adapter-memory`：内存缓存适配器
- `@wl-request/cache-adapter-indexeddb`：基于 IndexedDB 的持久化缓存适配器

## 安装

在实际项目中按需安装对应的包（示例以 axios + IndexedDB 缓存为例）：

```bash
# pnpm
pnpm add @wl-request/core @wl-request/adapter-axios @wl-request/cache-adapter-indexeddb

# yarn
yarn add @wl-request/core @wl-request/adapter-axios @wl-request/cache-adapter-indexeddb

# npm
npm install @wl-request/core @wl-request/adapter-axios @wl-request/cache-adapter-indexeddb
```

## 快速上手

### 1. 全局初始化

在应用入口处配置全局默认设置：

```ts
import { configure } from '@wl-request/core'
import { AxiosAdapter } from '@wl-request/adapter-axios'
import { IndexedDBCacheAdapter } from '@wl-request/cache-adapter-indexeddb'

configure({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  adapter: new AxiosAdapter(),
  cacheAdapter: new IndexedDBCacheAdapter(),
})
```

### 2. 在组件中使用 `useRequest`

下面以 Vue 组件为例，展示最基础的使用方式：

```vue
<template>
  <div>
    <button @click="handleRefresh">刷新</button>
    <div v-if="loading">加载中...</div>
    <div v-else-if="error">错误: {{ error?.message }}</div>
    <ul v-else>
      <li v-for="user in data" :key="user.id">{{ user.name }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRequest } from '@wl-request/core'

const data = ref<any[] | null>(null)
const loading = ref(false)
const error = ref<Error | null>(null)

const { send } = useRequest({
  url: '/api/users',
  method: 'GET',
  onBefore: () => {
    loading.value = true
    error.value = null
  },
  onSuccess: (response) => {
    data.value = response.data
  },
  onError: (err) => {
    error.value = err
  },
  onFinally: () => {
    loading.value = false
  },
})

onMounted(() => {
  send()
})

const handleRefresh = () => {
  send()
}
</script>
```

## 典型功能示例

### 请求重试

```ts
import { useRequest, RETRY_STRATEGY } from '@wl-request/core'

const { send } = useRequest({
  url: '/api/data',
  retry: {
    count: 3,
    delay: 200,
    strategy: RETRY_STRATEGY.EXPONENTIAL,
  },
})

await send()
```

### 请求缓存（内存缓存）

```ts
import { useRequest } from '@wl-request/core'
import { MemoryCacheAdapter } from '@wl-request/cache-adapter-memory'

const cacheAdapter = new MemoryCacheAdapter()

const { send } = useRequest({
  url: '/api/users',
  cache: {
    key: 'users-list',
    ttl: 5 * 60 * 1000,
    cacheAdapter,
  },
})

await send()
```

### 并行请求

```ts
import { useParallelRequests } from '@wl-request/core'

const { send } = useParallelRequests(
  [{ url: '/api/users' }, { url: '/api/posts' }, { url: '/api/comments' }],
  {
    failFast: false,
  }
)

const results = await send()
```

## 开发与本地调试

克隆仓库后，在根目录执行：

```bash
pnpm install
```

常用命令：

- 本地开发示例站点：`pnpm dev`
- 运行所有包的构建：`pnpm build`
- 运行测试：`pnpm test`
- 查看测试覆盖率：`pnpm test:coverage`
- 代码格式化：`pnpm format`
- 代码检查：`pnpm check`

## 架构概览

本项目采用分层架构：

1. **接口层**：统一的请求接口与类型定义
2. **适配器层**：对接 `axios`、`fetch` 等具体实现
3. **功能层**：重试、缓存、并行/串行、幂等等增强能力
4. **Hook 层**：封装为 Hooks，方便在组件中直接使用
