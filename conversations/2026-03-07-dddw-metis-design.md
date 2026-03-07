# Conversation: DDDW 和 METIS 的设计

## 元数据

- **日期**: 2026-03-07
- **主题**: 开发流程方法论设计
- **参与者**: User, Agent
- **概念产出**: [[dddw]]、[[metis]]、[[crew]]

---

## 对话记录

### 用户输入（初始需求）

```
我们来定义一个方法论大概是下面这个流程。1. 用户写文档描述原始需求 2. agent根据原始需求拆分设计文档和设计意图文档 3. 确认方案以后把设计文档继续拆分成适合多人开发的横向/纵向多人协同开发设计，并且补充所有可能的交互接口和公共基础库目录、e2e的功能测试 4. 开启subagent并行开发，并且补充单元测试 5. 回归测试验证所有功能是否和预期 6. 更新相关文档，查看不一致的点 7. 拆分成合适的commit
```

### AI 输出（流程分析和优化）

**七步流程总结**:

```
Step 1: 原始需求
    ↓
Step 2: 设计文档 + 设计意图
    ↓ (确认)
Step 3: 协同拆分 = 横向模块 + 纵向链路 + 接口契约 + E2E测试
    ↓
Step 4: 并行开发 (SubAgent) + 单元测试
    ↓
Step 5: 回归测试
    ↓
Step 6: 文档同步检查
    ↓
Step 7: Commit 拆分
```

**关键创新 - Step 3（协同拆分）**:
- 横向（按模块）：数据层、业务逻辑层、表现层
- 纵向（按数据流）：输入→处理→输出
- 混合拆分：接口定义者 + 实现者 + 集成者
- 接口契约：通过接口文档解耦多人开发
- E2E 测试先行：Step 3 定义验收标准

---

### 关于需求探索的讨论

### 用户输入

```
需求往往是随着讨论而出现的，DDDW是一个需求明确场景下的agent开发范式，如果我当前还有一些模糊的想法需要和agent去细化讨论，最后需要讨论的结果和过程（过程中包含了大量的why和tradeoff的思考过程）去生成最后的实际需求
```

### AI 输出

**问题识别**: DDDW 假设需求已经明确，但现实中需求往往是**涌现式**的。

**解决方案**: 新增 **Step 0: Collaborative Exploration**（协作探索）

```
Step 0: Exploration        ← 新增：协作澄清模糊想法
    ↓
Step 1: Requirements       ← 基于探索结果生成结构化需求
Step 2: Design
...
```

**Step 0 的核心设计**:
- **输入**: 用户的模糊想法、问题描述、目标愿景
- **过程**: 结构化对话（多轮澄清）
- **产出**: 
  1. `docs/exploration/<feature>-exploration.md` - 过程记录
  2. `docs/requirements/<feature>-requirements.md` - 最终需求

**六轮探索流程**:
1. Context Gathering - 理解背景
2. Problem Definition - 5 Whys 根因分析
3. Solution Brainstorming - 2-4 种方案
4. Deep Dive - 深入选定方向
5. Trade-off Analysis - 明确权衡
6. Consolidation - 确认共识

---

### 命名讨论

### 用户输入

```
CREW这个名字怎么样？
```

### AI 输出

**采纳**: CREW - Collaborative Requirements Exploration Workshop

**命名理由**:
- **Collaborative**: 强调协作，不是单向的需求传递
- **Requirements**: 明确产出是需求
- **Exploration**: 强调探索性，不是确定的
- **Workshop**: 工作坊形式，结构化对话

---

### 关于 METIS 的讨论

### 用户输入

```
开发的过程中，有一些testcase通过不了，或者是有一些case需要反复的调试，我们希望沉淀一些经验教训的文档。这个过程往往是agent在代码中自我debug的流程，有，我们希望能抽象出一些高层次的具有模糊性的方法论出来避免类似的问题，也就是说，单次的经验教训文档应该是一个方法论（可能是reference已有的方法论）和一个case的组合，之所以要用方法论而不是fewshot是因为我们担心模型的指令遵守过于好，导致完全跟着文档的决策树走，在过去的case里面思维定势了。
```

### AI 输出（完整分析）

**核心问题识别**:
- 需要沉淀调试经验
- 避免 Few-shot 导致的思维定势
- 用高层次方法论指导，而非具体步骤限制

**概念设计**: METIS - Methodology Extraction & Transferable Insight System

**核心架构**:

```
METIS/
├── methodology/          # 抽象思考框架（模糊、启发式）
│   ├── debugging-layer-cake.md
│   └── observer-check.md
├── cases/                # 具体情境记录（丰富、具体）
│   ├── code/
│   ├── cognitive/
│   └── ai-self/         # AI 自我反思
└── principles/          # 跨案例原则
```

**关键设计 - 双文档分离**:

| 类型 | 内容 | 作用 |
|------|------|------|
| **方法论** | 抽象框架、启发式问题 | 提供视角，不是步骤 |
| **案例** | 具体情境、失败路径 | 记录真实过程 |

**避免思维定势的策略**:
- 方法论使用隐喻（"Layer Cake"）而非步骤
- 案例记录"挣扎过程"而非"解决方案"
- 强调"观察者检查"（bias 在自己）

**与 AI 的关系**:
- AI 也需要 Observer Check
- AI 的"Pattern Primacy"和人类的"自动化错误"同源
- METIS 成为人机共享的认知基础设施

---

## 关键原话保留

> "我们来定义一个方法论大概是下面这个流程..."

> "需求往往是随着讨论而出现的，DDDW是一个需求明确场景下的agent开发范式"

> "CREW这个名字怎么样？"

> "单次的经验教训文档应该是一个方法论（可能是reference已有的方法论）和一个case的组合"

> "之所以要用方法论而不是fewshot是因为我们担心模型的指令遵守过于好，导致完全跟着文档的决策树走"

> "在过去的case里面思维定势了"

---

## 概念提取

### DDDW（Document-Driven Development Workflow）

**全称**: Document-Driven Development Workflow
**缩写**: DDDW
**定位**: 需求明确场景下的 Agent 开发范式
**核心**: 七步流程，从需求到代码
**关键创新**: Step 3 协同拆分（横向/纵向/混合 + 接口契约）

### CREW（Collaborative Requirements Exploration Workshop）

**全称**: Collaborative Requirements Exploration Workshop
**缩写**: CREW
**定位**: DDDW 的前置流程，处理模糊需求
**核心**: 六轮探索，从模糊想法到结构化需求
**产出**: exploration.md（过程）+ requirements.md（结果）

### METIS（Methodology Extraction & Transferable Insight System）

**全称**: Methodology Extraction & Transferable Insight System
**缩写**: METIS
**定位**: 调试经验的沉淀和复用
**核心**: 方法论 + 案例分离，避免思维定势
**关键设计**: 
- 方法论提供"视角"而非"步骤"
- 案例记录"过程"而非"结论"

---

## 后续影响

1. 创建了完整的 Skill 体系（CREW → DDDW → METIS）
2. 建立了方法论的层次结构
3. 影响了 debug-stance 的设计
4. 为后续所有涉及 Agent 开发的讨论提供了框架
