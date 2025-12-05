# wl-request

一个基于 TypeScript 的现代化请求库，采用分层架构设计，提供统一的请求接口和丰富的功能特性。

## 特性

- **分层架构**：基于 TypeScript，清晰的代码组织结构
- **适配器模式**：完全兼容适配对象（fetch、axios 等），每个适配器是一个独立的包
- **缓存适配器**：支持多种缓存存储方式（localStorage、内存、IndexedDB）
- **高级功能**：请求重试、请求缓存、并行请求、串行请求、幂等请求
- **设计原则**：适配器与核心模块的依赖关系遵循依赖倒置原则
- **测试完善**：完善的单元测试覆盖
- **使用方式**：hook 式使用方式，符合现代前端开发习惯

## 项目结构

```
wl-request/
├── packages/
│   ├── core/                    # 核心包
│   ├── adapter-fetch/           # Fetch 适配器（默认）
│   ├── adapter-axios/           # Axios 适配器（可选）
│   ├── cache-adapter-memory/    # 内存缓存适配器
│   └── cache-adapter-indexeddb/ # IndexedDB 缓存适配器
├── docs/                        # 文档目录
├── examples/                    # 使用示例
└── tests/                       # 集成测试
```

## 开发

### 前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装依赖

```bash
pnpm install
```

### 代码格式化

```bash
# 格式化代码
pnpm format

# 检查代码
pnpm check

# 自动修复问题
pnpm lint
```

### Commit 规范

项目使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范，commit 消息格式如下：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型（type）**：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档变更
- `style`: 代码格式（不影响代码运行的变动）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 增加测试
- `chore`: 构建过程或辅助工具的变动
- `revert`: 回滚
- `build`: 构建系统或外部依赖的变更
- `ci`: CI 配置文件和脚本的变更

## 许可证

MIT

