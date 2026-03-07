# Conversation: Mock Feasibility Boundary 工程约束

## Metadata

- **Date**: 2026-03-08
- **Topic**: Mock 的可行性边界：避免工程失败的关键约束
- **Participants**: User, Agent
- **Concepts Produced**: [[mock-feasibility-boundary]]

---

## Conversation Record

### Context

此前已建立完整工作流：
- [[mock-driven-validation]]: 方法论
- [[natural-language-mock]]: 技术基础
- [[demo-as-requirements]]: Demo 即文档
- [DDDW Skill](../.config/agents/skills/document-driven-development/SKILL.md): 工程化

### User Input 1

```
接下来要解决的一点是，不是所有的接口都可以被mock的，如果我们mock了不可能实现的接口，这就是工程上的失败
```

### AI Output 1

```
这是一个关键的工程约束问题。

（AI 开始整理概念笔记...）
```

---

## Key Quotes

> "不是所有的接口都可以被mock的"

> "如果我们mock了不可能实现的接口，这就是工程上的失败"

---

## Concept Extraction

### Mock Feasibility Boundary

**Definition**: 并非所有接口都能被有效 Mock——必须在探索期建立技术可行性检查机制，确保 Mock 的行为在工程实现上是可达的，避免验证通过却无法交付的工程失败。

**Source**: 在讨论完整开发工作流后，用户指出必须考虑 Mock 的工程可行性边界

**Key Insight**: 
- Mock 验证的是"想要什么"（主观需求）
- 工程实现有"能不能做"（客观约束）
- 两者脱节会导致"验证通过却无法交付"的灾难

**Core Problem**:
```
Mock 关注的是"行为模拟"
        ↓
用户验证通过
        ↓
但实际"实现可行性"未被验证
        ↓
DDDW 启动后发现无法实现
        ↓
工程失败
```

**Solution**: 三层防御机制
1. Mock 前可行性预检查
2. Mock 设计审查（标注风险假设）
3. DDDW 前可行性闸门

---

## Follow-up Impact

- Created [[mock-feasibility-boundary]] concept card
- Completed the "safety system" for the workflow
- Identified need for explicit feasibility gates between phases
- Potential for Feasibility Assessment Skill
