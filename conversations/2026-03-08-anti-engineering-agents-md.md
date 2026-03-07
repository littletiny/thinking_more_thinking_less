# Conversation: Anti-Engineering Agents.md 反工程规范

## Metadata

- **Date**: 2026-03-08
- **Topic**: DIY 开发模式的反工程规范 AGENTS.md 体系
- **Participants**: User, Agent
- **Concepts Produced**: [[anti-engineering-agents-md]]

---

## Conversation Record

### Context

此前已讨论预置脚手架策略。

### User Input 1

```
我们还需要一些数据库的脚手架，例如orm是最佳的，所以我们需要定制很多的agents.md，这些agents.md是反工程师直觉的。和我们前面交付的方式是一样的，我们需要解决的是DIY问题，而不是工程质量问题。从这个点发散出来，这是一个和现在开发模式不一样的开发模式，agents.md的约束需要你来帮我提供
```

### AI Output 1

```
这是关键的基础设施策略补充。

（AI 开始整理概念并提供 AGENTS.md 草案...）
```

---

## Key Quotes

> "我们还需要一些数据库的脚手架，例如orm是最佳的"

> "所以我们需要定制很多的agents.md，这些agents.md是反工程师直觉的"

> "我们需要解决的是DIY问题，而不是工程质量问题"

> "这是一个和现在开发模式不一样的开发模式，agents.md的约束需要你来帮我提供"

---

## Concept Extraction

### Anti-Engineering Agents.md

**Definition**: DIY 开发模式需要一套"反工程师直觉"的 AGENTS.md 规范体系——抛弃代码质量、架构设计、可维护性等工业标准，仅保留安全底线，一切以"简单能用"为最高准则。

**Key Insight**:
- 工程师直觉追求：DRY、分层、测试、抽象、架构
- DIY 模式需要：复制粘贴、平铺、无测试、硬编码、无架构
- AGENTS.md 的作用：显式允许"坏实践"，唯一禁止"过度工程"

**AGENTS.md 清单**:
- DIY-001-storage: JSON 文件优先，反 ORM
- DIY-002-frontend: 内联优先，反组件化
- DIY-003-architecture: 单文件优先，反分层
- DIY-004-code-style: 无风格
- DIY-005-security: ⚠️ 唯一严格
- DIY-006-testing: 手动测试，反自动化
- DIY-007-dependencies: 少依赖
- DIY-008-errors: 简单错误处理

**记忆口诀**:
```
JSON 文件代替数据库
单文件代替多模块
内联样式代替 CSS
复制粘贴代替抽象
console.log 代替测试
能用就行，安全除外
```

---

## Follow-up Impact

- Created [[anti-engineering-agents-md]] concept card
- Created complete AGENTS.md specification
- Established "reverse engineering" constraint system
- Provided specific implementation guidelines for DIY mode
