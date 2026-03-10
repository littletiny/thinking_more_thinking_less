#!/usr/bin/env python3
"""
聊天 SSE 路由
"""

import json
import threading
import logging
from queue import Queue

from flask import Blueprint, request, jsonify, Response, stream_with_context

from ..session_manager import SessionManager
from ..message_parser import _parse_message_content, _extract_text_from_content

bp = Blueprint('chat', __name__, url_prefix='/api')

logger = logging.getLogger('webchat')

# Session manager instance (will be set in create_app)
session_manager: SessionManager = None


def init_session_manager(sm: SessionManager):
    global session_manager
    session_manager = sm


@bp.route("/sessions/<session_id>/stop", methods=["POST"])
def stop_generation(session_id):
    """
    停止当前正在生成的响应
    
    Response:
        {"success": true, "stopped": true}  - 成功触发停止
        {"success": false, "error": "..."}  - 停止失败或没有正在生成的响应
    """
    logger.info(f"API: stop_generation {session_id}")
    
    session = session_manager.get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    # 调用 session 的停止方法
    stopped = session.stop_generation()
    
    if stopped:
        return jsonify({"success": True, "stopped": True, "message": "Stop signal sent"})
    else:
        return jsonify({"success": False, "error": "No generation in progress"}), 400


@bp.route("/sessions/<session_id>/chat", methods=["POST"])
def chat(session_id):
    """
    发送消息，SSE 流式返回
    
    使用 session 的专用 event loop 处理，避免跨线程问题
    支持的事件类型: thinking, chunk, event (tool_call, step_begin, tool_result, etc.), done, error
    
    支持多模态输入:
    - 纯文本: {"message": "hello"}
    - 带图片: {"message": [{"type": "text", "text": "hello"}, {"type": "image_url", "image_url": {"url": "data:image/png;base64,..."}}]}
    """
    logger.info(f"API: chat {session_id}")
    
    session = session_manager.get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    session_manager.touch_session(session_id)
    
    data = request.get_json(force=True, silent=True) or {}
    message_data = data.get("message", "")
    
    # 解析消息内容（支持字符串或数组）
    content_parts = _parse_message_content(message_data)
    if not content_parts:
        return jsonify({"error": "Message required"}), 400
    
    # 提取文本用于显示
    text_content = _extract_text_from_content(content_parts)
    
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
                # 传递多模态内容
                result = session.send_message_sync(content_parts, chunk_callback, thinking_callback, event_callback)
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
