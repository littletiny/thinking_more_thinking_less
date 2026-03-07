# Conversation: Agent-Only Engineering 现实约束

## Metadata

- **Date**: 2026-03-08
- **Topic**: Agent 作为唯一工程团队的能力边界与数据孤岛问题
- **Participants**: User, Agent
- **Concepts Produced**: [[agent-only-engineering]]

---

## Conversation Record

### Context

此前已讨论：
- [[mock-feasibility-boundary]]: 工程可行性边界

### User Input 1

```
我们没有工程团队，或者说我们的工程团队只有agent本身。只能依赖agent的websearch和内置的知识库去完成对功能是否技术可达的判断。另外一方面，就算技术可达，受限于某些环境情况，有些东西虽然技术可达，但是实际上存在数据孤岛导致的不可达，例如对方就不是开放数据。因此我们需要在mock demo阶段引出一些交互式流程，让用户知道，这里可能有问题
```

### AI Output 1

```
这是一个关键的现实约束。

（AI 开始整理概念笔记...）
```

---

## Key Quotes

> "我们没有工程团队，或者说我们的工程团队只有agent本身"

> "只能依赖agent的websearch和内置的知识库去完成对功能是否技术可达的判断"

> "就算技术可达，受限于某些环境情况，有些东西虽然技术可达，但是实际上存在数据孤岛导致的不可达"

> "我们需要在mock demo阶段引出一些交互式流程，让用户知道，这里可能有问题"

---

## Concept Extraction

### Agent-Only Engineering

**Definition**: 在 AI Native 开发流程中，工程可行性评估完全由 Agent 承担——依赖 WebSearch 和内置知识库判断技术可达性，且必须在 Mock Demo 阶段通过交互式设计暴露数据孤岛等隐性约束。

**Source**: 用户指出在 Agent-Only 场景下，可行性评估的能力边界和数据孤岛问题

**Key Constraints**:
1. **评估能力有限**: 只能依赖 WebSearch 和知识库
2. **知识盲区**: 不知道特定组织的内部系统、数据权限状态
3. **数据孤岛**: 技术可达但数据不可达（对方不开放）

**Solution**: 交互式风险暴露
- 不在后台静默评估
- 在 Demo 中设计交互，让用户面对约束
- 让用户成为"数据源专家"，自我确认权限

**Key Shift**:
```
从：Agent 替用户判断可行性
到：Agent 引导用户在体验中发现约束
```

---

## Follow-up Impact

- Created [[agent-only-engineering]] concept card
- Identified need for "interactive risk exposure" patterns
- Connected with existing [[data-silo-barrier]] concept
- Potential for "data source knowledge base"
