#!/usr/bin/env python3
"""
格式化工具 - 参考 kimi-cli 的实现

功能：
1. 格式化目录列表输出（Markdown 表格 + Rich 渲染）
2. 解析推理引擎 response，区分 thinking 和 output
"""

import re
import os
from dataclasses import dataclass
from typing import List, Optional, Iterator
from pathlib import Path


# ============== 文件列表格式化 ==============

@dataclass
class FileInfo:
    """文件信息"""
    permissions: str
    owner: str
    group: str
    size: str
    size_bytes: int
    date: str
    name: str
    is_dir: bool
    is_link: bool = False
    target: str = ""  # 对于软链接，指向的目标


def parse_ls_output(line: str) -> Optional[FileInfo]:
    """
    解析 ls -l 输出的一行
    
    示例输入：
    -rw-rw-r-- 1 user group 19641 Jan 01 12:00 filename.py
    drwxrwxr-x 2 user group  4096 Jan 01 12:00 dirname/
    lrwxrwxrwx 1 user group    10 Jan 01 12:00 linkname -> target
    """
    line = line.strip()
    if not line or line.startswith('total'):
        return None
    
    # 正则匹配 ls -l 格式
    # 格式: permissions links owner group size month day time/year name [-> target]
    pattern = r'^([ldrwxsStT\-]{10})\s+'  # permissions
    pattern += r'\S+\s+'  # links (忽略)
    pattern += r'(\S+)\s+'  # owner
    pattern += r'(\S+)\s+'  # group
    pattern += r'(\S+)\s+'  # size
    pattern += r'(\S+\s+\S+\s+\S+)\s+'  # date (month day time/year)
    pattern += r'(.+)$'  # name (剩余部分)
    
    match = re.match(pattern, line)
    if not match:
        return None
    
    perms, owner, group, size, date, name = match.groups()
    
    # 解析文件类型
    is_dir = perms.startswith('d')
    is_link = perms.startswith('l')
    
    # 解析软链接目标
    target = ""
    if is_link and ' -> ' in name:
        name, target = name.split(' -> ', 1)
    
    # 解析大小
    try:
        size_bytes = int(size)
    except ValueError:
        size_bytes = 0
    
    # 格式化大小显示
    size_formatted = format_size(size_bytes) if size_bytes > 0 else size
    
    return FileInfo(
        permissions=perms,
        owner=owner,
        group=group,
        size=size_formatted,
        size_bytes=size_bytes,
        date=date.strip(),
        name=name.strip(),
        is_dir=is_dir,
        is_link=is_link,
        target=target.strip() if target else ""
    )


def format_size(size_bytes: int) -> str:
    """格式化文件大小"""
    for unit in ['B', 'K', 'M', 'G', 'T']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f}{unit}" if size_bytes != int(size_bytes) else f"{int(size_bytes)}{unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f}P"


def get_file_icon(file_info: FileInfo) -> str:
    """根据文件类型获取图标"""
    if file_info.is_dir:
        return "📁"
    if file_info.is_link:
        return "🔗"
    
    # 根据扩展名判断
    name_lower = file_info.name.lower()
    ext = os.path.splitext(name_lower)[1]
    
    icons = {
        '.py': '🐍',
        '.js': '📜',
        '.ts': '📘',
        '.json': '📋',
        '.md': '📝',
        '.txt': '📄',
        '.yml': '⚙️',
        '.yaml': '⚙️',
        '.toml': '⚙️',
        '.cfg': '⚙️',
        '.ini': '⚙️',
        '.sh': '🔧',
        '.html': '🌐',
        '.css': '🎨',
        '.jpg': '🖼️',
        '.jpeg': '🖼️',
        '.png': '🖼️',
        '.gif': '🖼️',
        '.mp4': '🎬',
        '.mp3': '🎵',
        '.zip': '📦',
        '.tar': '📦',
        '.gz': '📦',
        '.gitignore': '👁️',
    }
    
    # 特殊文件名
    special_files = {
        'readme': '📖',
        'license': '⚖️',
        'dockerfile': '🐳',
        'makefile': '🔨',
        'requirements.txt': '📦',
    }
    
    base_name = os.path.splitext(file_info.name.lower())[0]
    if base_name in special_files:
        return special_files[base_name]
    
    return icons.get(ext, '📄')


def format_file_list_markdown(lines: List[str], title: str = "文件列表") -> str:
    """
    将 ls -l 输出格式化为 Markdown 表格
    
    示例输出：
    | 图标 | 名称 | 大小 | 修改日期 | 权限 |
    |------|------|------|----------|------|
    | 📄 | server.py | 29.3K | Jan 01 12:00 | -rw-rw-r-- |
    | 📁 | static/ | 4.0K | Jan 01 12:00 | drwxrwxr-x |
    """
    files = []
    for line in lines:
        info = parse_ls_output(line)
        if info:
            files.append(info)
    
    if not files:
        return f"**{title}**: 空目录"
    
    # 分离目录和文件
    dirs = [f for f in files if f.is_dir or f.is_link and os.path.isdir(f.target)]
    regular_files = [f for f in files if not f.is_dir and f not in dirs]
    links = [f for f in files if f.is_link]
    
    # 构建 Markdown
    md_lines = [f"### {title}", ""]
    
    # 统计信息
    total_size = sum(f.size_bytes for f in regular_files)
    md_lines.append(f"📊 **统计**: {len(dirs)} 个目录, {len(regular_files)} 个文件, {len(links)} 个链接")
    md_lines.append(f"📦 **总大小**: {format_size(total_size) if regular_files else '0B'}")
    md_lines.append("")
    
    # 表格
    md_lines.append("| 图标 | 名称 | 大小 | 修改日期 | 权限 |")
    md_lines.append("|:----:|------|------|----------|------|")
    
    # 先显示目录
    for f in sorted(dirs, key=lambda x: x.name.lower()):
        icon = get_file_icon(f)
        name = f"**{f.name}/**" if f.is_dir else f.name
        if f.is_link:
            name = f"{f.name} → `{f.target}`"
        md_lines.append(f"| {icon} | {name} | {f.size} | {f.date} | `{f.permissions}` |")
    
    # 再显示文件
    for f in sorted(regular_files, key=lambda x: x.name.lower()):
        icon = get_file_icon(f)
        md_lines.append(f"| {icon} | {f.name} | {f.size} | {f.date} | `{f.permissions}` |")
    
    # 显示链接
    for f in sorted(links, key=lambda x: x.name.lower()):
        icon = get_file_icon(f)
        name = f"{f.name} → `{f.target}`"
        md_lines.append(f"| {icon} | {name} | {f.size} | {f.date} | `{f.permissions}` |")
    
    return "\n".join(md_lines)


def format_file_list_rich(lines: List[str], title: str = "文件列表") -> str:
    """
    格式化为 Rich 风格的终端输出（带颜色）
    
    使用 ANSI 颜色代码
    """
    files = []
    for line in lines:
        info = parse_ls_output(line)
        if info:
            files.append(info)
    
    if not files:
        return f"\033[1;33m{title}:\033[0m 空目录"
    
    # ANSI 颜色
    BOLD = "\033[1m"
    BLUE = "\033[34m"
    CYAN = "\033[36m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    GRAY = "\033[90m"
    RESET = "\033[0m"
    
    output_lines = [f"\n{BOLD}{title}{RESET}", "=" * 60]
    
    # 统计
    dirs = [f for f in files if f.is_dir]
    regular = [f for f in files if not f.is_dir and not f.is_link]
    links = [f for f in files if f.is_link]
    total_size = sum(f.size_bytes for f in regular)
    
    output_lines.append(
        f"{GRAY}📊 {len(dirs)} 目录 | {len(regular)} 文件 | {len(links)} 链接 | "
        f"总大小: {format_size(total_size) if regular else '0B'}{RESET}"
    )
    output_lines.append("")
    
    # 计算列宽
    name_width = max(len(f.name) + (3 if f.is_dir else 0) for f in files) + 2
    name_width = min(name_width, 40)
    
    # 表头
    output_lines.append(
        f"{BOLD}{'图标':<4} {'名称':<{name_width}} {'大小':<8} {'日期':<16} {'权限':<12}{RESET}"
    )
    output_lines.append("-" * (4 + name_width + 8 + 16 + 12))
    
    # 排序：目录在前，然后按名称
    files.sort(key=lambda x: (not x.is_dir, x.name.lower()))
    
    for f in files:
        icon = get_file_icon(f)
        
        # 名称颜色
        if f.is_dir:
            name = f"{BLUE}{BOLD}{f.name}/{RESET}"
        elif f.is_link:
            name = f"{CYAN}{f.name} → {f.target}{RESET}"
        elif f.name.startswith('.'):
            name = f"{GRAY}{f.name}{RESET}"
        else:
            name = f.name
        
        # 截断长名称
        display_name = (f.name + "/") if f.is_dir else f.name
        if len(display_name) > name_width - 2:
            display_name = display_name[:name_width-5] + "..."
        
        # 重新构建带颜色的名称
        if f.is_dir:
            name_display = f"{BLUE}{BOLD}{display_name}{RESET}"
        elif f.is_link:
            target = f.target
            if len(target) > 15:
                target = target[:12] + "..."
            name_display = f"{CYAN}{f.name} → {target}{RESET}"
        elif f.name.startswith('.'):
            name_display = f"{GRAY}{display_name}{RESET}"
        else:
            name_display = display_name
        
        # 权限颜色
        perms = f.permissions
        if f.is_dir:
            perms_colored = f"{BLUE}{perms}{RESET}"
        elif 'x' in perms:
            perms_colored = f"{GREEN}{perms}{RESET}"
        else:
            perms_colored = perms
        
        # 大小颜色（大文件红色）
        size_str = f.size
        if f.size_bytes > 10 * 1024 * 1024:  # > 10MB
            size_colored = f"\033[31m{size_str}{RESET}"
        elif f.size_bytes > 1024 * 1024:  # > 1MB
            size_colored = f"{YELLOW}{size_str}{RESET}"
        else:
            size_colored = size_str
        
        output_lines.append(
            f"{icon:<3} {name_display:<{name_width}} "
            f"{size_colored:<{len(size_str) + (10 if f.size_bytes > 1024*1024 else 0)}} "
            f"{GRAY}{f.date:<16}{RESET} {perms_colored}"
        )
    
    output_lines.append("")
    return "\n".join(output_lines)


# ============== 推理引擎 Response 解析 ==============

@dataclass
class ParsedResponse:
    """解析后的响应"""
    thinking: Optional[str]  # 推理/思考内容
    output: str  # 最终输出内容
    has_thinking: bool  # 是否包含 thinking


class ResponseParser:
    """
    解析推理引擎的 response，区分 thinking 和 output
    
    支持的格式：
    1. <think>...</think> - 通用 thinking 标签
    2. <analysis>...</analysis> - 分析标签
    3. <reasoning>...</reasoning> - 推理标签
    4. ThinkPart / TextPart - kimi-cli 结构化格式
    """
    
    THINKING_TAGS = ['think', 'analysis', 'reasoning', 'thought', 'thinking']
    
    @classmethod
    def parse(cls, text: str) -> ParsedResponse:
        """
        解析 response，提取 thinking 和 output
        
        策略：
        1. 先尝试解析为结构化格式（ThinkPart/TextPart）
        2. 然后尝试解析 thinking 标签
        3. 如果没有 thinking，全部作为 output
        """
        # 尝试解析结构化格式
        if text.strip().startswith('[') or 'ThinkPart' in text or 'TextPart' in text:
            result = cls._parse_structured(text)
            if result.has_thinking:
                return result
        
        # 解析 thinking 标签
        return cls._parse_tags(text)
    
    @classmethod
    def _parse_structured(cls, text: str) -> ParsedResponse:
        """解析 kimi-cli 结构化格式"""
        thinking_parts = []
        output_parts = []
        
        # 简单的正则提取
        think_pattern = r'ThinkPart\([^)]*think=(["\'])(.*?)\1'
        for match in re.finditer(think_pattern, text, re.DOTALL):
            thinking_parts.append(match.group(2))
        
        text_pattern = r'TextPart\([^)]*text=(["\'])(.*?)\1'
        for match in re.finditer(text_pattern, text, re.DOTALL):
            output_parts.append(match.group(2))
        
        thinking = "\n".join(thinking_parts) if thinking_parts else None
        output = "\n".join(output_parts) if output_parts else text
        
        return ParsedResponse(
            thinking=thinking,
            output=output,
            has_thinking=bool(thinking_parts)
        )
    
    @classmethod
    def _parse_tags(cls, text: str) -> ParsedResponse:
        """解析 XML 风格的 thinking 标签"""
        thinking_parts = []
        output_parts = []
        
        # 构建正则：匹配所有支持的 thinking 标签
        tags_pattern = '|'.join(cls.THINKING_TAGS)
        pattern = f'<({tags_pattern})[^>]*>(.*?)</\\1>'
        
        last_end = 0
        for match in re.finditer(pattern, text, re.DOTALL | re.IGNORECASE):
            # 添加 thinking 前的内容到 output
            if match.start() > last_end:
                output_parts.append(text[last_end:match.start()])
            
            # 添加 thinking 内容
            thinking_parts.append(match.group(2).strip())
            last_end = match.end()
        
        # 添加剩余内容到 output
        if last_end < len(text):
            output_parts.append(text[last_end:])
        
        thinking = "\n\n".join(thinking_parts) if thinking_parts else None
        output = "".join(output_parts).strip()
        
        # 如果 output 为空但 thinking 有内容，可能是只有 thinking 的情况
        if not output and thinking:
            output = thinking
        
        return ParsedResponse(
            thinking=thinking,
            output=output,
            has_thinking=bool(thinking_parts)
        )
    
    @classmethod
    def format_for_display(cls, parsed: ParsedResponse, show_thinking: bool = True) -> str:
        """
        格式化解析后的响应用于显示
        
        支持 Markdown 格式：
        - thinking 放在折叠块中
        - output 正常显示
        """
        lines = []
        
        if parsed.has_thinking and show_thinking:
            lines.append("<details>")
            lines.append("<summary>💭 思考过程 (点击展开)</summary>")
            lines.append("")
            lines.append("```")
            lines.append(parsed.thinking)
            lines.append("```")
            lines.append("</details>")
            lines.append("")
        
        lines.append(parsed.output)
        
        return "\n".join(lines)
    
    @classmethod
    def stream_parser(cls) -> Iterator[Optional[str]]:
        """
        流式解析器 - 用于实时解析 thinking 和 output
        
        生成器，yield 解析后的内容块
        yield 格式：('thinking', content) 或 ('output', content) 或 None（表示等待更多数据）
        """
        buffer = ""
        in_thinking = False
        current_tag = None
        
        while True:
            chunk = yield None  # 等待输入
            if chunk is None:
                break
            
            buffer += chunk
            
            # 检测 thinking 标签开始
            if not in_thinking:
                for tag in cls.THINKING_TAGS:
                    open_tag = f"<{tag}>"
                    if open_tag in buffer:
                        # 分割 output 和 thinking
                        idx = buffer.index(open_tag)
                        if idx > 0:
                            yield ('output', buffer[:idx])
                        buffer = buffer[idx + len(open_tag):]
                        in_thinking = True
                        current_tag = tag
                        break
            
            # 检测 thinking 标签结束
            if in_thinking and current_tag:
                close_tag = f"</{current_tag}>"
                if close_tag in buffer:
                    idx = buffer.index(close_tag)
                    yield ('thinking', buffer[:idx])
                    buffer = buffer[idx + len(close_tag):]
                    in_thinking = False
                    current_tag = None
                    # 继续处理 buffer 中可能还有的内容
                    if buffer:
                        yield ('output', buffer)
                        buffer = ""
        
        # 处理剩余 buffer
        if buffer:
            if in_thinking:
                yield ('thinking', buffer)
            else:
                yield ('output', buffer)


# ============== 便捷函数 ==============

def format_directory_listing(text: str, title: str = "文件列表", use_markdown: bool = True) -> str:
    """
    便捷的目录列表格式化函数
    
    Args:
        text: ls -l 的输出文本
        title: 标题
        use_markdown: 是否使用 Markdown 格式，False 使用 Rich ANSI 格式
    
    Returns:
        格式化后的字符串
    """
    lines = text.strip().split('\n')
    if use_markdown:
        return format_file_list_markdown(lines, title)
    else:
        return format_file_list_rich(lines, title)


def parse_and_format_response(text: str, show_thinking: bool = True) -> str:
    """
    便捷函数：解析并格式化推理引擎响应
    
    Args:
        text: 原始响应文本
        show_thinking: 是否显示 thinking 内容
    
    Returns:
        格式化后的 Markdown 字符串
    """
    parsed = ResponseParser.parse(text)
    return ResponseParser.format_for_display(parsed, show_thinking)


# ============== 测试 ==============

if __name__ == "__main__":
    # 测试文件列表格式化
    test_ls_output = """
total 128
drwxrwxr-x 4 tiny tiny  4096 Jan 10 10:00 .
drwxrwxr-x 8 tiny tiny  4096 Jan 10 09:00 ..
-rw-rw-r-- 1 tiny tiny 29339 Jan 10 11:00 server.py
-rw-rw-r-- 1 tiny tiny 19641 Jan 10 10:30 test_server.py
-rw-rw-r-- 1 tiny tiny  1994 Jan 10 09:15 README.md
-rw-rw-r-- 1 tiny tiny    60 Jan 10 08:00 requirements.txt
drwxrwxr-x 2 tiny tiny  4096 Jan 10 08:00 static
drwxrwxr-x 2 tiny tiny  4096 Jan 10 08:00 __pycache__
lrwxrwxrwx 1 tiny tiny    10 Jan 10 08:00 webchat -> ./static
"""
    
    print("=== Markdown 格式 ===")
    print(format_directory_listing(test_ls_output, "webchat 目录", use_markdown=True))
    
    print("\n\n=== Rich ANSI 格式 ===")
    print(format_directory_listing(test_ls_output, "webchat 目录", use_markdown=False))
    
    # 测试推理引擎响应解析
    test_response = """
<think>
我需要分析用户的需求。用户想要格式化目录列表输出。

步骤：
1. 解析 ls -l 输出
2. 提取文件信息
3. 格式化为表格
</think>

这是一个文件格式化工具，可以将 ls -l 输出转换为美观的 Markdown 或 Rich 格式。

主要功能：
- 📁 目录和文件分类显示
- 📊 统计信息（数量、总大小）
- 🎨 颜色编码（Rich 格式）
"""
    
    print("\n\n=== 推理响应解析 ===")
    parsed = ResponseParser.parse(test_response)
    print(f"Has thinking: {parsed.has_thinking}")
    print(f"\nThinking:\n{parsed.thinking}")
    print(f"\nOutput:\n{parsed.output}")
    
    print("\n\n=== 格式化显示 ===")
    print(parse_and_format_response(test_response))
