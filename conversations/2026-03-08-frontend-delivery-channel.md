# Conversation: Frontend Delivery Channel 前端交付渠道

## Metadata

- **Date**: 2026-03-08
- **Topic**: 前端展示与交付渠道选择：IM vs 小程序 vs App
- **Participants**: User, Agent
- **Concepts Produced**: [[frontend-delivery-channel]]

---

## Conversation Record

### Context

此前已建立 DIY 开发模式、模型分工、Mock 演示等方法论。

### User Input 1

```
接下来是前端展示，对于用户来说，他必须有一个前端展示，没有几个用户会接受cli/tui和浏览器展示一堆json的形态。因此我们必须wrap一些可以用的前端出来。他可以是一个聊天框，例如最近openclaw带火了很多东西，我们可以有飞书/钉钉/微信公众号，我们也可以做一个独立的app（成本是否太高，虽然可以纯前端webkit堆，但是要额外服务器+公网ip？），在一切从简的情况的情况下，一个用户常用的IM就是我们最好的输入输出载体？但是不是所有的功能都能在NLP的输入输出下解决的（除非我们再次引用模型推理，但是模型推理是不是太贵？）所以可能我们还是需要一个附属在微信或者其他平台上的独立小程序？综上，所以我们要能基于前端技术和现在openclaw的各种社区技术红利，选择合适的前端交互方式，这是很关键的点，以为信息的交互模式和信息的入口渠道决定了后续的流程设计
```

### AI Output 1

```
这是一个关键的产品架构决策——"最后一公里"交付问题。

（AI 开始整理概念笔记...）
```

---

## Key Quotes

> "对于用户来说，他必须有一个前端展示，没有几个用户会接受cli/tui和浏览器展示一堆json的形态"

> "在一切从简的情况的情况下，一个用户常用的IM就是我们最好的输入输出载体"

> "不是所有的功能都能在NLP的输入输出下解决的"

> "除非我们再次引用模型推理，但是模型推理是不是太贵？"

> "我们要能基于前端技术和现在openclaw的各种社区技术红利，选择合适的前端交互方式"

> "信息的交互模式和信息的入口渠道决定了后续的流程设计"

---

## Concept Extraction

### Frontend Delivery Channel

**Definition**: 用户必须拥有友好的前端界面，在从简原则下优先利用现有 IM 平台（微信/飞书/钉钉）作为输入输出载体，仅在 NLP 无法承载的复杂交互场景才考虑独立小程序或 App。

**Key Insight**:
- IM 机器人是成本最低、门槛最低的方案
- 但不是所有功能都能用 NLP 承载（复杂表单、可视化）
- 需要根据交互复杂度选择：IM → Webview → 小程序
- 模型推理成本相对于开发和运维成本是可接受的

**Channel Hierarchy**:
```
Layer 1: IM 机器人（默认，80%场景）
Layer 2: IM + Webview（结构化展示）
Layer 3: 小程序（复杂交互）
Layer 4: 独立 App（极少）
```

**Cost Reality**:
- 模型推理：~$23/月（高频使用）
- IM 机器人：几乎免费
- 小程序：开发成本，运维免费
- 独立 App：服务器+IP+备案，成本高

---

## Follow-up Impact

- Created [[frontend-delivery-channel]] concept card
- Identified IM-first strategy for DIY tools
- Clarified cost structure (model inference vs infrastructure)
- Established channel selection decision tree
