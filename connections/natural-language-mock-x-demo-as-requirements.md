# Connection: Natural Language Mock × Demo as Requirements

## Relationship

**NL-Mock 是 Demo-as-Requirements 的技术使能器。**

- **Demo-as-Requirements** (方法论): Demo 的构建过程即需求文档
- **Natural Language Mock** (技术): 使 Demo 构建成本趋近于零，让迭代成为可能

---

## The Synergy

### 没有 NL-Mock 的困境

```
用户描述需求 ──→ 写 Mock 代码（2小时）──→ 生成 Demo
                                      ↓
用户反馈修改 ←── 不满意（需要改代码）←── 体验 Demo
       ↑________________________________|
                    (缓慢迭代)
```

**问题**: Mock 代码编写成本高，抑制了迭代次数

### 有 NL-Mock 的流畅

```
用户描述需求 ──→ 写 NL Mock 描述（2分钟）──→ 生成 Demo
                                        ↓
用户反馈修改 ←── 不满意（改几句话）←── 体验 Demo
       ↑__________________________________|
                    (快速迭代)
```

**结果**: 可以在用户注意力窗口内完成多轮迭代

---

## How They Create "Living Requirements"

### 传统需求文档

```markdown
## 功能需求
- 用户可以通过关键词搜索商品
- 搜索结果需要支持筛选
- 筛选条件包括：价格区间、品牌、评分

## 非功能需求
- 搜索响应时间 < 500ms
- 支持并发用户 1000+
```

**问题**: 静态文本，无法验证主观感受

### Demo-as-Requirements + NL-Mock

```markdown
## Demo Implementation Log (Iteration 3 - Final)

### Confirmed Behaviors
- API: search(query, filters) via NL Mock
  ```
  "根据关键词搜索，返回最多20个结果
   支持价格区间筛选（自动识别用户输入中的范围）
   支持品牌多选筛选
   结果按综合评分排序"
  ```

- UI Flow (用户验证通过)
  1. 搜索框在顶部，实时显示建议
  2. 筛选面板在左侧，可折叠
  3. 结果以卡片形式展示

### Iteration History
- Iter 1: 最初只支持简单搜索 → 用户反馈需要筛选
- Iter 2: 添加筛选但入口太深 → 用户找不到
- Iter 3: 筛选面板常驻左侧 → ✅ 用户确认

### Rejected Alternatives
- 高级搜索页面（用户认为太复杂）
- 标签云筛选（用户偏好结构化筛选）
```

**优势**: 
- 每一个决策都有用户反馈支撑
- 行为描述可执行（就是 NL Mock 配置）
- 历史记录完整，可追溯

---

## The Handoff to DDDW

当 Demo-as-Requirements 完成后，交付给 DDDW 的内容包括：

```
📦 Handoff Package
├── 🎯 Confirmed Demo
│   └── 用户已验证的可交互原型
├── 📄 Requirements Document  
│   └── Demo 构建日志（迭代历史 + 决策原因）
├── 🔧 NL Mock Configurations
│   └── 可作为 DDDW 中接口设计的参考
└── ⚠️ Risk Assessment
    └── 探索过程中发现的技术/产品风险
```

---

## Key Insight

这个组合实现了需求工程的范式转移：

> **从"先文档后实现"到"实现即文档"**

```
传统: 需求文档 ──→ 开发 ──→ （可能偏离文档）
       静态          动态        不一致

新范式: 探索 ──→ Demo ──→ Demo Log ──→ DDDW
         动态       可触摸     自动记录    确定实现
```

---

## Related

- Source: [natural-language-mock-origin](../conversations/2026-03-08-natural-language-mock.md)
- Source: [demo-as-requirements-origin](../conversations/2026-03-08-demo-as-requirements.md)
- Concepts: [[natural-language-mock]], [[demo-as-requirements]]
- Connection: [[mock-driven-validation-x-natural-language-mock]]
