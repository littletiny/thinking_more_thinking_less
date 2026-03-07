# Connection: Mock-Driven Validation × The Power of Seeing

## Relationship

**The Power of Seeing 是 Mock-Driven Validation 的哲学基础。**

- **Mock-Driven Validation**: 方法——用 Mock 验证需求
- **The Power of Seeing**: 原理——人必须看见才能判断

两者结合：Mock 是"让可能性被看见"的技术手段。

---

## The Core Insight

```
传统需求工程失败的原因：
"用户无法描述他们不知道的东西"
    ↓
Mock-Driven Validation 的解决方案：
"用看得见的东西验证需求"
    ↓
The Power of Seeing 的本质：
"人必须看见可能性，才能判断和确认"
```

---

## How Mock Enables Seeing

### NL-Mock: 快速生成可能性

```
用户："我想要一个记账工具"
    ↓
传统：开始问问题
"你想要什么功能？"
"你喜欢什么界面？"
（用户困惑，无法回答）

NL-Mock：立即展示
"这是三种可能的方案："
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  方案 A     │  │  方案 B     │  │  方案 C     │
│ 简单列表    │  │ 分类统计    │  │ 图表分析    │
└─────────────┘  └─────────────┘  └─────────────┘
    ↓
用户："B 比较接近，但我想..."
（有具体反馈了）
```

### Demo: 看见最终成果

```
Mock 生成 Demo
    ↓
用户"触摸"交互
    ↓
发现："这里不对"
或确认："对，就是这样"
    ↓
需求在"看见"中澄清
```

---

## Why This Matters

### 认知科学视角

```
人类认知限制：
- 无法操作纯抽象概念
- 需要具体实例来理解
- 工作记忆容量有限

看见的作用：
- 将抽象转化为具体
- 提供判断的锚点
- 降低认知负荷
```

### 产品设计视角

```
低代码平台的成败关键：

❌ 失败：给用户一张白纸
"你可以创造任何东西"
用户："我不知道创造什么"

✅ 成功：给用户半成品
"你可以修改这个"
用户："那我要把这里改成..."

DIY 系统的定位：
"快速生成半成品，让用户看见并修改"
```

---

## Integration in DIY System

### 完整流程中的"看见"

```
1. Intent Capture（意图捕获）
   用户：模糊描述
   
2. NL-Mock（生成可能性）
   → 用户"看见"几种方案
   
3. Demo（验证交互）
   → 用户"看见"真实体验
   
4. Confirmation（确认）
   → 基于"看见"的判断
   
5. DDDW（实现）
   → 基于确认的需求
```

### 关键原则

```
展示 > 询问
选项 > 空白
看见 > 想象
```

---

## Comparison with Traditional Approaches

| 维度 | 传统方法 | Mock-Driven + Seeing |
|------|---------|---------------------|
| **起点** | 询问需求 | 展示可能性 |
| **用户状态** | 困惑、不确定 | 有判断依据 |
| **反馈质量** | 抽象、模糊 | 具体、可执行 |
| **返工成本** | 高（开发后发现） | 低（Mock 阶段发现） |
| **用户参与** | 被动回答 | 主动选择 |

---

## Key Insight

> **Mock-Driven Validation 不是技术创新，是认知创新——它承认了"人类需要看见才能理解"这一认知限制，并设计了相应的流程。**

```
技术层面：
- NL-Mock 降低生成成本
- 脚手架加速实现

认知层面：
- Mock 让可能性可见
- 用户基于看见做判断

两者结合：
= 低成本的"看见"能力
= DIY 系统的核心价值
```

---

## Related

- Concepts: [[mock-driven-validation]], [[the-power-of-seeing]]
- Connection: [[natural-language-mock-x-demo-as-requirements]]
- Source: [power-of-seeing-origin](../conversations/2026-03-08-power-of-seeing-and-zero-cost.md)
