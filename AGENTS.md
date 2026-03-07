# DIY Development Agents.md / DIY 开发规范

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

## 规范速查

| 规范 | 核心 | 严格程度 |
|------|------|---------|
| **DIY-001** | JSON 文件优先 | 宽松 |
| **DIY-002** | 前端内联优先 | 宽松 |
| **DIY-003** | 无架构 | 宽松 |
| **DIY-004** | 代码风格随意 | 宽松 |
| **DIY-005** | 安全第一 | ⚠️ **严格** |
| **DIY-006** | 手动测试即可 | 宽松 |
| **DIY-007** | 少依赖 | 建议 |
| **DIY-008** | 崩溃即信息 | 宽松 |
| **DIY-009** | 看见的能力 | 建议 |
| **DIY-013** | 解决问题优先 | 建议 |
| **DIY-014** | JSON 用工具操作 | 建议 |

---

## DIY-001: Storage

### DO
- JSON 文件存储
- 全量读写（数据 < 10MB）
- `fs.readFileSync` / `fs.writeFileSync`

### DON'T
- 不要用数据库
- 不要用 ORM
- 不要做数据迁移

```javascript
// ✅ DIY 做法
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
```

---

## DIY-002: Frontend

### DO
- 单 HTML 文件
- 内联 `<style>` / `<script>`
- CDN 引入库

### DON'T
- 不要构建工具（Webpack/Vite）
- 不要 CSS 预处理器
- 不要 TypeScript

---

## DIY-003: Architecture

### DO
- 单文件实现
- 函数即接口
- 需要复用时复制粘贴

### DON'T
- 不要 MVC/MVVM
- 不要分层
- 不要依赖注入
- 不要微服务

---

## DIY-004: Code Style

### DO
- 变量名随意（能懂就行）
- `console.log` 调试
- 注释只写给自己

### DON'T（建议）
- ESLint/Prettier
- 代码审查
- 命名规范

---

## DIY-005: Security ⚠️

### MUST DO
- **输入验证**：所有用户输入必须验证
- **路径限制**：文件操作限制在用户目录
- **敏感信息**：从环境变量读取，不硬编码
- **XSS 防护**：HTML 输出必须转义

```javascript
// ✅ 输入验证
if (typeof input !== 'string' || input.length > 1000) return null;

// ✅ 路径限制
const resolved = path.resolve(filePath);
const allowedDir = path.resolve(__dirname, 'data');
if (!resolved.startsWith(allowedDir)) throw new Error('Access denied');

// ✅ XSS 防护
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}
```

---

## DIY-006: Testing

### DO
- 手动点一遍
- `console.log` 看输出
- 用真实数据跑

### DON'T
- Jest/Mocha
- 测试覆盖率
- TDD
- CI/CD

---

## DIY-007: Dependencies

### DO
- 优先标准库
- 复制粘贴小函数（< 50 行）
- CDN 引入前端库

### DON'T
- 不要全家桶
- 不要为了一个函数引入整个库

---

## DIY-008: Error Handling

### DO
- try-catch + console.error
- 返回默认值
- 开发时直接崩溃

### DON'T
- 复杂的错误类
- 错误码体系
- 重试机制（除非必要）

---

## DIY-009: The Power of Seeing

### DO
- 第一步永远是"展示"
- 用 Demo 让用户看见
- 提供模板作为起点

### DON'T
- 不要问"你想要什么"（用户不知道）
- 给用户白纸

---

## DIY-013: Solution First

### DO
- 先搜现有方案
- 推荐现成工具
- 诚实告知已有方案

### DON'T
- 不要为了 DIY 而 DIY
- 忽视成熟 SaaS

---

## DIY-014: JSON Index Tools

### DO
- 用 CLI 工具操作 JSON
- 自动验证和同步

### DON'T
- 禁止直接编辑 JSON

```bash
# ✅ 使用工具
python tools/update_index.py add-concept "name" "category"

# ❌ 不要直接编辑 index.json
```

---

## 记忆口诀

```
JSON 文件代替数据库
单文件代替多模块
内联样式代替 CSS
复制粘贴代替抽象
console.log 代替测试
能用就行，安全除外
```
