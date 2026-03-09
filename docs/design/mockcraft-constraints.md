# MockCraft 技术约束文档

> 版本: 0.1.0
> 日期: 2026-03-09

---

## 1. Must Use (必须使用)

### 1.1 基础框架
| 组件 | 选择 | 说明 |
|------|------|------|
| 后端框架 | Flask (现有) | webchat已使用Flask，保持一致 |
| 前端框架 | Vanilla JS (现有) | 无需引入复杂前端框架 |
| 通信协议 | REST API + SSE | 与现有webchat保持一致 |

### 1.2 存储
| 类型 | 方案 | 说明 |
|------|------|------|
| Session数据 | JSON文件 | 与webchat sessions.json一致 |
| HTML原型 | 文件系统 | 存储在 `webchat/mockcraft/` 目录 |
| 历史记录 | Markdown | 与conversations保持一致 |

### 1.3 LLM集成
| 项目 | 方案 |
|------|------|
| API | 通过kimi-cli ACP协议 |
| 模型 | Kimi (默认) |
| 调用方式 | 复用webchat的WebSession |

---

## 2. Must Not Use (禁止使用)

| 禁止项 | 原因 |
|--------|------|
| 数据库 (SQLite/PostgreSQL) | 保持与现有系统一致，使用文件存储 |
| React/Vue/Angular | 避免引入构建步骤，保持简单 |
| WebSocket (用于MockCraft) | 复用现有SSE实现 |
| 外部CDN资源 | 保持离线可用 |

---

## 3. Current Gaps (当前缺口)

| 缺口 | 影响 | 解决方案 |
|------|------|----------|
| 无HTML列表管理 | 无法管理多个原型 | 实现HTML List组件 |
| 无交互模拟能力 | 只能展示静态HTML | 实现交互状态管理 |
| 无版本历史 | 无法对比原型迭代 | 在文件名中嵌入版本号 |

---

## 4. Trade-off Decisions (权衡决策)

| 能力 | 替代方案 | 决策 | 理由 |
|------|----------|------|------|
| HTML存储 | 数据库 vs 文件系统 | **文件系统** | 简单，可直接查看/编辑 |
| 原型版本 | Git版本 vs 命名版本 | **命名版本** | 无需引入Git依赖 |
| 交互模拟 | 复杂状态机 vs 简单变量替换 | **简单变量替换** | MVP阶段足够 |
| 预览方式 | iframe vs 直接插入 | **iframe** | 隔离样式，更安全 |

---

## 5. Integration Constraints (集成约束)

### 5.1 与WebChat集成
```
webchat/
├── server.py              # 扩展MockCraft API
├── sessions.json          # 扩展session类型
├── static/
│   ├── index.html         # 添加MockCraft UI
│   └── app.js             # 添加MockCraft逻辑
└── mockcraft/             # NEW: 存储HTML原型
    ├── prototypes/        # HTML文件
    └── index.json         # 原型索引
```

### 5.2 API端点约束
必须在现有Flask应用下添加：
- `/api/mockcraft/prototypes` - GET/POST
- `/api/mockcraft/prototypes/<id>` - GET/PUT/DELETE
- `/api/mockcraft/prototypes/<id>/interactions` - 交互模拟

### 5.3 UI约束
- 复用现有分屏布局
- 左侧Chat，右侧MockCraft面板
- 保持现有CSS变量和样式风格

---

## 6. Performance Constraints (性能约束)

| 指标 | 要求 |
|------|------|
| HTML生成时间 | < 10s |
| 原型列表加载 | < 500ms |
| 预览刷新 | < 1s |

---

## 7. Security Constraints (安全约束)

| 项目 | 要求 |
|------|------|
| HTML渲染 | 使用iframe sandbox |
| XSS防护 | 不直接执行用户输入的JS |
| 文件访问 | 限制在mockcraft目录内 |

---

*基于DDDW Step 1.5创建*
