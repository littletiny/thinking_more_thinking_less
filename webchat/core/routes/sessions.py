#!/usr/bin/env python3
"""
会话路由
"""

from flask import Blueprint, request, jsonify

from ..session_manager import SessionManager

bp = Blueprint('sessions', __name__, url_prefix='/api')

# Session manager instance (will be set in create_app)
session_manager: SessionManager = None


def init_session_manager(sm: SessionManager):
    global session_manager
    session_manager = sm


@bp.route("/sessions", methods=["GET"])
def list_sessions():
    hide_inactive = request.args.get("hide_inactive", "false").lower() == "true"
    sessions = session_manager.list_sessions(include_inactive=not hide_inactive)
    return jsonify({"sessions": [s.to_dict() for s in sessions]})


@bp.route("/sessions", methods=["POST"])
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


@bp.route("/sessions/<session_id>", methods=["DELETE"])
def close_session(session_id):
    try:
        success = session_manager.close_session(session_id)
        if success:
            return jsonify({"success": True})
        return jsonify({"error": "Session not found"}), 404
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/sessions/<session_id>/title", methods=["PUT"])
def update_title(session_id):
    data = request.get_json(force=True, silent=True) or {}
    title = data.get("title")
    
    if not title:
        return jsonify({"error": "Title required"}), 400
    
    success = session_manager.update_title(session_id, title)
    if success:
        return jsonify({"success": True})
    return jsonify({"error": "Session not found"}), 404


@bp.route("/sessions/<session_id>/archive", methods=["POST"])
def archive_session(session_id):
    try:
        success = session_manager.archive_session(session_id)
        if success:
            return jsonify({"success": True})
        return jsonify({"error": "Session not found"}), 404
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/sessions/<session_id>/unarchive", methods=["POST"])
def unarchive_session(session_id):
    try:
        success = session_manager.unarchive_session(session_id)
        if success:
            return jsonify({"success": True})
        return jsonify({"error": "Session not found"}), 404
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/sessions/<session_id>/delete", methods=["POST"])
def delete_session(session_id):
    success = session_manager.delete_session(session_id)
    if success:
        return jsonify({"success": True})
    return jsonify({"error": "Session not found"}), 404
