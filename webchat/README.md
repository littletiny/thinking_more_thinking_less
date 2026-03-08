# Zettel WebChat

为 Zettel 知识库提供的 Web 聊天界面，自动结构化保存所有聊天记录。

## 设计目标

- **解放推理引擎**：模型只负责推理，保存完全透明
- **多 Session 并行**：支持同时开多个对话
- **零迁移成本**：直接写入 `conversations/` 目录，兼容现有格式
- **预留扩展**：Session 抽象层支持未来 attach 到 kimi-cli 的 session

## 快速开始

```bash
cd webchat

# 安装依赖
pip install flask flask-cors agent-client-protocol

# 启动（需要 kimi-cli 已安装）
python server.py

# 或使用 mock 模式（无需 kimi）
MOCK_MODE=true python server.py
```

访问 http://localhost:5000

## 技术栈

- **Backend**: Flask + SSE (Server-Sent Events)
- **Frontend**: Vanilla JS, 响应式布局
- **AI**: kimi-cli ACP 协议

## Session 类型

| 类型 | 创建 | 关闭 | 说明 |
|------|------|------|------|
| `web` | Web 创建 | ✅ 可关闭 | 当前实现 |
| `attachable` | CLI 创建 | ❌ 不可关闭 | 预留，未来实现 |

## API

| Endpoint | Method | 说明 |
|----------|--------|------|
| `/api/sessions` | GET | 列出 sessions |
| `/api/sessions` | POST | 创建新 session |
| `/api/sessions/<id>/chat` | POST | 发送消息，SSE 流式返回 |
| `/api/sessions/<id>/close` | POST | 关闭 session（仅 web 类型） |
| `/api/sessions/<id>/title` | PUT | 修改标题 |

## 文件结构

```
webchat/
├── server.py           # Flask 后端
├── sessions.json       # Session 元数据
├── static/
│   ├── index.html      # 前端页面
│   └── app.js          # 前端逻辑
└── README.md

conversations/          # 自动生成
├── {session-id}.md     # 对话记录
└── ...
```

## 移动端

支持响应式布局，移动端自动切换为抽屉式侧边栏。

## 未来扩展

- [ ] AttachableSession：attach 到已有 kimi-cli session
- [ ] Session 搜索
- [ ] 标题自动生成
- [ ] 图片/文件上传
