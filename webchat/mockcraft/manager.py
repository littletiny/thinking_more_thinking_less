"""
MockCraft 管理器
"""

from typing import List, Optional, Dict, Any
from .store import PrototypeStore
from .models import Prototype, Interaction


class MockCraftManager:
    """MockCraft 主管理器"""
    
    def __init__(self, store: Optional[PrototypeStore] = None):
        self.store = store or PrototypeStore()
    
    # ========== 原型管理 ==========
    
    def create_prototype(
        self,
        name: str,
        html_content: str,
        session_id: str,
        interactions: Optional[List[dict]] = None,
        state_schema: Optional[dict] = None
    ) -> Prototype:
        """创建新原型"""
        prototype = Prototype.create(
            name=name,
            html_content=html_content,
            session_id=session_id,
            interactions=interactions,
            state_schema=state_schema
        )
        
        self.store.save_prototype(prototype)
        return prototype
    
    def get_prototype(self, proto_id: str) -> Optional[Prototype]:
        """获取原型"""
        return self.store.get_prototype(proto_id)
    
    def list_prototypes(self, session_id: Optional[str] = None) -> List[dict]:
        """列出原型"""
        return self.store.list_prototypes(session_id)
    
    def list_project_files(self) -> List[dict]:
        """列出项目文件（prototypes目录下的HTML文件）"""
        return self.store.list_project_files()
    
    def get_project_file_content(self, filename: str) -> Optional[str]:
        """获取项目文件内容"""
        return self.store.get_project_file_content(filename)
    
    def update_prototype(
        self,
        proto_id: str,
        html_content: Optional[str] = None,
        name: Optional[str] = None,
        interactions: Optional[List[dict]] = None,
        state_schema: Optional[dict] = None
    ) -> Optional[Prototype]:
        """更新原型（仅名称更新时不创建新版本）"""
        existing = self.store.get_prototype(proto_id)
        if not existing:
            return None
        
        # 如果只更新名称，不创建新版本
        if name and html_content is None and interactions is None and state_schema is None:
            existing.name = name
            existing.updated_at = __import__('datetime').datetime.now().isoformat()
            self.store.save_prototype(existing)
            return existing
        
        # Fork新版本（内容变更时）
        new_proto = existing.fork(
            new_html_content=html_content if html_content is not None else None
        )
        
        if name:
            new_proto.name = name
        if interactions is not None:
            new_proto.interactions = [
                Interaction.from_dict(i) if isinstance(i, dict) else i
                for i in interactions
            ]
        if state_schema is not None:
            new_proto.state_schema = state_schema
            # 更新默认值
            for key, config in state_schema.items():
                if isinstance(config, dict) and 'default' in config:
                    new_proto.current_state[key] = config['default']
        
        self.store.save_prototype(new_proto)
        return new_proto
    
    def delete_prototype(self, proto_id: str) -> bool:
        """删除原型"""
        return self.store.delete_prototype(proto_id)
    
    # ========== 状态管理 ==========
    
    def update_state(self, proto_id: str, state_update: dict) -> Optional[dict]:
        """更新原型状态"""
        prototype = self.store.get_prototype(proto_id)
        if not prototype:
            return None
        
        new_state = prototype.update_state(state_update)
        self.store.save_prototype(prototype)
        return new_state
    
    def get_state(self, proto_id: str) -> Optional[dict]:
        """获取当前状态"""
        prototype = self.store.get_prototype(proto_id)
        if not prototype:
            return None
        return prototype.current_state
    
    def render_prototype(
        self,
        proto_id: str,
        state: Optional[dict] = None
    ) -> Optional[str]:
        """渲染原型"""
        prototype = self.store.get_prototype(proto_id)
        if not prototype:
            return None
        
        return prototype.render(state)
    
    # ========== 交互管理 ==========
    
    def list_interactions(self, proto_id: str) -> List[dict]:
        """列出交互定义"""
        prototype = self.store.get_prototype(proto_id)
        if not prototype:
            return []
        return [i.to_dict() for i in prototype.interactions]
    
    def execute_interaction(
        self,
        proto_id: str,
        interaction_id: str,
        value: Any = None
    ) -> Optional[dict]:
        """执行交互，返回新状态"""
        prototype = self.store.get_prototype(proto_id)
        if not prototype:
            return None
        
        # 找到交互定义
        interaction = None
        for inter in prototype.interactions:
            if inter.id == interaction_id:
                interaction = inter
                break
        
        if not interaction:
            return None
        
        # 计算状态更新
        state_update = {}
        for key, val in interaction.target_state.items():
            if val == '${value}':
                state_update[key] = value
            else:
                state_update[key] = val
        
        new_state = prototype.update_state(state_update)
        self.store.save_prototype(prototype)
        
        return {
            'state': new_state,
            'applied_update': state_update
        }
    
    # ========== 生成辅助 ==========
    
    def generate_from_prompt(
        self,
        prompt: str,
        session_id: str,
        existing_proto_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        根据自然语言提示生成原型配置
        返回包含 name, html_content, interactions, state_schema 的字典
        """
        # 这是一个辅助方法，实际生成由LLM完成
        # 这里返回结构模板
        return {
            'name': '',
            'html_content': '',
            'interactions': [],
            'state_schema': {},
            'prompt': prompt,
            'session_id': session_id,
            'existing_proto_id': existing_proto_id
        }
