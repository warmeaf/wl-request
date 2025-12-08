# wl-request 项目文档

基于 VitePress 1.6.4 构建的项目文档。

## 文档结构

```
vitepress/
├── .vitepress/
│   └── config.ts           # VitePress 配置
├── guide/                  # 使用指南
│   ├── configuration.md    # 配置指南
│   ├── adapters.md         # 适配器指南
│   ├── cache.md            # 缓存指南
│   ├── retry.md            # 重试指南
│   ├── parallel.md         # 并行请求指南
│   ├── serial.md           # 串行请求指南
│   └── idempotent.md       # 幂等请求指南
├── api/                    # API 文档
│   ├── hooks.md            # Hooks API
│   ├── config.md           # 配置 API
│   └── types.md            # 类型定义
├── index.md                # 首页
└── getting-started.md      # 快速开始
```

## 本地开发

```bash
# 启动开发服务器
pnpm docs:dev

# 构建文档
pnpm docs:build

# 预览构建结果
pnpm docs:preview
```

## 内容覆盖

### 介绍
- 快速开始：安装、基本使用、配置适配器、启用缓存和重试

### 指南
- **配置**：全局配置、实例配置、请求钩子
- **适配器**：内置适配器、切换适配器、缓存适配器、自定义适配器
- **缓存**：基本使用、缓存配置、缓存存储、缓存策略
- **重试**：基本使用、重试配置、重试策略、使用场景
- **并行请求**：基本使用、配置选项、错误处理、使用场景
- **串行请求**：基本使用、依赖请求、错误处理、使用场景
- **幂等请求**：基本使用、工作原理、使用场景

### API
- **Hooks**：useRequest、useParallelRequests、useSerialRequests
- **配置 API**：configure、createRequest、适配器管理
- **类型定义**：所有接口和类型的详细定义
