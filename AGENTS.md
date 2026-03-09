# DIY Development Agents.md

---

## 核心原则
- 当前项目使用acp连接kimi-cli
- 技能栈越加简单越好

---

## WebChat 项目导航

### 项目概述

WebChat 是 Zettel 知识库的 Web 聊天界面，通过 ACP 协议连接 kimi-cli，自动结构化保存聊天记录。

**设计目标**：
- 解放推理引擎：模型只负责推理，保存完全透明
- 多 Session 并行：支持同时开多个对话
- 零迁移成本：直接写入 conversations/ 目录

### 目录结构

```
webchat/
├── server.py              # Flask 后端 (核心)
├── sessions.json          # Session 元数据
├── format_utils.py        # 格式化工具
├── task_scheduler.py      # 任务调度器
├── static/
│   ├── index.html         # 前端页面
│   └── app.js             # 前端逻辑
├── mock_data/             # Mock 模式数据
│   ├── conversations/     # 模拟对话记录
│   └── sessions.json
├── README.md              # 项目说明
├── AGENTS.md              # 本文件
├── HISTORY.md             # 开发历史
└── FORMATTING.md          # 格式化规范
```

### 核心文件导航

| 文件 | 职责 | 关键类/函数 |
|------|------|------------|
| `server.py` | Flask 后端、ACP 通信 | `WebSession`, `SessionAsyncRunner`, `SimpleACPClient` |
| `static/app.js` | 前端逻辑 | SSE 流式接收、消息渲染 |
| `format_utils.py` | 响应格式化 | `parse_and_format_response()` |
| `task_scheduler.py` | 后台任务调度 | `TaskScheduler` |

### 启动方式

```bash
cd webchat

# 正常模式 (需要 kimi-cli)
python server.py

# Mock 模式 (无需 kimi，用于前端开发)
MOCK_MODE=true python server.py

# YOLO 模式 (自动批准所有权限请求，默认开启)
YOLO_MODE=true python server.py
```

访问 http://localhost:5000

### API 端点

| Endpoint | Method | 说明 |
|----------|--------|------|
| `/api/sessions` | GET | 列出 sessions |
| `/api/sessions` | POST | 创建新 session |
| `/api/sessions/<id>/chat` | POST | 发送消息，SSE 流式返回 |
| `/api/sessions/<id>/close` | POST | 关闭 session |
| `/api/sessions/<id>/title` | PUT | 修改标题 |

### Session 类型

| 类型 | 创建 | 关闭 | 说明 |
|------|------|------|------|
| `web` | Web 创建 | ✅ 可关闭 | 当前实现 |
| `attachable` | CLI 创建 | ❌ 不可关闭 | 预留，未来实现 |

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `MOCK_MODE` | 模拟模式，不连接 ACP | `false` |
| `YOLO_MODE` | 自动批准所有权限请求 | `true` |

---
