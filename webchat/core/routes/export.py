#!/usr/bin/env python3
"""
导出功能
"""

from flask import Blueprint, Response

from ..session_manager import SessionManager
from ..config import CONVERSATIONS_DIR

bp = Blueprint('export', __name__, url_prefix='/api')

# Session manager instance (will be set in create_app)
session_manager: SessionManager = None


def init_session_manager(sm: SessionManager):
    global session_manager
    session_manager = sm


@bp.route("/sessions/<session_id>/export", methods=["GET"])
def export_session(session_id):
    """
    导出 session 的完整聊天记录为 markdown 文件
    
    Response:
        直接返回 markdown 文件内容，触发浏览器下载
    """
    if not session_manager.has_metadata(session_id):
        from flask import jsonify
        return jsonify({"error": "Session not found"}), 404
    
    meta = session_manager.get_metadata(session_id)
    file_path = CONVERSATIONS_DIR / meta.file.replace("conversations/", "")
    
    if not file_path.exists():
        # 如果没有对话文件，返回一个空的 markdown
        content = f"""# {meta.title}

## Metadata
- **Session ID**: {meta.id}
- **Type**: {meta.type}
- **Created**: {meta.created_at}

---

## Messages

_No messages yet._
"""
    else:
        content = file_path.read_text(encoding="utf-8")
    
    # 生成安全的文件名
    safe_title = "".join(c for c in meta.title if c.isalnum() or c in "-_ ").strip()
    filename = f"{safe_title}_{session_id[:8]}.md"
    
    response = Response(
        content,
        mimetype="text/markdown",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
    response.headers["Content-Type"] = "text/markdown; charset=utf-8"
    return response
