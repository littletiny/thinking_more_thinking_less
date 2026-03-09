"""
MockCraft 存储管理
"""

import json
import os
from pathlib import Path
from typing import List, Optional, Dict, Any
from .models import Prototype, Interaction


class PrototypeStore:
    """原型文件存储"""
    
    def __init__(self, base_dir: str = None):
        if base_dir is None:
            base_dir = Path(__file__).parent.parent
        
        self.base_dir = Path(base_dir)
        self.prototypes_dir = self.base_dir / 'prototypes'
        self.index_file = self.base_dir / 'mockcraft_index.json'
        
        # 确保目录存在
        self.prototypes_dir.mkdir(parents=True, exist_ok=True)
        
        # 初始化索引文件
        if not self.index_file.exists():
            self._save_index({"prototypes": []})
    
    def _load_index(self) -> dict:
        """加载索引"""
        try:
            with open(self.index_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {"prototypes": []}
    
    def _save_index(self, index: dict):
        """保存索引"""
        with open(self.index_file, 'w', encoding='utf-8') as f:
            json.dump(index, f, ensure_ascii=False, indent=2)
    
    def _get_proto_file(self, proto_id: str, version: int) -> Path:
        """获取原型文件路径"""
        return self.prototypes_dir / f"{proto_id}-v{version}.html"
    
    def list_prototypes(self, session_id: Optional[str] = None) -> List[dict]:
        """获取原型列表（每个原型只返回最新版本）"""
        index = self._load_index()
        prototypes = index.get('prototypes', [])
        
        if session_id:
            prototypes = [p for p in prototypes if p.get('session_id') == session_id]
        
        # 按原型ID分组，只保留每个原型的最新版本
        proto_by_id = {}
        for p in prototypes:
            pid = p['id']
            if pid not in proto_by_id or p.get('version', 1) > proto_by_id[pid].get('version', 1):
                proto_by_id[pid] = p
        
        # 转换为列表并按更新时间排序
        result = list(proto_by_id.values())
        result.sort(key=lambda x: x.get('updated_at', ''), reverse=True)
        return result
    
    def get_prototype(self, proto_id: str) -> Optional[Prototype]:
        """获取完整原型"""
        index = self._load_index()
        proto_info = None
        
        for p in index.get('prototypes', []):
            if p['id'] == proto_id:
                proto_info = p
                break
        
        if not proto_info:
            return None
        
        # 读取HTML文件
        html_file = self._get_proto_file(proto_id, proto_info['version'])
        html_content = ''
        if html_file.exists():
            html_content = html_file.read_text(encoding='utf-8')
        
        # 构建Prototype对象
        interactions = [
            Interaction.from_dict(i) if isinstance(i, dict) else i
            for i in proto_info.get('interactions', [])
        ]
        
        from datetime import datetime
        
        now = datetime.now().isoformat()
        return Prototype(
            id=proto_id,
            name=proto_info.get('name', 'Untitled'),
            html_content=html_content,
            session_id=proto_info.get('session_id', ''),
            created_at=proto_info.get('created_at', now),
            updated_at=proto_info.get('updated_at', now),
            version=proto_info.get('version', 1),
            interactions=interactions,
            state_schema=proto_info.get('state_schema', {}),
            current_state=proto_info.get('current_state', {})
        )
    
    def save_prototype(self, prototype: Prototype) -> bool:
        """保存原型"""
        try:
            # 1. 保存HTML文件
            html_file = self._get_proto_file(prototype.id, prototype.version)
            html_file.write_text(prototype.html_content, encoding='utf-8')
            
            # 2. 更新索引
            index = self._load_index()
            prototypes = index.get('prototypes', [])
            
            # 查找是否已存在
            existing_idx = None
            for i, p in enumerate(prototypes):
                if p['id'] == prototype.id and p['version'] == prototype.version:
                    existing_idx = i
                    break
            
            # 准备列表项数据（不含完整HTML）
            list_item = prototype.to_list_item()
            list_item['interactions'] = prototype.to_dict()['interactions']
            list_item['state_schema'] = prototype.state_schema
            list_item['current_state'] = prototype.current_state
            
            if existing_idx is not None:
                prototypes[existing_idx] = list_item
            else:
                prototypes.append(list_item)
            
            index['prototypes'] = prototypes
            self._save_index(index)
            
            return True
        except Exception as e:
            print(f"Error saving prototype: {e}")
            return False
    
    def delete_prototype(self, proto_id: str) -> bool:
        """删除原型（所有版本）"""
        try:
            index = self._load_index()
            prototypes = index.get('prototypes', [])
            
            # 找到所有版本
            versions_to_delete = []
            new_prototypes = []
            
            for p in prototypes:
                if p['id'] == proto_id:
                    versions_to_delete.append(p['version'])
                else:
                    new_prototypes.append(p)
            
            # 删除HTML文件
            for version in versions_to_delete:
                html_file = self._get_proto_file(proto_id, version)
                if html_file.exists():
                    html_file.unlink()
            
            # 更新索引
            index['prototypes'] = new_prototypes
            self._save_index(index)
            
            return True
        except Exception as e:
            print(f"Error deleting prototype: {e}")
            return False
    
    def get_versions(self, proto_id: str) -> List[dict]:
        """获取原型的所有版本"""
        index = self._load_index()
        versions = []
        
        for p in index.get('prototypes', []):
            if p['id'] == proto_id:
                versions.append({
                    'version': p['version'],
                    'updated_at': p['updated_at'],
                    'interactions_count': p.get('interactions_count', 0)
                })
        
        versions.sort(key=lambda x: x['version'], reverse=True)
        return versions
