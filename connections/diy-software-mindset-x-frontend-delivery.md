# Connection: DIY Software Mindset × Frontend Delivery Channel

## Relationship

**Frontend Delivery Channel 是 DIY Software Mindset 在用户体验层面的延伸。**

- **DIY Software Mindset**: 价值观——简单能用，拼凑优先
- **Frontend Delivery Channel**: 实施策略——选择成本最低的前端渠道

两者共同确保非程序员用户能够真正使用 DIY 工具。

---

## The Anti-Pattern: Technical Purity

### 违背 DIY 精神的选择

```
技术人员倾向：
"我要做一个完整的系统，包括..."
- 独立 App（React Native/Flutter）
- 自建服务器（AWS/阿里云）
- 数据库（PostgreSQL）
- API 设计（REST/GraphQL）

结果：
- 开发周期：3个月
- 成本：$50/月
- 用户：只有作者自己
- 实际上：用 Excel 可能更快
```

### 违背用户现实的选择

```
"用户应该学习使用 CLI"
"JSON 输出很清晰啊"
"配置文件编辑是基本技能"

现实：
用户直接放弃
```

---

## The DIY-Aligned Strategy

### 渠道选择优先级（从简）

```
原则：用户在哪儿，就在哪儿交付

优先级 1: IM 机器人（成本最低）
├─ 用户无需安装
├─ 开发简单
├─ 通知天然触达
└─ 适合 80% 场景

优先级 2: IM + Webview（成本次低）
├─ 需要展示图表时
├─ 纯前端 H5
└─ 免费托管（GitHub Pages）

优先级 3: 小程序（必要时）
├─ NLP 无法承载的复杂交互
├─ 高频使用
└─ 长期价值

优先级 4: 独立 App（几乎不考虑）
└─ 成本与价值不匹配
```

### 渐进增强路径

```
Step 1: IM 机器人（MVP）
用户："记一笔午餐 35"
机器人："已记录"

Step 2: 增强回复
用户："本月花了多少"
机器人："本月餐饮 ¥1,250 [点击查看详情]"
        ↓
    点击打开 Webview 图表

Step 3: 高频场景小程序
如果用户每天使用 10+ 次
且 IM 体验确实不便
→ 开发小程序
```

---

## Cost Alignment with DIY

### DIY 成本原则：个人可承受

```
可接受成本：
- 模型推理：$20-30/月（高频使用）
- IM 机器人：免费
- Webview 托管：免费
- 小程序：开发时间成本

不可接受成本：
- 独立服务器：$20+/月 + 维护
- 独立 App：开发 + 审核 + 推广
- 复杂架构：时间成本
```

### 模型推理成本的误解

```
用户担心："模型推理是不是太贵？"

实际计算：
- 单次交互：~$0.01-0.02
- 每天 50 次：~$0.75
- 每月：~$23

对比：
- 一杯咖啡的价格
- 远低于独立服务器成本
- 远低于开发独立 App 的时间成本

结论：
模型推理是 DIY 工具的主要成本，但可接受
渠道成本应该最小化（选 IM）
```

---

## User Experience in DIY Context

### 非程序员用户的心理模型

```
技术人员认为的正常：
CLI → 命令 → JSON 输出

用户实际想要的：
像和朋友聊天一样使用工具

"帮我记一下"
"提醒我明天"
"看看我这个月花了多少"
```

### IM 作为桥梁

```
IM 机器人连接了：
- 用户熟悉的交互方式（聊天）
- DIY 工具的功能（记账/提醒）
- AI 的能力（理解自然语言）

不需要：
- 学习新 App
- 理解技术概念
- 适应新界面
```

---

## Decision Framework

### 选择哪个渠道？

```
问题 1: 纯对话能否完成交互？
├─ 能 → IM 机器人
└─ 不能 → 问题 2

问题 2: 是展示类还是操作类？
├─ 展示类（图表/报表）→ IM + Webview
└─ 操作类（复杂表单）→ 问题 3

问题 3: 使用频率多高？
├─ 每天多次 → 小程序
└─ 偶尔使用 → IM + Webview
```

### 与 DIY 流程的整合

```
Exploration Phase（Demo）：
- 在 IM 中展示 Demo
- 用户用自然语言交互
- 快速验证需求

DDDW Phase（实现）：
根据确认的渠道：
- IM：配置机器人 API
- Webview：开发 H5 页面
- 小程序：开发小程序

交付：
- 用户添加机器人好友
- 或扫码使用小程序
```

---

## Key Insight

> **对于 DIY 工具，IM 机器人是被严重低估的交付方式。**

它完美契合 DIY 理念：
- 成本最低（几乎免费）
- 用户门槛最低（已在常用 App 中）
- 开发最简单（API 调用）
- NLP 交互最自然

小程序和 App 的诱惑：
- 技术人员的"完美主义"
- 实际上对一人项目过度工程

**原则：先 IM，确实不够用时再升级。**

---

## Related

- Concepts: [[diy-software-mindset]], [[frontend-delivery-channel]]
- Connections: [[mock-as-demo-environment]]（Demo 也可以在 IM 中展示）
- Source: [frontend-delivery-channel-origin](../conversations/2026-03-08-frontend-delivery-channel.md)
