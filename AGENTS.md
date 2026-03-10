# DIY Development Agents.md

---

## 核心原则

- 当前项目使用 ACP 连接 kimi-cli
- 技能栈越简单越好

---

## WebChat 项目

WebChat 是 Zettel 知识库的 Web 聊天界面，通过 ACP 协议连接 kimi-cli。

### 快速启动

```bash
cd webchat
python server.py
```

访问 http://localhost:5000

### 参考文档

| 文档 | 内容 |
|------|------|
| [`webchat/README.md`](webchat/README.md) | 项目说明、功能特性、使用指南 |
| [`webchat/DEVELOPER_GUIDE.md`](webchat/DEVELOPER_GUIDE.md) | 架构详解、状态机、调试指南 |
| [`webchat/HISTORY.md`](webchat/HISTORY.md) | 开发历史、变更记录 |

---

## MockCraft 子项目

基于自然语言的需求验证与原型生成系统。

### 参考文档

| 类型 | 文档 | 内容 |
|------|------|------|
| **入口** | [`docs/00-meta/project-index.md`](docs/00-meta/project-index.md) | 项目总索引、快速导航 |
| **过程** | [`docs/00-meta/task-status-board.md`](docs/00-meta/task-status-board.md) | 开发进度、任务状态 |
| **过程** | [`docs/00-meta/decision-log.md`](docs/00-meta/decision-log.md) | ADR 决策记录 |
| **需求** | [`docs/requirements/mockcraft-requirements.md`](docs/requirements/mockcraft-requirements.md) | 功能需求规格 |
| **探索** | [`docs/exploration/mockcraft-exploration.md`](docs/exploration/mockcraft-exploration.md) | 需求探索过程 |
| **设计** | [`docs/design/mockcraft-design.md`](docs/design/mockcraft-design.md) | 系统架构设计 |
| **设计** | [`docs/design/mockcraft-constraints.md`](docs/design/mockcraft-constraints.md) | 技术约束 |

---

## kimi-cli 子项目

kimi-cli 源代码，Zettel 通过 ACP 协议连接的核心组件。

### 参考文档

| 文档 | 内容 |
|------|------|
| [`kimi-cli/README.md`](kimi-cli/README.md) | 项目说明、安装指南、基本用法 |
| [`kimi-cli/AGENTS.md`](kimi-cli/AGENTS.md) | 开发规范、架构说明 |
| [`kimi-cli/CHANGELOG.md`](kimi-cli/CHANGELOG.md) | 版本变更记录 |
| [`kimi-cli/CONTRIBUTING.md`](kimi-cli/CONTRIBUTING.md) | 贡献指南 |

---
