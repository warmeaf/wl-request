# 配置 API

## configure

设置全局配置。

### 类型签名

```typescript
function configure(config: Partial<GlobalConfig>): void
```

### 参数

#### config

- **类型**: `Partial<GlobalConfig>`

全局配置对象。

### 示例

```typescript
import { configure } from '@wl-request/core'

configure({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token'
  }
})
```

## getGlobalConfig

获取当前全局配置。

### 类型签名

```typescript
function getGlobalConfig(): Partial<GlobalConfig>
```

### 返回值

当前的全局配置对象（部分配置）。

### 示例

```typescript
import { getGlobalConfig } from '@wl-request/core'

const config = getGlobalConfig()
console.log(config.baseURL)
```

## resetConfig

重置全局配置为默认值。

### 类型签名

```typescript
function resetConfig(): void
```

### 示例

```typescript
import { resetConfig } from '@wl-request/core'
resetConfig()
```

## setDefaultCacheAdapter

设置默认缓存适配器。

### 类型签名

```typescript
function setDefaultCacheAdapter(adapter: CacheAdapter): void
```

### 参数

#### adapter

- **类型**: `CacheAdapter`
- 缓存适配器实例。

### 示例

```typescript
import { setDefaultCacheAdapter } from '@wl-request/core'
import { LocalStorageCacheAdapter } from '@wl-request/core'

// 设置为全局默认缓存适配器
setDefaultCacheAdapter(new LocalStorageCacheAdapter())
```

## getDefaultCacheAdapter

获取当前默认缓存适配器。

### 类型签名

```typescript
function getDefaultCacheAdapter(): CacheAdapter | null
```

### 返回值

当前默认缓存适配器，未设置时返回 null。

### 示例

```typescript
import { getDefaultCacheAdapter } from '@wl-request/core'

const adapter = getDefaultCacheAdapter()
if (adapter) {
  console.log('当前默认适配器:', adapter)
}
```

**优先级说明**：
此函数返回的适配器可能来自：
1. `configure()` 中的 `cacheAdapter` 配置（全局配置）
2. `setDefaultCacheAdapter()` 设置的值（模块级默认值）
3. 如果两者都未设置，则返回 null

## mergeConfig

合并配置对象。

### 类型签名

```typescript
function mergeConfig<T = unknown>(
  global: Partial<GlobalConfig>,
  local: Partial<RequestConfig<T>>
): RequestConfig<T>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| global | `Partial<GlobalConfig>` | 全局配置 |
| local | `Partial<RequestConfig<T>>` | 请求配置 |

### 返回值

合并后的配置对象。

### 示例

```typescript
import { mergeConfig } from '@wl-request/core'

const baseConfig = {
  baseURL: 'https://api.example.com',
  timeout: 5000
}

const requestConfig = {
  url: '/users',
  method: 'GET'
}

const finalConfig = mergeConfig(baseConfig, requestConfig)
```

## createRequest

创建请求实例。

### 类型签名

```typescript
function createRequest<T = unknown>(config: RequestConfig<T>): RequestInstance<T>
```

### 参数

#### config

- **类型**: `RequestConfig<T>`
- **必填**

请求实例的配置。

### 返回值

请求实例对象。

### 示例

```typescript
import { createRequest } from '@wl-request/core'

// 创建请求实例
const request = createRequest({
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

::: tip
推荐使用 `useRequest` 而不是 `createRequest` 函数。`useRequest` 提供了更简洁的 API。`createRequest` 主要用于需要显式创建实例的特殊场景。
:::

## registerAdapter

注册适配器。

### 类型签名

```typescript
function registerAdapter(name: string, adapter: RequestAdapter): void
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| name | `string` | 适配器名称 |
| adapter | `RequestAdapter` | 适配器实例 |

### 示例

```typescript
import { registerAdapter } from '@wl-request/core'
import { AxiosAdapter } from '@wl-request/adapter-axios'

registerAdapter('axios', new AxiosAdapter())
```

## setDefaultAdapter

设置默认适配器。

### 类型签名

```typescript
function setDefaultAdapter(adapter: RequestAdapter): void
```

### 参数

#### adapter

- **类型**: `RequestAdapter`

适配器实例。

### 示例

```typescript
import { setDefaultAdapter } from '@wl-request/core'
import { AxiosAdapter } from '@wl-request/adapter-axios'

setDefaultAdapter(new AxiosAdapter())
```

## getAdapter

获取已注册的适配器。

### 类型签名

```typescript
function getAdapter(name?: string): RequestAdapter | null
```

### 参数

#### name

- **类型**: `string`
- **可选**

适配器名称。如果未指定或为 'default'，则返回默认适配器。

### 返回值

适配器实例，如果未找到则返回 null。

### 示例

```typescript
import { getAdapter } from '@wl-request/core'

// 获取已注册的 axios 适配器
const adapter = getAdapter('axios')
```

## getDefaultAdapter

获取默认适配器。

### 类型签名

```typescript
function getDefaultAdapter(): RequestAdapter
```

### 返回值

默认适配器实例。

### 示例

```typescript
import { getDefaultAdapter } from '@wl-request/core'

const adapter = getDefaultAdapter()
```

## resetAdapters

重置所有适配器为默认状态。

### 类型签名

```typescript
function resetAdapters(): void
```

### 示例

```typescript
import { resetAdapters } from '@wl-request/core'

resetAdapters()
```

## clearPendingRequests

清除所有正在进行的幂等请求记录。

### 类型签名

```typescript
function clearPendingRequests(): void
```

### 说明

此函数会清除所有待处理的幂等请求记录。主要用于：
- 测试环境清理状态
- 强制取消所有等待中的幂等请求

::: warning
调用此函数后，正在等待相同幂等键的请求将无法共享结果，会各自独立执行。
:::

### 示例

```typescript
import { clearPendingRequests } from '@wl-request/core'

// 测试后清理
clearPendingRequests()
```
