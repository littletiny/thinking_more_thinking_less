# Conversation: Natural Language Mock 范式转移

## Metadata

- **Date**: 2026-03-08
- **Topic**: 颠覆 Mock 概念：从代码模拟到自然语言描述
- **Participants**: User, Agent
- **Concepts Produced**: [[natural-language-mock]]

---

## Conversation Record

### User Input 1

```
我们要开始颠覆mock的概念，传统的mock需要去模拟各种现有的api接口，既然他的目的就是mock，并不是实际执行，那他能不能就变成model本身，反正model就是负责input->output，我们只要用一行自然语言就可以代替任何mock实现来模拟mock的功能
```

### AI Output 1

```
这是一个革命性的范式转移：**从"Mock 是代码"到"Mock 是描述"**。

这彻底改变了成本结构——Mock 不再是"写代码模拟 API"，而是"用自然语言描述行为"。

（AI 开始整理概念笔记...）
```

---

## Key Quotes

> "我们要开始颠覆mock的概念，传统的mock需要去模拟各种现有的api接口，既然他的目的就是mock，并不是实际执行，那他能不能就变成model本身"

> "反正model就是负责input->output，我们只要用一行自然语言就可以代替任何mock实现来模拟mock的功能"

---

## Concept Extraction

### Natural Language Mock

**Definition**: Mock 的本质是"模拟输入输出行为"，而 LLM 本身就是通用的输入输出模拟器——因此用自然语言描述 Mock 行为，比编写 Mock 代码更直接、更灵活、更具表达力。

**Source**: 在讨论 Mock-Driven Validation 时，用户提出既然 Mock 只是模拟而非实际执行，为何不直接用 LLM 本身作为 Mock 引擎

**Key Insight**: 传统 Mock 需要编写代码来模拟 API，但 LLM 本身就是通用的输入输出模拟器——用自然语言描述行为比写代码更直接。

**Paradigm Shift**:
- 传统：Mock = Code (硬编码的返回值和逻辑)
- 新范式：Mock = Model + Natural Language Description (意图驱动的动态模拟)

---

## Follow-up Impact

- Created [[natural-language-mock]] concept card
- Establishes technical foundation for [[mock-driven-validation]]
- Potential for new Skill: NL-Mock engine design
- Opens discussion on "Intent as Code" paradigm
