#!/usr/bin/env python3
"""
format_utils 测试
"""

import unittest
from format_utils import (
    parse_ls_output,
    format_size,
    get_file_icon,
    format_directory_listing,
    ResponseParser,
    format_file_list_markdown,
)


class TestLsParsing(unittest.TestCase):
    """测试 ls 输出解析"""
    
    def test_parse_regular_file(self):
        line = "-rw-rw-r-- 1 tiny tiny 19641 Jan 10 10:30 test_server.py"
        result = parse_ls_output(line)
        self.assertIsNotNone(result)
        self.assertEqual(result.name, "test_server.py")
        self.assertEqual(result.permissions, "-rw-rw-r--")
        self.assertFalse(result.is_dir)
        self.assertFalse(result.is_link)
        self.assertEqual(result.size_bytes, 19641)
    
    def test_parse_directory(self):
        line = "drwxrwxr-x 2 tiny tiny 4096 Jan 10 08:00 static"
        result = parse_ls_output(line)
        self.assertIsNotNone(result)
        self.assertEqual(result.name, "static")
        self.assertTrue(result.is_dir)
        self.assertFalse(result.is_link)
    
    def test_parse_symlink(self):
        line = "lrwxrwxrwx 1 tiny tiny 10 Jan 10 08:00 webchat -> ./static"
        result = parse_ls_output(line)
        self.assertIsNotNone(result)
        self.assertEqual(result.name, "webchat")
        self.assertTrue(result.is_link)
        self.assertEqual(result.target, "./static")
    
    def test_parse_total_line(self):
        line = "total 128"
        result = parse_ls_output(line)
        self.assertIsNone(result)
    
    def test_format_size(self):
        self.assertEqual(format_size(512), "512B")
        self.assertEqual(format_size(1024), "1K")
        self.assertEqual(format_size(1024 * 1024), "1M")
        self.assertEqual(format_size(1024 * 1024 * 1024), "1G")


class TestFileIcons(unittest.TestCase):
    """测试文件图标"""
    
    def test_directory_icon(self):
        from format_utils import FileInfo
        info = FileInfo("drwxrwxr-x", "tiny", "tiny", "4K", 4096, "Jan 10 10:00", "test", True, False)
        self.assertEqual(get_file_icon(info), "📁")
    
    def test_python_file_icon(self):
        from format_utils import FileInfo
        info = FileInfo("-rw-rw-r--", "tiny", "tiny", "1K", 1024, "Jan 10 10:00", "test.py", False, False)
        self.assertEqual(get_file_icon(info), "🐍")
    
    def test_readme_icon(self):
        from format_utils import FileInfo
        info = FileInfo("-rw-rw-r--", "tiny", "tiny", "1K", 1024, "Jan 10 10:00", "README.md", False, False)
        self.assertEqual(get_file_icon(info), "📖")


class TestResponseParser(unittest.TestCase):
    """测试推理响应解析"""
    
    def test_parse_think_tag(self):
        text = "<think>Thinking content</think>\n\nOutput content"
        result = ResponseParser.parse(text)
        self.assertTrue(result.has_thinking)
        self.assertEqual(result.thinking, "Thinking content")
        self.assertEqual(result.output, "Output content")
    
    def test_parse_analysis_tag(self):
        text = "<analysis>Analysis here</analysis>\n\nFinal answer"
        result = ResponseParser.parse(text)
        self.assertTrue(result.has_thinking)
        self.assertEqual(result.thinking, "Analysis here")
        self.assertEqual(result.output, "Final answer")
    
    def test_parse_reasoning_tag(self):
        text = "<reasoning>Reasoning...</reasoning>\nResult"
        result = ResponseParser.parse(text)
        self.assertTrue(result.has_thinking)
        self.assertEqual(result.thinking, "Reasoning...")
        self.assertEqual(result.output, "Result")
    
    def test_parse_no_thinking(self):
        text = "Just a regular response without thinking"
        result = ResponseParser.parse(text)
        self.assertFalse(result.has_thinking)
        self.assertIsNone(result.thinking)
        self.assertEqual(result.output, text)
    
    def test_parse_multiple_thinking_blocks(self):
        text = "<think>First</think> middle <think>Second</think> end"
        result = ResponseParser.parse(text)
        self.assertTrue(result.has_thinking)
        self.assertEqual(result.thinking, "First\n\nSecond")
        self.assertEqual(result.output.strip(), "middle  end")


class TestMarkdownFormatting(unittest.TestCase):
    """测试 Markdown 格式化"""
    
    def test_format_directory_listing(self):
        ls_output = """
drwxrwxr-x 2 tiny tiny 4096 Jan 10 08:00 .
drwxrwxr-x 8 tiny tiny 4096 Jan 10 09:00 ..
-rw-rw-r-- 1 tiny tiny 29339 Jan 10 11:00 server.py
-rw-rw-r-- 1 tiny tiny 19641 Jan 10 10:30 test_server.py
"""
        result = format_directory_listing(ls_output, "Test", use_markdown=True)
        self.assertIn("### Test", result)
        self.assertIn("server.py", result)
        self.assertIn("test_server.py", result)
        self.assertIn("📊", result)  # 统计图标
        self.assertIn("📦", result)  # 大小图标
    
    def test_format_with_empty_input(self):
        result = format_directory_listing("", "Empty", use_markdown=True)
        self.assertIn("空目录", result)


if __name__ == "__main__":
    unittest.main(verbosity=2)
