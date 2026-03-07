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
├── README.md              # Index and entry point
├── SKILL.md               # This file (maintenance guide)
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

### 4. After Recording Conversation

**Step 1**: Create/update concept cards in `concepts/`
- Extract structured insights
- Link back to source conversation
- Preserve "why it matters" and "context"

**Step 2**: Update `conversations/README.md`
- Add new conversation to index

**Step 3**: Update main `README.md`
- Add new concepts to index
- Update "insights by source" section

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

## Maintenance Tasks

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

### Task 2: Create/Update Concept Cards

From conversation, create `concepts/{name}.md`:

1. **One-sentence definition**
2. **Why it matters** (from conversation context)
3. **Source context** (link to conversation, quote originals)
4. **Core mechanism** (technical explanation)
5. **Related concepts and sources**

### Task 3: Maintain Indexes

- `conversations/README.md`: List all conversations
- `README.md`: Concept index with source links
- Update "insights by source" tracking

### Task 4: Consistency Check

Periodically verify:
- All concepts link to source conversations
- All conversation files have complete input/output
- No 2024 dates (should be 2026)
- Links are not broken

---

## Critical Rules

| Rule | Why |
|------|-----|
| **Never summarize user input** | Context is in the details |
| **Never excerpt AI output** | Reasoning process matters |
| **Always link concept to conversation** | Traceability |
| **Always preserve original quotes** | Authentic voice |
| **Year is always 2026** | Consistency |

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
- [ ] README indexes are updated
