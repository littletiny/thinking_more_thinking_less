# Connection: Prebuilt Scaffold Strategy × Anti-Engineering Agents.md

## Relationship

**Anti-Engineering Agents.md 是 Prebuilt Scaffold Strategy 的行为约束。**

- **Prebuilt Scaffold Strategy**: 基础设施——提供脚手架模板
- **Anti-Engineering Agents.md**: 行为规范——告诉 Agent 如何用这些脚手架

两者结合，确保 Code Agent 以 DIY 方式使用脚手架，而非工程方式。

---

## The Problem: Scaffold Misuse

### 没有 AGENTS.md 的脚手架

```
提供了脚手架（React Native 模板）
    ↓
Code Agent（工程思维）：
"我要用最佳实践来使用这个脚手架..."
    ↓
结果：
- 添加 Redux 状态管理
- 设计复杂的组件结构
- 写 TypeScript 类型定义
- 配置 ESLint/Prettier
- 写单元测试
    ↓
违背了 DIY 原则（简单能用）
```

### 有 AGENTS.md 的脚手架

```
提供了脚手架 + AGENTS.md
    ↓
Code Agent（读取 DIY-001 ~ DIY-008）：
"规范说："
- 不要用 Redux，直接 useState
- 不要分太多组件，单文件优先
- 不要用 TypeScript，JS 就行
- 不要配置 ESLint
- 不要写单元测试
    ↓
结果：
简单能用，符合 DIY 原则
```

---

## Integration

### 脚手架 + 规范的联合使用

```
Scaffold A: Local App
├── template/                  # 预置代码
├── scripts/                   # 打包脚本
└── AGENTS.md                  # 使用规范
    ├── DIY-002-frontend       # 前端怎么写
    └── DIY-003-architecture   # 架构怎么组织

Scaffold B: IM Bot
├── adapters/                  # 平台适配
├── core/                      # 核心逻辑
└── AGENTS.md                  # 使用规范
    └── DIY-001-storage        # 数据怎么存
```

### Code Agent 工作流

```
1. 选择脚手架（基于 Frontend Delivery Channel）
    ↓
2. 读取脚手架附带的 AGENTS.md
    ↓
3. 按照规范填充业务代码
    - DIY-001: 用 JSON 文件存数据
    - DIY-002: 内联样式
    - DIY-003: 单文件组织
    - DIY-004: 随意命名
    - DIY-005: ⚠️ 检查安全
    - DIY-006: 手动测试
    - DIY-007: 少加依赖
    - DIY-008: 简单错误处理
    ↓
4. 调用打包脚本
    ↓
5. 交付
```

---

## Key Insight

> **脚手架提供"能用的基础"，AGENTS.md 约束"怎么用"。**

就像给工人提供了工具箱（脚手架），
还需要说明书（AGENTS.md）告诉他：
- "不要用精密仪器，用手动工具就行"
- "钉子可以锤歪，能固定就行"
- "但不要钉到自己手（安全）"

---

## The Complete System

```
DIY Development System:

Philosophy: [[diy-software-mindset]]
    ↓
Infrastructure: [[prebuilt-scaffold-strategy]]
    • Scaffold A: Local App
    • Scaffold B: IM Bot
    ↓
Constraints: [[anti-engineering-agents-md]]
    • DIY-001 ~ DIY-008
    • 反工程规范
    • 安全唯一底线
    ↓
Implementation: Agent + Code Agent
    ↓
Delivery: Frontend Delivery Channel
    ↓
User: 简单能用的个人工具
```

---

## Related

- Concepts: [[prebuilt-scaffold-strategy]], [[anti-engineering-agents-md]]
- Files: /AGENTS.md (实际规范文件)
- Source: [anti-engineering-agents-md-origin](../conversations/2026-03-08-anti-engineering-agents-md.md)
