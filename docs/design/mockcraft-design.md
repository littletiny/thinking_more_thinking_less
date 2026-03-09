# MockCraft 设计文档

> 版本: 0.1.0
> 日期: 2026-03-09
> 状态: 设计中

---

## 1. 系统架构

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      WebChat Frontend                        │
│  ┌──────────────┐  ┌──────────────────────────────────────┐ │
│  │ Chat Panel   │  │ MockCraft Panel                      │ │
│  │              │  │  ┌──────────────┐  ┌──────────────┐  │ │
│  │  - Messages  │  │  │ HTML List    │  │ Preview      │  │ │
│  │  - Input     │  │  │              │  │ (iframe)     │  │ │
│  │              │  │  │  - Items     │  │              │  │ │
│  │              │  │  │  - States    │  │  - Render    │  │ │
│  │              │  │  │  - Actions   │  │  - Interact  │  │ │
│  └──────────────┘  │  └──────────────┘  └──────────────┘  │ │
│                    └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Flask Backend                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Session Mgmt │  │ MockCraft    │  │ LLM Integration  │  │
│  │ (existing)   │  │ API          │  │ (existing)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      File System                             │
│  webchat/mockcraft/                                          │
│  ├── prototypes/           # HTML原型文件                     │
│  │   ├── pr-xxx-v1.html                                    │
│  │   └── pr-xxx-v2.html                                    │
│  └── index.json            # 原型索引                        │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心组件

| 组件 | 职责 | 文件位置 |
|------|------|----------|
| MockCraftManager | 管理原型生命周期 | server.py (新类) |
| PrototypeStore | 文件存储操作 | server.py (新类) |
| InteractionEngine | 模拟交互逻辑 | app.js (新模块) |
| HTMLListUI | 原型列表渲染 | app.js (新模块) |
| PreviewPanel | 预览面板控制 | app.js (扩展现有) |

---

## 2. 数据模型

### 2.1 Prototype (原型)

```python
@dataclass
class Prototype:
    id: str              # 唯一ID (pr-{uuid})
    name: str            # 显示名称
    html_content: str    # HTML内容
    session_id: str      # 关联的chat session
    created_at: str      # ISO时间
    updated_at: str      # ISO时间
    version: int         # 版本号
    interactions: List[Interaction]  # 交互定义
    state_schema: dict   # 状态变量schema
```

### 2.2 Interaction (交互定义)

```python
@dataclass
class Interaction:
    id: str              # 交互ID
    name: str            # 显示名称
    type: str            # click | input | select
    selector: str        # CSS选择器
    action: str          # 执行动作
    target_state: dict   # 目标状态变更
```

### 2.3 存储格式 (index.json)

```json
{
  "prototypes": [
    {
      "id": "pr-abc123",
      "name": "客户跟进系统",
      "session_id": "sess-xyz789",
      "created_at": "2026-03-09T10:00:00",
      "updated_at": "2026-03-09T10:30:00",
      "version": 2,
      "file": "pr-abc123-v2.html",
      "interactions_count": 5,
      "state_variables": ["filter_status", "sort_by"]
    }
  ]
}
```

---

## 3. API设计

### 3.1 原型管理API

| Endpoint | Method | 说明 |
|----------|--------|------|
| `/api/mockcraft/prototypes` | GET | 获取原型列表 |
| `/api/mockcraft/prototypes` | POST | 创建新原型 |
| `/api/mockcraft/prototypes/<id>` | GET | 获取原型详情 |
| `/api/mockcraft/prototypes/<id>` | PUT | 更新原型 |
| `/api/mockcraft/prototypes/<id>` | DELETE | 删除原型 |
| `/api/mockcraft/prototypes/<id>/fork` | POST | 创建新版本 |

### 3.2 交互模拟API

| Endpoint | Method | 说明 |
|----------|--------|------|
| `/api/mockcraft/prototypes/<id>/state` | GET | 获取当前状态 |
| `/api/mockcraft/prototypes/<id>/state` | POST | 更新状态 |
| `/api/mockcraft/prototypes/<id>/interactions` | GET | 获取交互列表 |
| `/api/mockcraft/prototypes/<id>/render` | POST | 渲染带状态的HTML |

### 3.3 请求/响应示例

**创建原型:**
```http
POST /api/mockcraft/prototypes
Content-Type: application/json

{
  "name": "客户跟进系统",
  "html_content": "<html>...</html>",
  "session_id": "sess-xyz789",
  "interactions": [
    {
      "name": "筛选状态",
      "type": "select",
      "selector": "#status-filter",
      "target_state": {"filter_status": "${value}"}
    }
  ],
  "state_schema": {
    "filter_status": {"type": "string", "default": "all"},
    "sort_by": {"type": "string", "default": "date"}
  }
}
```

**渲染原型:**
```http
POST /api/mockcraft/prototypes/pr-abc123/render
Content-Type: application/json

{
  "state": {
    "filter_status": "active",
    "sort_by": "name"
  }
}

Response:
{
  "html": "<html>...渲染后的HTML...</html>",
  "state_applied": ["filter_status", "sort_by"]
}
```

---

## 4. UI设计

### 4.1 MockCraft面板布局

```
┌─────────────────────────────────────┐
│ MockCraft                    [⚙️] │  ← Header
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 📄 原型列表                        │ │
│ │ ┌───────────────────────────┐   │ │
│ │ │ ● 客户跟进系统 (v2)        │   │ │  ← Active
│ │ │   2分钟前 | 5个交互        │   │ │
│ │ └───────────────────────────┘   │ │
│ │ ┌───────────────────────────┐   │ │
│ │ │ ○ 待办清单 (v1)            │   │ │  ← Inactive
│ │ │   1小时前 | 3个交互        │   │ │
│ │ └───────────────────────────┘   │ │
│ │ [+ 新建原型]                     │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 👁️ 预览                          │ │
│ │ ┌───────────────────────────┐   │ │
│ │ │                           │   │ │
│ │ │    (iframe渲染)            │   │ │
│ │ │                           │   │ │
│ │ └───────────────────────────┘   │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🎮 交互控制                      │ │
│ │ 状态: filter_status = [active ▼] │ │
│ │       sort_by = [date ▼]         │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 4.2 原型列表项

每个列表项显示:
- 原型名称 (加粗)
- 版本号 (标签)
- 创建/更新时间
- 交互数量
- 操作按钮 (编辑、删除、fork)

### 4.3 交互控制面板

根据state_schema自动生成:
- 字符串 → 文本输入框
- 枚举 → 下拉选择
- 布尔 → 开关

---

## 5. 状态管理

### 5.1 状态替换机制

HTML模板中使用占位符:
```html
<div class="filter-status" data-state="filter_status">
  当前筛选: {{filter_status}}
</div>
```

渲染时替换:
```python
def render_with_state(html: str, state: dict) -> str:
    for key, value in state.items():
        html = html.replace(f"{{{{{key}}}}}", str(value))
    return html
```

### 5.2 交互触发

iframe内的交互通过postMessage与父页面通信:
```javascript
// iframe内部
document.querySelector('#filter').addEventListener('change', (e) => {
  parent.postMessage({
    type: 'state_change',
    source: 'mockcraft-preview',
    data: { filter_status: e.target.value }
  }, '*');
});
```

---

## 6. 与Chat集成

### 6.1 从Chat创建原型

用户消息触发:
```
用户: "帮我生成一个客户跟进系统的原型"
AI: "正在生成原型..." [生成HTML]
AI: "已创建原型 [客户跟进系统]" [显示卡片]
```

### 6.2 原型卡片消息

特殊消息类型显示原型卡片:
```javascript
{
  type: 'prototype_card',
  prototype_id: 'pr-abc123',
  name: '客户跟进系统',
  preview_url: '/api/mockcraft/prototypes/pr-abc123/preview'
}
```

### 6.3 迭代更新

用户可以继续对话修改:
```
用户: "加上按状态筛选功能"
AI: "已更新原型 [客户跟进系统 v2]" [显示新版本]
```

---

## 7. 文件结构

```
webchat/
├── server.py                    # 扩展MockCraft API
├── mockcraft/                   # NEW
│   ├── __init__.py
│   ├── manager.py              # MockCraftManager
│   ├── store.py                # PrototypeStore
│   ├── models.py               # 数据模型
│   └── templates/              # HTML模板
│       └── prototype-base.html
├── prototypes/                 # 原型文件存储
│   ├── pr-abc123-v1.html
│   └── pr-abc123-v2.html
├── static/
│   ├── index.html              # 添加MockCraft UI
│   └── app.js                  # 添加MockCraft模块
└── mockcraft_index.json        # 原型索引
```

---

## 8. 实现计划

### Phase 1: 基础框架
1. 创建文件结构和数据模型
2. 实现PrototypeStore
3. 添加基础API端点

### Phase 2: UI集成
1. 添加MockCraft面板到HTML
2. 实现HTML列表组件
3. 实现预览iframe

### Phase 3: 交互模拟
1. 实现状态管理
2. 实现交互控制面板
3. 添加postMessage通信

### Phase 4: Chat集成
1. 实现从Chat创建原型
2. 添加原型卡片消息
3. 支持迭代更新

---

*基于DDDW Step 2创建*
