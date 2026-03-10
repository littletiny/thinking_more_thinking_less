#!/usr/bin/env python3
"""
工具 API
"""

from flask import Blueprint, request, jsonify

from ..config import FORMAT_UTILS_AVAILABLE, format_directory_listing, ResponseParser

bp = Blueprint('tools', __name__, url_prefix='/api')


@bp.route("/tools/format-ls", methods=["POST"])
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
        import logging
        logging.getLogger('webchat').exception("Error formatting ls output")
        return jsonify({"error": str(e)}), 500


@bp.route("/tools/parse-thinking", methods=["POST"])
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
        import logging
        logging.getLogger('webchat').exception("Error parsing thinking")
        return jsonify({"error": str(e)}), 500
