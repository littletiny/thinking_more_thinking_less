# Connection: The Complete Development Workflow

## The Puzzle

四个概念共同构成了一套完整的 AI 时代开发方法论：

```
┌─────────────────────────────────────────────────────────────────┐
│                    完整开发工作流                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐                                              │
│   │     CREW     │  ← 复杂需求的结构化澄清                       │
│   │   (可选入口)  │     [collaborative-requirements-exploration] │
│   └──────┬───────┘                                              │
│          │ 复杂/模糊需求                                         │
│          ↓                                                      │
│   ┌──────────────────────────────────────────────────────┐     │
│   │              EXPLORATION PHASE                        │     │
│   │                 探索期                                │     │
│   │                                                      │     │
│   │   ┌─────────────┐     ┌──────────────┐              │     │
│   │   │   Natural   │     │ Mock-Driven  │              │     │
│   │   │  Language   │  →  │  Validation  │              │     │
│   │   │    Mock     │     │              │              │     │
│   │   └─────────────┘     └──────┬───────┘              │     │
│   │                              │                      │     │
│   │                              ↓                      │     │
│   │   ┌──────────────────────────────────────┐         │     │
│   │   │        Demo as Requirements          │         │     │
│   │   │                                       │         │     │
│   │   │  闭环反馈 ← → 迭代验证 ← → 用户确认    │         │     │
│   │   │                                       │         │     │
│   │   │  产出：可评估 Demo + 需求文档          │         │     │
│   │   └──────────────────┬───────────────────┘         │     │
│   │                      │                              │     │
│   └──────────────────────┼──────────────────────────────┘     │
│                          │ 确认                               │
│                          ↓                                    │
│   ┌──────────────────────────────────────────────────────┐     │
│   │              ENGINEERING PHASE                        │     │
│   │                 确定期                                │     │
│   │                                                      │     │
│   │   ┌──────────────┐     ┌──────────────┐              │     │
│   │   │     DDDW     │  →  │  Production  │              │     │
│   │   │              │     │    System    │              │     │
│   │   │ 文档驱动开发  │     │   生产系统    │              │     │
│   │   └──────────────┘     └──────────────┘              │     │
│   │                                                      │     │
│   └──────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stage Breakdown

### Stage 0: CREW (可选)

**何时使用**: 需求复杂、系统性、多方利益相关

**输入**: 模糊的想法、冲突的需求、不确定的范围

**输出**: 澄清后的问题定义、范围边界、关键假设

**工具**: [CREW Skill](../.config/agents/skills/collaborative-requirements-exploration/SKILL.md)

---

### Stage 1: Exploration Phase

**核心概念**: [[mock-driven-validation]], [[natural-language-mock]], [[demo-as-requirements]], [[hard-constraints-system]], [[user-knowledge-reality]]

**目标**: 在不确定性中探索，找到正确的方向，同时确保可行性

**关键特征**:
- 快速迭代（分钟级）
- 用户主导反馈（但不承担评估负担）
- 低成本试错（可丢弃）
- 主观感受优先
- **系统内置硬性约束**（新增）

**增强后的流程**:
```
用户意图
    ↓
┌─────────────────────────────────────────┐
│ Hard Constraints System                 │
│ （系统内部评估，不给用户负担）            │
├─────────────────────────────────────────┤
│                                         │
│ 1. Absolute No 检查（安全/法律红线）      │
│    → 直接拒绝                            │
│                                         │
│ 2. 技术可行性评估（Agent WebSearch）       │
│                                         │
│ 3. 分类：                               │
│    - Hard Limits → 提供替代方案          │
│    - Negotiable  → 给出简化选项          │
│    - 明确可行    → 直接继续              │
│                                         │
└─────────────────────────────────────────┘
    ↓
NL Mock 生成（基于评估结果）
    ↓
Demo（用户理解约束后的体验）
    ↓
用户验证（简单选择，无需专业判断）
    ↑________________________|
         (快速迭代)
```

**关键原则**（基于 [[user-knowledge-reality]]）:
- 用户不回答复杂问题
- Agent 做评估，用户做选择
- 二元选项优先
- 智能默认推荐

---

### Stage 2: Engineering Phase

**核心概念**: [DDDW Skill](../.config/agents/skills/document-driven-development/SKILL.md)（需适配 DIY 模式）

**目标**: 确定性交付（能用即可）

**启动条件**（DIY 简化版）:
1. ✅ Demo 已通过用户验证（"能用"即可）
2. ✅ 安全检查通过
3. ✅ 用户确认（简单选择）

**关键特征**（DIY 调整）:
- **组装优先**: 现成组件 > 自己编写
- **胶水代码**: 连接而非创造
- **安全底线**: 唯一不可妥协的
- **能用即交付**: 不过度优化

**实现策略**:
```
1. 找现成方案（API、库、工具）
2. 最小胶水代码连接
3. 安全检查（输入、权限、敏感信息）
4. 交付（无需文档，无需测试）
```

---

## DIY Context Note

这个工作流基于 [[diy-software-mindset]] 的基础假设：

> **面向非程序员的一人项目，追求简单能用，安全是唯一的硬约束。**

所有概念和流程都经过 DIY 校准：
- 降低了质量要求
- 简化了评估流程
- 加速了交付速度
- 保留了安全底线

详见：[complete-development-workflow-diy](complete-development-workflow-diy.md)

## Key Principles

### 1. 确定性阈值

```
不确定性 ──────────────────────────────→ 确定性
     ↑                                  ↑
   Exploration                        Engineering
     探索期                            确定期
     NL-Mock 主导                      DDDW 主导
     欢迎变更                          控制变更
```

### 2. 文档的生成方式

| 阶段 | 文档来源 | 文档特性 |
|------|----------|----------|
| 传统 | 预先编写 | 静态、易偏离 |
| 新范式 | Demo 构建日志 | 动态、可执行、经用户验证 |

### 3. 成本结构变化

```
传统：
需求文档(低成本) → 开发(高成本) → 发现错误(返工成本极高)

新范式：
探索迭代(低成本) → 确认 Demo(中成本) → DDDW(高成本但确定)
                          ↑
                    错误在这里被发现
                    （成本最低）
```

---

## When to Use What

### 场景决策树

```
用户提出需求
    │
    ├── 需求复杂/系统性强？
    │       ├── 是 → 先走 CREW
    │       │         ↓
    │       │    得到澄清的问题定义
    │       │         ↓
    │       └── 否 ────┘
    │                   ↓
    ├── 需要用户验证主观感受？
    │       ├── 是 → Exploration Phase
    │       │         (NL-Mock → Demo-as-Requirements)
    │       │         ↓
    │       │    得到确认的 Demo + 需求文档
    │       │         ↓
    │       └── 否 ────┘
    │                   ↓
    ├── 需求已确定？
            ├── 是 → DDDW
            │         ↓
            │    生产系统
            │
            └── 否 → 回到 Exploration
```

---

## Related Connections

- [[mock-driven-validation-x-natural-language-mock]]
- [[natural-language-mock-x-demo-as-requirements]]

## Source Conversations

- [mock-driven-validation-origin](../conversations/2026-03-08-mock-driven-validation.md)
- [natural-language-mock-origin](../conversations/2026-03-08-natural-language-mock.md)
- [demo-as-requirements-origin](../conversations/2026-03-08-demo-as-requirements.md)

## Concepts

- [[mock-driven-validation]]
- [[natural-language-mock]]
- [[demo-as-requirements]]
- [CREW Skill](../.config/agents/skills/collaborative-requirements-exploration/SKILL.md)
- [DDDW Skill](../.config/agents/skills/document-driven-development/SKILL.md)
