# DIY Development Agents.md

> 目标：简单能用，而非工程质量。  
> 底线：安全，安全，还是安全。

---

## 核心原则

```
能用 > 优雅
简单 > 扩展
硬编码 > 配置
复制粘贴 > 抽象
单文件 > 模块化
JSON 文件 > 数据库
console.log > 单元测试
```

---

## DIY-014: JSON Index Tools

**用 CLI 工具操作 JSON，禁止直接编辑。**

```bash
# ✅ 使用工具
python tools/update_index.py add-concept "name" "category"
python tools/update_index.py add-conversation "file.md" "topic" "2026-03-09" "concept1"
python tools/update_index.py validate

# ❌ 不要直接编辑 index.json
```

### 为什么

| 直接编辑 JSON | 使用工具 |
|--------------|---------|
| 容易产生语法错误 | 结构化输入验证 |
| metadata 与实际数据不同步 | 自动同步计数 |
| 引用不存在的概念 | 自动引用检查 |

---

## 记忆口诀

```
JSON 文件代替数据库
单文件代替多模块
内联样式代替 CSS
复制粘贴代替抽象
console.log 代替测试
能用就行，安全除外
工具操作 JSON，不要直接编辑
```
