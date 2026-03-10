#!/usr/bin/env python3
"""
WebChat Core Package

提供 create_app() 工厂函数
"""

import os
from flask import Flask
from flask_cors import CORS

from .config import MOCK_MODE, logger
from .session_manager import SessionManager
from .routes import init_routes


def create_app() -> Flask:
    """
    Flask 应用工厂函数
    
    Returns:
        配置好的 Flask 应用实例
    """
    app = Flask(__name__, static_folder='../static')
    CORS(app)
    
    # 初始化 SessionManager
    session_manager = SessionManager()
    
    # 初始化 MockCraft（如果可用）
    mockcraft_manager = None
    from .config import MOCKCRAFT_AVAILABLE
    if MOCKCRAFT_AVAILABLE:
        try:
            from mockcraft import MockCraftManager
            mockcraft_manager = MockCraftManager()
            logger.info("MockCraft manager initialized")
        except Exception as e:
            logger.error(f"Failed to initialize MockCraft: {e}")
    
    # 注册所有路由
    init_routes(app, session_manager, mockcraft_manager)
    
    # 根路由
    @app.route("/")
    def index():
        return app.send_static_file("index.html")
    
    # 存储全局实例（供后续访问）
    app.session_manager = session_manager
    app.mockcraft_manager = mockcraft_manager
    
    return app


__all__ = ['create_app', 'SessionManager']
