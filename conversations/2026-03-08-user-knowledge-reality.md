# Conversation: User Knowledge Reality & Hard Constraints

## Metadata

- **Date**: 2026-03-08
- **Topic**: 用户知识现实与硬性约束系统
- **Participants**: User, Agent
- **Concepts Produced**: [[user-knowledge-reality]], [[hard-constraints-system]]

---

## Conversation Record

### Context

此前已讨论 Agent-Only Engineering 场景下的数据孤岛问题。

### User Input 1

```
这里的知识库更多就是模型自己的能力，因为对大部分普通用户而言，他的知识库只有2个，1. 上网查 2. 他脑子里。对于非程序员的普通大众来说，他大概率没有数字化的领域知识库，只有各种散落在各处的笔记和聊天记录。抛开这个话题先，我们要考虑的是，模型或者说流程（skill？）能评估某个功能是否能mock，在早期交互解决这个问题，所以这里要看下怎么引入一套业务上的流程给用户更好的体感。另外一个，用户大部分时候不专业，我们不需要问他太多的风险清单，他甚至不清楚风险，所以我们需要一个更加清晰的风险边界，哪些事是不能做的，这些应该是相对比较强硬的约束，应该在我们系统内提供
```

### AI Output 1

```
这是一个关键的产品设计洞察。

（AI 开始整理概念笔记...）
```

---

## Key Quotes

> "对大部分普通用户而言，他的知识库只有2个，1. 上网查 2. 他脑子里"

> "对于非程序员的普通大众来说，他大概率没有数字化的领域知识库"

> "用户大部分时候不专业，我们不需要问他太多的风险清单，他甚至不清楚风险"

> "我们需要一个更加清晰的风险边界，哪些事是不能做的，这些应该是相对比较强硬的约束，应该在我们系统内提供"

> "模型或者说流程（skill？）能评估某个功能是否能mock，在早期交互解决这个问题"

---

## Concept Extraction

### User Knowledge Reality

**Definition**: 普通用户没有数字化的领域知识库，其知识仅来自"上网查"和"个人经验"，因此在设计交互流程时不应假设用户能提供专业级的风险评估或技术判断。

**Key Insight**: 
- 不能假设用户是产品经理或工程师
- 用户的认知资源是稀缺品
- 流程设计必须基于"用户不专业"这一约束

**Implication**: 风险评估责任从用户转移到 Agent，用户只需做简单选择

### Hard Constraints System

**Definition**: 系统应内置清晰、强硬的不可为清单，在技术可行性评估阶段自动拦截，无需用户参与判断，直接告知限制并提供替代方向。

**Three Layers**:
1. **Absolute No**: 安全/法律红线，直接拒绝
2. **Hard Limits**: 技术/平台限制，提供替代方案
3. **Negotiable**: 成本/妥协，用户选择

**Key Insight**: 用户无法判断风险，系统必须提供清晰边界

---

## Follow-up Impact

- Created [[user-knowledge-reality]] concept card
- Created [[hard-constraints-system]] concept card
- Shifted feasibility assessment from "user-assisted" to "system-driven"
- Identified need for built-in constraint knowledge base
