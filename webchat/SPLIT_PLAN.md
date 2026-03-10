# WebChat 文件拆分计划

## 项目背景

当前 WebChat 项目有三个大文件需要拆分：
- `server.py` (2110 行) - 后端 Flask 服务
- `static/app.js` (2142 行) - 前端 JS
- `static/index.html` (2593 行) - 包含大量内联 CSS

## 拆分目标

按职责分离代码，使每个文件只负责单一功能，提高可维护性。

---

## 任务 A：CSS 拆分 (static/index.html)

### 目标
将 `index.html` 中的内联 CSS 抽出到独立文件。

### 输出文件结构
```
webchat/static/css/
├── base.css              # CSS 变量、重置样式
├── layout.css            # 整体布局 (sidebar, main-container)
├── sidebar.css           # 会话列表样式
├── chat.css              # 聊天区域样式
├── components.css        # 按钮、输入框、弹窗等通用组件
├── messages.css          # 消息气泡、思考块、工具标签
├── split-panel.css       # 分屏/MockCraft 面板
├── responsive.css        # 移动端适配
└── theme.css             # 主题相关样式
```

### 拆分原则
1. 按视觉模块拆分，不是按选择器数量
2. 保留 CSS 变量在 base.css
3. media query 集中到 responsive.css
4. 原有类名、ID 全部保留，不改任何选择器

### 入口文件修改
`index.html` 中移除 `<style>` 标签，改为：
```html
<link rel="stylesheet" href="/static/css/base.css">
<link rel="stylesheet" href="/static/css/layout.css">
<!-- ... 其他 css -->
```

---

## 任务 B：后端拆分 (server.py)

### 目标
将 `server.py` 按功能拆分到 `core/` 目录。

### 输出文件结构
```
webchat/core/
├── __init__.py
├── config.py             # 配置常量 (MOCK_MODE, DATA_DIR等)
├── models.py             # 数据模型 (SessionMeta, ToolCallInfo, StepInfo)
├── async_runner.py       # SessionAsyncRunner 类
├── sessions.py           # BaseSession, WebSession, AttachableSession
├── acp_client.py         # SimpleACPClient 类
├── session_manager.py    # SessionManager 类
├── message_parser.py     # parse_conversation_messages, _parse_message_content
└── routes/
    ├── __init__.py       # 注册所有蓝图
    ├── sessions.py       # 会话 CRUD 路由
    ├── chat.py           # /chat SSE 路由
    ├── tools.py          # /tools/* 路由
    ├── export.py         # /export 路由
    ├── messages.py       # /messages 路由
    └── mockcraft.py      # /mockcraft/* 路由
```

### server.py 保留内容
```python
from flask import Flask
from flask_cors import CORS
from core import create_app  # 或类似工厂函数

app = create_app()

if __name__ == "__main__":
    # 启动逻辑
```

### 关键迁移注意事项
1. **SessionAsyncRunner** → `async_runner.py`
2. **BaseSession/WebSession/AttachableSession** → `sessions.py`
3. **SimpleACPClient** → `acp_client.py` (带 ToolCallInfo, StepInfo)
4. **SessionManager** → `session_manager.py`
5. **所有 @app.route** → 相应蓝图文件
6. **全局变量** (session_manager, mockcraft_manager) → 通过 create_app() 管理

---

## 任务 C：前端 JS 拆分 (static/app.js)

### 目标
将 `app.js` 按功能拆分到 `js/` 目录，使用 ES Module。

### 输出文件结构
```
webchat/static/js/
├── config.js             # API_BASE, CODE_THEMES
├── state.js              # 全局状态变量
├── api.js                # API 封装函数
├── utils/
│   ├── helpers.js        # escapeHtml, scrollToBottom, escapeForDataAttr
│   └── markdown.js       # renderMarkdown, applySyntaxHighlight
├── ui/
│   ├── components.js     # showToast, showConfirm, 弹窗逻辑
│   ├── sidebar.js        # 侧边栏渲染、折叠
│   ├── session-menu.js   # 会话菜单交互
│   └── theme.js          # 主题切换
├── sessions/
│   ├── manager.js        # loadSessions, createSession, closeSession等
│   └── renderer.js       # renderSessionList, renderSessionGroup
├── chat/
│   ├── index.js          # sendMessage, streamChat
│   ├── renderer.js       # renderMessages, addMessage, parseContentToBlocks
│   ├── streaming.js      # streamingBlocks 处理, finalizeStreamingMessage
│   ├── tools.js          # handleEvent, updateToolsBlock, renderToolsBlock
│   └── images.js         # 粘贴图片处理
├── split-panel.js        # 分屏功能
└── app.js                # 入口，导入并初始化
```

### app.js 入口格式
```javascript
import { API_BASE, CODE_THEMES } from './config.js';
import { currentSession, sessions, isStreaming } from './state.js';
import { loadSessions, createSession } from './sessions/manager.js';
// ... 其他导入

async function init() {
    // 初始化逻辑
}

init();
```

### index.html 修改
```html
<script type="module" src="/static/js/app.js"></script>
<!-- 移除原来的 <script src="app.js"> -->
```

---

## 并行执行说明

三个任务相互独立，可以并行执行：
- **任务 A (CSS)**：只修改 index.html，抽离样式
- **任务 B (后端)**：创建 core/ 目录，迁移 server.py 代码
- **任务 C (前端 JS)**：创建 js/ 目录，迁移 app.js 代码

唯一冲突点：index.html 会被 A 和 C 同时修改（引入 CSS 和修改 script tag）。
**解决方案**：各自修改自己负责的部分，最后合并。

---

## 验证清单

每个任务完成后检查：
- [ ] 原大文件行数显著减少
- [ ] 新文件能正常导入/加载
- [ ] 核心功能正常（创建会话、发送消息、流式输出）
- [ ] 没有破坏现有功能

## 禁止事项

1. 不要修改业务逻辑
2. 不要重命名已有函数/类（除非是为了避免循环导入）
3. 不要改变 API 接口
4. 不要删除原有功能
