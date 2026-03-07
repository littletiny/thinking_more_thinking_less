# Anti-Engineering Agents.md / 反工程规范 Agents.md

## One Sentence
DIY 开发模式需要一套"反工程师直觉"的 AGENTS.md 规范体系——抛弃代码质量、架构设计、可维护性等工业标准，仅保留安全底线，一切以"简单能用"为最高准则。

---

## Why It Matters

### 工程师直觉的问题

传统工程师（包括 AI Agent）被训练为：
- 追求代码质量（DRY、KISS、SOLID）
- 重视架构设计（分层、解耦、扩展性）
- 强调可维护性（文档、测试、规范）
- 警惕技术债务（重构、优化、还债）

**但这些在 DIY 场景下都是过度工程。**

### DIY 场景的现实

```
场景：用户想记录每天喝了几次水

工程师直觉解决方案：
- 设计数据库 schema（users, drinks, timestamps）
- 实现 CRUD API
- 添加用户认证
- 做数据验证
- 写单元测试
- 考虑扩展性（万一要记录其他饮品？）

实际需要的：
- 一个 JSON 文件
- 追加一行记录
- 能统计就行
```

### 反直觉的价值

> "agents.md 的约束需要你来帮我提供"
> 
> "这是和现在开发模式不一样的开发模式"

我们需要显式定义：
- 什么**不应该做**（传统工程实践）
- 什么**应该做**（DIY 实践）
- 唯一的底线是什么（安全）

---

## Source Context

From conversation: [anti-engineering-agents-md-origin](../conversations/2026-03-08-anti-engineering-agents-md.md)

**Key case**: 讨论预置脚手架后，用户提出需要配套的 AGENTS.md 规范体系

**Key insight**: DIY 模式需要"反工程师直觉"的约束——不是为了工程质量，是为了简单能用。需要定制一套 AGENTS.md 来约束 Agent 的行为。

**User's original words**:
> "我们还需要一些数据库的脚手架，例如orm是最佳的"

> "所以我们需要定制很多的 agents.md，这些 agents.md 是反工程师直觉的"

> "和我们前面交付的方式是一样的，我们需要解决的是 DIY 问题，而不是工程质量问题"

> "这是和现在开发模式不一样的开发模式，agents.md 的约束需要你来帮我提供"

---

## Core Concept: The Anti-Patterns

### 反模式清单（DIY 允许/鼓励的）

| 传统工程（禁止） | DIY 模式（允许） | 为什么 |
|---------------|----------------|-------|
| DRY（不要重复） | 复制粘贴 | 理解成本低 |
| 抽象封装 | 硬编码 | 简单直接 |
| 配置化 | 写死 | 无需理解配置系统 |
| 分层架构 | 平铺 | 一目了然 |
| 单元测试 | 手动点一下 | 测试成本 > 收益 |
| 文档注释 | 无 | 代码即文档（给自己看） |
| 错误处理 | console.log | 能跑就行 |
| 类型安全 | any/string | 减少心智负担 |
| 数据库 | JSON 文件 | 无需运维 |
| ORM | 直接读写文件 | 少一层抽象 |
| 代码复用 | 每个功能独立 | 修改不相互影响 |
| 模块化 | 单文件 | 文件即功能 |

### 唯一底线：安全

```
即使在 DIY 模式下，这些也不能妥协：

✅ 必须检查：
- 用户输入（防注入）
- 敏感信息（不硬编码密钥）
- 文件操作（限制路径）
- 网络请求（验证 URL）

❌ 可以妥协：
- 其他所有工程规范
```

---

## The Agents.md System

### 需要的 AGENTS.md 清单

```
agents/
├── DIY-001-storage.md          # 存储层规范（反 ORM）
├── DIY-002-frontend.md         # 前端规范（反组件化）
├── DIY-003-architecture.md     # 架构规范（反分层）
├── DIY-004-code-style.md       # 代码风格（反规范）
├── DIY-005-security.md         # 安全规范（唯一严格）
└── DIY-006-testing.md          # 测试规范（反测试驱动）
```

### 每个 AGENTS.md 的结构

```markdown
# DIY-XXX: [领域]规范

## 原则
一句话核心原则

## 反模式（不要这样做）
❌ 传统工程做法

## 正模式（应该这样做）
✅ DIY 做法

## 为什么
解释背后的逻辑

## 示例
代码对比

## 安全底线
该领域必须遵守的安全规则
```

---

## Example: DIY-001-storage.md 草案

```markdown
# DIY-001: 存储层规范

## 原则
用文件代替数据库，用 JSON 代替 ORM，平铺代替关系模型。

## 反模式
❌ 不要使用：
- 关系型数据库（SQLite/PostgreSQL/MySQL）
- ORM（Prisma/TypeORM/Sequelize）
- 复杂的数据模型设计
- 数据库迁移脚本
- 连接池管理
- 事务处理

## 正模式
✅ 应该使用：
- JSON 文件直接存储
- fs.readFileSync / fs.writeFileSync
- 平铺的数据结构
- 每个功能一个数据文件
- 读写时全量加载/保存

## 为什么
1. 个人项目数据量小（< 10MB），全量加载无压力
2. 无需学习 SQL 或 ORM API
3. 数据文件可直接查看、手动编辑
4. 备份就是复制文件
5. 无需运维数据库服务

## 示例

❌ 传统做法：
```javascript
// 需要 Prisma schema + 迁移 + ORM
const user = await prisma.user.create({
  data: { name: '张三', email: 'zhangsan@example.com' }
});
```

✅ DIY 做法：
```javascript
// 直接读写 JSON 文件
const data = JSON.parse(fs.readFileSync('users.json', 'utf8'));
data.users.push({ id: Date.now(), name: '张三', email: 'zhangsan@example.com' });
fs.writeFileSync('users.json', JSON.stringify(data, null, 2));
```

## 安全底线
- 文件路径必须限制在用户目录内（防目录遍历）
- 用户输入写入文件前必须 JSON.stringify
- 敏感数据（密码等）必须加密存储
```

---

## Example: DIY-003-architecture.md 草案

```markdown
# DIY-003: 架构规范

## 原则
没有架构就是最好的架构，平铺直叙，单文件优先。

## 反模式
❌ 不要使用：
- MVC/MVVM 分层
- 服务层/DAO 层/控制层分离
- 依赖注入
- 接口抽象
- 微服务拆分
- 事件驱动架构
- 插件系统

## 正模式
✅ 应该使用：
- 单文件实现完整功能
- 函数即接口
- 全局变量传递状态（在单文件内）
- 直接调用，无需封装
- 需要复用时复制粘贴

## 为什么
1. 一人项目，无需团队协作
2. 代码量小（< 1000 行），无需组织
3. 修改时一目了然，无需跳转多个文件
4. "坏"架构比过度架构好

## 示例

❌ 传统做法（6 个文件）：
```
src/
├── controllers/
│   └── userController.js
├── services/
│   └── userService.js
├── models/
│   └── userModel.js
├── routes/
│   └── userRoutes.js
├── utils/
│   └── helpers.js
└── app.js
```

✅ DIY 做法（1 个文件）：
```javascript
// user.js - 所有功能都在这里
const fs = require('fs');

// 数据操作
function loadUsers() {
  return JSON.parse(fs.readFileSync('users.json', 'utf8'));
}

function saveUsers(users) {
  fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
}

// 业务逻辑
function addUser(name) {
  const users = loadUsers();
  users.push({ id: Date.now(), name });
  saveUsers(users);
  return '添加成功';
}

function listUsers() {
  return loadUsers();
}

// 直接导出
module.exports = { addUser, listUsers };
```

## 安全底线
- 即使是单文件，也要验证用户输入
- 文件操作限制路径
- 不执行用户输入的代码
```

---

## The Complete System

### 如何使用这些 AGENTS.md

```
用户提出需求
    ↓
Code Agent 读取相关 AGENTS.md
    ↓
按照"反规范"实现
    ↓
安全规范检查（唯一严格项）
    ↓
交付
```

### 与传统 AGENTS.md 的区别

| 维度 | 传统 AGENTS.md | DIY AGENTS.md |
|------|---------------|---------------|
| **目标** | 代码质量、可维护性 | 简单能用 |
| **约束方向** | 你应该做什么 | 你不应该做什么 |
| **严格程度** | 全面严格 | 仅安全严格 |
| **哲学** | 预防技术债务 | 接受技术债务 |
| **适用场景** | 团队协作、长期维护 | 一人项目、短期使用 |

---

## Key Insight

> **DIY AGENTS.md 是一套"许可清单"而非"禁止清单"——它允许传统工程禁止的做法，唯一禁止的是"过度工程"。**

传统规范：
- "你必须写测试"
- "你必须分层架构"
- "你必须 DRY"

DIY 规范：
- "你可以不写测试"
- "你可以不分层"
- "你可以复制粘贴"
- "但你必须检查安全"

---

## Next Steps

需要完整编写的 AGENTS.md：

1. **DIY-001-storage.md** - JSON 文件优先，反 ORM
2. **DIY-002-frontend.md** - 内联样式优先，反组件化
3. **DIY-003-architecture.md** - 单文件优先，反分层
4. **DIY-004-code-style.md** - 无规范，console.log 调试
5. **DIY-005-security.md** - 唯一严格的安全底线
6. **DIY-006-testing.md** - 手动测试，反自动化测试
7. **DIY-007-dependencies.md** - 少依赖，复制粘贴优先
8. **DIY-008-error-handling.md** - 崩溃即调试信息

---

## Related Concepts

- [[diy-software-mindset]] - 反工程规范的哲学基础
- [[prebuilt-scaffold-strategy]] - 脚手架需要配套 AGENTS.md
- All DIY concepts - 每个都需要对应的规范约束

---

## Personal Notes

- 这套 AGENTS.md 是对 AI Agent 的"去训练"
- 需要显式允许"坏实践"，因为 Agent 被训练为追求"好实践"
- 安全是唯一不能被"反"的
- 这套规范本身也是 DIY——根据实际使用不断调整
