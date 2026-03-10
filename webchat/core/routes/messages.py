#!/usr/bin/env python3
"""
消息路由
"""

from flask import Blueprint, jsonify

from ..session_manager import SessionManager
from ..config import CONVERSATIONS_DIR
from ..message_parser import parse_conversation_messages

bp = Blueprint('messages', __name__, url_prefix='/api')

# Session manager instance (will be set in create_app)
session_manager: SessionManager = None


def init_session_manager(sm: SessionManager):
    global session_manager
    session_manager = sm


@bp.route("/sessions/<session_id>/messages", methods=["GET"])
def get_messages(session_id):
    if not session_manager.has_metadata(session_id):
        return jsonify({"error": "Session not found"}), 404
    
    meta = session_manager.get_metadata(session_id)
    file_path = CONVERSATIONS_DIR / meta.file.replace("conversations/", "")
    
    messages = []
    if file_path.exists():
        content = file_path.read_text(encoding="utf-8")
        messages = parse_conversation_messages(content)
    
    return jsonify({"messages": messages})
