# 关联：Obsidian ↔ Git & Agent

## 核心关联

**Obsidian 是知识管理的"前端"，Git + Agent 是"后端基础设施"**

---

## 来源对话

- [git-agent-safety](../conversations/2026-03-07-git-agent-safety.md)

---

## 功能互补

| 需求 | Obsidian 提供 | Git + Agent 提供 |
|------|--------------|-----------------|
| **阅读体验** | 美观的渲染、图谱可视化 | 原始 Markdown |
| **编辑体验** | 双向链接、插件增强 | 版本控制、批量自动化 |
| **长期存储** | 本地文件（但依赖 Obsidian 解析） | 纯文本 + 完整历史 |
| **协作** | Collaborative（弱，新功能） | Branch + Merge（强） |
| **维护** | 手动 MOC、手动链接 | Agent 自动维护链接和索引 |
| **审计** | Sync 有 30 天历史 | 永久历史，blame/bisect |

---

## 关键洞察（来自对话）

**分层架构**（来自对话）：
```
知识管理层（Obsidian）
    ↓ 读取
存储层（Git 管理的 Markdown）
    ↓ Agent 维护
基础设施层（Git + Agent）
```

**Git 是 Agent 的免疫系统**（来自对话）：
> "Git 将 Agent 从'顾问'提升为'执行者'"

**风险计算的变化**：
- 无 Git：风险 = 破坏程度 × 修复时间（极高）
- 有 Git：风险 = 破坏程度 × 回滚时间（接近零）

---

## 双向链接

- [[obsidian]]
- [[git-agent]]
- [来源对话](../conversations/2026-03-07-git-agent-safety.md)