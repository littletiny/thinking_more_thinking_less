---
name: zettel
description: Maintain the Zettel knowledge base structure, conversations, and concepts. Use when user explicitly says "record this", "add to zettel", "new concept", OR when the conversation clearly concludes with significant insights.
---

# Zettel Maintainer

Maintain the Zettel knowledge base: structured conversations, extracted concepts, and their relationships.

---

## ⚠️ When to Record (CRITICAL - Reduce Tool Calls)

**DO NOT record every conversation. Recording is expensive (multiple tool calls).**

### Record ONLY when:
1. **User explicitly requests**: "record this", "add to zettel", "save this discussion"
2. **Conversation is clearly complete** AND produced significant insights worth preserving
3. **New concept emerged** that is reusable and non-obvious

### Skip recording when:
- Routine Q&A without new insights
- Debugging or troubleshooting sessions
- Small talk or clarifications
- The insight is obvious or already documented
- User is still exploring (conversation not concluded)

### Decision flow:
```
Conversation ended?
    ↓ No → Don't record (wait for conclusion)
    ↓ Yes
Significant new insight?
    ↓ No → Don't record (not worth the cost)
    ↓ Yes
User explicitly asked to record OR insight is highly reusable?
    ↓ No → Optional (use judgment)
    ↓ Yes → Record it
```

---

## Core Philosophy

**Preserve the thinking process, not just the conclusion.**

This knowledge base serves two purposes:
- **For humans**: Trace back how ideas emerged, understand context and struggles
- **For AI**: Learn from past discussions, avoid repeating explanations

---

## Directory Structure

```
zettel/
├── README.md              # Human-readable index and overview
├── SKILL.md               # This file (maintenance guide)
├── AGENTS.md              # DIY development specifications
├── index.json             # Machine-readable index (CRITICAL)
│
├── tools/                 # 🔧 Search and maintenance tools
│   ├── search.py          # Search and query tool
│   └── update_index.py    # Index management tool (CRITICAL)
│
├── conversations/         # Complete chat records (input + output)
│   ├── README.md
│   └── YYYY-MM-DD-{topic}.md
│
├── concepts/              # Extracted concept cards
│   └── {concept-name}.md
│
├── connections/           # Inter-concept relationship analysis
│   └── {a}-x-{b}.md
│
└── notes/                 # Loose notes (scratchpad)
```

---

## Index System (NEW - Simplified Maintenance)

### Core Principle: Index-First

**`index.json` is the SINGLE SOURCE OF TRUTH for all machine queries.**

This reduces tool calls from 3+ (update conversation file + update README + update SKILL) to 1 (update index.json).

### Index Structure

```json
{
  "metadata": { "version", "last_updated", "counts" },
  "conversations": [{ "file", "topic", "date", "concepts" }],
  "concepts": [{ "name", "category", "file" }],
  "connections": [{ "file", "concepts" }]
}
```

### Tools

**Search Tool** - Query the knowledge base:
```bash
# Find a concept
python tools/search.py concept observer-check

# Search conversations
python tools/search.py conversation 2026-03-07

# Find related concepts
python tools/search.py related mock-driven-validation

# Full-text search
python tools/search.py grep "DIY"

# List all items
python tools/search.py list concepts

# Show statistics
python tools/search.py stats
```

**Index Manager** - Update index.json (⚠️ NEVER edit index.json directly):
```bash
# Add new conversation
python tools/update_index.py add-conversation \
    "2026-03-09-topic.md" \
    "对话主题" \
    "2026-03-09" \
    "concept-1" "concept-2"

# Add new concept
python tools/update_index.py add-concept \
    "concept-name" \
    "解决方法论"

# Add connection
python tools/update_index.py add-connection \
    "connections/a-x-b.md" \
    "concept-a" "concept-b"

# Validate index
python tools/update_index.py validate

# Update statistics
python tools/update_index.py update-stats
```

---

## Recording Requirements

### 1. WebChat 自动记录

**WebChat 已自动保存完整对话到 `conversations/` 目录。**

无需手动复制粘贴，系统会自动：
- 保存完整的 user input
- 保存完整的 AI output (包括 thinking 和 tool_calls)
- 按日期命名文件: `2026-MM-DD-{topic}.md`

### 2. 需要手动完成的工作

- **判断哪些对话值得索引** (见 "When to Record")
- **提取新概念** 到 `concepts/` 目录
- **更新 `index.json`** 使用 `update_index.py` 工具

### 3. Conversation File 格式参考

```markdown
# Conversation: {Brief Topic}

## Metadata

- **Date**: 2026-MM-DD
- **Topic**: One-line description
- **Participants**: User, Agent
- **Concepts Produced**: [[concept-1]], [[concept-2]]

---

## Conversation Record

### User Input 1

```
[Paste complete user message here]
Do not edit. Do not summarize.
Preserve typos, formatting, everything.
```

### AI Output 1

```
[Paste complete AI response here]
All of it. Not just the conclusion.
Preserve the reasoning, examples, struggles.
```

### User Input 2

```
[Complete next user message]
```

### AI Output 2

```
[Complete next AI response]
```

... continue until conversation ends ...

---

## Key Quotes (Preserve exactly)

> "Original user quote 1"

> "Original user quote 2"

> "Key AI insight from output"

---

## Concept Extraction

### Concept Name

**Definition**: One-sentence definition

**Source**: Which part of conversation produced this

**Key Insight**: The core breakthrough

---

## Follow-up Impact

- Created [[concept-name]] concept card
- Influenced later discussion about X
- Led to creation of [[other-concept]]
```

### 4. After Recording Conversation

**只需更新 `index.json`** (对话文件已由 WebChat 自动生成)

```json
// Add to conversations array:
{
  "file": "2026-MM-DD-topic.md",
  "topic": "Brief description",
  "date": "2026-MM-DD",
  "concepts": ["concept-1", "concept-2"]
}

// Add to concepts array for each new concept:
{
  "name": "concept-name",
  "category": "认知偏差与陷阱|解决方法论|工具与基础设施",
  "file": "concepts/concept-name.md"
}

// Update metadata counts
```

**Optional (Batch Update)**: Update `README.md` and `conversations/README.md` 
- Can be deferred to batch updates (e.g., end of session)
- Not required for every new concept
- Use `node tools/search.js` for immediate lookups

---

## Concept Card Format

```markdown
# Concept Name (中文名)

## One Sentence
Definition.

---

## Why It Matters

(Extracted from conversation - why this concept is important)

---

## Source Context

From conversation: [filename](../conversations/2026-MM-DD-topic.md)

**Key case**: What triggered this concept
**Key insight**: Breakthrough moment
**User's original words**: 
> "Quote from user"

---

## Core Mechanism

Technical explanation.

---

## Related Concepts
- [[other-concept]]
- [Source conversation](../conversations/2026-MM-DD-topic.md)

---

## Personal Notes
- Ongoing thoughts
```

---

## Recording Workflow

When you decide to record (see "When to Record" above):

### Step 1: 确认 WebChat 已生成对话文件

WebChat 自动在 `conversations/` 生成文件，格式如：
```
conversations/2026-MM-DD-{brief-topic}.md
```

### Step 2: 提取新概念 (如有)

如对话中产生了**可复用、非显而易见**的洞察，创建 `concepts/{name}.md`：

```markdown
# Concept Name

## One Sentence
Definition.

## Why It Matters
(Why this concept is important)

## Source Context
From conversation: [filename](../conversations/2026-MM-DD-topic.md)

> "Original user quote"

## Core Mechanism
Technical explanation.

## Related Concepts
- [[other-concept]]
```

### Step 3: 更新 Index

**⚠️ 使用工具 - 永远不要直接编辑 index.json：**

```bash
# 添加对话记录
python tools/update_index.py add-conversation \
    "2026-MM-DD-topic.md" "Topic" "2026-MM-DD" "concept-1"

# 如有新概念，添加概念
python tools/update_index.py add-concept "concept-name" "解决方法论"

# 验证完整性
python tools/update_index.py validate
```

**目标**: 2-3 次 tool call 完成记录。

---

## Critical Rules

| Rule | Why |
|------|-----|
| **Always link concept to conversation** | Traceability |
| **Always preserve original quotes** | Authentic voice |
| **Year is always 2026** | Consistency |
| **⚠️ Use `update_index.py` tool - never edit index.json directly** | Prevents errors, maintains consistency |
| **README updates are OPTIONAL** | Batch them to reduce tool calls |

---

## Current Status Tracking

When updating, check:
- [ ] Concept cards link to source conversations
- [ ] All dates are 2026
- [ ] **Used `update_index.py` tool to update index.json (NEVER edit directly)**
- [ ] README indexes are updated (optional, can batch)
