#!/usr/bin/env python3
"""
Session 抽象和实现
"""

import asyncio
import json
import threading
import logging
from abc import ABC, abstractmethod
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Callable

from .config import MOCK_MODE, YOLO_MODE, ACP_AVAILABLE, CONVERSATIONS_DIR, acp, text_block
from .config import ClientCapabilities, FileSystemCapability, Implementation
from .models import SessionMeta
from .async_runner import SessionAsyncRunner
from .acp_client import SimpleACPClient

logger = logging.getLogger('webchat')


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
    - 支持通过 acp_session_id 恢复 kimi-cli session
    """
    
    def __init__(self, meta: SessionMeta, cwd: str = ".", on_acp_session_id_changed: Optional[Callable[[str], None]] = None):
        super().__init__(meta)
        self._cwd = cwd
        self._runner = SessionAsyncRunner(meta.id)
        self._process = None
        self._conn = None
        self._conn_context = None
        self._client: Optional[SimpleACPClient] = None
        self._session_id: Optional[str] = None
        self._initialized = False
        self._init_lock = threading.Lock()
        self._on_acp_session_id_changed = on_acp_session_id_changed
        # Mock 模式下的历史消息存储
        self._mock_history: List[dict] = []
        # 处理锁：确保同一个 session 的消息顺序处理
        self._processing_lock = threading.Lock()
        # 停止生成标志
        self._stop_event = threading.Event()
        logger.debug(f"[{meta.id}] WebSession created (acp_session_id: {meta.acp_session_id or 'new'})")
    
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
        """异步初始化，支持恢复已有session"""
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
        self._conn_context = acp.spawn_agent_process(
            self._client, "kimi", "acp", cwd=self._cwd
        )
        self._conn, self._process = await self._conn_context.__aenter__()
        
        logger.debug(f"[{self.id}] Initializing ACP connection...")
        logger.info(f"[{self.id}] YOLO_MODE: {YOLO_MODE} (auto-approve all permission requests)")
        init_result = await self._conn.initialize(
            protocol_version=acp.PROTOCOL_VERSION,
            client_capabilities=ClientCapabilities(
                fs=FileSystemCapability(read_text_file=True, write_text_file=True),
                terminal=True,  # 启用终端能力
            ),
            client_info=Implementation(name="zettel-webchat", version="1.0"),
        )
        
        # 检查server是否支持load_session
        can_load_session = (
            init_result.agent_capabilities and 
            getattr(init_result.agent_capabilities, 'load_session', False)
        )
        
        # 判断是创建新session还是加载已有session
        existing_acp_session_id = self._meta.acp_session_id
        
        acp_session_id_changed = False
        
        if existing_acp_session_id and can_load_session:
            # 尝试加载已有session
            logger.info(f"[{self.id}] Loading existing ACP session: {existing_acp_session_id}")
            try:
                await self._conn.load_session(
                    cwd=self._cwd, 
                    mcp_servers=[], 
                    session_id=existing_acp_session_id
                )
                self._session_id = existing_acp_session_id
                logger.info(f"[{self.id}] Successfully loaded ACP session: {self._session_id}")
            except Exception as e:
                logger.warning(f"[{self.id}] Failed to load session {existing_acp_session_id}: {e}")
                logger.info(f"[{self.id}] Falling back to creating new session...")
                session = await self._conn.new_session(cwd=self._cwd, mcp_servers=[])
                self._session_id = session.session_id
                # 标记acp_session_id发生了变化（但不更新_meta，让回调去更新）
                if self._session_id != self._meta.acp_session_id:
                    acp_session_id_changed = True
        else:
            # 创建新session
            if existing_acp_session_id and not can_load_session:
                logger.warning(f"[{self.id}] ACP server doesn't support load_session, creating new")
            logger.debug(f"[{self.id}] Creating new ACP session...")
            session = await self._conn.new_session(cwd=self._cwd, mcp_servers=[])
            self._session_id = session.session_id
            # 标记acp_session_id发生了变化（从空到新ID，或从旧ID到新ID）
            if self._session_id != self._meta.acp_session_id:
                acp_session_id_changed = True
            logger.info(f"[{self.id}] Created new ACP session: {self._session_id}")
        
        self._initialized = True
        
        # 触发回调同步到metadata（如果acp_session_id发生了变化）
        if acp_session_id_changed and self._on_acp_session_id_changed:
            try:
                self._on_acp_session_id_changed(self._session_id)
                logger.debug(f"[{self.id}] Triggered acp_session_id sync: {self._session_id}")
            except Exception as e:
                logger.warning(f"[{self.id}] Failed to sync acp_session_id: {e}")
        
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
        message: str | list[dict], 
        chunk_callback: Callable[[str], None],
        thinking_callback: Optional[Callable[[str], None]] = None,
        event_callback: Optional[Callable[[dict], None]] = None
    ) -> dict:
        """
        内部异步发送消息
        
        Args:
            message: 字符串或内容部件列表
        
        Returns:
            {"thinking": str|None, "output": str, "has_thinking": bool, "events": list}
        """
        await self._initialize()
        
        # 处理消息内容
        if isinstance(message, str):
            content_parts = [{"type": "text", "text": message}]
            display_message = message
        else:
            content_parts = message
            # 提取文本用于文件记录
            display_message = " ".join([
                p["text"] if p["type"] == "text" else "[图片]"
                for p in content_parts
            ])
        
        # 记录用户消息（简化版本）
        self._append_to_file("User", display_message)
        
        if MOCK_MODE:
            # Mock 模式：模拟带有 thinking 和历史记忆的响应
            
            # 提取文本用于历史记录
            if isinstance(message, list):
                text_parts = [p["text"] for p in message if p["type"] == "text"]
                message_text = " ".join(text_parts)
                has_image = any(p["type"] == "image_url" for p in message)
            else:
                message_text = message
                has_image = False
            
            # 添加到历史
            self._mock_history.append({"role": "user", "content": message_text})
            
            # 根据历史生成响应
            history_len = len(self._mock_history)
            mock_thinking = f"<think>\n这是第 {history_len//2 + 1} 轮对话\n用户消息: {message_text[:30]}...\n历史消息数: {history_len}\n</think>\n\n"
            
            # 生成带有历史信息的响应
            if has_image:
                mock_output = "我看到你发送了一张图片。作为模拟助手，我无法真正识别图片内容，但我会假装能看到它！"
            elif history_len == 1:
                mock_output = f"你好！我是模拟助手。你说的是：'{message_text[:30]}...'"
            elif "记住" in message_text or "历史" in message_text:
                mock_output = f"我记得我们的对话历史，目前有 {history_len//2} 轮对话。"
            else:
                mock_output = f"收到（第 {history_len//2 + 1} 轮）: '{message_text[:30]}...'"
            
            # 流式输出 thinking（如果回调存在）
            if thinking_callback:
                for char in mock_thinking:
                    if self._stop_event.is_set():
                        break
                    thinking_callback(char)
                    await asyncio.sleep(0.001)
            
            # 模拟工具调用事件（在 thinking 之后，output 之前）
            if event_callback:
                event_callback({"type": "tool_call", "data": {"id": "mock-1", "name": "shell", "arguments": "{\"command\": \"echo hello\"}"}})
                await asyncio.sleep(0.2)
                event_callback({"type": "tool_result", "data": {"id": "mock-1", "status": "completed", "result": "hello"}})
                await asyncio.sleep(0.1)
            
            stopped = False
            
            # 流式输出
            for char in mock_output:
                if self._stop_event.is_set():
                    stopped = True
                    break
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
                "events": [],
                "stopped": stopped
            }
        
        # 清空客户端状态
        self._client.clear()
        
        # 构建 ACP 内容块
        if isinstance(message, list):
            # 多模态输入
            prompt_blocks = []
            for part in message:
                if part["type"] == "text":
                    prompt_blocks.append(text_block(part["text"]))
                elif part["type"] == "image_url":
                    url = part["image_url"]["url"]
                    if url.startswith("data:"):
                        # 解析 data URI
                        try:
                            mime_part, b64_data = url.split(",", 1)
                            mime_type = mime_part.split(";")[0].replace("data:", "") or "image/png"
                            prompt_blocks.append(acp.schema.ImageContentBlock(
                                type="image",
                                mime_type=mime_type,
                                data=b64_data
                            ))
                        except Exception as e:
                            logger.warning(f"[{self.id}] Failed to parse image data URI: {e}")
            if not prompt_blocks:
                prompt_blocks = [text_block("")]
        else:
            prompt_blocks = [text_block(message)]
        
        # 发送消息
        logger.debug(f"[{self.id}] Sending prompt to ACP with {len(prompt_blocks)} block(s)...")
        response_task = asyncio.create_task(
            self._conn.prompt(
                session_id=self._session_id,
                prompt=prompt_blocks,
            )
        )
        logger.debug(f"[{self.id}] Prompt task created")
        
        output_parts = []
        thinking_parts = []
        all_events = []
        
        loop_count = 0
        no_data_count = 0
        stopped = False
        
        try:
            logger.debug(f"[{self.id}] Entering response loop")
            while True:
                loop_count += 1
                
                # 检查是否请求停止
                if self._stop_event.is_set():
                    logger.info(f"[{self.id}] Stop requested, breaking loop")
                    stopped = True
                    break
                
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
            "events": all_events,
            "stopped": stopped
        }
    
    def stop_generation(self) -> bool:
        """
        请求停止当前生成
        
        Returns:
            是否成功触发停止
        """
        if not self._processing_lock.locked():
            # 没有正在处理的消息
            return False
        
        logger.info(f"[{self.id}] Stop generation requested")
        self._stop_event.set()
        return True
    
    def send_message_sync(
        self, 
        message: str | list[dict], 
        chunk_callback: Callable[[str], None],
        thinking_callback: Optional[Callable[[str], None]] = None,
        event_callback: Optional[Callable[[dict], None]] = None
    ) -> dict:
        """
        同步接口：在 session 的专用 event loop 中执行发送
        使用锁确保同一个 session 的消息顺序处理
        
        Args:
            message: 字符串或内容部件列表（支持多模态）
        
        Returns:
            {"thinking": str|None, "output": str, "has_thinking": bool, "events": list, "stopped": bool}
        """
        # 清除停止标志
        self._stop_event.clear()
        
        # 获取处理锁，阻塞等待前一个消息完成
        with self._processing_lock:
            if isinstance(message, str):
                log_preview = message[:50]
            else:
                text_parts = [p["text"] for p in message if p["type"] == "text"]
                img_count = sum(1 for p in message if p["type"] == "image_url")
                preview = " ".join(text_parts)[:50] if text_parts else ""
                log_preview = f"{preview} (+{img_count} images)"
            logger.info(f"[{self.id}] send_message_sync: {log_preview}...")
            
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
