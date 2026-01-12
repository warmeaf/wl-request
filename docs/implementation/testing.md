# 测试

项目使用 **Vitest** 进行单元测试和集成测试，确保功能的稳定性和可靠性。

## 测试结构

```
packages/
├── core/
│   ├── src/
│   └── tests/              # 单元测试
│       ├── hooks/
│       ├── features/
│       └── adapters/
│
└── adapter-axios/
    ├── src/
    └── tests/              # 适配器测试

tests/                       # 集成测试
```

## 运行测试

**运行所有测试：**

```bash
pnpm test
```

**监听模式（开发时推荐）：**

```bash
pnpm test:watch
```

**运行特定包的测试：**

```bash
# 运行核心包测试
pnpm --filter @wl-request/core test

# 运行适配器测试
pnpm --filter @wl-request/adapter-axios test
```

**生成覆盖率报告：**

```bash
pnpm test:coverage
```

## 测试最佳实践

1. **单元测试**：每个功能模块都应该有对应的单元测试
2. **集成测试**：测试不同模块之间的协作
3. **Mock 数据**：使用 Vitest 的 `vi` API 进行 mock
4. **测试覆盖率**：保持较高的测试覆盖率（建议 > 80%）
5. **测试命名**：使用描述性的测试名称，清晰表达测试意图
