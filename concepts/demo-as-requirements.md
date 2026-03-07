# Demo as Requirements / Demo 即需求文档

## One Sentence
通过闭环反馈生成的可评估 Demo，其构建过程本身就构成了一份活的、可执行的需求文档；只有 Demo 和需求文档双重确认后，才进入确定性工程阶段。

---

## Why It Matters

### 传统流程的问题

```
需求文档 → 设计 → 开发 → 测试 → 交付
   ↑                        ↓
   └──── 文档与实际偏离 ────┘
```

- 文档是静态的，需求是动态的
- 用户看不懂文档，只能看懂成果
- 文档和实现之间的"翻译"导致信息丢失

### Demo 即文档的洞见

> "这个 demo 的实现过程，就是我们具体的需求文档"

关键洞察：
- **Demo 是可触摸的** —— 用户能直接验证
- **Demo 的构建过程记录了所有决策** —— 为什么选择这种交互、为什么舍弃那个方案
- **Demo 是可执行的** —— 没有歧义，只有行为
- **Demo 是活的** —— 可以持续迭代直到用户说"对，这就是我要的"

---

## Source Context

From conversation: [demo-as-requirements-origin](../conversations/2026-03-08-demo-as-requirements.md)

**Key case**: 在讨论 Mock-Driven Validation 和 Natural Language Mock 后，用户提出需要一个完整的闭环反馈流程，且 Demo 实现过程本身就是需求文档

**Key insight**: 在需求文档确定的情况下，才可以引入 DDDW。Demo 不仅是验证工具，更是需求文档的载体。

**User's original words**:
> "我们需要的是一个闭环反馈的全流程，在全流程走通以后，我们就可以认为我们有了一个可以评估的demo，这个demo的实现过程，就是我们具体的需求文档。在需求文档确定的情况下，我们就可以引入DDDW这套开发流程了"

---

## Core Mechanism

### 双阶段流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Phase 1: Exploration                             │
│                    探索期：不确定性主导                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   Intent     │    │   Natural    │    │   Interactive│          │
│  │   Capture    │ →  │   Language   │ →  │   Demo       │          │
│  │              │    │   Mock       │    │              │          │
│  │ 用户模糊描述  │    │  AI生成行为   │    │  用户触摸体验 │          │
│  └──────────────┘    └──────────────┘    └──────┬───────┘          │
│                                                  │                  │
│                       ┌──────────────────────────┘                  │
│                       ↓                                             │
│                  ┌──────────────┐                                   │
│                  │  Subjective  │                                   │
│                  │  Feedback    │                                   │
│                  │              │                                   │
│                  │  用户反馈     │                                   │
│                  └──────┬───────┘                                   │
│                         │                                           │
│               ┌─────────┴──────────┐                                │
│               ↓                    ↓                                │
│         ┌─────────┐          ┌──────────┐                          │
│         | 不满意  |          |  满意    |                          │
│         └────┬────┘          └────┬─────┘                          │
│              │                    │                                 │
│              ↓                    ↓                                 │
│         回到 Intent         进入 Phase 2                           │
│         Capture             (确定期)                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Phase 2: Engineering                             │
│                    确定期：工程化执行                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   Demo as    │    │   DDDW       │    │   Production │          │
│  │   Requirements│ → │   Process    │ →  │   System     │          │
│  │              │    │              │    │              │          │
│  │ Demo构建过程  │    │ 文档驱动开发  │    │ 生产级系统    │          │
│  │ = 需求文档    │    │              │    │              │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 阶段边界：确定性阈值

| 维度 | Phase 1: Exploration | Phase 2: Engineering |
|------|---------------------|---------------------|
| **目标** | 探索可能性空间 | 确定性交付 |
| **成本敏感度** | 低（可快速丢弃） | 高（需精心维护） |
| **用户角色** | 主导探索方向 | 确认验收标准 |
| **工具** | NL-Mock, 快速原型 | DDDW, 工程规范 |
| **交付物** | Demo + 决策记录 | 生产系统 |
| **变更容忍** | 高（鼓励迭代） | 低（控制变更） |

### Demo 如何成为需求文档

```
Demo Implementation Log (即需求文档)
========================================

## User Story
[原始用户描述]

## Iteration History
### Iteration 1
- Mock Behavior: "返回固定列表"
- User Feedback: "太简单了，需要搜索功能"
- Decision: 添加搜索接口

### Iteration 2  
- Mock Behavior: "支持关键词搜索，返回匹配结果"
- User Feedback: "搜索结果需要按相关性排序"
- Decision: 添加排序逻辑

### Iteration 3 (Final)
- Mock Behavior: "关键词搜索 + 相关性排序 + 支持筛选"
- User Feedback: "对，这就是我要的"
- Decision: 冻结需求

## Confirmed Behaviors
- API: search_items(query, filters) → sorted_results
- UI: 搜索框 + 筛选面板 + 结果列表
- Interaction: 实时搜索 + 点击筛选即时更新

## Rejected Alternatives
- 最初考虑分类浏览 → 用户明确要搜索优先
- 考虑过高级搜索面板 → 用户认为太复杂

## Handoff to DDDW
- Status: ✅ 用户确认
- Confidence: 高（经过3轮迭代）
- Risk Areas: 大规模数据下的排序性能需验证
```

---

## Integration with Existing Workflows

### 与 CREW 的关系

```
复杂需求
    ↓
是否需要深度探索？
    ├─→ 是 → CREW (结构化对话澄清)
    │         ↓
    │    得到清晰问题定义
    │         ↓
    └─→ 否 → 直接进入 Exploration Phase
              ↓
         Demo-as-Requirements
              ↓
         用户验证
              ↓
         确认 → DDDW
```

### 与 DDDW 的边界

**DDDW 的启动条件**（必须全部满足）：
1. ✅ Demo 已通过用户验证
2. ✅ 需求文档（Demo 构建日志）完整
3. ✅ 用户明确表示"这就是我要的"
4. ✅ 关键风险已识别

**DDDW 不处理**（由 Exploration Phase 完成）：
- ❌ "这个功能应该是什么样的？" → 由 Demo 回答
- ❌ "用户真的需要这个吗？" → 由用户验证 Demo 回答
- ❌ "哪种交互方式更好？" → 由迭代探索回答

---

## Key Advantages

### 1. 零文档漂移
传统：文档写于开发前，实现时必然偏离
Demo-as-Requirements：文档源于实现，天然一致

### 2. 用户可验证
传统：用户只能验证最终产品
Demo-as-Requirements：用户在每一步都能验证

### 3. 决策可追溯
传统："为什么要这样设计？" → 找不到答案
Demo-as-Requirements：迭代历史记录所有决策原因

### 4. 风险前置
传统：风险在开发后期才发现
Demo-as-Requirements：风险在探索期就暴露（因为用户会反馈）

---

## Potential Challenges

1. **Demo 陷阱**
   - 用户可能误以为 Demo 就是最终产品
   - 需要明确设定预期："这是探索原型，不是最终版本"

2. **探索永无止境**
   - 没有明确边界，可能无限迭代
   - 需要设定："3轮迭代后必须做出选择"

3. **Demo 到 Production 的鸿沟**
   - Demo 用的是 Mock，Production 需要真实实现
   - 需要评估：Demo 中验证的需求，在技术实现上是否可行

---

## Related Concepts

- [[mock-driven-validation]] - 用 Mock 验证需求的方法论
- [[natural-language-mock]] - 快速生成 Mock 的技术基础
- [DDDW Skill](../.config/agents/skills/document-driven-development/SKILL.md) - 确定性工程阶段
- [CREW Skill](../.config/agents/skills/collaborative-requirements-exploration/SKILL.md) - 复杂需求的初步探索

---

## Personal Notes

- 这个概念完成了方法论拼图的最后一块：
  - CREW: 复杂需求的结构化澄清
  - NL-Mock: 快速原型生成的技术基础  
  - Demo-as-Requirements: 需求验证与文档化
  - DDDW: 确定性工程执行

- 关键认知转变：**需求文档不是开发的输入，而是探索的输出**

- 需要设计一个明确的"确定性检查清单"，防止过早或过晚进入 DDDW
