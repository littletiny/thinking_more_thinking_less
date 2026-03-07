# Zettel Tools

## 检索工具

### search.py

查询知识库。

```bash
python tools/search.py concept <name>           # 查找概念
python tools/search.py conversation <keyword>   # 搜索对话
python tools/search.py related <concept>        # 相关概念
python tools/search.py grep <pattern>           # 全文搜索
python tools/search.py list [concepts|conversations|connections]
python tools/search.py stats                    # 显示统计
```

---

## 索引维护工具

### update_index.py

**⚠️ CRITICAL: 永远使用此工具更新 index.json，禁止直接编辑。**

```bash
# 添加对话
python tools/update_index.py add-conversation \
    "2026-03-09-topic.md" "对话主题" "2026-03-09" \
    "concept-1" "concept-2"

# 添加概念
python tools/update_index.py add-concept \
    "concept-name" "解决方法论"

# 添加关联
python tools/update_index.py add-connection \
    "connections/a-x-b.md" "concept-a" "concept-b"

# 删除/更新/验证
python tools/update_index.py remove-concept "name"
python tools/update_index.py update-stats
python tools/update_index.py validate
```

---

## 为什么用工具？

**问题**: 直接编辑 JSON 容易出错，且需要多次 tool calls。

**收益**: 单次工具调用完成所有更新，自动验证数据一致性。

---

## DIY-014 详解

### 原则

JSON 文件是存储层（DIY-001），但模型不应直接编辑 JSON。使用 CLI 工具作为抽象层。

### 为什么需要工具？

| 直接编辑 JSON | 使用工具 |
|--------------|---------|
| 容易产生语法错误 | 结构化输入验证 |
| metadata 与实际数据不同步 | 自动同步计数 |
| 引用不存在的概念 | 自动引用检查 |
| 重复劳动 | 原子操作 |

### 工具设计原则

- **命令式接口**: `add-conversation` 而非 "edit json"
- **自动验证**: 添加前检查引用是否存在
- **自动同步**: metadata 计数自动更新
- **幂等性**: 重复执行不会重复添加

### 实现要点

```python
def add_conversation(file, topic, date, concepts):
    index = load_index()
    
    # 验证：概念必须存在
    for concept in concepts:
        if not concept_exists(index, concept):
            raise ValueError(f"Concept '{concept}' not found")
    
    # 幂等：已存在则更新
    for conv in index['conversations']:
        if conv['file'] == file:
            conv.update({...})
            break
    else:
        index['conversations'].append({...})
    
    # 自动同步统计
    index['metadata']['total_conversations'] = len(index['conversations'])
    
    save_index(index)
```

### 适用场景

| 场景 | 做法 |
|------|------|
| 频繁更新的 JSON 索引 | ✅ 使用工具 |
| 复杂的数据关系 | ✅ 使用工具 |
| 一次性配置 | 可直接编辑 |
| 简单的键值对 | 可直接编辑 |
