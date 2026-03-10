#!/usr/bin/env python3
"""
Session Manager
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
from uuid import uuid4

from .config import METADATA_PATH, CONVERSATIONS_DIR
from .models import SessionMeta
from .sessions import BaseSession, WebSession

logger = logging.getLogger('webchat')


class SessionManager:
    """管理所有 sessions"""
    
    def __init__(self):
        self._sessions: Dict[str, BaseSession] = {}
        self._load_metadata()
        logger.info("SessionManager initialized")
    
    def _load_metadata(self):
        if METADATA_PATH.exists():
            data = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
            self._metadata = {
                item["id"]: SessionMeta.from_dict(item) 
                for item in data.get("sessions", [])
            }
            logger.info(f"Loaded {len(self._metadata)} sessions")
        else:
            self._metadata = {}
    
    def _save_metadata(self):
        data = {"sessions": [meta.to_dict() for meta in self._metadata.values()]}
        METADATA_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    
    def create_web_session(self, title: Optional[str] = None, cwd: str = ".") -> WebSession:
        session_id = uuid4().hex[:8]
        now = datetime.now().isoformat()
        
        meta = SessionMeta(
            id=session_id,
            type="web",
            source="spawned",
            title=title or session_id,
            file=f"conversations/{session_id}.md",
            created_at=now,
            updated_at=now,
            status="active",
            message_count=0,
            cwd=cwd  # 保存cwd到metadata
        )
        
        self._metadata[session_id] = meta
        self._save_metadata()
        
        # 创建回调函数来同步 acp_session_id
        def on_acp_session_id_changed(acp_session_id: str):
            self.sync_acp_session_id(session_id, acp_session_id)
        
        session = WebSession(meta, cwd=cwd, on_acp_session_id_changed=on_acp_session_id_changed)
        self._sessions[session_id] = session
        
        logger.info(f"Created web session: {session_id}")
        return session
    
    def get_session(self, session_id: str) -> Optional[BaseSession]:
        if session_id in self._sessions:
            session = self._sessions[session_id]
            # 检查 WebSession 的 ACP 是否还活着
            if isinstance(session, WebSession) and not session._is_acp_alive():
                logger.warning(f"[{session_id}] ACP dead, removing from cache")
                del self._sessions[session_id]
                session = None
            else:
                return session
        
        if session_id in self._metadata:
            meta = self._metadata[session_id]
            if meta.type == "web":
                # 创建回调函数来同步 acp_session_id
                def on_acp_session_id_changed(acp_session_id: str):
                    self.sync_acp_session_id(session_id, acp_session_id)
                
                # 使用保存的cwd恢复session
                session_cwd = meta.cwd if meta.cwd else "."
                session = WebSession(meta, cwd=session_cwd, on_acp_session_id_changed=on_acp_session_id_changed)
                self._sessions[session_id] = session
                return session
        
        return None
    
    def list_sessions(self, include_inactive: bool = True) -> List[SessionMeta]:
        sessions = list(self._metadata.values())
        active = [s for s in sessions if s.status == "active"]
        archived = [s for s in sessions if s.status == "archived"]
        closed = [s for s in sessions if s.status == "closed"]
        
        active.sort(key=lambda x: x.last_accessed_at or x.updated_at, reverse=True)
        archived.sort(key=lambda x: x.last_accessed_at or x.updated_at, reverse=True)
        closed.sort(key=lambda x: x.updated_at, reverse=True)
        
        if include_inactive:
            return active + archived + closed
        else:
            return active
    
    def close_session(self, session_id: str) -> bool:
        logger.info(f"Closing session: {session_id}")
        session = self.get_session(session_id)
        if not session:
            return False
        
        if not session.can_close:
            raise RuntimeError("Session cannot be closed")
        
        success = session.close_sync()
        if success:
            self._metadata[session_id].status = "closed"
            self._metadata[session_id].updated_at = datetime.now().isoformat()
            self._save_metadata()
            if session_id in self._sessions:
                del self._sessions[session_id]
        
        return success
    
    def archive_session(self, session_id: str) -> bool:
        if session_id not in self._metadata:
            return False
        
        meta = self._metadata[session_id]
        if meta.status == "closed":
            raise RuntimeError("Cannot archive closed session")
        
        meta.status = "archived"
        meta.updated_at = datetime.now().isoformat()
        self._save_metadata()
        return True
    
    def unarchive_session(self, session_id: str) -> bool:
        if session_id not in self._metadata:
            return False
        
        meta = self._metadata[session_id]
        if meta.status == "active":
            raise RuntimeError("Session is already active")
        
        meta.status = "active"
        meta.last_accessed_at = datetime.now().isoformat()
        self._save_metadata()
        return True
    
    def touch_session(self, session_id: str):
        if session_id in self._metadata:
            self._metadata[session_id].last_accessed_at = datetime.now().isoformat()
            self._save_metadata()
    
    def update_title(self, session_id: str, title: str) -> bool:
        if session_id not in self._metadata:
            return False
        
        self._metadata[session_id].title = title
        self._metadata[session_id].updated_at = datetime.now().isoformat()
        self._save_metadata()
        return True
    
    def sync_acp_session_id(self, session_id: str, acp_session_id: str) -> bool:
        """同步 ACP session id 到 metadata"""
        if session_id not in self._metadata:
            return False
        
        if self._metadata[session_id].acp_session_id != acp_session_id:
            self._metadata[session_id].acp_session_id = acp_session_id
            self._save_metadata()
            logger.debug(f"[{session_id}] Synced acp_session_id: {acp_session_id}")
        return True
    
    def delete_session(self, session_id: str) -> bool:
        logger.info(f"Deleting session: {session_id}")
        if session_id not in self._metadata:
            return False
        
        if session_id in self._sessions:
            session = self._sessions[session_id]
            if session.can_close:
                try:
                    session.close_sync()
                except:
                    pass
            del self._sessions[session_id]
        
        del self._metadata[session_id]
        self._save_metadata()
        
        try:
            file_path = CONVERSATIONS_DIR / f"{session_id}.md"
            if file_path.exists():
                file_path.unlink()
        except:
            pass
        
        return True
    
    def get_metadata(self, session_id: str) -> Optional[SessionMeta]:
        """获取 session 的元数据（不创建 session 实例）"""
        return self._metadata.get(session_id)
    
    def has_metadata(self, session_id: str) -> bool:
        """检查 session_id 是否在元数据中"""
        return session_id in self._metadata
