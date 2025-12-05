# 快速开始

> **注意**：以下所有示例均需要在浏览器环境中运行，不支持 Node.js 环境。

## 基础使用

在 Vue 组件中使用，通过钩子函数处理请求的各个阶段：

```vue
<template>
  <div>
    <button @click="handleRefresh">刷新</button>
    <div v-if="loading">加载中...</div>
    <div v-else-if="error">错误: {{ error?.message }}</div>
    <div v-else>
      <ul>
        <li v-for="user in data" :key="user.id">
          {{ user.name }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRequest } from 'wl-request'

const data = ref(null)
const loading = ref(false)
const error = ref(null)

const { send } = useRequest({
  url: '/api/users',
  method: 'GET',
  onBefore: () => {
    loading.value = true
    error.value = null
  },
  onSuccess: (response) => {
    data.value = response.data
    loading.value = false
    error.value = null
  },
  onError: (err) => {
    error.value = err
    loading.value = false
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

## 全局配置基础

在应用启动时配置全局默认设置，所有请求都会继承这些配置：

```typescript
import { configure } from 'wl-request'

configure({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  onBefore: (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      }
    }
  },
  onError: (err) => {
    if (err.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
  },
})
```

单个请求可以覆盖全局配置：

```typescript
const { send } = useRequest({
  url: '/api/users',
  timeout: 5000,
  headers: {
    'X-Custom-Header': 'custom-value',
  },
  onSuccess: (response) => {
    console.log('用户数据:', response.data)
  },
})
```

更多详细的使用示例和配置说明，请参考 [使用示例](./usage-examples.md)。

