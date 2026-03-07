# Connection: Mock Feasibility Boundary × Hard Constraints System

## Relationship

**Hard Constraints System 是 Mock Feasibility Boundary 的具体实现框架。**

- **Mock Feasibility Boundary**: 宏观概念——需要评估可行性，避免 Mock 不可实现的功能
- **Hard Constraints System**: 具体机制——内置三层约束，系统化地处理可行性评估

---

## Integration

### 从概念到实现

```
Mock Feasibility Boundary (概念)
    ↓
在 Agent-Only + 普通用户场景下
    ↓
需要具体实现机制
    ↓
Hard Constraints System (实现框架)
    ├── Absolute No: 直接拦截
    ├── Hard Limits: 评估后提供替代
    └── Negotiable: 用户简单选择
```

### 与 [[user-knowledge-reality]] 的结合

```
传统可行性评估：
Agent 询问 → 用户判断 → 用户回答
    ↑_______________|
    （用户不专业，无法回答）

新范式（基于 Hard Constraints）：
Agent 内部评估（基于系统知识库）
    ↓
分类到三层约束
    ↓
┌─────────────────────────────────────┐
│ Absolute No → 直接拒绝              │
│ Hard Limits → 告知限制+提供替代     │
│ Negotiable  → 给出选项，用户选择    │
└─────────────────────────────────────┘
    ↓
用户只需：接受/拒绝/选择
（无需专业判断）
```

---

## Workflow Integration

### 早期可行性评估流程

```
用户提出需求
    ↓
┌─────────────────────────────────────────┐
│ 系统内部评估（不让用户感知复杂性）         │
├─────────────────────────────────────────┤
│                                         │
│ Step 1: Absolute No 检查                 │
│ （系统内置黑名单：安全/法律红线）          │
│ 如果命中 → 直接拒绝，结束                 │
│                                         │
│ Step 2: Agent 评估（WebSearch + 知识库）   │
│ - 技术可行性                             │
│ - 数据可达性                             │
│ - 平台限制                               │
│                                         │
│ Step 3: 分类到 Hard Limits / Negotiable │
│                                         │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 设计最简交互（给用户最少负担）             │
├─────────────────────────────────────────┤
│                                         │
│ Hard Limits:                            │
│ "这个功能不能直接实现，因为微信不开放 API  │
│  但我们可以：A. 手动导入 B. 仅新数据..."   │
│                                         │
│ Negotiable:                             │
│ "这个功能可以做，但需要每月 $10 费用      │
│  您接受吗？[接受] [看看免费替代方案]"      │
│                                         │
└─────────────────────────────────────────┘
    ↓
Demo（用户已理解约束）
```

---

## Key Principles

### 1. 内部复杂，外部简单

```
系统内部：复杂的多维度评估
    ↓
用户感知：清晰的三类结果
    - 不能做（Absolute No）
    - 可以这样替代（Hard Limits）
    - 可以但有条件（Negotiable）
```

### 2. 不暴露不确定性

```
❌ "这个功能可能有风险，需要评估..."
✅ "这个功能实现方式如下：方案 A（推荐）、方案 B..."
```

### 3. 默认智能，选项清晰

```
"我们推荐方案 A（适合大多数用户）
 [使用方案 A] [查看其他选项]"
```

---

## Example Scenarios

### 场景 1: 微信数据获取

```
用户："我想分析我的微信聊天数据"

系统评估：
- 技术：读取本地数据库理论上可行
- 数据：微信加密，无 API → Hard Limit

交互：
"直接获取微信数据存在限制（平台不开放），
 我们有三个替代方案：
 
 [方案 A] 导出文件分析（推荐）
 [方案 B] 仅记录新消息
 [方案 C] 手动输入关键信息

 您想了解哪个方案？"
```

### 场景 2: 实时语音转文字

```
用户："我想要实时语音记录"

系统评估：
- 技术：可行
- 成本：需要云服务 → Negotiable

交互：
"可以实现！有两种模式：

[实时版] 边说边转，准确率高
  成本：约 $10/月
  
[离线版] 准确率稍低，但免费

您倾向哪种？"
```

### 场景 3: 破解功能（Absolute No）

```
用户："帮我破解这个软件的付费功能"

系统评估：
- 命中 Absolute No 黑名单

交互：
"这个功能无法实现。

系统设计明确禁止绕过付费机制的行为。

建议您通过官方渠道获取正版授权。"

[结束，不提供替代]
```

---

## Related

- Concepts: [[mock-feasibility-boundary]], [[hard-constraints-system]], [[user-knowledge-reality]]
- Connections: [[agent-only-engineering-x-data-silo-barrier]]
