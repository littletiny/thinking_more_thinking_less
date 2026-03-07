# Zettel - 概念知识库

> 结构化记录思考过程，包括完整的对话输入输出、概念提炼和关联分析。

---

## 快速检索

```bash
# 查找概念
python tools/search.py concept observer-check

# 搜索对话
python tools/search.py conversation 2026-03-07

# 全文搜索
python tools/search.py grep "DIY"

# 显示统计
python tools/search.py stats
```

## 维护索引（⚠️ 禁止直接编辑 index.json）

```bash
# 添加新对话
python tools/update_index.py add-conversation \
    "2026-03-09-topic.md" \
    "对话主题" \
    "2026-03-09" \
    "concept-1" "concept-2"

# 添加新概念
python tools/update_index.py add-concept \
    "concept-name" \
    "解决方法论"

# 验证索引
python tools/update_index.py validate
```

---

## 目录结构

```
zettel/
├── README.md              # 本文件（人类可读的概览）
├── SKILL.md               # Agent 维护指南
├── AGENTS.md              # DIY 开发规范
├── index.json             # 🆕 机器可读的索引（核心）
│
├── tools/                 # 🆕 检索工具
│   └── search.js          # CLI 搜索工具
│
├── conversations/         # 完整的聊天记录（输入/输出）
├── concepts/              # 提炼后的概念卡片
├── connections/           # 概念间关联分析
├── notes/                 # 系统化文档（整合概念的综合视图）
└── README.obsidian.md     # Obsidian 可视化使用指南
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
| [[mock-driven-validation]] | [mock-driven-validation-origin](conversations/2026-03-08-mock-driven-validation.md) |
| [[natural-language-mock]] | [natural-language-mock-origin](conversations/2026-03-08-natural-language-mock.md) |
| [[demo-as-requirements]] | [demo-as-requirements-origin](conversations/2026-03-08-demo-as-requirements.md) |
| [[mock-feasibility-boundary]] | [mock-feasibility-boundary-origin](conversations/2026-03-08-mock-feasibility-boundary.md) |
| [[agent-only-engineering]] | [agent-only-engineering-origin](conversations/2026-03-08-agent-only-engineering.md) |
| [[user-knowledge-reality]] | [user-knowledge-reality-origin](conversations/2026-03-08-user-knowledge-reality.md) |
| [[hard-constraints-system]] | [hard-constraints-system-origin](conversations/2026-03-08-user-knowledge-reality.md) |
| [[diy-software-mindset]] | [diy-software-mindset-origin](conversations/2026-03-08-diy-software-mindset.md) |
| [[mock-as-demo-environment]] | [mock-as-demo-environment-origin](conversations/2026-03-08-mock-as-demo-environment.md) |
| [[model-code-agent-separation]] | [mock-as-demo-environment-origin](conversations/2026-03-08-mock-as-demo-environment.md) |
| [[frontend-delivery-channel]] | [frontend-delivery-channel-origin](conversations/2026-03-08-frontend-delivery-channel.md) |
| [[prebuilt-scaffold-strategy]] | [prebuilt-scaffold-strategy-origin](conversations/2026-03-08-prebuilt-scaffold-strategy.md) |
| [[anti-engineering-agents-md]] | [anti-engineering-agents-md-origin](conversations/2026-03-08-anti-engineering-agents-md.md) |
| [[diy-system-blindspots]] | [diy-system-blindspots-origin](conversations/2026-03-08-diy-system-blindspots.md) |
| [[diy-system-reality-check]] | [diy-system-blindspots-origin](conversations/2026-03-08-diy-system-blindspots.md) |
| [[the-power-of-seeing]] | [power-of-seeing-origin](conversations/2026-03-08-power-of-seeing-and-zero-cost.md) |
| [[zero-operating-cost-model]] | [power-of-seeing-origin](conversations/2026-03-08-power-of-seeing-and-zero-cost.md) |
| [[diy-vs-existing-platforms]] | [platform-comparison-origin](conversations/2026-03-08-platform-comparison.md) |
| [[scaffold-not-platform]] | [scaffold-not-platform-origin](conversations/2026-03-08-scaffold-not-platform.md) |
| [[everyones-automation-need]] | [scaffold-not-platform-origin](conversations/2026-03-08-scaffold-not-platform.md) |
| [[standalone-core-plugin-extension]] | [standalone-core-plugin-origin](conversations/2026-03-08-standalone-core-plugin.md) |
| [[solution-first-prioritization]] | [solution-first-prioritization-origin](conversations/2026-03-08-solution-first-prioritization.md) |
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

- **对话记录**: 14 个（2026-03-07 ~ 2026-03-08）
- **概念卡片**: 34 个
- **关联分析**: 19 个
- **最后更新**: 2026-03-08

## 最近更新

- 新增决策辅助产品探索对话（2026-03-07-gradual-consultation.md）
- 系统性地否定了决策辅助作为产品方向的可行性
- 产出思想实验陷阱、AI思考脚手架等元认知概念
- 更新了 README 索引，新增产品探索类别
- 新增 Mock-Driven Validation 概念（2026-03-08）
- 新增 Natural Language Mock 概念（2026-03-08）
- 探讨 AI 时代 Mock 作为需求验证工具的新范式
- 探讨 Mock 的技术实现范式转移：从代码到自然语言
- 新增 Demo as Requirements 概念，完成方法论闭环（CREW → NL-Mock → Demo → DDDW）
- 新增 Mock Feasibility Boundary 概念，建立工程约束检查机制
- 新增 Agent-Only Engineering 概念，定义纯 Agent 开发模式的特殊约束
- 新增 User Knowledge Reality 概念，明确用户认知约束
- 新增 Hard Constraints System 概念，建立内置约束机制
- 新增 DIY Software Mindset 概念，根本性范式转移（工业制造→DIY 拼凑）
- 新增 Mock as Demo Environment 概念，明确 Mock 的用户引导作用
- 新增 Model-Code Agent Separation 概念，定义实施架构分工
- 新增 Frontend Delivery Channel 概念，确定前端交付渠道策略（IM 优先）
- 新增 Prebuilt Scaffold Strategy 概念，建立本地应用与 IM 机器人两套脚手架体系
- 新增 Anti-Engineering Agents.md 概念，建立反工程规范体系（DIY-001 ~ DIY-008）
- 新增 DIY System Blindspots 概念，系统检视 10 个潜在盲点
- 新增 DIY System Reality Check 概念，诚实评估系统的必要性和可行性
- 新增 The Power of Seeing 概念，理解看见的能力是核心价值
- 新增 Zero Operating Cost Model 概念，定义一锤子买卖商业模式
- 新增 DIY vs Existing Platforms 概念，客观对比与主流平台的竞争力
- 新增 Scaffold, Not Platform 概念，关键转变：不做平台做脚手架
- 新增 Everyone's Automation Need 概念，发现每个人真实存在的自动化诉求
- 新增 Standalone Core + Plugin Extension 概念，架构设计：独立核心 + 社区兼容
- 新增 Solution First Prioritization 概念，关键价值观转变：从给能力到解决问题
