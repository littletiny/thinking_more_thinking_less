#!/usr/bin/env python3
"""
Zettel WebChat - Flask Backend

关键设计：
- 每个 WebSession 有专用的事件循环线程，避免跨线程 event loop 问题
- Flask 请求通过线程安全的方式与 session 的 event loop 通信

代码已拆分到 core/ 目录，此文件仅保留入口点
"""

import os
from core import create_app
from core.config import MOCK_MODE

app = create_app()

if __name__ == "__main__":
    print(f"🚀 Zettel WebChat Server")
    print(f"   Mode: {'MOCK' if MOCK_MODE else 'ACP'}")
    print()
    
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=5000, debug=debug, threaded=True, use_reloader=debug)
