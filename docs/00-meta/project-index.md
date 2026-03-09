# MockCraft Project Index

> MockCraft - 自然语言驱动的需求验证与原型生成系统

---

## 快速导航

| 文档 | 路径 | 说明 |
|------|------|------|
| 需求规格 | `docs/requirements/mockcraft-requirements.md` | 功能需求 |
| 探索文档 | `docs/exploration/mockcraft-exploration.md` | 需求探索 |
| 设计文档 | `docs/design/mockcraft-design.md` | 系统设计 |
| 约束文档 | `docs/design/mockcraft-constraints.md` | 技术约束 |
| 任务板 | `docs/00-meta/task-status-board.md` | 开发进度 |
| 会话日志 | `docs/00-meta/session-log.md` | 会话记录 |
| 决策记录 | `docs/00-meta/decision-log.md` | ADR记录 |

---

## 代码结构

```
webchat/
├── server.py                 # Flask后端 (扩展MockCraft API)
├── mockcraft/               # MockCraft核心模块
│   ├── models.py           # 数据模型
│   ├── store.py            # 存储管理
│   └── manager.py          # 业务逻辑
├── static/
│   ├── index.html          # 前端页面 (MockCraft UI)
│   └── app.js              # 前端逻辑 (MockCraft模块)
└── prototypes/             # 原型文件存储
```

---

## 关键接口

### API端点
- `GET/POST /api/mockcraft/prototypes` - 原型列表/创建
- `GET/PUT/DELETE /api/mockcraft/prototypes/<id>` - 原型操作
- `POST /api/mockcraft/prototypes/<id>/render` - 渲染原型

### 前端组件
- MockCraftPanel - 主面板
- PrototypeList - 原型列表
- PreviewFrame - 预览iframe
- InteractionControls - 交互控制

---

*最后更新: 2026-03-09*
