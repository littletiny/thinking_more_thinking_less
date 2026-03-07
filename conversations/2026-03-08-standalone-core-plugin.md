# Conversation: Standalone Core + Plugin Extension 架构决策

## Metadata

- **Date**: 2026-03-08
- **Topic**: 架构设计：独立核心 + 插件扩展，拥抱 OpenClaw 但保持独立
- **Participants**: User, Agent
- **Concepts Produced**: [[standalone-core-plugin-extension]]

---

## Conversation Record

### Context

在明确脚手架定位后，讨论技术架构。

### User Input 1

```
所以是否应该做成一个openclaw插件，拥抱一个更大的社区？这里的问题在于，openclaw是否符合我们定义的模式，这套东西其实并不需要在openclaw环境下才能运行，他应该是简单的，0依赖的部署方式，最好就是一个binary打开就能尝试，甚至在线就能简单体验，只是我们可以让他支持openclaw。
```

### AI Output 1

```
这是一个聪明的架构决策——独立核心 + 社区兼容。

（AI 开始设计架构...）
```

---

## Key Quotes

> "所以是否应该做成一个openclaw插件，拥抱一个更大的社区？"

> "这套东西其实并不需要在openclaw环境下才能运行"

> "他应该是简单的，0依赖的部署方式，最好就是一个binary打开就能尝试"

> "甚至在线就能简单体验，只是我们可以让他支持openclaw"

---

## Concept Extraction

### Standalone Core + Plugin Extension

**Definition**: 架构策略——核心工具是独立、0依赖的 binary（甚至可在线体验），同时兼容 OpenClaw 插件生态，拥抱社区但不受制于平台。

**Architecture**:
```
Layer 1: Delivery（多种形式）
  • Binary (CLI) - 单文件命令行
  • Web Demo - 浏览器体验
  • Desktop App - 图形界面

Layer 2: Core Engine（独立核心）
  • 自然语言理解
  • 代码生成
  • 模板系统
  • 0依赖，离线可用

Layer 3: Ecosystem（可选插件）
  • OpenClaw Skill 兼容
  • 社区插件支持
  • 但不依赖运行
```

**Key Principles**:
1. **独立核心** - 0依赖，单 binary，开箱即用
2. **插件兼容** - 支持 OpenClaw，但不绑定
3. **在线体验** - 浏览器试用，降低门槛
4. **渐进增强** - 基础独立，高级可选

**Delivery Options**:
- Single Binary（推荐）：`diy-cli create "记账工具"`
- Desktop App：双击运行，图形界面
- Web Demo：浏览器打开，零安装
- OpenClaw Skill：插件形式，拥抱社区

**Advantages**:
- 独立性：不绑定平台，用户完全拥有
- 生态兼容：拥抱 OpenClaw 获得流量
- 渐进体验：从 Web 到 Binary 到 Desktop
- 长期可用：即使 OpenClaw 消失，核心仍可用

---

## Follow-up Impact

- Created [[standalone-core-plugin-extension]] concept card
- Designed three-layer architecture
- Clarified "independent but compatible" strategy
- Defined multiple delivery forms
- Established implementation phases
