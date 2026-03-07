# Conversation: Mock 作为演示环境与模型分工

## Metadata

- **Date**: 2026-03-08
- **Topic**: Mock 演示环境的设计与模型/Code Agent 分工架构
- **Participants**: User, Agent
- **Concepts Produced**: [[mock-as-demo-environment]], [[model-code-agent-separation]]

---

## Conversation Record

### Context

此前已建立 DIY 软件思维的基础方法论。

### User Input 1

```
mock就是我们的演示环境，用户可能对功能的描述没有那么清晰，因此我们需要尽可能多的引导用户去mock，对于一些数值类的计算，模型的表现往往不太符合预期，因此后面还不能是一个纯模型，大概率还是一个code agent。但是我们不能让code agent做所有的事，因为真的做所有的事以后，这就是重新实现一个系统了，所以我们大概率让code agent做的就是简单的数值计算，然后剩下的都是文本记录，交给模型去认识文本查找而已（正确性不重要，重要的是交互的流程）
```

### AI Output 1

```
这是一个关键的实施架构细节。

（AI 开始整理概念笔记...）
```

---

## Key Quotes

> "mock就是我们的演示环境，用户可能对功能的描述没有那么清晰，因此我们需要尽可能多的引导用户去mock"

> "对于一些数值类的计算，模型的表现往往不太符合预期，因此后面还不能是一个纯模型，大概率还是一个code agent"

> "但是我们不能让code agent做所有的事，因为真的做所有的事以后，这就是重新实现一个系统了"

> "所以我们大概率让code agent做的就是简单的数值计算，然后剩下的都是文本记录，交给模型去认识文本查找而已"

> "（正确性不重要，重要的是交互的流程）"

---

## Concept Extraction

### Mock as Demo Environment

**Definition**: Mock 的本质是演示环境——通过可交互的原型引导用户逐步澄清需求，而非仅仅作为技术测试工具。

**Key Insight**: 
- Mock 不是技术工具，是用户引导工具
- 通过演示让用户"看到"功能，暴露隐含需求
- 最大化 Mock 覆盖率，尽可能在 Demo 阶段澄清需求

### Model-Code Agent Separation

**Definition**: 在 DIY 开发模式中，模型负责文本处理和交互流程（正确性不重要），Code Agent 负责数值计算（准确性关键），严格分离以避免重新实现整个系统。

**Key Insight**:
- 模型：文本理解、交互流程（模糊匹配可接受）
- Code Agent：数值计算、精确逻辑（必须准确）
- 边界：不能让 Code Agent 做所有事（否则变成重新实现系统）

**分工原则**:
```
模型：理解 → 决策 → 生成
        ↓
Code Agent：计算 ← 执行 ← 返回
        ↓
模型：回复
```

---

## Follow-up Impact

- Created [[mock-as-demo-environment]] concept card
- Created [[model-code-agent-separation]] concept card
- Clarified implementation architecture for DIY development
- Established clear boundaries between Model and Code Agent
