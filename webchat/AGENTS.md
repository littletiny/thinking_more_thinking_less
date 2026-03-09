---
name: zettel
description: Maintain the Zettel knowledge base structure, conversations, and concepts. Use when user explicitly says "record this", "add to zettel", "new concept", OR when the conversation clearly concludes with significant insights.
---

# WebChat Agent Guidelines

> WebChat **不自动记录对话全文**，Agent 通过检索 index 元信息找到相关历史，提炼知识到 Zettel。

⚠️ **重要**：本项目属于 `zettel` 知识库系统。请先阅读上层目录的 `../SKILL.md` 了解完整的 Zettel 方法论和维护规范。

---

## 核心规则

**⚠️ 不创建 conversation 文件。仅更新 index.json 元信息，使用 search.py 工具查询历史对话。**

---

## 何时提炼到 Zettel

**用户明确请求**：
- "把这个概念记录下来"
- "保存到 zettel"
- "这个概念很重要"

**对话自然沉淀后**：
- 形成了可复用的方法论
- 产生了反直觉的洞察
- 值得长期回顾的思考

**不需要**：
- 日常问答、调试
- 临时性讨论
- 观点还在变化中

---

## 提炼流程

### 1. 先检索（关键步骤）

**在创建任何新内容前，先用工具查询已有知识：**

```bash
# 查找是否已有相关概念
python tools/search.py concept "关键词"

# 查找相关历史对话
python tools/search.py conversation "关键词"
python tools/search.py grep "用户提到的关键短语"

# 查看相关概念网络
python tools/search.py related "已知概念"
```

### 2. 识别新概念
- 检索确认该概念**不存在**于 index
- 用户反复提及且**值得复用**的核心方法论
- 反直觉的认知突破

### 3. 创建/更新概念卡片

```markdown
# Concept Name

## 一句话定义
简洁准确的定义。

## 为什么重要
从本次对话中提炼的价值。

## 来源
- 对话索引：2026-MM-DD-topic (仅元信息，无完整文件)
- 触发场景：什么情况下产生了这个概念

## 关联概念
- [[相关概念1]]
- [[相关概念2]]
```

### 4. 更新索引（仅元信息）

```bash
# 添加对话元信息（不创建文件）
python tools/update_index.py add-conversation \
    "2026-MM-DD-topic.md" "主题" "2026-MM-DD" "概念1" "概念2"

# 添加新概念
python tools/update_index.py add-concept "概念名" "解决方法论"

# 添加关联
python tools/update_index.py add-connection "概念A" "概念B"
```

---

## 概念复现提示 (Hints)

**通过 index 元信息检索历史，主动补全上下文。**

### 触发条件
- 用户提及任何可能是概念的词汇
- 讨论深入某个话题的具体实现/应用场景
- 用户询问"之前说过""上次聊过"等暗示历史上下文的表述
- **任何记录操作前** - 先检索避免重复

### 执行动作

```bash
# 1. 检索该概念是否存在
python tools/search.py concept <concept-name>

# 2. 全文搜索相关历史对话（关键词匹配）
python tools/search.py grep <用户提到的关键词>

# 3. 查找该概念关联的概念网络
python tools/search.py related <concept-name>

# 4. 按日期/话题查找对话元信息
python tools/search.py conversation <date-or-keyword>
```

### 输出要求
检索完成后，主动整合信息：

1. **概念是否存在** - 如果存在，展示定义；如果不存在，提示可创建
2. **历史对话线索** - 从 index 中发现的的相关对话元信息
3. **相关概念网络** - 与该概念有关联的其他概念
4. **行动建议** - 基于检索结果：复用/扩展/创建新概念

### 示例工作流

```
User: "那个找茬图的case"
↓
Agent: python tools/search.py grep "找茬图"
        → 发现 observer-check 概念
        → python tools/search.py concept observer-check
        → python tools/search.py related observer-check
↓
Agent: "之前讨论过 observer-check 概念，与 carelessness 相关。
        需要我展开这个概念的定义和相关洞察吗？"
```

**目的**：用检索代替记忆，让 index.json 成为知识导航中心。

---

## 检索知识库（核心工作流）

**所有操作前，先检索 index.json。conversations/ 目录仅通过元信息引用。**

### 1. 概念查询

```bash
# 查找概念详情（定义、分类、文件位置）
python tools/search.py concept observer-check

# 查找相关概念网络
python tools/search.py related mock-driven-validation
```

### 2. 对话元信息查询

```bash
# 按日期查找对话元信息
python tools/search.py conversation 2026-03-07

# 按概念查找关联对话
python tools/search.py conversation "observer-check"

# 按话题关键词查找
python tools/search.py conversation "DIY"
```

**返回结果**：对话文件名、主题、日期、涉及概念列表（元信息，非完整内容）

### 3. 全文搜索（跨所有文档）

```bash
# 搜索关键词出现在哪些文档中
python tools/search.py grep "debug myself"
python tools/search.py grep "找茬图"
```

**用途**：
- 找到用户提到的特定短语出现在哪些 concept/connection 文件中
- 发现潜在的相关概念关联
- 验证某个话题是否已讨论过

### 4. 列出与统计

```bash
# 列出所有概念
python tools/search.py list concepts

# 列出所有对话元信息
python tools/search.py list conversations

# 列出所有概念关联
python tools/search.py list connections

# 显示知识库统计
python tools/search.py stats
```

### 检索优先原则

```
用户提问
    ↓
提取关键词 → python tools/search.py grep "关键词"
    ↓
发现相关概念 → python tools/search.py concept <name>
    ↓
发现相关对话 → python tools/search.py conversation <concept>
    ↓
整合已有知识 → 回应用户 / 决定是否创建新概念
```

**绝不**：在检索前直接创建新文件。

---

## 记录原则

```
检索优先于创建
概念要可复用
索引代替全文
```

### 核心转变

| 旧方式 | 新方式 |
|--------|--------|
| 创建 conversations/ 文件 | 仅更新 index.json 元信息 |
| 手动翻阅历史 | 用 search.py 工具查询 |
| 全文存储 | 元信息索引 + 概念卡片 |
| 记录后搜索 | 搜索后再决定是否记录 |

### 何时更新 Index

**添加对话元信息**：
- 用户明确说"记录这次讨论"
- 产生了值得索引的新概念关联
- 对话主题与现有概念形成新的连接

**仅更新概念卡片**：
- 新概念提炼完成
- 现有概念需要补充新的洞察
- 概念间关联关系变化
