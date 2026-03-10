#!/usr/bin/env python3
"""
MockCraft API
"""

import logging
from flask import Blueprint, request, jsonify

from ..config import MOCKCRAFT_AVAILABLE

bp = Blueprint('mockcraft', __name__, url_prefix='/api/mockcraft')

logger = logging.getLogger('webchat')

# MockCraft manager instance (will be set in create_app)
mockcraft_manager = None


def init_mockcraft_manager(manager):
    global mockcraft_manager
    mockcraft_manager = manager


@bp.route("/prototypes", methods=["GET"])
def list_prototypes():
    """获取原型列表"""
    if not mockcraft_manager:
        return jsonify({"error": "MockCraft not available"}), 503
    
    session_id = request.args.get("session_id")
    prototypes = mockcraft_manager.list_prototypes(session_id)
    return jsonify({"prototypes": prototypes})


@bp.route("/project-files", methods=["GET"])
def list_project_files():
    """获取项目文件列表（prototypes目录下的HTML文件）"""
    if not mockcraft_manager:
        return jsonify({"error": "MockCraft not available"}), 503
    
    files = mockcraft_manager.list_project_files()
    return jsonify({"files": files})


@bp.route("/project-files/<path:filename>", methods=["GET"])
def get_project_file(filename):
    """获取项目文件内容"""
    if not mockcraft_manager:
        return jsonify({"error": "MockCraft not available"}), 503
    
    content = mockcraft_manager.get_project_file_content(filename)
    if content is None:
        return jsonify({"error": "File not found"}), 404
    
    return jsonify({"content": content})


@bp.route("/prototypes", methods=["POST"])
def create_prototype():
    """创建新原型"""
    if not mockcraft_manager:
        return jsonify({"error": "MockCraft not available"}), 503
    
    data = request.get_json(force=True, silent=True) or {}
    
    name = data.get("name", "Untitled Prototype")
    html_content = data.get("html_content", "")
    session_id = data.get("session_id", "")
    interactions = data.get("interactions", [])
    state_schema = data.get("state_schema", {})
    
    if not html_content:
        return jsonify({"error": "html_content is required"}), 400
    
    try:
        prototype = mockcraft_manager.create_prototype(
            name=name,
            html_content=html_content,
            session_id=session_id,
            interactions=interactions,
            state_schema=state_schema
        )
        return jsonify({"prototype": prototype.to_list_item()}), 201
    except Exception as e:
        logger.exception("Error creating prototype")
        return jsonify({"error": str(e)}), 500


@bp.route("/prototypes/<proto_id>", methods=["GET"])
def get_prototype(proto_id):
    """获取原型详情"""
    if not mockcraft_manager:
        return jsonify({"error": "MockCraft not available"}), 503
    
    prototype = mockcraft_manager.get_prototype(proto_id)
    if not prototype:
        return jsonify({"error": "Prototype not found"}), 404
    
    return jsonify({
        "prototype": prototype.to_dict(),
        "html_content": prototype.html_content
    })


@bp.route("/prototypes/<proto_id>", methods=["PUT"])
def update_prototype(proto_id):
    """更新原型（创建新版本）"""
    if not mockcraft_manager:
        return jsonify({"error": "MockCraft not available"}), 503
    
    data = request.get_json(force=True, silent=True) or {}
    
    try:
        prototype = mockcraft_manager.update_prototype(
            proto_id=proto_id,
            html_content=data.get("html_content"),
            name=data.get("name"),
            interactions=data.get("interactions"),
            state_schema=data.get("state_schema")
        )
        
        if not prototype:
            return jsonify({"error": "Prototype not found"}), 404
        
        return jsonify({"prototype": prototype.to_list_item()})
    except Exception as e:
        logger.exception("Error updating prototype")
        return jsonify({"error": str(e)}), 500


@bp.route("/prototypes/<proto_id>", methods=["DELETE"])
def delete_prototype(proto_id):
    """删除原型"""
    if not mockcraft_manager:
        return jsonify({"error": "MockCraft not available"}), 503
    
    success = mockcraft_manager.delete_prototype(proto_id)
    if success:
        return jsonify({"success": True})
    return jsonify({"error": "Prototype not found"}), 404


@bp.route("/prototypes/<proto_id>/render", methods=["POST"])
def render_prototype(proto_id):
    """渲染原型，应用状态"""
    if not mockcraft_manager:
        return jsonify({"error": "MockCraft not available"}), 503
    
    data = request.get_json(force=True, silent=True) or {}
    state = data.get("state")
    
    html = mockcraft_manager.render_prototype(proto_id, state)
    if html is None:
        return jsonify({"error": "Prototype not found"}), 404
    
    return jsonify({"html": html})


@bp.route("/prototypes/<proto_id>/state", methods=["GET"])
def get_prototype_state(proto_id):
    """获取原型当前状态"""
    if not mockcraft_manager:
        return jsonify({"error": "MockCraft not available"}), 503
    
    state = mockcraft_manager.get_state(proto_id)
    if state is None:
        return jsonify({"error": "Prototype not found"}), 404
    
    return jsonify({"state": state})


@bp.route("/prototypes/<proto_id>/state", methods=["POST"])
def update_prototype_state(proto_id):
    """更新原型状态"""
    if not mockcraft_manager:
        return jsonify({"error": "MockCraft not available"}), 503
    
    data = request.get_json(force=True, silent=True) or {}
    state_update = data.get("state", {})
    
    new_state = mockcraft_manager.update_state(proto_id, state_update)
    if new_state is None:
        return jsonify({"error": "Prototype not found"}), 404
    
    return jsonify({"state": new_state})


@bp.route("/prototypes/<proto_id>/interactions", methods=["GET"])
def list_interactions(proto_id):
    """获取原型交互定义"""
    if not mockcraft_manager:
        return jsonify({"error": "MockCraft not available"}), 503
    
    interactions = mockcraft_manager.list_interactions(proto_id)
    return jsonify({"interactions": interactions})


@bp.route("/prototypes/<proto_id>/execute", methods=["POST"])
def execute_interaction(proto_id):
    """执行交互"""
    if not mockcraft_manager:
        return jsonify({"error": "MockCraft not available"}), 503
    
    data = request.get_json(force=True, silent=True) or {}
    interaction_id = data.get("interaction_id")
    value = data.get("value")
    
    if not interaction_id:
        return jsonify({"error": "interaction_id is required"}), 400
    
    result = mockcraft_manager.execute_interaction(proto_id, interaction_id, value)
    if result is None:
        return jsonify({"error": "Prototype or interaction not found"}), 404
    
    return jsonify(result)
