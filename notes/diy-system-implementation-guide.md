# DIY 系统技术实现指南

> 从架构到代码的完整技术方案

---

## 一、技术架构总览

### 1.1 三层架构

```
┌─────────────────────────────────────────┐
│  Layer 1: 接入层（展示）                 │
│  - CLI/TUI                              │
│  - IM Bot (Telegram/微信/钉钉)          │
│  - Web Demo                             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Layer 2: 核心引擎（独立，0依赖）        │
│  - NLU 模块                             │
│  - Mock 引擎                            │
│  - 代码生成器                           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Layer 3: 基础设施（可选）               │
│  - OpenClaw Skill 适配                  │
│  - 社区插件支持                         │
└─────────────────────────────────────────┘
```

### 1.2 核心设计原则

- **独立核心**：可脱离任何平台运行
- **0 依赖**：单 binary，离线可用
- **自然语言交互**：CLI/IM 对话方式
- **代码交付**：生成可运行的源代码

---

## 二、核心引擎详细设计

### 2.1 NLU 模块（自然语言理解）

**职责**：
- 意图识别（创建/查询/修改工具）
- 实体提取（功能点、数据字段）
- 需求分类（表单/流程/报表）

**输入**：用户自然语言描述
```
"我想要一个记账工具，需要记录和谁吃饭，
 自动分类餐饮交通，每周给我发汇总"
```

**输出**：结构化需求
```json
{
  "intent": "create_tool",
  "type": "form",
  "features": [
    "expense_record",
    "social_context",
    "auto_category",
    "weekly_report"
  ],
  "data_fields": [
    {"name": "amount", "type": "number"},
    {"name": "category", "type": "enum"},
    {"name": "people", "type": "string"},
    {"name": "date", "type": "datetime"}
  ]
}
```

**技术实现**：
- 大模型 API（DeepSeek / MiniMax / Kimi）
- Prompt 工程 + 输出格式化
- 多轮对话状态管理

### 2.2 Mock 引擎

**职责**：快速生成可视化原型，让用户"看见"可能性

**输入**：结构化需求

**输出**：Mock 描述
```
【记账工具 - 界面设计】

┌─────────────────────────────────┐
│ 💰 记账本                        │
├─────────────────────────────────┤
│ [添加支出] [添加收入] [报表]    │
├─────────────────────────────────┤
│ 金额: [________]                │
│ 分类: [餐饮 ▼]                  │
│ 和谁: [________]                │
│ 备注: [________]                │
│ [保存]                          │
├─────────────────────────────────┤
│ 📊 本周统计                      │
│ 餐饮: ¥1,250 | 交通: ¥380       │
└─────────────────────────────────┘

功能说明：
- 支持语音/文字输入
- 自动分类（餐饮/交通/购物）
- 记录同行人（社交记账）
- 每周推送汇总
```

**技术实现**：
- 模板库（表单类/流程类/报表类）
- 动态填充字段
- ASCII/文字描述输出

### 2.3 代码生成器

**职责**：将确认的需求转换为可运行代码

**输入**：需求 + Mock 设计

**输出**：完整项目
```
my-expense-app/
├── app.js              # 主程序
├── data.json           # 数据文件
├── index.html          # 前端界面
├── package.json
└── README.md
```

**技术实现**：
- 模板引擎（Jinja2 / EJS）
- 代码片段库
- 安全审查（输入验证、XSS 防护）

**代码规范（13 条 DIY 规范）**：

| 规范 | 实现 | 示例 |
|------|------|------|
| 存储 | JSON 文件 | `fs.readFileSync('data.json')` |
| 前端 | 单文件 | HTML + inline CSS/JS |
| 架构 | 平铺 | 单文件实现 |
| 安全 | 输入验证 | `escapeHtml(userInput)` |

---

## 三、接入层实现

### 3.1 CLI 工具

**设计**：
```bash
# 安装
npm install -g diy-scaffold

# 使用
$ diy create "记账工具，记录和谁吃饭"

# 交互过程
[系统] 正在理解需求...
[系统] 发现现有方案：随手记、MoneyWiz...
[用户] 不满足，继续
[系统] 请描述具体功能...
[用户] ...
[系统] 这是设计的界面：
       [Mock 展示]
[用户] 可以
[系统] 正在生成代码...
[系统] ✓ 已生成 my-app/
[系统] 运行: cd my-app && npm start
```

**技术**：Node.js + Commander.js

### 3.2 IM Bot

**支持平台**：
- Telegram（海外用户）
- 企业微信（国内办公）
- 钉钉（阿里生态）

**交互方式**：
```
用户: 我想做记账工具

Bot: 查了一下，有很多现成工具...
     1. 随手记（免费）
     2. MoneyWiz（付费）
     能满足你吗？

用户: 不行，要记录和谁吃饭

Bot: 明白了，这是社交记账。
     设计如下：
     [Mock 图片/描述]
     
用户: 可以

Bot: [生成代码 zip]
```

**技术**：各平台 Bot API + Webhook

### 3.3 Web Demo

**设计**：
- 浏览器打开即用
- 表单输入需求
- 展示 Mock 和代码
- 可下载完整项目

**技术**：
- 静态页面（GitHub Pages）
- 或轻量级后端（Vercel）

---

## 四、完整流程实现

### 4.1 流程状态机

```
[Start]
  ↓
[Step 0: Check Existing]
  ├─ 有现成工具 → [Recommend] → [End]
  └─ 无 → [Step 1]
        ↓
[Step 1: Clarify]
  ↓
[Step 2: Mock]
  ├─ 用户不满意 → [Revise Mock] → [Step 2]
  └─ 用户满意 → [Step 3]
        ↓
[Step 3: Generate]
  ↓
[Step 4: Deliver]
  ↓
[End]
```

### 4.2 关键代码结构

```javascript
// 主流程控制器
class DIYFlow {
  async run(userInput) {
    // Step 0: 检查现有方案
    const existing = await this.checkExisting(userInput);
    if (existing.suitable) {
      return this.recommendExisting(existing.tools);
    }
    
    // Step 1: 需求澄清
    const requirements = await this.clarify(userInput);
    
    // Step 2: Mock 展示与确认
    let mock = await this.generateMock(requirements);
    while (!(await this.confirmMock(mock))) {
      const feedback = await this.getFeedback();
      mock = await this.reviseMock(mock, feedback);
    }
    
    // Step 3: 代码生成
    const code = await this.generateCode(requirements, mock);
    
    // Step 4: 交付
    return this.deliver(code);
  }
}
```

---

## 五、部署与运行

### 5.1 交付物结构

```
project-name/
├── src/
│   ├── app.js          # 主程序
│   ├── utils.js        # 工具函数
│   └── data/
│       └── records.json
├── public/
│   └── index.html      # 前端界面
├── package.json
├── README.md           # 使用说明
└── start.sh            # 启动脚本
```

### 5.2 运行方式

| 方式 | 命令 | 适用场景 |
|------|------|---------|
| 本地 | `node app.js` | 开发测试 |
| 桌面 | 双击打开 | 普通用户 |
| 云端 | `docker run` | 多设备访问 |

### 5.3 数据存储

**方案**：JSON 文件（遵循 DIY-001）

```javascript
// data/records.json
{
  "version": 1,
  "records": [
    {
      "id": 1709830400000,
      "amount": 35,
      "category": "餐饮",
      "people": "张三",
      "date": "2024-03-08"
    }
  ]
}
```

**读写**：
```javascript
function loadData() {
  try {
    return JSON.parse(fs.readFileSync('data.json', 'utf8'));
  } catch {
    return { version: 1, records: [] };
  }
}

function saveData(data) {
  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
}
```

---

## 六、安全实现

### 6.1 输入验证

```javascript
function validateInput(input) {
  // 类型检查
  if (typeof input !== 'string') return null;
  
  // 长度限制
  if (input.length > 1000) return null;
  
  // 危险字符检查
  if (/<script|javascript:|on\w+=/i.test(input)) {
    return null;
  }
  
  return input.trim();
}
```

### 6.2 路径安全

```javascript
const BASE_DIR = path.resolve(__dirname, 'data');

function safeWrite(filename, data) {
  const fullPath = path.resolve(BASE_DIR, filename);
  
  // 确保在允许目录内
  if (!fullPath.startsWith(BASE_DIR)) {
    throw new Error('Access denied');
  }
  
  fs.writeFileSync(fullPath, JSON.stringify(data));
}
```

### 6.3 XSS 防护

```javascript
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

---

## 七、与 OpenClaw 集成

### 7.1 Skill 接口

```javascript
// openclaw-skill.js
const diyCore = require('./diy-core');

module.exports = {
  name: 'diy-scaffold',
  
  async onUserRequest(request, context) {
    // 调用独立核心
    const result = await diyCore.run(request.text);
    
    return {
      text: result.message,
      attachments: result.code ? [{
        type: 'file',
        name: 'generated-tool.zip',
        content: result.code
      }] : null
    };
  }
};
```

### 7.2 独立运行

```javascript
// cli.js
const diyCore = require('./diy-core');

async function main() {
  const input = process.argv[2];
  const result = await diyCore.run(input);
  console.log(result.message);
}

main();
```

---

## 八、技术选型

| 组件 | 技术 | 理由 |
|------|------|------|
| 核心引擎 | Node.js / Go | 生态丰富 / 单 binary |
| 模板引擎 | EJS / Jinja2 | 简单灵活 |
| 前端 | 原生 HTML/JS | 0 依赖 |
| 存储 | JSON 文件 | 简单够用 |
| 模型 API | DeepSeek / MiniMax | 成本低 |
| 部署 | Docker / 原生 | 灵活 |

---

## 九、实施路线图

### Phase 1: MVP（1 个月）
- [ ] 核心引擎（NLU + Mock + Generator）
- [ ] CLI 界面
- [ ] 3 个基础模板（表单/列表/报表）

### Phase 2: 完善（1 个月）
- [ ] Web Demo
- [ ] Telegram Bot
- [ ] 模板库扩展

### Phase 3: 生态（1 个月）
- [ ] OpenClaw Skill
- [ ] 社区插件支持
- [ ] 文档完善

---

## 十、代码示例

### 完整项目生成示例

```javascript
// 用户需求："记账工具，记录和谁吃饭"

// 1. NLU 解析
const requirements = {
  type: 'form',
  fields: ['amount', 'category', 'people', 'date'],
  features: ['add', 'list', 'stats']
};

// 2. Mock 生成
const mock = `
┌─────────────────────────┐
│ 💰 记账本                │
├─────────────────────────┤
│ 金额: [      ]          │
│ 分类: [餐饮▼]           │
│ 和谁: [      ]          │
│ [保存]                  │
└─────────────────────────┘
`;

// 3. 代码生成
const code = generateFromTemplate('form-app', requirements);

// 4. 输出
outputZip({
  'app.js': code.main,
  'index.html': code.frontend,
  'package.json': code.config,
  'README.md': code.docs
});
```

---

*本文档提供从技术视角的完整实现方案*
*概念定义见 `concepts/` 目录*
