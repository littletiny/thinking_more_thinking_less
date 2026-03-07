---
name: zettel-maintainer
description: Maintain the Zettel knowledge base structure, conversations, and concepts. Use when user wants to record discussions, add new concepts, link ideas, or ensure consistency. Triggers on "record this conversation", "add to zettel", "new concept", or when user shares insights that should be preserved.
---

# Zettel Maintainer

Maintain the Zettel knowledge base: structured conversations, extracted concepts, and their relationships.

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

## Recording Requirements (CRITICAL)

### 1. Always Record Full Conversations

**When**: Any meaningful discussion that produces insights

**What to record**:
- **Complete user input** (copy-paste, don't summarize)
- **Complete AI output** (copy-paste the full response)
- **Context**: What triggered this discussion

**Never**:
- ❌ Summarize or paraphrase user input
- ❌ Extract only "key points" from AI output
- ❌ Skip the "obvious" parts

**Why**: 
- Context is in the details
- Future you may need the full reasoning
- Summarization loses nuance

### 2. Year is 2026

All conversation files: `2026-MM-DD-{topic}.md`

### 3. Conversation File Format

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

### 4. After Recording Conversation (SIMPLIFIED)

**CRITICAL: Update `index.json` ONLY** (single write, replaces multiple updates)

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

## Maintenance Tasks (Optimized for Minimal Tool Calls)

### Task 1: Record New Conversation

When user shares a case, insight, or engages in discussion:

1. **Create conversation file**
   ```
   conversations/2026-MM-DD-{brief-topic}.md
   ```

2. **Copy complete input/output**
   - User input: FULL text, no editing
   - AI output: FULL response, not summary
   - Preserve formatting, typos, everything

3. **Extract key quotes**
   - User's most insightful statements
   - Key AI reasoning steps

4. **Document concepts produced**
   - What ideas emerged
   - Link to existing concepts

### Task 2: Create Concept Card (REQUIRED)

From conversation, create `concepts/{name}.md`:

1. **One-sentence definition**
2. **Why it matters** (from conversation context)
3. **Source context** (link to conversation, quote originals)
4. **Core mechanism** (technical explanation)
5. **Related concepts and sources**

### Task 3: Update Index (REQUIRED - Use Tool, Never Edit Directly)

**⚠️ CRITICAL: Always use `update_index.py` tool. Never manually edit `index.json`.**

**Why use a tool?**
- Prevents JSON syntax errors
- Maintains consistency between metadata and actual data
- Validates references (concepts exist, files present)
- Single atomic operation

**Usage:**
```bash
# Add the conversation you just created
python tools/update_index.py add-conversation \
    "2026-03-09-topic.md" \
    "对话主题描述" \
    "2026-03-09" \
    "concept-1" "concept-2"

# Add each new concept
python tools/update_index.py add-concept \
    "concept-name" \
    "解决方法论"

# If you created connection files
python tools/update_index.py add-connection \
    "connections/concept-a-x-concept-b.md" \
    "concept-a" "concept-b"

# Validate everything is consistent
python tools/update_index.py validate
```

**This replaces the old multi-file update process.** One tool call instead of 3+ file edits.

### Task 4: Maintain Human-Readable Indexes (OPTIONAL - Batch)

**Can be deferred** to end of session or periodic batch updates:

- `conversations/README.md`: List all conversations
- `README.md`: Concept index with source links
- Update "insights by source" tracking

Use the search tool for immediate lookups instead:
```bash
python tools/search.py list concepts
python tools/search.py conversation 2026-03-08
```

### Task 5: Consistency Check

Use the validation tool:
```bash
python tools/update_index.py validate
```

Periodically verify:
- `index.json` is in sync with actual files
- All concepts link to source conversations
- All conversation files have complete input/output
- No 2024 dates (should be 2026)
- Links are not broken

If counts are wrong, update them:
```bash
python tools/update_index.py update-stats
```

---

## Critical Rules

| Rule | Why |
|------|-----|
| **Never summarize user input** | Context is in the details |
| **Never excerpt AI output** | Reasoning process matters |
| **Always link concept to conversation** | Traceability |
| **Always preserve original quotes** | Authentic voice |
| **Year is always 2026** | Consistency |
| **⚠️ Use `update_index.py` tool - never edit index.json directly** | Prevents errors, maintains consistency |
| **README updates are OPTIONAL** | Batch them to reduce tool calls |

---

## Example: Good vs Bad Recording

### Bad (Summarized)

```markdown
### User Input
User talked about a "find the difference" puzzle they couldn't solve.

### AI Output
I explained Observer Check concept.

### Key Points
- Check observer bias
- Not eyes problem, seeing problem
```

**What's wrong**: Lost all context, reasoning, original words.

### Good (Complete)

```markdown
### User Input

```
有这么一个case，有一天有一个"显而易见"的找茬图，我找不到哪里不合理...
[complete text]
```

### AI Output

```
这是一个关于**元认知**的深刻案例。用户经历了：

1. **困境**: 看不见"显而易见"的东西
2. **转向**: 不是继续找，而是意识到自己"看的方式"有问题
3. **方法**: "debug myself then debug case"

**概念命名**: Observer Check...
[complete response]
```

### Key Quotes

> "我知道一定是我自己哪里的认知有问题了"

> "debug myself then debug case"
```

**What's right**: Complete record, original words, full reasoning preserved.

---

## Current Status Tracking

When updating, check:
- [ ] Conversation has complete user input (not summarized)
- [ ] Conversation has complete AI output (not excerpted)
- [ ] Concept cards link to source conversations
- [ ] All dates are 2026
- [ ] **Used `update_index.py` tool to update index.json (NEVER edit directly)**
- [ ] README indexes are updated (optional, can batch)
