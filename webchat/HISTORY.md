# Session 历史消息机制

## 设计原则

### ACP 模式（非 Mock）

在 ACP 模式下，**kimi-acp 自动管理历史消息**，不需要 webchat 手动维护：

```
WebSession
  ├── 创建时: 初始化 ACP session (new_session)
  │              └── kimi-cli 创建 Context 并恢复历史 (context.jsonl)
  │
  ├── 第1条消息: prompt(session_id, "message1")
  │              └── kimi-cli 自动添加到历史
  │
  ├── 第2条消息: prompt(session_id, "message2")
  │              └── kimi-cli 自动读取历史，追加新消息
  │
  └── 关闭时: 清理资源
```

**关键点：**
- 同一个 `session_id` 的所有请求，kimi-acp 会自动维护对话历史
- 历史存储在 kimi-cli 的 `context.jsonl` 文件中
- WebChat 只需要保持 `session_id` 不变，无需手动传递历史

### Mock 模式

Mock 模式下，WebSession 自己维护历史：

```python
self._mock_history = [
    {"role": "user", "content": "message1"},
    {"role": "assistant", "content": "response1"},
    {"role": "user", "content": "message2"},
    # ...
]
```

## 代码实现

### WebSession 类

```python
class WebSession(BaseSession):
    def __init__(self, meta, cwd="."):
        # ...
        self._mock_history: List[dict] = []  # Mock 历史存储
        self._processing_lock = threading.Lock()  # 顺序处理锁
    
    async def _send_message_async(self, message, ...):
        if MOCK_MODE:
            # 添加到 Mock 历史
            self._mock_history.append({"role": "user", "content": message})
            # ... 生成响应 ...
            self._mock_history.append({"role": "assistant", "content": response})
        else:
            # ACP 模式：直接发送，历史由 kimi-acp 管理
            await self._conn.prompt(session_id=self._session_id, prompt=[...])
    
    def send_message_sync(self, message, ...):
        # 获取处理锁，确保顺序处理
        with self._processing_lock:
            return self._runner.run_sync(do_send)
```

### 消息流程

```
用户发送消息
    ↓
chat() API
    ↓
session.send_message_sync()
    ↓
  ┌─────────────────────────────────────────────────┐
  │ 获取 _processing_lock（阻塞等待前一个消息完成）  │
  │                                                 │
  │ SessionAsyncRunner.run_sync()                  │
  │   ↓                                             │
  │ _send_message_async()                          │
  │   ├── MOCK: 操作 _mock_history                 │
  │   └── ACP: 调用 conn.prompt()                  │
  │       └── kimi-acp 自动处理历史                │
  └─────────────────────────────────────────────────┘
    ↓
返回结果
```

## API 更新

### 获取 Session 信息

```http
GET /api/sessions/{session_id}/info

Response:
{
    "session_id": "abc123",
    "status": "active",
    "message_count": 10,
    "turn_count": 5,              // user+assistant = 1 turn
    "acp_connected": true,
    "mock_mode": false,
    "mock_history_count": null
}
```

### SSE 流（支持 Thinking）

```javascript
// 连接 SSE
const es = new EventSource(`/api/sessions/${id}/chat`);

// 处理事件
es.onmessage = (e) => {
    const data = JSON.parse(e.data);
    
    switch(data.type) {
        case 'thinking':
            // 推理内容（实时显示在折叠区域）
            appendThinking(data.content);
            break;
        case 'chunk':
            // 正式输出内容
            appendOutput(data.content);
            break;
        case 'done':
            // 完成
            if (data.has_thinking) {
                console.log('思考过程:', data.thinking);
            }
            es.close();
            break;
    }
};
```

## 顺序处理保证

### 并发请求处理

当同一个 session 收到多条并发消息时：

1. **_processing_lock** 确保消息顺序处理
2. 后到的消息会阻塞等待前一个完成
3. 这在 Mock 模式下很重要（避免历史混乱）
4. ACP 模式下也有保护作用（避免 kimi-acp 内部竞态）

### 示意图

```
时间轴 ──────────────────────────────────────────►

请求1 ──────[获取锁]────[处理中]────[释放锁]──────────────►
                 ↑                              
请求2 ───────────┴────────[等待]────[获取锁]────[处理]───►
                                          ↑
请求3 ────────────────────────────────────┴──[等待]─────►
```

## 故障恢复

### ACP 连接断开检测

```python
def _is_acp_alive(self) -> bool:
    """检查 ACP 连接是否存活"""
    if self._process.poll() is not None:
        logger.warning("ACP process exited")
        return False
    return True
```

### 自动重连

```python
async def _initialize(self):
    if self._initialized and self._is_acp_alive():
        return  # 正常，直接返回
    
    if self._initialized and not self._is_acp_alive():
        # 断开了，清理旧资源
        await self._cleanup_acp()
    
    # 重新初始化（会丢失历史！）
    # ... 创建新的 ACP session
```

**注意：** 重连后会丢失历史，因为新的 ACP session 会创建新的 Context。
