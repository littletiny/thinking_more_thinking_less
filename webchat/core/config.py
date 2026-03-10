#!/usr/bin/env python3
"""
配置常量
"""

import os
import sys
import logging
from pathlib import Path

# ============== Path Setup ==============

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# ============== Logging ==============

logging.basicConfig(
    level=logging.WARNING,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(threadName)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('webchat')

# ============== ACP Availability ==============

try:
    import acp
    from acp import spawn_agent_process, text_block
    from acp.schema import ClientCapabilities, FileSystemCapability, Implementation
    ACP_AVAILABLE = True
except ImportError:
    ACP_AVAILABLE = False
    print("⚠️ ACP not available, running in mock mode")

# ============== Format Utils ==============

try:
    from format_utils import (
        format_directory_listing,
        parse_and_format_response,
        ResponseParser,
    )
    FORMAT_UTILS_AVAILABLE = True
except ImportError:
    FORMAT_UTILS_AVAILABLE = False
    logger.warning("format_utils not available")

# ============== Configuration ==============

MOCK_MODE = os.environ.get("MOCK_MODE", "false").lower() == "true" or not ACP_AVAILABLE
YOLO_MODE = os.environ.get("YOLO_MODE", "true").lower() == "true"  # 默认启用 yolo 模式，自动批准所有权限请求

if MOCK_MODE:
    DATA_DIR = Path(__file__).parent.parent / "mock_data"
    CONVERSATIONS_DIR = DATA_DIR / "conversations"
    METADATA_PATH = DATA_DIR / "sessions.json"
else:
    DATA_DIR = Path(__file__).parent.parent.parent
    CONVERSATIONS_DIR = DATA_DIR / "conversations"
    METADATA_PATH = Path(__file__).parent.parent / "sessions.json"

DATA_DIR.mkdir(parents=True, exist_ok=True)
CONVERSATIONS_DIR.mkdir(parents=True, exist_ok=True)

logger.info(f"MOCK_MODE: {MOCK_MODE}")


# ============== MockCraft Availability ==============

try:
    from mockcraft import MockCraftManager, PrototypeStore
    MOCKCRAFT_AVAILABLE = True
except ImportError as e:
    MOCKCRAFT_AVAILABLE = False
    logger.warning(f"MockCraft not available: {e}")
