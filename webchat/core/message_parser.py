#!/usr/bin/env python3
"""
消息解析函数
"""

from typing import List, Dict, Any


def _parse_message_content(message_data) -> list:
    """
    解析前端发送的消息内容
    支持:
    - 字符串: "hello"
    - 数组: [{"type": "text", "text": "..."}, {"type": "image_url", "image_url": {"url": "data:image/png;base64,..."}}]
    """
    if not message_data:
        return []
    
    if isinstance(message_data, str):
        if not message_data.strip():
            return []
        return [{"type": "text", "text": message_data.strip()}]
    
    if isinstance(message_data, list):
        parts = []
        for item in message_data:
            if isinstance(item, dict):
                part_type = item.get("type", "")
                if part_type == "text" and item.get("text", "").strip():
                    parts.append({"type": "text", "text": item["text"]})
                elif part_type == "image_url" and item.get("image_url", {}).get("url"):
                    parts.append({
                        "type": "image_url",
                        "image_url": {"url": item["image_url"]["url"]}
                    })
        return parts
    
    return []


def _extract_text_from_content(content_parts: list) -> str:
    """从内容部件中提取纯文本（用于记录到文件）"""
    texts = []
    for part in content_parts:
        if part.get("type") == "text":
            texts.append(part["text"])
        elif part.get("type") == "image_url":
            texts.append("[图片]")
    return " ".join(texts) if texts else ""


def _convert_to_acp_content_blocks(content_parts: list) -> list:
    """
    将前端内容部件转换为 ACP ContentBlock 格式
    用于发送到 ACP 服务器
    """
    blocks = []
    for part in content_parts:
        part_type = part.get("type")
        if part_type == "text":
            blocks.append({"type": "text", "text": part["text"]})
        elif part_type == "image_url":
            url = part.get("image_url", {}).get("url", "")
            # 解析 data URI: data:image/png;base64,xxx
            if url.startswith("data:"):
                try:
                    # data:image/png;base64,xxx 格式
                    mime_part, b64_data = url.split(",", 1)
                    mime_type = mime_part.split(";")[0].replace("data:", "") or "image/png"
                    blocks.append({
                        "type": "image",
                        "mime_type": mime_type,
                        "data": b64_data
                    })
                except Exception as e:
                    import logging
                    logging.getLogger('webchat').warning(f"Failed to parse image data URI: {e}")
            else:
                # 普通 URL
                blocks.append({"type": "image", "mime_type": "image/png", "data": url})
    return blocks


def parse_conversation_messages(content: str) -> list:
    messages = []
    lines = content.split('\n')
    current_role = None
    current_content = []
    current_time = None
    in_header = False  # 标记是否在消息头部（### 后的空行）
    
    def is_valid_message_header(line: str) -> tuple:
        """
        检查是否为有效的消息头部行
        有效格式: ### User [timestamp] 或 ### Assistant [timestamp]
        返回: (is_valid, role, time) 元组
        """
        if not line.startswith('### '):
            return (False, None, None)
        
        match = line[4:].strip()
        # 必须包含时间戳格式 [timestamp]
        if ' [' in match and match.endswith(']'):
            role_part, time_part = match.rsplit(' [', 1)
            role_lower = role_part.lower()
            if role_lower in ['user', 'assistant']:
                return (True, role_lower, time_part[:-1])
        return (False, None, None)
    
    for line in lines:
        is_header, role, timestamp = is_valid_message_header(line)
        
        if is_header:
            # 保存上一个消息
            if current_role and current_content:
                messages.append({
                    'role': current_role,
                    'content': '\n'.join(current_content).strip(),
                    'time': current_time
                })
            
            # 开始新消息
            current_role = role
            current_time = timestamp
            current_content = []
            in_header = True  # 跳过头部后的空行
        
        elif line.strip() == '---':
            # 消息分隔符，跳过
            continue
        
        elif current_role is not None:
            # 跳过头部后的第一个空行
            if in_header:
                if line.strip() == '':
                    in_header = False
                    continue
                in_header = False
            current_content.append(line)
    
    # 保存最后一个消息
    if current_role and current_content:
        messages.append({
            'role': current_role,
            'content': '\n'.join(current_content).strip(),
            'time': current_time
        })
    
    return messages
