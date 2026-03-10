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
├── server.py              # 入口文件 (24行)
├── core/                  # 后端 Flask 核心模块
│   ├── config.py          # 全局配置、常量
│   ├── models.py          # 数据模型 (SessionMeta, ToolCallInfo等)
│   ├── async_runner.py    # SessionAsyncRunner - 异步执行器
│   ├── sessions.py        # Session 抽象和实现 (BaseSession, WebSession)
│   ├── acp_client.py      # SimpleACPClient - ACP 协议客户端
│   ├── session_manager.py # SessionManager - 会话管理器
│   ├── message_parser.py  # 消息解析器
│   └── routes/            # API 路由蓝图
│       ├── sessions.py    # 会话 CRUD
│       ├── chat.py        # /chat SSE 端点
│       ├── messages.py    # /messages 历史记录
│       └── ...
├── static/
│   ├── index.html         # 前端页面
│   ├── js/                # 前端 ES Modules
│   │   ├── app.js         # 入口模块
│   │   ├── state.js       # 全局状态
│   │   ├── api.js         # API 封装
│   │   ├── chat/          # 聊天相关模块
│   │   ├── sessions/      # 会话管理
│   │   └── ui/            # UI 组件
│   └── css/               # 样式模块
├── mock_data/             # Mock 模式数据
│   ├── conversations/     # 模拟对话记录
│   └── sessions.json
├── README.md              # 项目说明
├── DEVELOPER_GUIDE.md     # 开发导航（详细）
└── AGENTS.md              # 本文件
```

### 核心文件导航

#### 后端核心模块

| 文件 | 职责 | 关键类/函数 |
|------|------|------------|
| `core/sessions.py` | Session 实现 | `WebSession.send_message_sync()`, `_send_message_async()` |
| `core/acp_client.py` | ACP 协议客户端 | `SimpleACPClient.session_update()` |
| `core/session_manager.py` | 会话生命周期管理 | `SessionManager` |
| `core/async_runner.py` | 异步执行器 | `SessionAsyncRunner.run_sync()` |
| `core/routes/chat.py` | SSE 端点 | `chat()` |
| `server.py` | 入口文件 | Flask 应用启动 |

#### 前端核心模块

| 文件 | 职责 | 关键类/函数 |
|------|------|------------|
| `js/chat/index.js` | 发送消息入口 | `sendMessage()`, `streamChat()` |
| `js/chat/streaming.js` | 流式消息处理 | `updateStreamingBlocks()`, `appendStreamingChunk()` |
| `js/chat/tools.js` | 工具调用显示 | `handleEvent()` |
| `js/sessions/manager.js` | 会话切换 | `selectSession()` |
| `js/state.js` | 全局状态 | `setXxx()` |

> 📖 详细开发指南请参考：`webchat/DEVELOPER_GUIDE.md`
>
> 包含：流式消息状态机、工具调用状态机、Session 生命周期、模块依赖关系、调试指南等

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
