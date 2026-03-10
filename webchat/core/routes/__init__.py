#!/usr/bin/env python3
"""
路由注册
"""

from flask import Flask, Blueprint

from . import sessions, chat, tools, export, messages, mockcraft, session_info
from ..session_manager import SessionManager
from ..config import MOCKCRAFT_AVAILABLE, logger


def init_routes(app: Flask, session_manager: SessionManager, mockcraft_manager=None):
    """初始化并注册所有蓝图"""
    
    # 初始化 session_manager 到各个蓝图
    sessions.init_session_manager(session_manager)
    chat.init_session_manager(session_manager)
    messages.init_session_manager(session_manager)
    export.init_session_manager(session_manager)
    session_info.init_session_manager(session_manager)
    
    # 初始化 mockcraft_manager
    mockcraft.init_mockcraft_manager(mockcraft_manager)
    
    # 注册蓝图
    app.register_blueprint(sessions.bp)
    app.register_blueprint(chat.bp)
    app.register_blueprint(tools.bp)
    app.register_blueprint(export.bp)
    app.register_blueprint(messages.bp)
    app.register_blueprint(mockcraft.bp)
    app.register_blueprint(session_info.bp)
    
    logger.info("All routes registered")
