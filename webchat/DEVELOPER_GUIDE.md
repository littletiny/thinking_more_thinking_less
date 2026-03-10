# WebChat 开发导航文档

## 一、项目架构总览

```
webchat/
├── core/                       # 后端 Flask 核心模块
│   ├── config.py              # 全局配置、常量
│   ├── models.py              # 数据模型 (SessionMeta, ToolCallInfo等)
│   ├── async_runner.py        # SessionAsyncRunner - 异步执行器
│   ├── sessions.py            # Session 抽象和实现 (BaseSession, WebSession)
│   ├── acp_client.py          # SimpleACPClient - ACP 协议客户端
│   ├── session_manager.py     # SessionManager - 会话管理器
│   ├── message_parser.py      # 消息解析器
│   └── routes/                # API 路由蓝图
│       ├── sessions.py        # 会话 CRUD
│       ├── chat.py            # /chat SSE 端点
│       ├── messages.py        # /messages 历史记录
│       └── ...
├── static/
│   ├── js/                    # 前端 ES Modules
│   │   ├── state.js           # 全局状态定义
│   │   ├── api.js             # API 封装
│   │   ├── chat/              # 聊天相关模块
│   │   │   ├── index.js       # 聊天核心 (sendMessage, streamChat)
│   │   │   ├── streaming.js   # 流式消息处理
│   │   │   ├── tools.js       # 工具调用显示
│   │   │   ├── blocks.js      # 消息块渲染
│   │   │   └── renderer.js    # 消息渲染
│   │   ├── sessions/          # 会话管理
│   │   ├── ui/                # UI 组件
│   │   └── utils/             # 工具函数
│   └── css/                   # 样式模块
└── server.py                  # 入口文件 (24行)
```

---

## 二、关键函数导航

### 后端核心函数

| 模块 | 函数/类 | 职责 |
|------|---------|------|
| `session_manager.py` | `SessionManager` | 会话生命周期管理、元数据持久化 |
| `sessions.py` | `WebSession.send_message_sync()` | 同步发送消息，管理 ACP 连接 |
| `sessions.py` | `WebSession._send_message_async()` | 异步消息发送，处理 SSE 流 |
| `acp_client.py` | `SimpleACPClient.session_update()` | 处理 ACP 事件 (thinking, tool_call) |
| `async_runner.py` | `SessionAsyncRunner.run_sync()` | 在专用线程的事件循环中执行异步代码 |
| `routes/chat.py` | `chat()` | SSE 端点，协调消息发送和流式响应 |

### 前端核心函数

| 模块 | 函数 | 职责 |
|------|------|------|
| `chat/index.js` | `sendMessage()` | 发送消息入口，构建请求 |
| `chat/index.js` | `streamChat()` | SSE 连接管理，流式数据解析 |
| `chat/streaming.js` | `updateStreamingBlocks()` | 更新流式消息 DOM |
| `chat/streaming.js` | `appendStreamingChunk()` | 追加消息块 |
| `chat/tools.js` | `handleEvent()` | 处理 tool_call/tool_result 事件 |
| `chat/blocks.js` | `renderThinkingBlock()` | 渲染 thinking 块 |
| `chat/blocks.js` | `renderToolsBlock()` | 渲染工具调用标签 |
| `sessions/manager.js` | `selectSession()` | 切换会话，加载历史 |
| `state.js` | `setXxx()` | 状态 setter，需配合重新渲染 |

---

## 三、核心机制详解

### 3.1 流式消息状态机

流式消息处理是最复杂的状态机，涉及多个状态和转换：

```
┌─────────────┐
│   IDLE      │ 初始状态，等待用户发送消息
└──────┬──────┘
       │ sendMessage()
       ▼
┌─────────────┐
│ STREAMING   │ 正在接收 SSE 流数据
│ - thinking  │ - 接收 thinking chunk
│ - tools     │ - 接收 tool_call 事件
│ - output    │ - 接收 output chunk
└──────┬──────┘
       │ 收到 done/error
       ▼
┌─────────────┐
│ FINALIZED   │ 消息完成，DOM 转为最终状态
└─────────────┘
```

**关键数据结构 - streamingBlocks:**
```javascript
streamingBlocks = [
    { type: 'thinking', content: '...' },  // 思考内容
    { type: 'tools', content: [...] },     // 工具调用数组
    { type: 'output', content: '...' }     // 输出内容
]
currentBlockType = 'thinking' | 'output' | null
```

**状态转换规则:**

| 当前状态 | 事件 | 动作 | 下一状态 |
|----------|------|------|----------|
| IDLE | sendMessage() | 清空 blocks, 添加 placeholder | STREAMING |
| STREAMING | `type: 'thinking'` | appendStreamingChunk(chunk, 'thinking') | STREAMING |
| STREAMING | `type: 'event'` (tool_call) | handleEvent() → updateToolsBlock() | STREAMING |
| STREAMING | `type: 'chunk'` | appendStreamingChunk(chunk, 'output') | STREAMING |
| STREAMING | `type: 'done'` | finalizeStreamingMessage() | FINALIZED |
| STREAMING | `type: 'error'` | append error + finalize | FINALIZED |
| FINALIZED | - | - | IDLE (下次发送时) |

**⚠️ Bug 高发区:**

1. **块类型切换问题**: 当从 thinking 切换到 output 时，`currentBlockType` 必须正确更新，否则内容会追加到错误的块。

2. **DOM 容器查找**: `updateStreamingBlocks()` 尝试查找两种容器:
   - `.streaming-blocks` (流式中)
   - `.content` (已 finalize)
   如果查找逻辑出错，会导致内容渲染到错误位置。

3. **并发问题**: 如果在 streaming 过程中快速切换会话，`eventSource` 可能未正确关闭。

### 3.2 工具调用状态机

```
┌─────────────┐
│   EMPTY     │ 没有工具调用
└──────┬──────┘
       │ 收到 tool_call 事件
       ▼
┌─────────────┐
│  RUNNING    │ 工具正在执行
│ (参数累积)  │ arguments 字段会逐步更新
└──────┬──────┘
       │ 收到 tool_result 事件
       ▼
┌─────────────┐
│ COMPLETED   │ 工具执行完成
│ / FAILED    │
└─────────────┘
```

**关键代码位置**: `chat/tools.js`

```javascript
// toolCalls 数组结构
toolCalls = [
    {
        id: 'tc_xxx',
        name: 'shell',
        arguments: '{"command": "ls"}',  // 会逐步累积
        status: 'running',              // running | completed | failed
        result: null                    // 完成后填充
    }
]
```

**⚠️ Bug 高发区:**

1. **参数累积**: ToolCallStart 只包含部分参数，ToolCallProgress 会逐步发送完整参数。必须用长度比较来更新：
   ```javascript
   if (event.data.arguments.length > tc.arguments.length) {
       tc.arguments = event.data.arguments;
   }
   ```

2. **去重逻辑**: `renderToolsBlock()` 中使用 Set 去重，确保同一 tool_call_id 只显示最新状态。

### 3.3 Session 生命周期

```
┌───────────────┐
│   created     │ 创建但未激活
└───────┬───────┘
        │ 首次访问
        ▼
┌───────────────┐
│   active      │ 正常状态
│ (ACP connected)│
└───────┬───────┘
        │ 关闭 / 归档
        ▼
┌───────────────┐     ┌───────────────┐
│   closed      │     │  archived     │
│  (不可再聊)   │     │  (可恢复)     │
└───────────────┘     └───────────────┘
```

**⚠️ Bug 高发区:**

1. **ACP 连接恢复**: WebSession 支持通过 `acp_session_id` 恢复连接。如果恢复失败，会自动创建新 session，但 metadata 中的 `acp_session_id` 需要同步更新。

2. **跨线程事件循环**: `SessionAsyncRunner` 为每个 session 维护独立的事件循环线程。`run_sync()` 方法使用 `asyncio.run_coroutine_threadsafe()` 在线程间安全调度。

### 3.4 消息块渲染流程

```
原始消息内容
     │
     ▼
parseContentToBlocks() ──► thinking/output blocks 数组
     │
     ▼
renderMessageContent() ──► HTML 字符串
     │
     ▼
updateStreamingBlocks() ──► DOM 更新
```

**块类型识别规则:**
```javascript
// <think>...</think> 标签识别
const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
// 标签内内容 → thinking block
// 标签外内容 → output block
```

---

## 四、模块依赖关系

### 前端模块依赖图

```
app.js (入口)
    ├── config.js (常量)
    ├── state.js (状态)
    ├── api.js (网络)
    ├── utils/
    │   ├── helpers.js
    │   └── markdown.js
    ├── ui/
    │   ├── components.js
    │   ├── sidebar.js
    │   └── ...
    ├── sessions/
    │   ├── manager.js ──┐
    │   └── renderer.js ◄┘
    └── chat/
        ├── index.js ───────┐
        ├── streaming.js ◄──┤ (循环依赖已解耦)
        ├── tools.js ───────┤
        ├── blocks.js ◄─────┘
        ├── renderer.js
        └── images.js
```

**循环依赖解决方案:**
- `streaming.js` 和 `tools.js` 之间的循环依赖通过事件机制解耦
- `tools.js` 触发 `tools-updated` 事件
- `streaming.js` 监听该事件调用 `updateStreamingBlocks()`

---

## 五、调试指南

### 5.1 常见问题排查

**问题1: 历史记录不显示**
- 检查 Network: `/api/sessions/{id}/messages` 是否返回数据
- 检查 Console: `loadConversation` 是否被调用
- 检查 `renderMessages` 是否被调用且传入正确数据

**问题2: 流式消息不显示**
- 检查 `isStreaming` 状态是否正确
- 检查 `streamingBlocks` 是否被正确更新
- 检查 DOM 选择器 `.message.assistant:last-child` 是否找到元素

**问题3: 工具调用不显示**
- 检查 `hideToolsCalls` 是否为 false
- 检查 `handleEvent` 是否正确接收 tool_call 事件
- 检查 `updateToolsBlock` 是否正确更新 blocks

**问题4: 切换会话后消息错乱**
- 检查切换时是否清空 `streamingBlocks` 和 `toolCalls`
- 检查 `eventSource` 是否正确关闭

### 5.2 关键日志点

```javascript
// state.js 状态变化
console.log('[renderMessages] Rendering', messages.length, 'messages');
console.log('[loadConversation] Loaded', messages.length, 'messages');
console.log('[parseContentToBlocks] Input length:', content?.length, 'Output blocks:', result.length);

// streaming.js
console.log('[updateStreamingBlocks] isFinalized:', isFinalized, 'blocks:', streamingBlocks.length);

// tools.js
console.log('[renderToolsBlock] Called, hideToolsCalls:', hideToolsCalls, 'toolCalls:', toolCalls?.length);
```

### 5.3 浏览器调试技巧

```javascript
// 在控制台查看全局状态
> state.currentSession
> state.sessions
> state.isStreaming
> state.streamingBlocks
> state.toolCalls

// 手动触发动作
> loadConversation(state.currentSession)
> renderMessages([...])
```

---

## 六、新增功能开发指南

### 6.1 添加新的状态

1. 在 `state.js` 定义状态和 setter:
```javascript
export let newFeatureState = initialValue;
export function setNewFeatureState(value) { newFeatureState = value; }
```

2. 在需要使用的模块导入:
```javascript
import { newFeatureState, setNewFeatureState } from '../state.js';
```

### 6.2 添加新的消息块类型

1. 在 `blocks.js` 添加渲染函数:
```javascript
export function renderNewBlock(content) {
    return `<div class="new-block">${content}</div>`;
}
```

2. 在 `streaming.js` 的 `updateStreamingBlocks` 中添加类型处理:
```javascript
if (block.type === 'new_type') {
    return renderNewBlock(block.content);
}
```

3. 在 `parseContentToBlocks` 中添加解析逻辑

### 6.3 添加新的 ACP 事件处理

1. 在 `chat/tools.js` 的 `handleEvent` 中添加 case:
```javascript
case 'new_event_type':
    // 处理逻辑
    break;
```

---

## 七、性能优化提示

1. **避免频繁 DOM 操作**: `updateStreamingBlocks` 每次重建整个 HTML，考虑使用虚拟 DOM 或增量更新

2. **防抖加载**: 快速切换会话时，延迟加载历史记录避免闪烁

3. **图片懒加载**: 粘贴的图片使用 data URL，大量图片时考虑延迟加载

4. **消息分页**: 历史记录多时，考虑分页或虚拟滚动

---

## 八、安全注意事项

1. **XSS 防护**: 
   - 所有用户输入内容必须通过 `escapeHtml()` 转义
   - `renderMarkdown` 输出使用 `innerHTML`，确保 markdown 解析器安全

2. **数据验证**:
   - 后端 API 需验证 session_id 存在性
   - 文件路径操作使用 `Path` 避免目录遍历

3. **资源限制**:
   - SSE 连接设置超时
   - 图片粘贴限制大小
