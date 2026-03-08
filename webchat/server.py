#!/usr/bin/env python3
"""
Zettel WebChat - Flask Backend

关键设计：
- 每个 WebSession 有专用的事件循环线程，避免跨线程 event loop 问题
- Flask 请求通过线程安全的方式与 session 的 event loop 通信
"""

import os
import sys
import json
import uuid
import asyncio
import threading
import logging
import time
from queue import Queue
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, AsyncGenerator, Any, Callable, Tuple

from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS

sys.path.insert(0, str(Path(__file__).parent.parent))

# 导入格式化工具
try:
    from format_utils import (
        format_directory_listing,
        parse_and_format_response,
        ResponseParser,
    )
    FORMAT_UTILS_AVAILABLE = True
except ImportError:
    FORMAT_UTILS_AVAILABLE = False
    logger.warning("format_utils not available")

try:
    import acp
    from acp import spawn_agent_process, text_block
    from acp.schema import ClientCapabilities, FileSystemCapability, Implementation
    ACP_AVAILABLE = True
except ImportError:
    ACP_AVAILABLE = False
    print("⚠️ ACP not available, running in mock mode")


# ============== Logging ==============

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(threadName)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('webchat')


# ============== Configuration ==============

MOCK_MODE = os.environ.get("MOCK_MODE", "false").lower() == "true" or not ACP_AVAILABLE

if MOCK_MODE:
    DATA_DIR = Path(__file__).parent / "mock_data"
    CONVERSATIONS_DIR = DATA_DIR / "conversations"
    METADATA_PATH = DATA_DIR / "sessions.json"
else:
    DATA_DIR = Path(__file__).parent.parent
    CONVERSATIONS_DIR = DATA_DIR / "conversations"
    METADATA_PATH = Path(__file__).parent / "sessions.json"

DATA_DIR.mkdir(parents=True, exist_ok=True)
CONVERSATIONS_DIR.mkdir(parents=True, exist_ok=True)

logger.info(f"MOCK_MODE: {MOCK_MODE}")


# ============== Data Models ==============

@dataclass
class SessionMeta:
    id: str
    type: str
    source: str
    title: str
    file: str
    created_at: str
    updated_at: str
    status: str
    message_count: int = 0
    last_accessed_at: str = ""
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict) -> "SessionMeta":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


# ============== Async Runner for Session ==============

class SessionAsyncRunner:
    """
    为每个 Session 提供专用的事件循环线程
    解决跨线程 event loop 问题
    """
    def __init__(self, session_id: str):
        self.session_id = session_id
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self._initialized = False
        self._stop_event = threading.Event()
        logger.debug(f"[{session_id}] AsyncRunner created")
    
    def start(self):
        """启动事件循环线程"""
        with self._lock:
            if self._thread is not None and self._thread.is_alive():
                return
            
            self._stop_event.clear()
            self._thread = threading.Thread(target=self._run_loop, name=f"Session-{self.session_id}")
            self._thread.daemon = True
            self._thread.start()
            
            # 等待 loop 准备好
            while self._loop is None:
                time.sleep(0.001)
            
            logger.info(f"[{self.session_id}] AsyncRunner started")
    
    def _run_loop(self):
        """在专用线程中运行事件循环"""
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        
        # 运行直到被停止
        while not self._stop_event.is_set():
            try:
                self._loop.run_forever()
            except Exception as e:
                logger.exception(f"[{self.session_id}] Event loop error")
        
        # 清理
        pending = asyncio.all_tasks(self._loop)
        for task in pending:
            task.cancel()
        
        if pending:
            self._loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
        
        self._loop.close()
        logger.info(f"[{self.session_id}] AsyncRunner stopped")
    
    def run(self, coro: Callable[[], Any]) -> Any:
        """
        在 session 的 event loop 中运行异步函数
        如果还没启动，先启动
        """
        self.start()
        
        # 创建 Future 来接收结果
        result_queue = Queue()
        
        def run_coro():
            try:
                future = asyncio.ensure_future(coro())
                
                def on_done(fut):
                    try:
                        result_queue.put(('result', fut.result()))
                    except Exception as e:
                        result_queue.put(('error', e))
                
                future.add_done_callback(on_done)
            except Exception as e:
                result_queue.put(('error', e))
        
        # 在 event loop 线程中调度
        self._loop.call_soon_threadsafe(run_coro)
        
        # 等待结果
        status, value = result_queue.get()
        if status == 'error':
            raise value
        return value
    
    def run_sync(self, coro: Callable[[], Any], timeout: Optional[float] = None) -> Any:
        """同步等待异步函数完成"""
        self.start()
        
        # 使用 run_coroutine_threadsafe 在线程安全的 loop 中运行
        future = asyncio.run_coroutine_threadsafe(coro(), self._loop)
        return future.result(timeout=timeout)
    
    def stop(self):
        """停止事件循环"""
        self._stop_event.set()
        if self._loop:
            self._loop.call_soon_threadsafe(self._loop.stop)
        if self._thread:
            self._thread.join(timeout=5)


# ============== Session Abstraction ==============

class BaseSession(ABC):
    """Session 抽象基类"""
    
    def __init__(self, meta: SessionMeta):
        self._meta = meta
        self._lock = threading.Lock()
    
    @property
    def id(self) -> str:
        return self._meta.id
    
    @property
    def meta(self) -> SessionMeta:
        return self._meta
    
    @property
    def can_close(self) -> bool:
        return self._meta.type == "web"
    
    @abstractmethod
    def send_message_sync(self, message: str, chunk_callback: Callable[[str], None]) -> str:
        """
        同步发送消息，通过回调返回 chunk
        
        Args:
            message: 用户消息
            chunk_callback: 每个 chunk 的回调函数
        
        Returns:
            完整响应文本
        """
        pass
    
    @abstractmethod
    def close_sync(self) -> bool:
        """同步关闭 session"""
        pass
    
    def _append_to_file(self, role: str, content: str):
        """追加消息到 conversation 文件"""
        file_path = CONVERSATIONS_DIR / self._meta.file.replace("conversations/", "")
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().isoformat()
        
        if not file_path.exists():
            header = f"""# Conversation: {self._meta.title}

## Metadata
- **Session ID**: {self._meta.id}
- **Type**: {self._meta.type}
- **Created**: {self._meta.created_at}

---

## Messages

"""
            file_path.write_text(header, encoding="utf-8")
        
        with open(file_path, "a", encoding="utf-8") as f:
            f.write(f"### {role} [{timestamp}]\n\n")
            f.write(f"{content}\n\n---\n\n")
        
        self._meta.message_count += 1
        self._meta.updated_at = timestamp
        self._meta.last_accessed_at = timestamp


class WebSession(BaseSession):
    """
    Web 创建的 Session
    - 使用专用线程运行 event loop，避免跨线程问题
    - ACP 模式下自动维护历史消息（由 kimi-acp 处理）
    - Mock 模式下模拟历史消息维护
    """
    
    def __init__(self, meta: SessionMeta, cwd: str = "."):
        super().__init__(meta)
        self._cwd = cwd
        self._runner = SessionAsyncRunner(meta.id)
        self._process = None
        self._conn = None
        self._client: Optional[SimpleACPClient] = None
        self._session_id: Optional[str] = None
        self._initialized = False
        self._init_lock = threading.Lock()
        # Mock 模式下的历史消息存储
        self._mock_history: List[dict] = []
        # 处理锁：确保同一个 session 的消息顺序处理
        self._processing_lock = threading.Lock()
        logger.debug(f"[{meta.id}] WebSession created")
    
    def _is_acp_alive(self) -> bool:
        """检查 ACP 连接是否存活"""
        if MOCK_MODE:
            return True
        if not self._process or not self._conn:
            return False
        # 检查进程是否还在运行 (asyncio.subprocess.Process 使用 returncode)
        if self._process.returncode is not None:
            logger.warning(f"[{self.id}] ACP process exited with code {self._process.returncode}")
            return False
        return True
    
    async def _initialize(self):
        """异步初始化"""
        if self._initialized and self._is_acp_alive():
            return
        
        # 如果之前初始化过但断开了，清理旧资源
        if self._initialized and not self._is_acp_alive():
            logger.warning(f"[{self.id}] ACP session disconnected, will reinitialize")
            await self._cleanup_acp()
        
        if MOCK_MODE:
            logger.info(f"[{self.id}] Mock mode initialization")
            self._initialized = True
            return
        
        logger.info(f"[{self.id}] Spawning kimi process...")
        
        self._client = SimpleACPClient()
        self._conn_context = spawn_agent_process(
            self._client, "kimi", "acp", cwd=self._cwd
        )
        self._conn, self._process = await self._conn_context.__aenter__()
        
        logger.debug(f"[{self.id}] Initializing ACP connection...")
        await self._conn.initialize(
            protocol_version=acp.PROTOCOL_VERSION,
            client_capabilities=ClientCapabilities(
                fs=FileSystemCapability(read_text_file=True, write_text_file=True),
            ),
            client_info=Implementation(name="zettel-webchat", version="1.0"),
        )
        
        logger.debug(f"[{self.id}] Creating ACP session...")
        session = await self._conn.new_session(cwd=self._cwd, mcp_servers=[])
        self._session_id = session.session_id
        
        self._initialized = True
        logger.info(f"[{self.id}] Initialization complete, ACP session: {self._session_id}")
    
    async def _cleanup_acp(self):
        """清理 ACP 资源"""
        logger.debug(f"[{self.id}] Cleaning up ACP resources")
        if self._conn_context:
            try:
                await self._conn_context.__aexit__(None, None, None)
            except:
                pass
        self._process = None
        self._conn = None
        self._session_id = None
        self._initialized = False
    
    async def _send_message_async(
        self, 
        message: str, 
        chunk_callback: Callable[[str], None],
        thinking_callback: Optional[Callable[[str], None]] = None,
        event_callback: Optional[Callable[[dict], None]] = None
    ) -> dict:
        """
        内部异步发送消息
        
        Returns:
            {"thinking": str|None, "output": str, "has_thinking": bool, "events": list}
        """
        await self._initialize()
        
        # 记录用户消息
        self._append_to_file("User", message)
        
        if MOCK_MODE:
            # Mock 模式：模拟带有 thinking 和历史记忆的响应
            
            # 添加到历史
            self._mock_history.append({"role": "user", "content": message})
            
            # 根据历史生成响应
            history_len = len(self._mock_history)
            mock_thinking = f"<think>\n这是第 {history_len//2 + 1} 轮对话\n用户消息: {message[:30]}...\n历史消息数: {history_len}\n</think>\n\n"
            
            # 生成带有历史信息的响应
            if history_len == 1:
                mock_output = f"你好！我是模拟助手。你说的是：'{message[:30]}...'"
            elif "记住" in message or "历史" in message:
                mock_output = f"我记得我们的对话历史，目前有 {history_len//2} 轮对话。"
            else:
                mock_output = f"收到（第 {history_len//2 + 1} 轮）: '{message[:30]}...'"
            
            # 流式输出 thinking（如果回调存在）
            if thinking_callback:
                for char in mock_thinking:
                    thinking_callback(char)
                    await asyncio.sleep(0.001)
            
            # 模拟工具调用事件（在 thinking 之后，output 之前）
            if event_callback:
                event_callback({"type": "tool_call", "data": {"id": "mock-1", "name": "shell", "arguments": "{\"command\": \"echo hello\"}"}})
                await asyncio.sleep(0.2)
                event_callback({"type": "tool_result", "data": {"id": "mock-1", "status": "completed", "result": "hello"}})
                await asyncio.sleep(0.1)
            
            # 流式输出
            for char in mock_output:
                chunk_callback(char)
                await asyncio.sleep(0.001)
            
            # 添加到历史
            self._mock_history.append({"role": "assistant", "content": mock_output})
            
            # 解析并保存
            full_text = mock_thinking + mock_output if not thinking_callback else mock_output
            self._append_to_file("Assistant", full_text)
            
            return {
                "thinking": mock_thinking.strip() if thinking_callback else None,
                "output": mock_output,
                "has_thinking": True,
                "history_count": len(self._mock_history),
                "events": []
            }
        
        # 清空客户端状态
        self._client.clear()
        
        # 发送消息
        logger.debug(f"[{self.id}] Sending prompt to ACP...")
        response_task = asyncio.create_task(
            self._conn.prompt(
                session_id=self._session_id,
                prompt=[text_block(message)],
            )
        )
        logger.debug(f"[{self.id}] Prompt task created")
        
        output_parts = []
        thinking_parts = []
        all_events = []
        
        loop_count = 0
        no_data_count = 0
        try:
            logger.debug(f"[{self.id}] Entering response loop")
            while True:
                loop_count += 1
                
                task_done = response_task.done()
                has_pending = self._client.has_pending()
                
                if loop_count % 100 == 0:
                    logger.debug(f"[{self.id}] loop={loop_count}, no_data={no_data_count}, task_done={task_done}, pending={has_pending}")
                
                # 当 task 完成且没有 pending 数据时退出
                if task_done and not has_pending:
                    logger.debug(f"[{self.id}] Task done and no pending, breaking")
                    break
                
                output_chunk, thinking_chunk, events = await self._client.get_chunk(timeout=0.1)
                
                # 处理事件
                if events:
                    logger.debug(f"[{self.id}] Got {len(events)} events")
                    for event in events:
                        all_events.append(event)
                        if event_callback:
                            event_callback(event)
                
                if thinking_chunk:
                    logger.debug(f"[{self.id}] Got thinking chunk: {thinking_chunk[:50]}...")
                    thinking_parts.append(thinking_chunk)
                    no_data_count = 0
                    if thinking_callback:
                        thinking_callback(thinking_chunk)
                
                if output_chunk:
                    logger.debug(f"[{self.id}] Got output chunk: {output_chunk[:50]}...")
                    output_parts.append(output_chunk)
                    no_data_count = 0
                    chunk_callback(output_chunk)
                
                # 检查是否有数据
                has_data = events or thinking_chunk or output_chunk
                
                if not has_data:
                    no_data_count += 1
                    
                    # 如果 task 完成但没有数据，退出
                    if task_done:
                        if self._client.has_pending():
                            continue
                        logger.debug(f"[{self.id}] Task done and no chunks, breaking")
                        break
                    
                    # 超时保护：如果 60 秒没有数据，强制退出（防止 ACP 崩溃导致无限等待）
                    if no_data_count > 600:  # 600 * 0.1s = 60s
                        logger.warning(f"[{self.id}] No data for 60s, ACP may be dead, forcing break")
                        break
                    
                    await asyncio.sleep(0.001)
                else:
                    no_data_count = 0
        
        finally:
            if not response_task.done():
                response_task.cancel()
                try:
                    await response_task
                except asyncio.CancelledError:
                    pass
        
        output_text = "".join(output_parts)
        thinking_text = "".join(thinking_parts) if thinking_parts else None
        has_thinking = bool(thinking_parts)
        
        # 保存到文件
        full_for_file = ""
        if thinking_text:
            full_for_file += f"<think>\n{thinking_text}\n</think>\n\n"
        full_for_file += output_text
        self._append_to_file("Assistant", full_for_file)
        
        return {
            "thinking": thinking_text,
            "output": output_text,
            "has_thinking": has_thinking,
            "events": all_events
        }
    
    def send_message_sync(
        self, 
        message: str, 
        chunk_callback: Callable[[str], None],
        thinking_callback: Optional[Callable[[str], None]] = None,
        event_callback: Optional[Callable[[dict], None]] = None
    ) -> dict:
        """
        同步接口：在 session 的专用 event loop 中执行发送
        使用锁确保同一个 session 的消息顺序处理
        
        Returns:
            {"thinking": str|None, "output": str, "has_thinking": bool, "events": list}
        """
        # 获取处理锁，阻塞等待前一个消息完成
        with self._processing_lock:
            logger.info(f"[{self.id}] send_message_sync: {message[:50]}...")
            
            async def do_send():
                return await self._send_message_async(message, chunk_callback, thinking_callback, event_callback)
            
            return self._runner.run_sync(do_send)
    
    def close_sync(self) -> bool:
        """同步关闭"""
        logger.info(f"[{self.id}] Closing session...")
        
        if not self.can_close:
            raise RuntimeError("Attachable session cannot be closed")
        
        if self._initialized and not MOCK_MODE:
            async def do_close():
                try:
                    await self._conn_context.__aexit__(None, None, None)
                except:
                    pass
            
            try:
                self._runner.run_sync(do_close)
            except:
                pass
            
            self._process = None
            self._conn = None
            self._initialized = False
        
        # 清理 mock 历史
        self._mock_history = []
        
        self._runner.stop()
        self._meta.status = "closed"
        logger.info(f"[{self.id}] Session closed")
        return True
    
    def get_history(self) -> List[dict]:
        """获取对话历史（Mock 模式）"""
        if MOCK_MODE:
            return self._mock_history.copy()
        # ACP 模式下历史由 kimi-acp 管理，这里返回空列表
        # 实际历史应从 conversation 文件读取
        return []


class AttachableSession(BaseSession):
    def __init__(self, meta: SessionMeta, cli_session_id: str):
        super().__init__(meta)
        self._cli_session_id = cli_session_id
        raise NotImplementedError("AttachableSession not implemented yet")
    
    def send_message_sync(self, message: str, chunk_callback: Callable[[str], None]) -> str:
        pass
    
    def close_sync(self) -> bool:
        raise RuntimeError("CLI-managed session cannot be closed from web")


class ToolCallInfo:
    """Tool call 信息"""
    def __init__(self, id: str, name: str, arguments: str):
        self.id = id
        self.name = name
        self.arguments = arguments
        self.status = "pending"  # pending, running, completed, failed
        self.result = None
        self.start_time = time.time()
        self.end_time = None
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "arguments": self.arguments,
            "status": self.status,
            "result": self.result,
            "duration": round(self.end_time - self.start_time, 2) if self.end_time else None
        }


class StepInfo:
    """Step 信息"""
    def __init__(self, n: int):
        self.n = n
        self.status = "running"  # running, completed
        self.tool_calls: List[ToolCallInfo] = []
        self.start_time = time.time()
        self.end_time = None
    
    def to_dict(self) -> dict:
        return {
            "n": self.n,
            "status": self.status,
            "tool_calls": [tc.to_dict() for tc in self.tool_calls],
            "duration": round(self.end_time - self.start_time, 2) if self.end_time else None
        }


class SimpleACPClient:
    """增强的 ACP 客户端 - 支持 ToolCall、Thinking、Status 等事件
    
    正确处理 ACP 协议的各种 update 类型:
    - AgentThoughtChunk: thinking 内容
    - AgentMessageChunk: output 内容  
    - ToolCallStart: 工具调用开始
    - ToolCallProgress: 工具调用进度/结果
    """
    
    def __init__(self):
        # 使用两个队列分别存储 thinking 和 output
        self._output_chunks: List[str] = []  # AgentMessageChunk
        self._thinking_chunks: List[str] = []  # AgentThoughtChunk
        self._chunk_event = threading.Event()
        self._lock = threading.Lock()
        self._closed = False
        
        # 事件队列 (tool_call, tool_result, status_update 等)
        self._events: List[dict] = []
        
        # 工具调用状态跟踪
        self._tool_calls: Dict[str, ToolCallInfo] = {}
        
        # 当前状态
        self._status = {
            "context_usage": None,
            "token_usage": None,
            "message_id": None,
        }
    
    def get_events(self) -> List[dict]:
        """获取并清空事件队列"""
        with self._lock:
            events = self._events.copy()
            self._events = []
            return events
    
    def get_current_status(self) -> dict:
        """获取当前状态"""
        with self._lock:
            return {
                **self._status,
                "tool_calls": [tc.to_dict() for tc in self._tool_calls.values()]
            }
    
    def _add_event(self, event_type: str, data: dict):
        """添加事件到队列"""
        with self._lock:
            self._events.append({
                "type": event_type,
                "data": data,
                "timestamp": time.time()
            })
        self._chunk_event.set()
    
    def _extract_text_from_content(self, content) -> Optional[str]:
        """从 Content 对象中提取文本"""
        if content is None:
            return None
        # 如果是列表（ToolCallStart/Progress 的 content 是列表）
        if isinstance(content, list) and len(content) > 0:
            return self._extract_text_from_content(content[0])
        # ContentToolCallContent 有 content 属性（里面包含 TextContentBlock）
        if hasattr(content, 'content') and content.content is not None:
            return self._extract_text_from_content(content.content)
        # TextContentBlock 有 text 属性
        if hasattr(content, 'text'):
            return content.text
        return str(content) if content else None
    
    async def session_update(self, session_id: str, update, **kwargs):
        """处理 ACP session update
        
        update 可能是以下类型之一:
        - AgentThoughtChunk: thinking 内容
        - AgentMessageChunk: output 内容
        - ToolCallStart: 工具调用开始
        - ToolCallProgress: 工具调用进度更新
        """
        # DEBUG: 每次调用都打印，不管是否 closed
        update_type_name = type(update).__name__
        logger.info(f"[ACP] ==== session_update CALLED: type={update_type_name} ====")
        
        if self._closed:
            logger.warning(f"[ACP] session_update ignored: client closed")
            return
        
        try:
            # DEBUG: 打印所有接收到的 update 类型和属性
            try:
                attrs = {k: str(type(v).__name__) for k, v in vars(update).items() if not k.startswith('_')}
                logger.info(f"[ACP] RECEIVED UPDATE: type={update_type_name}, attrs={attrs}")
            except:
                logger.info(f"[ACP] RECEIVED UPDATE: type={update_type_name}, vars failed")
            
            # 处理 AgentThoughtChunk (thinking)
            if update_type_name == 'AgentThoughtChunk':
                text = self._extract_text_from_content(update.content)
                if text:
                    with self._lock:
                        self._thinking_chunks.append(text)
                        logger.debug(f"[ACP] +thinking queue={len(self._thinking_chunks)}, text={text[:50]}...")
                    self._chunk_event.set()
                return
            
            # 处理 AgentMessageChunk (output)
            if update_type_name == 'AgentMessageChunk':
                text = self._extract_text_from_content(update.content)
                if text:
                    with self._lock:
                        self._output_chunks.append(text)
                        logger.debug(f"[ACP] +output queue={len(self._output_chunks)}, text={text[:50]}...")
                    self._chunk_event.set()
                return
            
            # 处理 ToolCallStart (工具调用开始)
            if update_type_name == 'ToolCallStart':
                tc_id = getattr(update, 'tool_call_id', None) or getattr(update, 'id', 'unknown')
                name = getattr(update, 'title', None) or getattr(update, 'name', 'unknown')
                
                # 从 content 字段提取参数（ContentToolCallContent 列表）
                arguments = '{}'
                content = getattr(update, 'content', None)
                logger.info(f"[ACP] ToolCallStart content type={type(content).__name__}, value={repr(content)[:200]}")
                if content and isinstance(content, list) and len(content) > 0:
                    try:
                        # content 是 ContentToolCallContent 列表，里面包含 TextContentBlock
                        first_item = content[0]
                        logger.info(f"[ACP] first_item type={type(first_item).__name__}, dir={[x for x in dir(first_item) if not x.startswith('_')]}")
                        if hasattr(first_item, 'content') and first_item.content:
                            text_block = first_item.content
                            logger.info(f"[ACP] text_block type={type(text_block).__name__}, value={repr(text_block)[:200]}")
                            if hasattr(text_block, 'text'):
                                arguments = text_block.text
                                logger.info(f"[ACP] extracted text: {arguments[:100]}")
                            else:
                                arguments = str(text_block)
                        else:
                            logger.info(f"[ACP] first_item has no content attr or content is None")
                    except Exception as e:
                        logger.warning(f"[ACP] Failed to extract args from content: {e}", exc_info=True)
                
                # 备用：尝试 raw_input
                if arguments == '{}':
                    raw_input = getattr(update, 'raw_input', None)
                    if raw_input:
                        try:
                            arguments = json.dumps(raw_input)
                        except:
                            arguments = str(raw_input)
                
                # 创建工具调用信息
                tc_info = ToolCallInfo(tc_id, name, arguments)
                tc_info.status = getattr(update, 'status', None) or 'running'
                self._tool_calls[tc_id] = tc_info
                
                logger.info(f"[ACP] ToolCallStart: {name} ({tc_id[:8]}...) args={arguments[:100]}")
                
                # 发送 tool_call 事件
                self._add_event("tool_call", {
                    "id": tc_id,
                    "name": name,
                    "arguments": arguments,
                    "kind": getattr(update, 'kind', 'unknown'),
                    "status": tc_info.status
                })
                return
            
            # 处理 ToolCallProgress (工具调用进度/结果)
            if update_type_name == 'ToolCallProgress':
                tc_id = getattr(update, 'tool_call_id', None) or getattr(update, 'id', None)
                content = getattr(update, 'content', None)
                title = getattr(update, 'title', None)
                logger.info(f"[ACP] ToolCallProgress: tc_id={tc_id[:20] if tc_id else None}, title={title}, content={repr(content)[:200] if content else None}")
                
                if tc_id and tc_id in self._tool_calls:
                    tc = self._tool_calls[tc_id]
                    
                    # 更新状态
                    status = getattr(update, 'status', None)
                    if status:
                        tc.status = status
                    
                    # 通过 title 区分是参数更新还是结果
                    # _send_tool_call_part 有 title，_send_tool_result 没有 title
                    title = getattr(update, 'title', None)
                    
                    # 提取参数（有 title 表示是参数更新）
                    args_updated = False
                    if title and content:
                        args_text = self._extract_text_from_content(content)
                        if args_text:
                            # 累积参数（流式传输时参数是逐步到达的）
                            if tc.arguments in ['{}', '']:
                                tc.arguments = args_text
                                args_updated = True
                            elif len(args_text) > len(tc.arguments):
                                # 新参数更长，说明是累积内容
                                tc.arguments = args_text
                                args_updated = True
                            if args_updated:
                                logger.info(f"[ACP] ToolCallProgress: args for {tc.name}: {tc.arguments[:80]}...")
                                # 参数更新时发送事件
                                self._add_event("tool_result", {
                                    "id": tc_id,
                                    "status": tc.status,
                                    "result": None,
                                    "arguments": tc.arguments
                                })
                    
                    # 提取结果（没有 title 表示是结果）
                    result_text = None
                    raw_output = getattr(update, 'raw_output', None)
                    
                    if raw_output:
                        try:
                            import json
                            result_text = json.dumps(raw_output)[:500]
                        except:
                            result_text = str(raw_output)[:500]
                    elif not title and content:
                        # 没有 title，这是结果
                        result_text = self._extract_text_from_content(content)
                        if result_text:
                            result_text = result_text[:500]
                    
                    if result_text:
                        tc.result = result_text
                        tc.end_time = time.time()
                        logger.info(f"[ACP] ToolCallProgress: {tc.name} -> {tc.status}")
                        # 结果到达时发送事件
                        self._add_event("tool_result", {
                            "id": tc_id,
                            "status": tc.status,
                            "result": tc.result,
                            "arguments": tc.arguments
                        })
                return
            
            # 未知类型，记录日志
            logger.debug(f"[ACP] Unknown update type: {update_type_name}")
            
        except Exception as e:
            logger.exception(f"[ACP] Error handling session_update: {e}")
    
    async def read_text_file(self, path: str, session_id: str, **kwargs):
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                return acp.ReadTextFileResponse(content=f.read())
        except Exception as e:
            return acp.ReadTextFileResponse(content=f"Error: {e}")
    
    async def write_text_file(self, content: str, path: str, session_id: str, **kwargs):
        try:
            Path(path).parent.mkdir(parents=True, exist_ok=True)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            return acp.WriteTextFileResponse(success=True)
        except Exception as e:
            return acp.WriteTextFileResponse(success=False, error=str(e))
    
    async def request_permission(self, options, session_id: str, tool_call, **kwargs):
        from acp.schema import AllowedOutcome
        outcome = AllowedOutcome(option_id='approve', outcome='selected')
        return acp.RequestPermissionResponse(outcome=outcome)
    
    def clear(self):
        with self._lock:
            self._output_chunks = []
            self._thinking_chunks = []
            self._events = []
            self._tool_calls = {}
        self._chunk_event.clear()
        self._closed = False
    
    def close(self):
        self._closed = True
        self._chunk_event.set()
    
    def has_pending(self) -> bool:
        with self._lock:
            return len(self._output_chunks) > 0 or len(self._thinking_chunks) > 0 or len(self._events) > 0
    
    def has_thinking_pending(self) -> bool:
        """检查是否有待处理的 thinking 内容"""
        with self._lock:
            return len(self._thinking_chunks) > 0
    
    def has_output_pending(self) -> bool:
        """检查是否有待处理的 output 内容"""
        with self._lock:
            return len(self._output_chunks) > 0
    
    async def get_chunk(self, timeout: float = 1.0) -> Tuple[Optional[str], Optional[str], List[dict]]:
        """
        获取 chunk 和事件
        
        Returns:
            (output_chunk, thinking_chunk, events) - 其中之一可能为 None
        """
        with self._lock:
            # 优先返回事件
            events = self._events.copy()
            self._events = []
            
            if self._thinking_chunks:
                chunk = self._thinking_chunks.pop(0)
                logger.debug(f"[ACP] -thinking queue={len(self._thinking_chunks)}, text={chunk[:50]}...")
                return None, chunk, events
            if self._output_chunks:
                chunk = self._output_chunks.pop(0)
                logger.debug(f"[ACP] -output queue={len(self._output_chunks)}, text={chunk[:50]}...")
                return chunk, None, events
            if events:
                logger.info(f"[ACP] get_chunk: returning {len(events)} events (fast path)")
                return None, None, events
        
        start = time.time()
        while True:
            if self._closed:
                return None, None, []
            
            if self._chunk_event.is_set():
                with self._lock:
                    # 获取事件
                    events = self._events.copy()
                    self._events = []
                    
                    if events:
                        logger.info(f"[ACP] get_chunk: returning {len(events)} events (after wait)")
                    
                    # 优先返回 thinking
                    if self._thinking_chunks:
                        chunk = self._thinking_chunks.pop(0)
                        result = (None, chunk, events)
                        if not self._thinking_chunks and not self._output_chunks and not self._events:
                            self._chunk_event.clear()
                        logger.debug(f"[ACP] -thinking(after wait) queue={len(self._thinking_chunks)}, text={chunk[:50]}...")
                        return result
                    if self._output_chunks:
                        chunk = self._output_chunks.pop(0)
                        result = (chunk, None, events)
                        if not self._thinking_chunks and not self._output_chunks and not self._events:
                            self._chunk_event.clear()
                        logger.debug(f"[ACP] -output(after wait) queue={len(self._output_chunks)}, text={chunk[:50]}...")
                        return result
                    if events:
                        return None, None, events
                    self._chunk_event.clear()
            
            elapsed = time.time() - start
            if elapsed >= timeout:
                return None, None, []
            
            await asyncio.sleep(0.01)


# ============== Session Manager ==============

class SessionManager:
    """管理所有 sessions"""
    
    def __init__(self):
        self._sessions: Dict[str, BaseSession] = {}
        self._load_metadata()
        logger.info("SessionManager initialized")
    
    def _load_metadata(self):
        if METADATA_PATH.exists():
            data = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
            self._metadata = {
                item["id"]: SessionMeta.from_dict(item) 
                for item in data.get("sessions", [])
            }
            logger.info(f"Loaded {len(self._metadata)} sessions")
        else:
            self._metadata = {}
    
    def _save_metadata(self):
        data = {"sessions": [meta.to_dict() for meta in self._metadata.values()]}
        METADATA_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    
    def create_web_session(self, title: Optional[str] = None, cwd: str = ".") -> WebSession:
        session_id = uuid.uuid4().hex[:8]
        now = datetime.now().isoformat()
        
        meta = SessionMeta(
            id=session_id,
            type="web",
            source="spawned",
            title=title or session_id,
            file=f"conversations/{session_id}.md",
            created_at=now,
            updated_at=now,
            status="active",
            message_count=0
        )
        
        self._metadata[session_id] = meta
        self._save_metadata()
        
        session = WebSession(meta, cwd=cwd)
        self._sessions[session_id] = session
        
        logger.info(f"Created web session: {session_id}")
        return session
    
    def get_session(self, session_id: str) -> Optional[BaseSession]:
        if session_id in self._sessions:
            session = self._sessions[session_id]
            # 检查 WebSession 的 ACP 是否还活着
            if isinstance(session, WebSession) and not session._is_acp_alive():
                logger.warning(f"[{session_id}] ACP dead, removing from cache")
                del self._sessions[session_id]
                session = None
            else:
                return session
        
        if session_id in self._metadata:
            meta = self._metadata[session_id]
            if meta.type == "web":
                session = WebSession(meta)
                self._sessions[session_id] = session
                return session
        
        return None
    
    def list_sessions(self, include_inactive: bool = True) -> List[SessionMeta]:
        sessions = list(self._metadata.values())
        active = [s for s in sessions if s.status == "active"]
        archived = [s for s in sessions if s.status == "archived"]
        closed = [s for s in sessions if s.status == "closed"]
        
        active.sort(key=lambda x: x.last_accessed_at or x.updated_at, reverse=True)
        archived.sort(key=lambda x: x.last_accessed_at or x.updated_at, reverse=True)
        closed.sort(key=lambda x: x.updated_at, reverse=True)
        
        if include_inactive:
            return active + archived + closed
        else:
            return active
    
    def close_session(self, session_id: str) -> bool:
        logger.info(f"Closing session: {session_id}")
        session = self.get_session(session_id)
        if not session:
            return False
        
        if not session.can_close:
            raise RuntimeError("Session cannot be closed")
        
        success = session.close_sync()
        if success:
            self._metadata[session_id].status = "closed"
            self._metadata[session_id].updated_at = datetime.now().isoformat()
            self._save_metadata()
            if session_id in self._sessions:
                del self._sessions[session_id]
        
        return success
    
    def archive_session(self, session_id: str) -> bool:
        if session_id not in self._metadata:
            return False
        
        meta = self._metadata[session_id]
        if meta.status == "closed":
            raise RuntimeError("Cannot archive closed session")
        
        meta.status = "archived"
        meta.updated_at = datetime.now().isoformat()
        self._save_metadata()
        return True
    
    def unarchive_session(self, session_id: str) -> bool:
        if session_id not in self._metadata:
            return False
        
        meta = self._metadata[session_id]
        if meta.status == "active":
            raise RuntimeError("Session is already active")
        
        meta.status = "active"
        meta.last_accessed_at = datetime.now().isoformat()
        self._save_metadata()
        return True
    
    def touch_session(self, session_id: str):
        if session_id in self._metadata:
            self._metadata[session_id].last_accessed_at = datetime.now().isoformat()
            self._save_metadata()
    
    def update_title(self, session_id: str, title: str) -> bool:
        if session_id not in self._metadata:
            return False
        
        self._metadata[session_id].title = title
        self._metadata[session_id].updated_at = datetime.now().isoformat()
        self._save_metadata()
        return True
    
    def delete_session(self, session_id: str) -> bool:
        logger.info(f"Deleting session: {session_id}")
        if session_id not in self._metadata:
            return False
        
        if session_id in self._sessions:
            session = self._sessions[session_id]
            if session.can_close:
                try:
                    session.close_sync()
                except:
                    pass
            del self._sessions[session_id]
        
        del self._metadata[session_id]
        self._save_metadata()
        
        try:
            file_path = CONVERSATIONS_DIR / f"{session_id}.md"
            if file_path.exists():
                file_path.unlink()
        except:
            pass
        
        return True


# ============== Flask App ==============

app = Flask(__name__)
CORS(app)
session_manager = SessionManager()


@app.route("/api/sessions", methods=["GET"])
def list_sessions():
    hide_inactive = request.args.get("hide_inactive", "false").lower() == "true"
    sessions = session_manager.list_sessions(include_inactive=not hide_inactive)
    return jsonify({"sessions": [s.to_dict() for s in sessions]})


@app.route("/api/sessions", methods=["POST"])
def create_session():
    data = request.get_json(force=True, silent=True) or {}
    session_type = data.get("type", "web")
    
    if session_type != "web":
        return jsonify({"error": f"Session type '{session_type}' not implemented"}), 400
    
    session = session_manager.create_web_session(
        title=data.get("title"),
        cwd=data.get("cwd", ".")
    )
    
    return jsonify({"session": session.meta.to_dict()}), 201


@app.route("/api/sessions/<session_id>", methods=["DELETE"])
def close_session(session_id):
    try:
        success = session_manager.close_session(session_id)
        if success:
            return jsonify({"success": True})
        return jsonify({"error": "Session not found"}), 404
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/sessions/<session_id>/title", methods=["PUT"])
def update_title(session_id):
    data = request.get_json(force=True, silent=True) or {}
    title = data.get("title")
    
    if not title:
        return jsonify({"error": "Title required"}), 400
    
    success = session_manager.update_title(session_id, title)
    if success:
        return jsonify({"success": True})
    return jsonify({"error": "Session not found"}), 404


@app.route("/api/sessions/<session_id>/archive", methods=["POST"])
def archive_session(session_id):
    try:
        success = session_manager.archive_session(session_id)
        if success:
            return jsonify({"success": True})
        return jsonify({"error": "Session not found"}), 404
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/sessions/<session_id>/unarchive", methods=["POST"])
def unarchive_session(session_id):
    try:
        success = session_manager.unarchive_session(session_id)
        if success:
            return jsonify({"success": True})
        return jsonify({"error": "Session not found"}), 404
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/sessions/<session_id>/delete", methods=["POST"])
def delete_session(session_id):
    success = session_manager.delete_session(session_id)
    if success:
        return jsonify({"success": True})
    return jsonify({"error": "Session not found"}), 404


@app.route("/api/sessions/<session_id>/messages", methods=["GET"])
def get_messages(session_id):
    if session_id not in session_manager._metadata:
        return jsonify({"error": "Session not found"}), 404
    
    meta = session_manager._metadata[session_id]
    file_path = CONVERSATIONS_DIR / meta.file.replace("conversations/", "")
    
    messages = []
    if file_path.exists():
        content = file_path.read_text(encoding="utf-8")
        messages = parse_conversation_messages(content)
    
    return jsonify({"messages": messages})


def parse_conversation_messages(content: str) -> list:
    messages = []
    lines = content.split('\n')
    current_role = None
    current_content = []
    current_time = None
    in_header = False  # 标记是否在消息头部（### 后的空行）
    
    for line in lines:
        if line.startswith('### '):
            # 保存上一个消息
            if current_role and current_content:
                messages.append({
                    'role': current_role,
                    'content': '\n'.join(current_content).strip(),
                    'time': current_time
                })
            
            # 解析新消息的头部
            match = line[4:].strip()
            if ' [' in match and match.endswith(']'):
                role_part, time_part = match.rsplit(' [', 1)
                current_role = role_part.lower() if role_part.lower() in ['user', 'assistant'] else None
                current_time = time_part[:-1]
            else:
                current_role = match.lower() if match.lower() in ['user', 'assistant'] else None
                current_time = None
            current_content = []
            in_header = True  # 跳过头部后的空行
        
        elif line.strip() == '---':
            # 消息分隔符，跳过
            continue
        
        elif current_role is not None:
            # 跳过头部后的第一个空行
            if in_header:
                if line.strip() == '':
                    in_header = False
                    continue
                in_header = False
            current_content.append(line)
    
    # 保存最后一个消息
    if current_role and current_content:
        messages.append({
            'role': current_role,
            'content': '\n'.join(current_content).strip(),
            'time': current_time
        })
    
    return messages


@app.route("/api/sessions/<session_id>/chat", methods=["POST"])
def chat(session_id):
    """
    发送消息，SSE 流式返回
    
    使用 session 的专用 event loop 处理，避免跨线程问题
    支持的事件类型: thinking, chunk, event (tool_call, step_begin, tool_result, etc.), done, error
    """
    logger.info(f"API: chat {session_id}")
    
    session = session_manager.get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    session_manager.touch_session(session_id)
    
    data = request.get_json(force=True, silent=True) or {}
    message = data.get("message", "").strip()
    
    if not message:
        return jsonify({"error": "Message required"}), 400
    
    def generate():
        """SSE 生成器 - 使用同步接口，支持 thinking 和事件"""
        logger.info(f"[{session_id}] SSE stream started")
        
        chunk_queue = Queue()
        thinking_queue = Queue()
        event_queue = Queue()  # 新增：事件队列
        done_event = threading.Event()
        result_holder = [None]
        error_holder = [None]
        
        def chunk_callback(chunk: str):
            chunk_queue.put(('output', chunk))
        
        def thinking_callback(chunk: str):
            thinking_queue.put(('thinking', chunk))
        
        def event_callback(event: dict):
            """事件回调"""
            event_queue.put(('event', event))
        
        def do_send():
            try:
                result = session.send_message_sync(message, chunk_callback, thinking_callback, event_callback)
                result_holder[0] = result
            except Exception as e:
                logger.exception(f"[{session_id}] Error in send")
                error_holder[0] = str(e)
            finally:
                done_event.set()
        
        # 在后台线程执行发送
        send_thread = threading.Thread(target=do_send, name=f"Send-{session_id}")
        send_thread.start()
        
        # 读取 chunk 并 yield（优先级: thinking > event > output）
        try:
            while True:
                has_data = False
                
                # 1. 优先处理 thinking 内容
                try:
                    while True:
                        item = thinking_queue.get_nowait()
                        yield f"data: {json.dumps({'type': 'thinking', 'content': item[1]})}\n\n"
                        has_data = True
                except:
                    pass
                
                # 2. 处理事件（tool_call, step_begin 等）
                try:
                    while True:
                        item = event_queue.get_nowait()
                        yield f"data: {json.dumps({'type': 'event', 'event': item[1]})}\n\n"
                        has_data = True
                except:
                    pass
                
                # 3. 然后检查 output 内容
                try:
                    chunk = chunk_queue.get(timeout=0.05)
                    yield f"data: {json.dumps({'type': 'chunk', 'content': chunk[1]})}\n\n"
                    has_data = True
                except:
                    pass
                
                # 检查是否完成
                if done_event.is_set() and chunk_queue.empty() and thinking_queue.empty() and event_queue.empty():
                    break
            
            # 发送最终结果
            if error_holder[0]:
                yield f"data: {json.dumps({'type': 'error', 'error': error_holder[0]})}\n\n"
            else:
                result = result_holder[0] or {}
                yield f"data: {json.dumps({
                    'type': 'done',
                    'has_thinking': result.get('has_thinking', False),
                    'thinking': result.get('thinking') if result.get('has_thinking') else None
                })}\n\n"
        
        finally:
            send_thread.join(timeout=1)
            logger.info(f"[{session_id}] SSE stream ended")
    
    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


@app.route("/api/tools/format-ls", methods=["POST"])
def format_ls():
    """
    格式化 ls -l 输出为 Markdown
    
    Request body:
        {"ls_output": "...", "title": "文件列表"}
    
    Response:
        {"markdown": "...", "rich": "..."}
    """
    if not FORMAT_UTILS_AVAILABLE:
        return jsonify({"error": "format_utils not available"}), 503
    
    data = request.get_json(force=True, silent=True) or {}
    ls_output = data.get("ls_output", "")
    title = data.get("title", "文件列表")
    
    if not ls_output.strip():
        return jsonify({"error": "ls_output is required"}), 400
    
    try:
        markdown = format_directory_listing(ls_output, title, use_markdown=True)
        rich = format_directory_listing(ls_output, title, use_markdown=False)
        return jsonify({
            "markdown": markdown,
            "rich": rich,
            "title": title
        })
    except Exception as e:
        logger.exception("Error formatting ls output")
        return jsonify({"error": str(e)}), 500


@app.route("/api/tools/parse-thinking", methods=["POST"])
def parse_thinking():
    """
    解析推理引擎响应，分离 thinking 和 output
    
    Request body:
        {"text": "...", "show_thinking": true}
    
    Response:
        {
            "thinking": "...",
            "output": "...",
            "has_thinking": true,
            "formatted": "..."
        }
    """
    if not FORMAT_UTILS_AVAILABLE:
        return jsonify({"error": "format_utils not available"}), 503
    
    data = request.get_json(force=True, silent=True) or {}
    text = data.get("text", "")
    show_thinking = data.get("show_thinking", True)
    
    if not text.strip():
        return jsonify({"error": "text is required"}), 400
    
    try:
        parsed = ResponseParser.parse(text)
        formatted = ResponseParser.format_for_display(parsed, show_thinking)
        return jsonify({
            "thinking": parsed.thinking,
            "output": parsed.output,
            "has_thinking": parsed.has_thinking,
            "formatted": formatted
        })
    except Exception as e:
        logger.exception("Error parsing thinking")
        return jsonify({"error": str(e)}), 500


@app.route("/api/sessions/<session_id>/info", methods=["GET"])
def get_session_info(session_id):
    """
    获取 session 详细信息，包括历史消息统计
    
    Response:
        {
            "session_id": "...",
            "status": "active",
            "message_count": 10,
            "turn_count": 5,  // 对话轮数 (user+assistant 算一轮)
            "acp_connected": true,  // ACP 连接状态
            "mock_mode": false
        }
    """
    if session_id not in session_manager._metadata:
        return jsonify({"error": "Session not found"}), 404
    
    meta = session_manager._metadata[session_id]
    session = session_manager.get_session(session_id)
    
    # 计算对话轮数
    turn_count = meta.message_count // 2  # user + assistant = 1 turn
    
    # 检查 ACP 连接状态
    acp_connected = False
    if session and isinstance(session, WebSession):
        # 使用 session 的 runner 来检查状态
        async def check_alive():
            return session._is_acp_alive()
        try:
            acp_connected = session._runner.run_sync(check_alive)
        except:
            acp_connected = False
    
    # Mock 模式下的历史
    mock_history_count = 0
    if session and MOCK_MODE:
        mock_history_count = len(session.get_history())
    
    return jsonify({
        "session_id": session_id,
        "status": meta.status,
        "title": meta.title,
        "message_count": meta.message_count,
        "turn_count": turn_count,
        "created_at": meta.created_at,
        "updated_at": meta.updated_at,
        "acp_connected": acp_connected,
        "mock_mode": MOCK_MODE,
        "mock_history_count": mock_history_count if MOCK_MODE else None
    })


@app.route("/")
def index():
    return app.send_static_file("index.html")


if __name__ == "__main__":
    print(f"🚀 Zettel WebChat Server")
    print(f"   Mode: {'MOCK' if MOCK_MODE else 'ACP'}")
    print()
    
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=5000, debug=debug, threaded=True, use_reloader=debug)
