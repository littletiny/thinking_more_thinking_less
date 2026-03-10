#!/usr/bin/env python3
"""
ACP Client
"""

import json
import time
import logging
import threading
import asyncio
from typing import Dict, List, Optional, Tuple

from .config import ACP_AVAILABLE, YOLO_MODE, MOCK_MODE, acp
from .models import ToolCallInfo

logger = logging.getLogger('webchat')


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
            from pathlib import Path
            Path(path).parent.mkdir(parents=True, exist_ok=True)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            return acp.WriteTextFileResponse(success=True)
        except Exception as e:
            return acp.WriteTextFileResponse(success=False, error=str(e))
    
    async def request_permission(self, options, session_id: str, tool_call, **kwargs):
        """处理权限请求 - YOLO 模式下自动批准所有请求"""
        from acp.schema import AllowedOutcome
        
        if YOLO_MODE:
            # YOLO 模式：自动批准，无需用户确认
            logger.info(f"[ACP] YOLO: Auto-approved permission request for {tool_call}")
            outcome = AllowedOutcome(option_id='approve', outcome='selected')
        else:
            # 非 YOLO 模式：可以在这里实现弹窗确认逻辑
            # 目前也默认批准，但记录了请求
            logger.warning(f"[ACP] Permission request (YOLO disabled): {tool_call}")
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
