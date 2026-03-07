# Connection: Demo as Requirements × Mock Feasibility Boundary

## Relationship

**Mock Feasibility Boundary 是 Demo-as-Requirements 的安全约束。**

- **Demo-as-Requirements**: 通过 Demo 探索并记录需求
- **Mock Feasibility Boundary**: 确保 Demo 中验证的需求在工程上可实现

两者结合，防止"验证成功但交付失败"的灾难。

---

## The Dangerous Gap

### 没有可行性检查的流程

```
用户："我想要实时情绪识别，通过摄像头判断用户心情"
    ↓
NL Mock: easy
    ↓
Demo: 完美运行（模拟数据）
    ↓
用户："对！这就是我要的！"
    ↓
DDDW 启动
    ↓
工程团队：...
  - 情绪识别准确率有限（70-80%）
  - 需要大量训练数据
  - 隐私合规问题
  - 浏览器端实时处理性能问题
    ↓
无法实现 Demo 承诺的体验
    ↓
用户失望 / 项目失败 / 信任破裂
```

### 有可行性检查的流程

```
用户："我想要实时情绪识别..."
    ↓
┌──────────────────────────────────────┐
│ Feasibility Pre-Check                │
│ "情绪识别技术存在，但准确率约75%，    │
│  且涉及隐私合规，是否继续？"          │
└──────────────────┬───────────────────┘
                   │
        ┌──────────┴──────────┐
        ↓                     ↓
    接受约束              不接受
        │                     │
        ↓                     ↓
   继续流程，但          探索替代方案
   在 Mock 中标注        - 离线情绪分析
   准确率限制            - 简化版（仅开心/难过）
        │                     ↓
        └─────────────────────┘
                   ↓
           Demo 生成
           （明确标注技术约束）
                   ↓
           用户验证
           （基于真实约束期望）
                   ↓
           ┌──────────────────────────┐
           │ Pre-DDDW Feasibility Gate │
           │                           │
           │ 工程团队确认：             │
           │ ✅ 75%准确率可实现         │
           │ ✅ 隐私方案已设计          │
           │ ✅ 性能优化方案可行        │
           └───────────┬───────────────┘
                       ↓
                  启动 DDDW
                  （可实现的需求）
```

---

## Integration Points

### Point 1: Mock Design Level

每个 NL Mock 描述都应该包含可行性元数据：

```yaml
api: emotion_recognition
behavior: >
  分析视频流，返回检测到的情绪（happy/sad/angry/neutral）
  置信度阈值 0.6 以上才返回结果

feasibility:
  tech_readiness: production_ready  # research/poc/production
  accuracy: ~75%  # 明确标注准确率
  constraints:
    - "需要用户明确授权摄像头"
    - "仅支持正面清晰人脸"
    - "准确率随光线条件变化"
  risk_level: medium
  
mitigation:
  fallback: "无法识别时返回 'unknown'，不阻断流程"
  user_communication: "界面显示'仅供参考'"
```

### Point 2: Demo Confirmation Level

用户确认 Demo 时，必须同时确认可行性约束：

```
Demo 已准备好，请体验。

⚠️ 重要提示：以下功能在真实实现中有约束
- 情绪识别准确率约 75%，可能误判
- 需要良好的光线条件
- 需要您授权摄像头权限

您是否接受这些约束？
[接受并继续] [讨论替代方案]
```

### Point 3: Handoff to DDDW Level

交付包必须包含可行性评估：

```
📦 Handoff Package (with Feasibility)
├── 🎯 Confirmed Demo
├── 📄 Requirements Document (Demo Log)
├── 🔧 NL Mock Configurations
├── ⚠️ Feasibility Assessment  ← 新增
│   ├── 技术可行性：✅ 可实现
│   ├── 准确率约束：75%（用户已接受）
│   ├── 性能风险：中等（需优化）
│   └── 建议：优先实现 happy/sad 二分类
└── 🧪 Feasibility Spike Result (if applicable)
    └── 概念验证结果
```

---

## Key Insight

这个组合解决了探索型开发的核心矛盾：

> **如何在保持探索灵活性的同时，确保工程可行性？**

答案：
1. **探索期**: 快速验证用户意图（不纠结可行性）
2. **但**: 同时标注可行性假设
3. **过渡期**: 显式进行可行性评估
4. **工程期**: 基于已验证的可行需求进行确定性开发

---

## Risk Levels

| 风险等级 | 定义 | 处理方式 |
|---------|------|----------|
| **Low** | 技术成熟，实现路径清晰 | 直接 Mock，标准流程 |
| **Medium** | 技术可行，但有约束/挑战 | 标注约束，用户确认 |
| **High** | 技术前沿，或依赖不确定 | Feasibility Spike 验证 |
| **Blocker** | 当前技术不可行/不现实 | 拒绝或寻找替代方案 |

---

## Related

- Concepts: [[demo-as-requirements]], [[mock-feasibility-boundary]]
- Source: [demo-as-requirements-origin](../conversations/2026-03-08-demo-as-requirements.md)
- Source: [mock-feasibility-boundary-origin](../conversations/2026-03-08-mock-feasibility-boundary.md)
