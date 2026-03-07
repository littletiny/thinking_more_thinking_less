# Connection: Scaffold, Not Platform × Standalone Core + Plugin Extension

## Relationship

**Standalone Core + Plugin Extension 是 Scaffold, Not Platform 的技术实现架构。**

- **Scaffold, Not Platform**: 产品定位——不做平台，做独立脚手架
- **Standalone Core + Plugin Extension**: 技术实现——独立核心 + 社区兼容

两者结合：以独立工具形式存在，但拥抱社区生态。

---

## From Philosophy to Implementation

### 理念层

```
Scaffold, Not Platform:
- 不追求商业成功
- 追求 AI 普惠
- 给个体能力，而非提供服务
- 独立、免费、开源
```

### 实现层

```
Standalone Core + Plugin Extension:
- 核心 0 依赖（独立）
- 单 binary（简单）
- 开源免费（普惠）
- 兼容 OpenClaw（拥抱社区）
```

---

## Architecture Alignment

### 为什么这个架构符合脚手架理念

| 理念 | 架构实现 |
|------|---------|
| **独立** | 核心 0 依赖，单 binary |
| **简单** | Web Demo 零门槛，CLI 单命令 |
| **普惠** | 开源免费，多形式交付 |
| **拥抱社区** | OpenClaw 兼容，但不绑定 |
| **长期可用** | 即使 OpenClaw 消失，核心仍可用 |

---

## User Journey Alignment

### 脚手架的目标用户

```
每个人（不会编程的普通人）
    ↓
诉求：自动化工具
    ↓
门槛：
- 平台太复杂（Dify/n8n）
- 编程太难
- 现成 APP 不够灵活
```

### 架构如何服务这个目标

```
Web Demo（最低门槛）：
- 浏览器打开
- 零安装
- 看见即所得
- 适合第一次体验

Binary CLI（轻量级）：
- 下载单文件
- 命令行输入
- 生成本地工具
- 适合轻度用户

Desktop App（完整体验）：
- 双击运行
- 图形界面
- 最佳用户体验
- 适合普通用户

OpenClaw Skill（社区）：
- 插件形式
- 生态集成
- 获得流量
- 适合社区用户
```

---

## Key Insight

> **Standalone Core + Plugin Extension 架构完美实现了"脚手架"的定位——独立存在，但开放连接。**

```
不是：
中心化平台（用户依赖我）

而是：
分散式工具（用户拥有，我赋能）

但：
兼容社区（拥抱 OpenClaw 生态）

结果：
- 用户完全独立
- 社区获得价值
- 长期可持续
```

---

## Related

- Concepts: [[scaffold-not-platform]], [[standalone-core-plugin-extension]]
- Also related: [[everyones-automation-need]] - 目标用户
- Source: [standalone-core-plugin-origin](../conversations/2026-03-08-standalone-core-plugin.md)
