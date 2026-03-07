# Zettel - 概念知识库

> 结构化记录思考过程，包括完整的对话输入输出、概念提炼和关联分析。

---

## 快速开始

```bash
# 检索
python tools/search.py concept <name>           # 查找概念
python tools/search.py conversation <keyword>   # 搜索对话
python tools/search.py related <concept>        # 相关概念
python tools/search.py grep <pattern>           # 全文搜索
python tools/search.py list concepts            # 列出所有概念
python tools/search.py stats                    # 显示统计

# 维护索引（⚠️ 禁止直接编辑 index.json）
python tools/update_index.py add-conversation <file> <topic> <date> [concepts...]
python tools/update_index.py add-concept <name> <category>
python tools/update_index.py validate
```

---

## 目录结构

```
zettel/
├── README.md          # 本文件
├── AGENTS.md          # DIY 开发规范
├── SKILL.md           # Agent 维护指南
├── index.json         # 机器可读索引
├── tools/             # 检索和维护工具
├── conversations/     # 完整对话记录
├── concepts/          # 概念卡片
├── connections/       # 概念关联分析
└── notes/             # 综合文档
```

---

## 导航

| 目的 | 位置 |
|------|------|
| 了解概念起源 | `conversations/` |
| 快速查阅概念 | `concepts/` 或 `python tools/search.py concept <name>` |
| 理解概念关系 | `connections/` 或 `python tools/search.py related <concept>` |

---

## 相关文档

- [AGENTS.md](AGENTS.md) - DIY 开发规范
- [SKILL.md](SKILL.md) - 维护指南
- [tools/README.md](tools/README.md) - 工具详细说明
