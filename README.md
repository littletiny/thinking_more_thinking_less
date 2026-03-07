# Zettel - 概念知识库

> 结构化记录思考过程，包括完整的对话输入输出、概念提炼和关联分析。

---

## 目录结构

```
zettel/
├── README.md              # 本文件
├── SKILL.md               # Agent 维护指南
│
├── conversations/         # 完整的聊天记录（输入/输出）
│   ├── README.md
│   ├── 2026-03-07-observer-check-origin.md
│   ├── 2026-03-07-carelessness-mechanisms.md
│   ├── 2026-03-07-dddw-metis-design.md
│   ├── 2026-03-07-git-agent-safety.md
│   ├── 2026-03-07-obsidian-ai-era.md
│   └── 2026-03-07-gradual-consultation.md
│
├── concepts/              # 提炼后的概念卡片
│   ├── carelessness.md
│   ├── defamiliarization.md
│   ├── feynman-technique.md
│   ├── observer-check.md
│   ├── pattern-primacy.md
│   ├── obsidian.md
│   ├── git-agent.md
│   ├── gradual-consultation.md
│   ├── frequency-value-paradox.md
│   ├── data-silo-barrier.md
│   ├── thought-experiment-trap.md
│   └── ai-thinking-scaffold.md
│
├── connections/           # 概念间关联分析
│   ├── carelessness-x-feynman.md
│   ├── obsidian-x-git-agent.md
│   ├── gradual-consultation-x-frequency-value-paradox.md
│   └── thought-experiment-trap-x-ai-thinking-scaffold.md
│
└── notes/                 # 零散笔记（预留）
```

---

## 使用方式

### 想了解概念的起源

→ 查看 `conversations/` 中的对话记录
- 完整的输入/输出
- 概念如何从具体案例中产生
- 决策过程中的挣扎和选择

### 想快速查阅概念

→ 查看 `concepts/` 中的概念卡片
- 核心定义
- 机制解释
- 与其他概念的关联

### 想理解概念间关系

→ 查看 `connections/` 中的关联分析
- 为什么两个概念有关
- 如何相互作用

---

## 核心概念索引

### 认知偏差与陷阱

| 概念 | 来源对话 |
|------|----------|
| [[carelessness]] | [carelessness-mechanisms](conversations/2026-03-07-carelessness-mechanisms.md) |
| [[pattern-primacy]] | [dddw-metis-design](conversations/2026-03-07-dddw-metis-design.md) |
| [[observer-check]] | [observer-check-origin](conversations/2026-03-07-observer-check-origin.md) |
| [[thought-experiment-trap]] | [gradual-consultation](conversations/2026-03-07-gradual-consultation.md) |
| [[frequency-value-paradox]] | [gradual-consultation](conversations/2026-03-07-gradual-consultation.md) |

### 解决方法论

| 概念 | 来源对话 |
|------|----------|
| [[defamiliarization]] | [observer-check-origin](conversations/2026-03-07-observer-check-origin.md) |
| [[feynman-technique]] | [carelessness-mechanisms](conversations/2026-03-07-carelessness-mechanisms.md) |
| [[gradual-consultation]] | [gradual-consultation](conversations/2026-03-07-gradual-consultation.md) |
| [[ai-thinking-scaffold]] | [gradual-consultation](conversations/2026-03-07-gradual-consultation.md) |

### 工具与基础设施

| 概念 | 来源对话 |
|------|----------|
| [[obsidian]] | [obsidian-ai-era](conversations/2026-03-07-obsidian-ai-era.md) |
| [[git-agent]] | [git-agent-safety](conversations/2026-03-07-git-agent-safety.md) |
| [[data-silo-barrier]] | [gradual-consultation](conversations/2026-03-07-gradual-consultation.md) |

---

## 关键洞察来源

### 找茬图案例
**对话**: [observer-check-origin](conversations/2026-03-07-observer-check-origin.md)

**核心洞察**:
> "我知道一定是我自己哪里的认知有问题了...我要先解决我的偏见"

**产出**: Observer Check 概念 - 当找不到问题时，怀疑观察方式而非对象。

### 矫枉必须过正
**对话**: [git-agent-safety](conversations/2026-03-07-git-agent-safety.md)

**核心洞察**:
> "矫枉必须过正，因为认知惯性是指数级的"

**产出**: 从结构主义到解构实用的认知转变。

### 方法论 vs 案例
**对话**: [dddw-metis-design](conversations/2026-03-07-dddw-metis-design.md)

**核心洞察**:
> "单次的经验教训文档应该是一个方法论和一个case的组合...之所以要用方法论而不是fewshot是因为我们担心模型的指令遵守过于好"

**产出**: METIS 的设计原则 - 用高层次方法论指导，而非具体步骤限制。

### Obsidian 在 AI 时代
**对话**: [obsidian-ai-era](conversations/2026-03-07-obsidian-ai-era.md)

**核心洞察**:
> "当 Agent 可以模拟任何工具的工作流时，工具本身还剩下什么价值？"

**产出**: 分层架构 - Obsidian（前端）+ Git（后端）+ Agent（维护），工具主权 vs 便利的权衡。

---

## 关键洞察来源

### 决策辅助产品探索
**对话**: [gradual-consultation](conversations/2026-03-07-gradual-consultation.md)

**核心洞察**:
> "99%的问题咨询与否他不会产生显著收益，重大决策的场景太少了"

**产出**: 
- [[frequency-value-paradox]] - 频次-价值悖论，解释决策工具不可行的结构性原因
- [[thought-experiment-trap]] - 思想实验陷阱，用思考代替行动的循环
- [[ai-thinking-scaffold]] - AI作为思考脚手架，高强度自我剖析的载体

**最终结论**:
> "不是产品形态错了，是方向本身的结构性矛盾" + "Just do it"

---

## 维护状态

- **对话记录**: 6 个（2026-03-07）
- **概念卡片**: 11 个
- **关联分析**: 4 个
- **最后更新**: 2026-03-07

## 最近更新

- 新增决策辅助产品探索对话（2026-03-07-gradual-consultation.md）
- 系统性地否定了决策辅助作为产品方向的可行性
- 产出思想实验陷阱、AI思考脚手架等元认知概念
- 更新了 README 索引，新增产品探索类别
