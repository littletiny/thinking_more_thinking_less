# ACP (Agent Client Protocol) 文档

> 本文档涵盖标准 ACP 协议、kimi-cli 的实现差异，以及当前项目的使用方式。

---

## 1. ACP 概述

**ACP** 全称 **Agent Client Protocol**，是一种用于**编辑器/客户端 ↔ AI Agent** 通信的标准协议。

### 与其他协议的区别

| 协议 | 全称 | 用途 | 通信方式 |
|------|------|------|----------|
| **ACP** | Agent Client Protocol | 编辑器 ↔ Agent | JSON-RPC 2.0 over stdio |
| **MCP** | Model Context Protocol | 工具/资源提供 | JSON-RPC |
| **A2A** | Agent-to-Agent Protocol | Agent ↔ Agent | HTTP / JSON-RPC |

---

## 2. Python ACP SDK

### 2.1 安装

```bash
pip install agent-client-protocol
# 或
uv add agent-client-protocol
```

### 2.2 核心模块

```
acp
├── schema          # Pydantic 模型（从规范生成）
├── agent           # Agent 基类
├── client          # Client 基类
├── helpers         # 工具函数
└── contrib         # 实验性工具
```

### 2.3 基本用法

**服务端（Agent）实现：**

```python
import acp

class MyAgent(acp.Agent):
    async def initialize(self, protocol_version, client_capabilities, **kwargs):
        # 返回初始化响应
        return acp.InitializeResponse(
            protocol_version=protocol_version,
            agent_capabilities=acp.schema.AgentCapabilities(...),
        )
    
    async def prompt(self, prompt, session_id, **kwargs) -> acp.PromptResponse:
        # 处理用户输入，返回响应
        return acp.PromptResponse(stop_reason="end_turn")

# 运行
asyncio.run(acp.run_agent(MyAgent()))
```

**客户端实现：**

```python
import acp

# 启动 Agent 进程
process = acp.spawn_agent_process(["kimi", "acp"])

# 创建客户端连接
client = acp.Client(process)

# 初始化
await client.initialize(...)

# 创建会话
response = await client.new_session(cwd="/path/to/project")
session_id = response.session_id

# 发送消息
await client.prompt(
    session_id=session_id,
    prompt=[acp.schema.TextContentBlock(text="Hello")]
)
```

---

## 3. 核心概念

### 3.1 通信模型

```
┌─────────────┐      stdio (JSON-RPC)      ┌─────────────┐
│   Client    │  ◄──────────────────────►  │    Agent    │
│  (WebChat)  │                            │  (kimi-cli) │
└─────────────┘                            └─────────────┘
      │                                           │
      │  1. initialize                            │
      │  2. new_session ──► session_id            │
      │  3. prompt ──► streaming updates          │
      │  4. session/update (SSE-like) ◄───────────┘
```

### 3.2 消息类型

| 消息 | 方向 | 说明 |
|------|------|------|
| `initialize` | C → A | 能力协商、版本确认 |
| `new_session` | C → A | 创建新会话 |
| `load_session` | C → A | 加载已有会话 |
| `prompt` | C → A | 发送用户输入 |
| `session/update` | A → C | 流式更新（Notification） |
| `cancel` | C → A | 取消当前处理 |

### 3.3 Update 类型（流式响应）

| Update 类型 | 说明 | 对应内容 |
|-------------|------|----------|
| `AgentMessageChunk` | 助手消息片段 | `output` |
| `AgentThoughtChunk` | 思考过程片段 | `thinking` |
| `ToolCallStart` | 工具调用开始 | 工具名、初始参数 |
| `ToolCallProgress` | 工具调用进度 | 累积参数 / 执行结果 |
| `AgentPlanUpdate` | 计划更新 | TODO 列表状态 |
| `AvailableCommandsUpdate` | 可用命令更新 | `/command` 列表 |

---

## 4. kimi-cli 的 ACP 实现

### 4.1 代码位置

```
kimi-cli/src/kimi_cli/acp/
├── __init__.py      # 入口：acp_main()
├── server.py        # ACPServer 类（Agent 实现）
├── session.py       # ACPSession 类（会话处理）
├── types.py         # 类型定义
├── convert.py       # 类型转换
├── kaos.py          # Kaos 集成（文件系统）
├── mcp.py           # MCP 服务器配置
└── tools.py         # 工具处理
```

### 4.2 启动方式

```python
# kimi-cli/src/kimi_cli/acp/__init__.py
import acp
from kimi_cli.acp.server import ACPServer

asyncio.run(acp.run_agent(ACPServer(), use_unstable_protocol=True))
```

**注意**：kimi-cli 使用 `use_unstable_protocol=True`，表示使用实验性协议版本。

### 4.3 核心类

#### ACPServer（Agent 端）

```python
class ACPServer:
    """ACP 服务器实现，处理客户端连接"""
    
    async def initialize(self, ...):
        # 返回能力信息、认证方式
        
    async def new_session(self, cwd, mcp_servers, ...):
        # 创建 KimiCLI 实例，返回 session_id
        
    async def load_session(self, session_id, ...):
        # 加载已有会话
        
    async def prompt(self, prompt, session_id, ...):
        # 转发给 ACPSession 处理
        
    async def set_session_model(self, model_id, session_id):
        # 动态切换模型
```

#### ACPSession（会话处理）

```python
class ACPSession:
    """处理单个会话的消息流转"""
    
    async def prompt(self, prompt):
        # 1. 调用 KimiCLI.run() 获取消息流
        # 2. 将内部消息转换为 ACP update
        # 3. 通过 session_update() 发送给客户端
```

### 4.4 消息转换流程

```
KimiCLI 内部消息          ACP Update
─────────────────────────────────────────
TextPart              →  AgentMessageChunk
ThinkPart             →  AgentThoughtChunk
ToolCall              →  ToolCallStart
ToolCallPart          →  ToolCallProgress (args)
ToolResult            →  ToolCallProgress (result)
TodoDisplayBlock      →  AgentPlanUpdate
```

---

## 5. 当前项目（WebChat）的使用

### 5.1 架构

```
webchat/
├── core/acp_client.py      # SimpleACPClient（处理 update）
├── core/sessions.py        # WebSession（管理 ACP 连接）
└── core/config.py          # ACP 配置、YOLO 模式
```

### 5.2 SimpleACPClient

自定义的 ACP 客户端，实现了 `session_update` 处理器：

```python
class SimpleACPClient:
    """处理 ACP 协议的各种 update 类型"""
    
    async def session_update(self, session_id, update):
        # AgentThoughtChunk → thinking_chunks
        # AgentMessageChunk → output_chunks  
        # ToolCallStart     → tool_calls + event
        # ToolCallProgress  → tool_calls update + event
```

### 5.3 启动流程

```python
# core/sessions.py
from acp import spawn_agent_process, text_block

# 1. 启动 kimi-cli ACP 进程
process = spawn_agent_process(["kimi", "acp"])

# 2. 创建客户端
client = acp.Client(process, SimpleACPClient())

# 3. 初始化
await client.initialize(
    protocol_version=acp.LATEST_STABLE_PROTOCOL_VERSION,
    client_capabilities=ClientCapabilities(...),
)

# 4. 创建会话
response = await client.new_session(
    cwd=work_dir,
    mcp_servers=[]
)
```

### 5.4 YOLO 模式

在 `SimpleACPClient.request_permission()` 中实现：

```python
async def request_permission(self, options, session_id, tool_call, **kwargs):
    if YOLO_MODE:
        # 自动批准所有权限请求
        return acp.RequestPermissionResponse(
            outcome=AllowedOutcome(option_id='approve', outcome='selected')
        )
```

---

## 6. Update 类型详解

### 6.1 AgentMessageChunk（输出内容）

```python
acp.schema.AgentMessageChunk(
    session_update="agent_message_chunk",
    content=acp.schema.TextContentBlock(
        type="text",
        text="Hello, world!"
    )
)
```

### 6.2 AgentThoughtChunk（思考内容）

```python
acp.schema.AgentThoughtChunk(
    session_update="agent_thought_chunk",
    content=acp.schema.TextContentBlock(
        type="text",
        text="我需要分析这个问题..."
    )
)
```

### 6.3 ToolCallStart（工具调用开始）

```python
acp.schema.ToolCallStart(
    session_update="tool_call",
    tool_call_id="tc_xxx",
    title="shell: ls",  # 工具名 + 关键参数
    status="in_progress",
    content=[
        acp.schema.ContentToolCallContent(
            type="content",
            content=acp.schema.TextContentBlock(
                type="text",
                text='{"command": "ls"}'  # 初始参数
            )
        )
    ]
)
```

### 6.4 ToolCallProgress（工具调用进度）

**参数累积阶段**（有 `title`）：
```python
acp.schema.ToolCallProgress(
    session_update="tool_call_update",
    tool_call_id="tc_xxx",
    title="shell: ls -la",  # 更新后的标题
    status="in_progress",
    content=[...]  # 累积的参数
)
```

**结果返回阶段**（无 `title`）：
```python
acp.schema.ToolCallProgress(
    session_update="tool_call_update",
    tool_call_id="tc_xxx",
    status="completed",  # 或 "failed"
    content=[...]  # 执行结果
)
```

### 6.5 AgentPlanUpdate（计划更新）

```python
acp.schema.AgentPlanUpdate(
    session_update="plan",
    entries=[
        acp.schema.PlanEntry(
            content="分析需求",
            status="completed",  # pending / in_progress / completed
            priority="high"
        ),
        ...
    ]
)
```

---

## 7. 协议差异说明

### 7.1 kimi-cli 与标准 ACP 的差异

| 方面 | 标准 ACP | kimi-cli |
|------|----------|----------|
| 协议版本 | Stable | `use_unstable_protocol=True` |
| 工具调用 ID | 全局唯一 | 使用 `{turn_id}/{tool_call_id}` 避免冲突 |
| 终端认证 | 标准字段 | 自定义 `terminal-auth` metadata |
| Thinking | 可选 | 支持 thinking 变体模型 |
| 权限请求 | 标准选项 | 支持 `approve_for_session` |

### 7.2 重要实现细节

1. **Tool Call ID 唯一性**
   - kimi-cli 在工具调用 ID 前附加 turn ID
   - 避免用户取消/拒绝后重试时 ID 冲突

2. **流式参数累积**
   - ToolCallStart 只包含部分参数
   - ToolCallProgress 逐步累积完整参数
   - 需要通过参数长度比较来判断是否更新

3. **YOLO 模式**
   - 非标准 ACP 功能
   - 自动批准所有权限请求
   - 适用于自动化/无人值守场景

---

## 8. 参考资源

- **ACP Python SDK**: https://agentclientprotocol.github.io/python-sdk/
- **协议规范**: https://agentclientprotocol.com/protocol/schema
- **kimi-cli ACP 代码**: `kimi-cli/src/kimi_cli/acp/`
- **本项目 ACP 客户端**: `webchat/core/acp_client.py`

---

*最后更新: 2026-03-11*
