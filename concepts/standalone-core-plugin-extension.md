# Standalone Core + Plugin Extension / 独立核心 + 插件扩展

## One Sentence
架构策略：核心工具是独立、0依赖的 binary（甚至可在线体验），同时兼容 OpenClaw 插件生态，拥抱社区但不受制于平台。

---

## Architecture Decision

### 核心洞察

```
用户担心：
"OpenClaw 是否符合我们定义的模式？"
"这套东西其实并不需要在 OpenClaw 环境下才能运行"

回答：
核心应该是独立的
OpenClaw 只是可选的扩展
就像 VSCode 可以独立运行
也可以安装各种插件
```

### 设计原则

```
1. 独立核心（Standalone Core）
   - 0 依赖
   - 单 binary
   - 开箱即用
   - 不绑定任何平台

2. 插件兼容（Plugin Compatible）
   - 支持 OpenClaw Skill 格式
   - 可以加载社区插件
   - 但不依赖 OpenClaw 运行

3. 在线体验（Online Demo）
   - 浏览器即可试用
   - 降低尝试门槛
   - 但生成本地可运行代码

4. 渐进增强（Progressive Enhancement）
   - 基础功能：独立运行
   - 高级功能：插件扩展
   - 生态集成：可选连接
```

---

## Source Context

From conversation: [standalone-core-plugin-origin](../conversations/2026-03-08-standalone-core-plugin.md)

**Key insight**: 架构上应该是独立核心 + 插件扩展，拥抱 OpenClaw 社区但保持独立性，最好是单 binary 开箱即用。

**User's original words**:
> "所以是否应该做成一个openclaw插件，拥抱一个更大的社区？"

> "这里的问题在于，openclaw是否符合我们定义的模式，这套东西其实并不需要在openclaw环境下才能运行"

> "他应该是简单的，0依赖的部署方式，最好就是一个binary打开就能尝试，甚至在线就能简单体验"

> "只是我们可以让他支持openclaw"

---

## Technical Architecture

### 三层架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Layer 3: Ecosystem                       │
│                      生态层（可选）                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ OpenClaw    │  │ Community   │  │ Cloud Services      │ │
│  │ Skill       │  │ Plugins     │  │ (Optional)          │ │
│  │ Support     │  │             │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                           ↑                                 │
│                    Plugin API                               │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                     Layer 2: Core Engine                     │
│                      核心引擎层（必需）                       │
├───────────────────────────┼─────────────────────────────────┤
│                           │                                 │
│  ┌────────────────────────┴────────────────────────────┐   │
│  │              DIY Scaffold Core                       │   │
│  │                                                      │   │
│  │  • Natural Language Parser                           │   │
│  │  • Code Generator                                    │   │
│  │  • Template Manager                                  │   │
│  │  • Build System                                      │   │
│  │  • Deployment Helper                                 │   │
│  │                                                      │   │
│  │  独立运行，0 依赖                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                     Layer 1: Delivery                        │
│                      交付层（多种形式）                        │
├───────────────────────────┼─────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Binary      │  │ Web Demo    │  │ Desktop App         │ │
│  │ (CLI)       │  │ (Browser)   │  │ (Electron/Tauri)    │ │
│  │             │  │             │  │                     │ │
│  │ 单文件      │  │ 在线体验    │  │ 图形界面            │ │
│  │ 命令行      │  │ 生成本地代码│  │ 一键运行            │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 独立核心（Layer 2）

```
核心功能（不依赖任何外部平台）：
├── 自然语言理解
├── 代码生成
├── 模板系统
├── 构建打包
└── 部署辅助

技术栈：
- 单语言实现（Go/Rust/TypeScript）
- 静态编译
- 单 binary 文件
- 内置所有依赖
```

### OpenClaw 兼容（Layer 3）

```
作为插件运行时：
- 遵循 OpenClaw Skill 规范
- 可以加载 OpenClaw 生态的插件
- 可以使用 OpenClaw 的界面

独立运行时：
- 有自己的 CLI/GUI
- 不依赖 OpenClaw
- 功能完全可用
```

### 在线体验（Layer 1 - Web）

```
Web Demo 特点：
- 浏览器打开即用
- 自然语言输入需求
- 看见生成的代码/Mock
- 可以下载完整代码包
- 可以在本地继续开发

技术实现：
- 前端：纯 HTML/JS（无后端）
- 或使用 WebAssembly 编译核心
- 或使用轻量级 API（仅生成阶段）
```

---

## Deployment Options

### Option 1: Single Binary（推荐）

```
diy-scaffold-cli
├── 单文件可执行
├── 跨平台（Windows/Mac/Linux）
├── 内置模板
├── 离线可用
└── 一键生成项目

使用：
$ diy-cli create "我想要一个记账工具"
$ cd my-app
$ ./run
```

### Option 2: Desktop App

```
diy-scaffold-app
├── Electron/Tauri 打包
├── 图形界面
├── 双击运行
├── 完全本地
└── 无需命令行

适合：
- 完全不懂命令行的用户
- 喜欢 GUI 的用户
```

### Option 3: Web Demo

```
diy-scaffold-web
├── 浏览器打开
├── 在线试用
├── 生成代码下载
├── 零安装
└── 降低尝试门槛

适合：
- 第一次体验
- 快速验证想法
- 分享 Demo 给他人
```

### Option 4: OpenClaw Skill

```
openclaw-skill-diy
├── 作为 OpenClaw 插件安装
├── 使用 OpenClaw 界面
├── 与 OpenClaw 生态集成
├── 共享 OpenClaw 用户群
└── 但核心仍是独立代码

优势：
- 拥抱社区
- 获得流量
- 生态兼容
```

---

## OpenClaw Integration Design

### 如何兼容但不依赖

```
Skill 接口定义：

// OpenClaw 调用时
const diySkill = {
  name: 'diy-scaffold',
  
  // 当用户在 OpenClaw 中说"帮我做一个..."
  onUserRequest: async (request) => {
    // 调用独立核心
    const result = await core.generate(request);
    
    // 返回给 OpenClaw
    return {
      code: result.code,
      explanation: result.explanation,
      runCommand: result.runCommand
    };
  },
  
  // OpenClaw 可以查询生成的项目
  getProjects: () => core.listProjects(),
  
  // 可以部署到 OpenClaw 环境
  deployToOpenClaw: (project) => core.deploy(project, 'openclaw')
};

// 独立运行时，同样的 core.generate() 可用
```

### 数据流

```
用户输入（自然语言）
    ↓
┌─────────────────────────────────────┐
│  输入处理层                          │
│  （OpenClaw 接口或 CLI 参数）         │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  核心引擎（独立，0依赖）              │
│  • 理解需求                           │
│  • 选择模板                           │
│  • 生成代码                           │
│  • 打包交付                           │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  输出生成物                          │
│  • 源代码（可在任何地方运行）          │
│  • 部署指南                          │
│  • 运行脚本                          │
└─────────────────────────────────────┘
```

---

## User Journey

### 路径 1：独立 Binary（极客）

```
1. 下载 diy-cli（单文件）
2. 运行：diy-cli create "记账工具"
3. 看到生成的代码
4. 本地运行：./run
5. 拥有完整工具
```

### 路径 2：Web Demo（新手）

```
1. 浏览器打开 diy-scaffold.io
2. 输入："我想要一个记账工具"
3. 看见生成的 Demo
4. 点击"下载代码"
5. 本地解压运行
```

### 路径 3：OpenClaw 用户

```
1. 在 OpenClaw 中安装 DIY Skill
2. 对 OpenClaw 说："帮我做个记账工具"
3. OpenClaw 调用 DIY 核心
4. 生成代码并展示
5. 可以选择在 OpenClaw 中运行或导出
```

### 路径 4：Desktop App（普通用户）

```
1. 下载 DIY-Scaffold.app
2. 双击打开
3. 图形界面输入需求
4. 点击"生成"
5. 自动打开生成的工具
```

---

## Advantages of This Architecture

### 1. 独立性

```
- 不绑定任何平台
- 核心 0 依赖
- 用户完全拥有
- 长期可用（即使 OpenClaw 消失）
```

### 2. 生态兼容性

```
- 拥抱 OpenClaw 社区
- 获得流量和用户
- 共享插件生态
- 但不依赖
```

### 3. 渐进体验

```
- Web Demo：零门槛尝试
- Binary：轻量级使用
- Desktop：完整体验
- OpenClaw：生态集成
```

### 4. 技术简单

```
- 单代码库
- 多目标编译（CLI/Web/Desktop/Plugin）
- 维护成本低
- 部署灵活
```

---

## Implementation Strategy

### Phase 1: Core Engine

```
开发独立核心：
- 自然语言理解
- 模板系统
- 代码生成
- 单 binary 输出

技术选型：
- Go：单 binary，跨平台，性能好
- 或 Rust：更小的 binary，更安全
- 或 TypeScript + pkg：JS 生态，易开发

目标：
- 单个 < 50MB 的可执行文件
- 离线可用
- 内置模板
```

### Phase 2: Web Demo

```
开发在线体验：
- 静态网页（GitHub Pages）
- 或轻量级 API（Vercel/Cloudflare）
- 展示 Mock 和生成的代码
- 可下载完整项目

目标：
- 浏览器打开即用
- 降低首次尝试门槛
-  viral 传播
```

### Phase 3: OpenClaw Plugin

```
开发 Skill 包装器：
- 遵循 OpenClaw Skill 规范
- 调用核心引擎
- 适配 OpenClaw 界面

目标：
- 上架 OpenClaw Skill 市场
- 获得社区用户
- 验证需求
```

### Phase 4: Desktop App

```
开发图形界面：
- Tauri（轻量，Rust 后端）
- 或 Electron（成熟，JS 生态）
- 双击运行体验

目标：
- 完全不使用命令行的用户
- 最佳用户体验
```

---

## Success Metrics

### 不追求

```
❌ OpenClaw 插件市场排名
❌ 商业收入
❌ 大规模用户
```

### 追求

```
✅ 有人独立使用（不依赖 OpenClaw）
✅ 核心 binary 被下载使用
✅ 解决真实问题（即使很少人）
✅ 开源社区贡献
✅ 验证"普惠"价值
```

---

## Related Concepts

- [[scaffold-not-platform]] - 脚手架定位
- [[everyones-automation-need]] - 每个人的自动化诉求
- [[zero-operating-cost-model]] - 零成本模式

---

## Personal Notes

这个架构决策很聪明：
- 保持独立性（核心 0 依赖）
- 拥抱社区（OpenClaw 兼容）
- 降低门槛（Web Demo）
- 灵活交付（多形式）

关键是：
- 核心必须简单可靠
- 插件只是可选扩展
- 用户永远拥有代码
- 长期可用性优先

这可能是"普惠 AI"的正确技术路径。
