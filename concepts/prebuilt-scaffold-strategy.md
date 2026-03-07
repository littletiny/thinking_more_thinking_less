# Prebuilt Scaffold Strategy / 预置脚手架策略

## One Sentence
为减少 Code Agent 负担并加速交付，需预置两套脚手架：一套基于 React Native/Electron 的本地应用栈（含自动打包），一套 IM 机器人栈（微信/飞书/钉钉/Telegram），覆盖本地与云端、国内与海外场景。

---

## Why It Matters

### Code Agent 的负担

```
如果没有预置脚手架：

用户："我想做个记账应用"
    ↓
Code Agent 需要：
1. 选择前端技术栈
2. 配置构建工具
3. 设置开发环境
4. 处理打包部署
5. 处理平台差异（iOS/Android/Web）
6. 处理 IM API 接入
    ↓
每个项目重复这些工作
    ↓
开发周期长、错误率高、不一致
```

### 预置脚手架的价值

```
有预置脚手架：

用户："我想做个记账应用"
    ↓
Code Agent：
1. 选择脚手架 A（本地 App）或 B（IM 机器人）
2. 在脚手架基础上填充业务代码
3. 自动打包交付
    ↓
专注业务逻辑，而非基础设施
```

---

## Source Context

From conversation: [prebuilt-scaffold-strategy-origin](../conversations/2026-03-08-prebuilt-scaffold-strategy.md)

**Key case**: 讨论前端交付渠道后，用户补充基础设施准备策略

**Key insight**: 需要预置两套脚手架减少 Code Agent 负担——一套本地应用栈（React Native/Electron），一套 IM 机器人栈（多平台支持），覆盖不同场景。

**User's original words**:
> "考虑到海外用户，我们还得加上telegram，telegram的的sdk能力应该是最强的，当然他的风险也众多"

> "当然还可能只是一个本地应用，这种情况下，前端的web栈也很合适，但是我们需要稍微打包成一个app，否则每次要启动一个service再在页面上交互很糟心"

> "因此我们还是要准备2套脚手架，一套react-native类似的前端栈，一套IM机器人的栈"

> "这些脚手架我们得事先实现好，减少code agent的负担"

---

## Core Mechanism

### 两套脚手架体系

```
┌─────────────────────────────────────────────────────────────────┐
│                   Scaffold System                               │
├───────────────────────────────┬─────────────────────────────────┤
│                               │                                 │
│   Scaffold A: Local App       │   Scaffold B: IM Bot            │
│   本地应用脚手架               │   IM 机器人脚手架                │
│                               │                                 │
├───────────────────────────────┼─────────────────────────────────┤
│                               │                                 │
│  技术栈：                      │  平台支持：                      │
│  • React Native (iOS/Android) │  • 微信（国内）                  │
│  • Electron (Desktop)         │  • 飞书（国内/企业）              │
│  • Tauri (轻量桌面)            │  • 钉钉（企业）                  │
│  • Capacitor (Web→App)        │  • Telegram（海外）              │
│                               │                                 │
│  预置能力：                    │  预置能力：                      │
│  • UI 组件库                   │  • 多平台 SDK 封装              │
│  • 本地存储                    │  • 消息路由                      │
│  • 离线支持                    │  • 命令解析                      │
│  • 自动打包脚本                │  • Webhook 处理                  │
│  • 热更新                      │  • 富媒体消息                    │
│                               │                                 │
│  适用场景：                    │  适用场景：                      │
│  • 高频使用                    │  • 低频/通知类                   │
│  • 复杂交互                    │  • 简单 NLP 交互                 │
│  • 离线需求                    │  • 快速触达                      │
│  • 数据敏感（本地优先）         │  • 零安装成本                    │
│                               │                                 │
└───────────────────────────────┴─────────────────────────────────┘
```

### 脚手架预置内容

#### Scaffold A: Local App

```
prebuilt-scaffold/
├── local-app/
│   ├── templates/
│   │   ├── react-native/          # RN 模板
│   │   │   ├── src/
│   │   │   │   ├── components/    # 预置 UI 组件
│   │   │   │   ├── storage/       # 本地存储封装
│   │   │   │   └── api/           # 本地 API 层
│   │   │   ├── android/           # Android 配置
│   │   │   ├── ios/               # iOS 配置
│   │   │   └── package.json
│   │   ├── electron/              # 桌面端模板
│   │   └── tauri/                 # 轻量桌面模板
│   ├── scripts/
│   │   ├── build-android.sh       # 自动打包脚本
│   │   ├── build-ios.sh
│   │   └── build-desktop.sh
│   └── docs/
│       └── integration-guide.md   # Code Agent 接入指南
```

**预置能力**：
- UI 组件库（按钮、表单、列表、图表）
- 本地存储（SQLite/IndexedDB 封装）
- 状态管理
- 离线支持
- 自动打包（输出 APK/IPA/EXE/DMG）

#### Scaffold B: IM Bot

```
prebuilt-scaffold/
├── im-bot/
│   ├── adapters/                  # 平台适配器
│   │   ├── wechat/                # 微信适配
│   │   ├── feishu/                # 飞书适配
│   │   ├── dingtalk/              # 钉钉适配
│   │   └── telegram/              # Telegram 适配
│   ├── core/
│   │   ├── message-router.js      # 消息路由
│   │   ├── command-parser.js      # 命令解析
│   │   ├── session-manager.js     # 会话管理
│   │   └── rich-media.js          # 富媒体消息
│   ├── templates/
│   │   ├── bot-handler.js         # 业务逻辑模板
│   │   └── webhook-server.js      # Webhook 服务模板
│   └── docs/
│       └── platform-setup.md      # 各平台配置指南
```

**预置能力**：
- 多平台 SDK 统一封装
- 消息路由（文本/图片/卡片）
- 命令解析（自然语言 → 结构化指令）
- 会话状态管理
- 富媒体消息（按钮、菜单、链接）

---

## Platform Considerations

### Telegram（海外）

**优势**：
- Bot API 最完善
- 支持丰富的消息格式
- Webhook + 长轮询都支持
- 免费

**风险**：
- 部分地区访问受限
- 隐私政策变化
- 账号封禁风险

**适用**：海外个人用户

### 微信（国内）

**限制**：
- 个人号机器人限制严格
- 企业微信相对开放
- 公众号开发较复杂

**方案**：
- 企业微信机器人（推荐）
- 公众号（服务号）
- 小程序（如果需要界面）

### 飞书/钉钉（企业）

**优势**：
- 企业场景成熟
- API 完善
- 国内稳定

**适用**：企业用户、团队协作工具

---

## Scaffold Selection Decision

```
用户需求
    ↓
┌─────────────────────────────────────────┐
│ Step 1: 使用场景判断                     │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        ↓                     ↓
    个人高频使用            低频/通知类
    复杂交互                简单 NLP
        │                     │
        ↓                     ↓
   Scaffold A              Scaffold B
   (Local App)             (IM Bot)
        │                     │
        ↓                     ↓
   ┌───────────────────────────────────┐
   │ Step 2: 用户环境判断               │
   ├───────────────────────────────────┤
   │                                   │
   │ Local App:                        │
   │ • 桌面为主 → Electron/Tauri       │
   │ • 移动为主 → React Native         │
   │ • 快速跨端 → Capacitor            │
   │                                   │
   │ IM Bot:                           │
   │ • 国内用户 → 微信/飞书            │
   │ • 海外用户 → Telegram             │
   │ • 企业场景 → 飞书/钉钉            │
   │                                   │
   └───────────────────────────────────┘
```

---

## Integration with Workflow

### DDDW 阶段使用脚手架

```
Exploration Phase（Demo）：
- 快速用 NL-Mock 验证需求
- 不涉及具体技术栈

DDDW Phase（实现）：
    ↓
选择脚手架
    ↓
Code Agent：
1. 拉取对应脚手架模板
2. 根据需求填充业务代码
3. 调用脚手架打包脚本
4. 输出可交付产物

交付物：
- Local App: APK/IPA/安装包
- IM Bot: 部署配置 + 使用说明
```

### Code Agent 减负效果

**无脚手架时**：
```
Code Agent 任务：
- 选择技术栈（100+ 选择）
- 配置构建工具（易错）
- 处理平台差异（复杂）
- 编写基础设施代码（重复）
- 业务逻辑（真正重要的）

时间分配：80% 基础设施，20% 业务
```

**有脚手架时**：
```
Code Agent 任务：
- 选择脚手架（2 选 1）
- 填充业务代码
- 调用打包脚本

时间分配：10% 基础设施选择，90% 业务
```

---

## Key Principles

### 1. 约定优于配置

```
脚手架提供：
- 固定的项目结构
- 预置的最佳实践
- 标准的打包流程

Code Agent 只需：
- 按约定填充业务代码
- 无需做技术决策
```

### 2. 渐进披露复杂度

```
基础脚手架：简单，覆盖 80% 场景
    ↓
高级扩展：需要时启用
    - 复杂状态管理
    - 多端同步
    - 离线优先
```

### 3. 平台抽象

```
IM Bot 脚手架：
- 统一接口：sendMessage()
- 底层适配不同平台 SDK
- Code Agent 无需关心平台差异
```

---

## Risk Considerations

### Telegram 风险

```
问题：部分地区无法访问
应对：
- 提供备用方案（Matrix？）
- 或建议本地 App 方案
```

### 微信限制

```
问题：个人号机器人封号风险
应对：
- 主推企业微信
- 明确告知用户限制
```

### 本地 App 分发

```
问题：iOS 需要签名，Android 需要安装权限
应对：
- 优先桌面端（Electron/Tauri）
- 移动端建议 IM 方案
```

---

## Related Concepts

- [[frontend-delivery-channel]] - 前端交付渠道选择
- [[diy-software-mindset]] - 从简原则，脚手架减少重复工作
- [[model-code-agent-separation]] - Code Agent 专注业务，脚手架处理基础设施

---

## Personal Notes

- 脚手架是 DIY 模式的"基础设施投资"
- 前期投入大，后期每个项目都受益
- 关键：脚手架要足够简单，不要让 Code Agent 学习成本太高
- 需要权衡：预置多少 vs 保持灵活性
- Telegram 的 Bot API 确实最强，但需要考虑用户的实际可达性
