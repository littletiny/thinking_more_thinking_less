# Conversation: Prebuilt Scaffold Strategy 预置脚手架

## Metadata

- **Date**: 2026-03-08
- **Topic**: 预置脚手架策略：本地应用栈与 IM 机器人栈
- **Participants**: User, Agent
- **Concepts Produced**: [[prebuilt-scaffold-strategy]]

---

## Conversation Record

### Context

此前已讨论前端交付渠道（IM 优先）。

### User Input 1

```
考虑到海外用户，我们还得加上telegram，telegram的的sdk能力应该是最强的，当然他的风险也众多。当然还可能只是一个本地应用，这种情况下，前端的web栈也很合适，但是我们需要稍微打包成一个app，否则每次要启动一个service再在页面上交互很糟心，因此我们还是要准备2套脚手架，一套react-native类似的前端栈，一套IM机器人的栈。这些脚手架我们得事先实现好，减少code agent的负担
```

### AI Output 1

```
这是关键的基础设施策略补充。

（AI 开始整理概念笔记...）
```

---

## Key Quotes

> "考虑到海外用户，我们还得加上telegram，telegram的sdk能力应该是最强的"

> "当然还可能只是一个本地应用，这种情况下，前端的web栈也很合适，但是我们需要稍微打包成一个app"

> "因此我们还是要准备2套脚手架，一套react-native类似的前端栈，一套IM机器人的栈"

> "这些脚手架我们得事先实现好，减少code agent的负担"

---

## Concept Extraction

### Prebuilt Scaffold Strategy

**Definition**: 为减少 Code Agent 负担并加速交付，需预置两套脚手架：一套基于 React Native/Electron 的本地应用栈（含自动打包），一套 IM 机器人栈（微信/飞书/钉钉/Telegram），覆盖本地与云端、国内与海外场景。

**Key Insight**:
- 脚手架是基础设施投资，前期投入大，后期每个项目受益
- Local App 栈：React Native / Electron / Tauri，支持移动+桌面
- IM Bot 栈：多平台适配（微信/飞书/钉钉/Telegram）
- Code Agent 只需填充业务代码，无需处理基础设施

**Two Scaffolds**:
```
Scaffold A: Local App
- React Native (iOS/Android)
- Electron (Desktop)
- Tauri (轻量桌面)
- 预置：UI 组件、本地存储、离线支持、自动打包

Scaffold B: IM Bot
- 微信/飞书/钉钉/Telegram
- 预置：SDK 封装、消息路由、命令解析、富媒体
```

**Platform Considerations**:
- Telegram：SDK 最强，但有访问风险
- 微信：限制多，建议企业微信
- 飞书/钉钉：企业场景成熟
- 本地 App：避免"启动 service + 浏览器"的糟糕体验

---

## Follow-up Impact

- Created [[prebuilt-scaffold-strategy]] concept card
- Established infrastructure preparation strategy
- Identified need for two-scaffold system
- Reduced Code Agent workload from infrastructure to business logic
