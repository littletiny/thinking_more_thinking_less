"""
MockCraft 数据模型
"""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any
from datetime import datetime
import uuid


@dataclass
class Interaction:
    """交互定义"""
    id: str
    name: str
    type: str  # click | input | select
    selector: str
    target_state: Dict[str, Any]
    
    @classmethod
    def from_dict(cls, data: dict) -> "Interaction":
        return cls(
            id=data.get('id', str(uuid.uuid4())[:8]),
            name=data['name'],
            type=data['type'],
            selector=data['selector'],
            target_state=data.get('target_state', {})
        )
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Prototype:
    """原型定义"""
    id: str
    name: str
    html_content: str
    session_id: str
    created_at: str
    updated_at: str
    version: int
    interactions: List[Interaction] = field(default_factory=list)
    state_schema: Dict[str, Any] = field(default_factory=dict)
    current_state: Dict[str, Any] = field(default_factory=dict)
    
    @classmethod
    def create(
        cls,
        name: str,
        html_content: str,
        session_id: str,
        interactions: Optional[List[dict]] = None,
        state_schema: Optional[dict] = None,
        base_prototype_id: Optional[str] = None
    ) -> "Prototype":
        """创建新原型"""
        now = datetime.now().isoformat()
        proto_id = base_prototype_id or f"pr-{str(uuid.uuid4())[:8]}"
        
        # 处理interactions
        interaction_objs = []
        if interactions:
            for inter in interactions:
                if isinstance(inter, dict):
                    interaction_objs.append(Interaction.from_dict(inter))
                else:
                    interaction_objs.append(inter)
        
        # 处理state_schema的默认值
        schema = state_schema or {}
        default_state = {}
        for key, config in schema.items():
            if isinstance(config, dict):
                default_state[key] = config.get('default', '')
            else:
                default_state[key] = ''
        
        return cls(
            id=proto_id,
            name=name,
            html_content=html_content,
            session_id=session_id,
            created_at=now,
            updated_at=now,
            version=1,
            interactions=interaction_objs,
            state_schema=schema,
            current_state=default_state
        )
    
    def fork(self, new_html_content: Optional[str] = None) -> "Prototype":
        """创建新版本（fork）"""
        now = datetime.now().isoformat()
        return Prototype(
            id=self.id,  # 保持相同ID
            name=self.name,
            html_content=new_html_content or self.html_content,
            session_id=self.session_id,
            created_at=self.created_at,
            updated_at=now,
            version=self.version + 1,
            interactions=self.interactions.copy(),
            state_schema=self.state_schema.copy(),
            current_state=self.current_state.copy()
        )
    
    def update_state(self, new_state: dict) -> dict:
        """更新状态，返回应用后的状态"""
        self.current_state.update(new_state)
        self.updated_at = datetime.now().isoformat()
        return self.current_state
    
    def render(self, state: Optional[dict] = None) -> str:
        """渲染HTML，替换状态变量"""
        html = self.html_content
        render_state = state or self.current_state
        
        # 替换 {{variable}} 格式的占位符
        import re
        def replace_var(match):
            var_name = match.group(1)
            return str(render_state.get(var_name, match.group(0)))
        
        html = re.sub(r'\{\{(\w+)\}\}', replace_var, html)
        
        # 添加交互脚本
        if self.interactions:
            interaction_script = self._generate_interaction_script()
            if '</body>' in html:
                html = html.replace('</body>', f'{interaction_script}</body>')
            else:
                html += interaction_script
        
        return html
    
    def _generate_interaction_script(self) -> str:
        """生成交互脚本"""
        interactions_json = []
        for inter in self.interactions:
            interactions_json.append({
                'id': inter.id,
                'type': inter.type,
                'selector': inter.selector,
                'targetState': inter.target_state
            })
        
        script = f'''
<script>
(function() {{
    const interactions = {interactions_json};
    
    interactions.forEach(inter => {{
        const elements = document.querySelectorAll(inter.selector);
        elements.forEach(el => {{
            el.addEventListener(inter.type === 'click' ? 'click' : 'change', (e) => {{
                const value = inter.type === 'click' ? null : e.target.value;
                const stateUpdate = {{}};
                
                for (const [key, val] of Object.entries(inter.targetState)) {{
                    stateUpdate[key] = val === '${{value}}' ? value : val;
                }}
                
                parent.postMessage({{
                    type: 'mockcraft_state_change',
                    prototypeId: '{self.id}',
                    state: stateUpdate
                }}, '*');
            }});
        }});
    }});
}})();
</script>
'''
        return script
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            'id': self.id,
            'name': self.name,
            'session_id': self.session_id,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'version': self.version,
            'interactions': [i.to_dict() for i in self.interactions],
            'state_schema': self.state_schema,
            'current_state': self.current_state
        }
    
    def to_list_item(self) -> dict:
        """转换为列表项（不含完整HTML内容）"""
        return {
            'id': self.id,
            'name': self.name,
            'session_id': self.session_id,
            'updated_at': self.updated_at,
            'version': self.version,
            'interactions_count': len(self.interactions),
            'state_variables': list(self.state_schema.keys())
        }
