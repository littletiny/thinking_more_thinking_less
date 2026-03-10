#!/usr/bin/env python3
"""
Session Info 路由
"""

from flask import Blueprint, jsonify

from ..session_manager import SessionManager
from ..sessions import WebSession
from ..config import MOCK_MODE

bp = Blueprint('session_info', __name__, url_prefix='/api')

# Session manager instance (will be set in create_app)
session_manager: SessionManager = None


def init_session_manager(sm: SessionManager):
    global session_manager
    session_manager = sm


@bp.route("/sessions/<session_id>/info", methods=["GET"])
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
    if not session_manager.has_metadata(session_id):
        return jsonify({"error": "Session not found"}), 404
    
    meta = session_manager.get_metadata(session_id)
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
