# Conversation: Demo as Requirements 方法论闭环

## Metadata

- **Date**: 2026-03-08
- **Topic**: 构建闭环反馈全流程：Demo 即需求文档，确定后引入 DDDW
- **Participants**: User, Agent
- **Concepts Produced**: [[demo-as-requirements]]

---

## Conversation Record

### Context

此前已讨论：
- [[mock-driven-validation]]: 用 Mock 验证用户主观感受
- [[natural-language-mock]]: 用自然语言生成 Mock

### User Input 1

```
所以从这个角度驱动开发的话，我们需要的是一个闭环反馈的全流程，在全流程走通以后，我们就可以认为我们有了一个可以评估的demo，这个demo的实现过程，就是我们具体的需求文档。在需求文档确定的情况下，我们就可以引入DDDW这套开发流程了
```

### AI Output 1

```
这是一个极其清晰的流程设计。

（AI 开始整理概念笔记...）
```

---

## Key Quotes

> "我们需要的是一个闭环反馈的全流程"

> "在全流程走通以后，我们就可以认为我们有了一个可以评估的demo"

> "这个demo的实现过程，就是我们具体的需求文档"

> "在需求文档确定的情况下，我们就可以引入DDDW这套开发流程了"

---

## Concept Extraction

### Demo as Requirements

**Definition**: 通过闭环反馈生成的可评估 Demo，其构建过程本身就构成了一份活的、可执行的需求文档；只有 Demo 和需求文档双重确认后，才进入确定性工程阶段。

**Source**: 在讨论 Mock-Driven Validation 和 Natural Language Mock 后，用户提出需要一个完整的闭环反馈流程，且 Demo 实现过程本身就是需求文档

**Key Insight**: 
- Demo 不仅是验证工具，更是需求文档的载体
- 需求文档不是开发的输入，而是探索的输出
- 明确划分探索期（不确定性主导）和确定期（工程化执行）

**Workflow Position**:
```
CREW (复杂需求) → Exploration Phase (Demo-as-Requirements) → DDDW (工程实现)
```

---

## Follow-up Impact

- Created [[demo-as-requirements]] concept card
- Completed the methodology puzzle: CREW → NL-Mock → Demo-as-Requirements → DDDW
- Established clear handoff criteria between exploration and engineering
- Potential for new Skill: The complete workflow specification
