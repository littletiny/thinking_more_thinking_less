# Connection: Frontend Delivery Channel × Prebuilt Scaffold Strategy

## Relationship

**Prebuilt Scaffold Strategy 是 Frontend Delivery Channel 的实现支撑。**

- **Frontend Delivery Channel**: 决策——选择什么渠道交付给用户
- **Prebuilt Scaffold Strategy**: 基础设施——预先准备好这些渠道的技术实现

两者共同确保交付渠道的可行性。

---

## From Decision to Implementation

### 决策层（Channel Selection）

```
用户场景分析
    ↓
选择渠道：
• IM 机器人（推荐默认）
• IM + Webview
• 小程序
• 本地 App
```

### 实现层（Scaffold Support）

```
选择渠道后：
    ↓
┌─────────────────────────────────────────┐
│ 有对应脚手架？                           │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        ↓                     ↓
       有                     没有
        │                     │
        ↓                     ↓
   拉取脚手架              创建新脚手架
   填充业务代码            或降级方案
   自动打包
```

---

## Scaffold Coverage

### 已覆盖的渠道

| 渠道 | 脚手架支持 | 说明 |
|------|-----------|------|
| IM 机器人 | ✅ Scaffold B | 微信/飞书/钉钉/Telegram |
| 本地 App | ✅ Scaffold A | React Native/Electron/Tauri |
| Webview | ⚠️ 部分 | 可作为本地 App 的子集 |
| 小程序 | ❌ 暂未 | 需要额外脚手架 |

### 渠道 → 脚手架映射

```
用户选择 IM 机器人
    ↓
选择具体平台：
• 微信 → 脚手架 B + 微信适配器
• 飞书 → 脚手架 B + 飞书适配器
• Telegram → 脚手架 B + Telegram 适配器
    ↓
统一接口：sendMessage(), parseCommand()

用户选择本地 App
    ↓
选择具体形式：
• 移动端 → 脚手架 A + React Native
• 桌面端 → 脚手架 A + Electron/Tauri
    ↓
统一接口：本地存储、UI 组件
```

---

## Code Agent 工作流（有脚手架）

```
DDDW 阶段：
    ↓
1. 确定交付渠道（基于 Frontend Delivery Channel 决策）
    ↓
2. 选择对应脚手架
    - 用户用 Telegram → 拉取 IM Bot 脚手架 + Telegram 适配器
    - 用户要桌面应用 → 拉取 Local App 脚手架 + Electron
    ↓
3. Code Agent 专注业务逻辑
    - 不需要：选择技术栈
    - 不需要：配置构建工具
    - 不需要：处理平台差异
    - 只需要：填充业务代码
    ↓
4. 调用脚手架打包
    - 输出 APK/IPA/EXE/DMG
    - 或部署 IM Bot
    ↓
5. 交付用户
```

---

## Value Proposition

### 对 Code Agent

```
无脚手架：
• 每个项目重复基础设施工作
• 技术选型耗费时间
• 构建配置易出错
• 时间分配：80% 基础设施，20% 业务

有脚手架：
• 每个项目专注业务
• 技术决策已固化
• 构建流程标准化
• 时间分配：10% 选择，90% 业务
```

### 对用户

```
• 交付速度更快
• 质量更一致
• 体验更稳定
```

---

## Key Insight

> **脚手架是 DIY 模式的"编译器"——把业务意图快速转化为可交付产物。**

就像传统开发有编译器把代码转为可执行文件，
DIY 开发有脚手架把需求快速打包为 App/Bot。

**投资脚手架 = 投资长期效率**

---

## Related

- Concepts: [[frontend-delivery-channel]], [[prebuilt-scaffold-strategy]]
- Connections: All workflow concepts
- Source: [prebuilt-scaffold-strategy-origin](../conversations/2026-03-08-prebuilt-scaffold-strategy.md)
