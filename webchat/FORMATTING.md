# WebChat 格式化与推理解析

## 功能概述

参考 kimi-cli 的实现，添加了以下功能：

1. **目录列表美化** - 将 `ls -l` 输出格式化为 Markdown 表格或 Rich 终端格式
2. **推理内容解析** - 从 AI 响应中分离 thinking（思考过程）和 output（最终输出）

---

## 1. 目录列表格式化 (`format_utils.py`)

### 支持的格式

#### Markdown 格式（用于 Web 展示）

```markdown
### webchat 目录

📊 **统计**: 5 个目录, 4 个文件, 1 个链接
📦 **总大小**: 49.8K

| 图标 | 名称 | 大小 | 修改日期 | 权限 |
|:----:|------|------|----------|------|
| 📁 | **static/** | 4K | Jan 10 08:00 | `drwxrwxr-x` |
| 🐍 | server.py | 28.7K | Jan 10 11:00 | `-rw-rw-r--` |
| 🔗 | webchat → `./static` | 10B | Jan 10 08:00 | `lrwxrwxrwx` |
```

#### Rich ANSI 格式（用于终端）

带有颜色编码：
- 📁 目录：蓝色加粗
- 🔗 链接：青色
- 📄 文件：默认
- 大文件：黄色/红色提示

### 文件类型图标

| 类型 | 图标 |
|------|------|
| 目录 | 📁 |
| 链接 | 🔗 |
| Python | 🐍 |
| README | 📖 |
| Markdown | 📝 |
| 配置/JSON | ⚙️ 📋 |
| 图片 | 🖼️ |
| 压缩包 | 📦 |
| 其他 | 📄 |

---

## 2. 推理内容解析 (`ResponseParser`)

### 支持的 Thinking 标签

解析以下标签作为 thinking 内容：
- `<think>...</think>`
- `<analysis>...</analysis>`
- `<reasoning>...</reasoning>`
- `<thought>...</thought>`
- `<thinking>...</thinking>`

### 解析示例

输入：
```
<think>
1. 用户询问当前目录文件
2. 需要格式化输出
</think>

当前目录包含 5 个文件...
```

输出：
```json
{
  "thinking": "1. 用户询问当前目录文件\n2. 需要格式化输出",
  "output": "当前目录包含 5 个文件...",
  "has_thinking": true
}
```

### 格式化显示

```html
<details>
<summary>💭 思考过程 (点击展开)</summary>

```
1. 用户询问当前目录文件
2. 需要格式化输出
```
</details>

当前目录包含 5 个文件...
```

---

## 3. API 端点

### 格式化目录列表

```http
POST /api/tools/format-ls
Content-Type: application/json

{
  "ls_output": "drwxrwxr-x 2 tiny tiny 4096 Jan 10 08:00 .\n-rw-rw-r-- 1 tiny tiny 29339 Jan 10 11:00 server.py",
  "title": "项目目录"
}
```

响应：
```json
{
  "markdown": "### 项目目录\n...",
  "rich": "\x1b[1m项目目录\x1b[0m...",
  "title": "项目目录"
}
```

### 解析推理内容

```http
POST /api/tools/parse-thinking
Content-Type: application/json

{
  "text": "<think>思考中...</think>\n最终答案",
  "show_thinking": true
}
```

响应：
```json
{
  "thinking": "思考中...",
  "output": "最终答案",
  "has_thinking": true,
  "formatted": "<details>...</details>\n最终答案"
}
```

### 聊天流（SSE）

```http
POST /api/sessions/{session_id}/chat
Content-Type: application/json

{
  "message": "列出当前目录"
}
```

SSE 事件类型：
- `type: "thinking"` - 思考内容（实时流式）
- `type: "chunk"` - 输出内容（实时流式）
- `type: "done"` - 完成，包含 `has_thinking` 和 `thinking` 字段

---

## 4. 前端集成建议

### 渲染 Markdown 表格

```javascript
// 使用 marked.js 或类似库
const markdown = response.markdown;
element.innerHTML = marked.parse(markdown);
```

### 渲染折叠的 Thinking

```javascript
// 原生 HTML details/summary 元素
const formatted = response.formatted;
element.innerHTML = formatted;  // 包含 <details> 标签
```

### 流式显示 Thinking

```javascript
const eventSource = new EventSource(`/api/sessions/${id}/chat`);
let thinkingContent = '';
let outputContent = '';

eventSource.onmessage = (e) => {
  const data = JSON.parse(e.data);
  
  if (data.type === 'thinking') {
    thinkingContent += data.content;
    updateThinkingUI(thinkingContent);
  } else if (data.type === 'chunk') {
    outputContent += data.content;
    updateOutputUI(outputContent);
  } else if (data.type === 'done') {
    if (data.has_thinking) {
      // 可以显示"思考完成"提示
      console.log('Thinking:', data.thinking);
    }
    eventSource.close();
  }
};
```

---

## 5. 测试

```bash
# 运行格式化工具测试
python test_format_utils.py

# 运行完整服务器测试
python test_server.py
```
