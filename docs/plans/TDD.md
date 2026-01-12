# wl-request 核心功能开发计划（TDD）

## TDD 开发流程

每个功能模块遵循 **Red → Green → Refactor** 循环：

1. **Red**：先编写测试用例（测试失败）
2. **Green**：实现最小功能使测试通过
3. **Refactor**：重构代码，保持测试通过

## 开发顺序

### 第一阶段：核心类型和接口定义

#### 1.1 类型定义 (`packages/core/src/types/index.ts`)

- 定义请求配置类型（`RequestConfig`）
- 定义响应类型（`Response`、`ResponseData`）
- 定义错误类型（`RequestError`）
- 定义重试配置类型（`RetryConfig`）
- 定义缓存配置类型（`CacheConfig`）
- 定义幂等配置类型（`IdempotentConfig`）
- 定义全局配置类型（`GlobalConfig`）
- 定义 Hook 回调函数类型（`RequestHooks`）

#### 1.2 接口定义 (`packages/core/src/interfaces/index.ts`)

- 定义请求适配器接口（`RequestAdapter`）
- 定义缓存适配器接口（`CacheAdapter`）
- 定义请求实例接口（`RequestInstance`）

> **注意**：类型和接口定义是基础，不涉及业务逻辑，可以直接实现，无需测试。

### 第二阶段：功能模块实现（TDD）

#### 2.1 请求重试功能

**测试先行** (`packages/core/tests/features/retry.test.ts`)

- 测试：重试次数正确执行
- 测试：重试延迟时间
- 测试：指数退避策略
- 测试：自定义重试条件
- 测试：重试失败后的错误处理

**实现** (`packages/core/src/features/retry.ts`)

- 实现重试逻辑
- 支持指数退避策略
- 支持自定义重试条件

#### 2.2 请求缓存功能

**测试先行** (`packages/core/tests/features/cache.test.ts`)

- 测试：缓存写入和读取
- 测试：TTL 过期机制
- 测试：缓存键生成策略
- 测试：缓存失效处理
- 测试：不同缓存适配器的兼容性

**实现** (`packages/core/src/features/cache.ts`)

- 实现缓存读写逻辑
- 支持 TTL（Time To Live）
- 支持缓存键生成策略

#### 2.3 幂等请求功能

**测试先行** (`packages/core/tests/features/idempotent.test.ts`)

- 测试：幂等性检查机制
- 测试：相同请求在 TTL 内不重复执行
- 测试：幂等键生成
- 测试：缓存适配器集成

**实现** (`packages/core/src/features/idempotent.ts`)

- 实现幂等性检查
- 基于缓存适配器存储请求记录

#### 2.4 并行请求功能

**测试先行** (`packages/core/tests/features/parallel.test.ts`)

- 测试：多个请求并行执行
- 测试：部分成功/失败处理
- 测试：错误收集和报告
- 测试：超时处理

**实现** (`packages/core/src/features/parallel.ts`)

- 实现并行请求执行
- 支持部分成功/失败处理

#### 2.5 串行请求功能

**测试先行** (`packages/core/tests/features/serial.test.ts`)

- 测试：请求按顺序执行
- 测试：中断和错误处理
- 测试：前一个请求失败后的行为
- 测试：超时处理

**实现** (`packages/core/src/features/serial.ts`)

- 实现串行请求执行
- 支持中断和错误处理

#### 2.6 功能模块导出 (`packages/core/src/features/index.ts`)

- 统一导出所有功能模块

### 第三阶段：适配器实现（TDD）

#### 3.1 Axios 适配器

**测试先行** (`packages/adapter-axios/tests/index.test.ts`)

- 测试：基本请求功能
- 测试：与 axios API 的兼容性
- 测试：请求/响应拦截器
- 测试：错误处理

**实现** (`packages/adapter-axios/src/index.ts`)

- 实现 `RequestAdapter` 接口
- 基于 `axios` 库
- 保持与 axios API 的兼容性

#### 3.2 内存缓存适配器

**测试先行** (`packages/cache-adapter-memory/tests/index.test.ts`)

- 测试：缓存写入和读取
- 测试：TTL 过期清理
- 测试：缓存删除
- 测试：缓存清空

**实现** (`packages/cache-adapter-memory/src/index.ts`)

- 实现 `CacheAdapter` 接口
- 基于内存 Map 存储
- 支持 TTL 过期清理

#### 3.3 IndexedDB 缓存适配器

**测试先行** (`packages/cache-adapter-indexeddb/tests/index.test.ts`)

- 测试：数据库初始化
- 测试：异步缓存操作
- 测试：TTL 过期清理
- 测试：错误处理（浏览器兼容性）

**实现** (`packages/cache-adapter-indexeddb/src/index.ts`)

- 实现 `CacheAdapter` 接口
- 基于浏览器 IndexedDB API
- 支持异步操作
- 处理数据库初始化

### 第四阶段：适配器抽象层和全局配置（TDD）

#### 4.1 适配器抽象层

**测试先行** (`packages/core/tests/adapters/index.test.ts`)

- 测试：适配器注册
- 测试：默认适配器设置
- 测试：适配器获取

**实现** (`packages/core/src/adapters/index.ts`)

- 实现适配器注册和管理机制
- 提供默认适配器（fetch）的引用

#### 4.2 全局配置管理

**测试先行** (`packages/core/tests/config.test.ts`)

- 测试：全局配置设置
- 测试：配置合并和继承
- 测试：配置覆盖机制

**实现** (`packages/core/src/config.ts`)

- 实现全局配置存储
- 实现 `configure` 函数
- 支持配置合并和继承

### 第五阶段：请求实例和核心逻辑（TDD）

#### 5.1 请求实例创建

**测试先行** (`packages/core/tests/request.test.ts`)

- 测试：请求实例创建
- 测试：配置继承
- 测试：适配器集成
- 测试：功能模块集成

**实现** (`packages/core/src/request.ts`)

- 实现请求实例创建逻辑
- 集成适配器、功能模块和配置
- 实现请求执行流程

### 第六阶段：Hook 层实现（TDD）

**设计原则**：Hook 层不维护内部状态，只提供请求执行能力和钩子支持。使用者通过生命周期钩子（onBefore、onSuccess、onError、onFinally）自行维护状态，这样可以灵活适配不同的响应式框架（React、Vue 等）或非响应式场景。

#### 6.1 useRequest Hook

**测试先行** (`packages/core/tests/hooks/useRequest.test.ts`)

- 测试：基础请求功能（send、cancel 方法）
- 测试：生命周期钩子调用（onBefore、onSuccess、onError、onFinally）
- 测试：重试功能集成
- 测试：缓存功能集成
- 测试：幂等功能集成
- 测试：钩子执行顺序和参数传递

**实现** (`packages/core/src/hooks/useRequest.ts`)

- 实现基础请求 Hook，返回 `{ send, cancel }` 方法
- 集成所有功能模块（重试、缓存、幂等）
- 支持生命周期钩子，让使用者通过钩子自行维护状态
- 不维护内部状态（loading、error、data），状态由使用者管理

#### 6.2 useParallelRequests Hook

**测试先行** (`packages/core/tests/hooks/useParallelRequests.test.ts`)

- 测试：并行请求执行
- 测试：生命周期钩子调用（onBefore、onSuccess、onError、onFinally）
- 测试：错误处理（部分失败场景）
- 测试：钩子参数正确性（results、errors）

**实现** (`packages/core/src/hooks/useParallelRequests.ts`)

- 实现并行请求 Hook，返回 `{ send, cancel }` 方法
- 基于并行请求功能模块
- 支持生命周期钩子，让使用者通过钩子自行维护状态
- 不维护内部状态，状态由使用者管理

#### 6.3 useSerialRequests Hook

**测试先行** (`packages/core/tests/hooks/useSerialRequests.test.ts`)

- 测试：串行请求执行
- 测试：生命周期钩子调用（onBefore、onSuccess、onError、onFinally）
- 测试：错误处理（中断场景）
- 测试：钩子参数正确性（results、error、index）

**实现** (`packages/core/src/hooks/useSerialRequests.ts`)

- 实现串行请求 Hook，返回 `{ send, cancel }` 方法
- 基于串行请求功能模块
- 支持生命周期钩子，让使用者通过钩子自行维护状态
- 不维护内部状态，状态由使用者管理

#### 6.4 Hook 导出 (`packages/core/src/hooks/index.ts`)

- 统一导出所有 Hook

### 第七阶段：核心入口和集成测试

#### 7.1 核心入口 (`packages/core/src/index.ts`)

- 导出所有公共 API
- 导出类型定义
- 导出接口定义
- 导出 Hook
- 导出配置函数

#### 7.2 集成测试 (`tests/`)

- 编写端到端测试用例
- 验证各功能模块的集成
- 验证文档中的使用示例

#### 7.3 使用示例 (`examples/`)

- 在 `examples/` 目录创建实际使用示例
- 验证文档中的示例代码可运行

## 技术要点

1. **TDD 原则**：每个功能模块必须先写测试，再实现功能
2. **依赖倒置原则**：核心包不依赖具体适配器实现，通过接口解耦
3. **浏览器环境**：所有实现必须基于浏览器 API，不支持 Node.js
4. **TypeScript 类型安全**：充分利用 TypeScript 类型系统，确保类型安全
5. **错误处理**：完善的错误处理和类型定义
6. **异步处理**：正确处理 Promise 和异步操作

## 关键文件

- `packages/core/src/types/index.ts` - 所有类型定义
- `packages/core/src/interfaces/index.ts` - 适配器接口定义
- `packages/core/src/features/` - 功能模块实现
- `packages/core/src/hooks/` - Hook 实现
- `packages/core/src/index.ts` - 核心入口