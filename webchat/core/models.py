#!/usr/bin/env python3
"""
数据模型
"""

import time
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional


@dataclass
class SessionMeta:
    id: str
    type: str
    source: str
    title: str
    file: str
    created_at: str
    updated_at: str
    status: str
    message_count: int = 0
    last_accessed_at: str = ""
    acp_session_id: str = ""  # kimi-cli session id for session recovery
    cwd: str = "."  # working directory for kimi session
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict) -> "SessionMeta":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


class ToolCallInfo:
    """Tool call 信息"""
    def __init__(self, id: str, name: str, arguments: str):
        self.id = id
        self.name = name
        self.arguments = arguments
        self.status = "pending"  # pending, running, completed, failed
        self.result = None
        self.start_time = time.time()
        self.end_time = None
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "arguments": self.arguments,
            "status": self.status,
            "result": self.result,
            "duration": round(self.end_time - self.start_time, 2) if self.end_time else None
        }


class StepInfo:
    """Step 信息"""
    def __init__(self, n: int):
        self.n = n
        self.status = "running"  # running, completed
        self.tool_calls: List[ToolCallInfo] = []
        self.start_time = time.time()
        self.end_time = None
    
    def to_dict(self) -> dict:
        return {
            "n": self.n,
            "status": self.status,
            "tool_calls": [tc.to_dict() for tc in self.tool_calls],
            "duration": round(self.end_time - self.start_time, 2) if self.end_time else None
        }
