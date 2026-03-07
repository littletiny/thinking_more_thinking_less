# Natural Language Mock / 自然语言 Mock

## One Sentence
Mock 的本质是"模拟输入输出行为"，而 LLM 本身就是通用的输入输出模拟器——因此用自然语言描述 Mock 行为，比编写 Mock 代码更直接、更灵活、更具表达力。

---

## Why It Matters

### 传统 Mock 的痛苦

```python
# 传统方式：写代码模拟 API
@mock.patch('api.get_user')
def test_user_flow(mock_get_user):
    mock_get_user.return_value = {
        'id': 1,
        'name': 'Test',
        'status': 'active',
        'created_at': '2024-01-01'
    }
    # 测试逻辑...
```

问题：
- 需要定义精确的数据结构
- 需要模拟各种边界情况（错误、超时、部分返回）
- Mock 代码本身需要维护
- 变更真实 API 时，Mock 可能失效

### 自然语言 Mock 的洞见

> "Mock 的目的就是 mock，并不是实际执行"

既然：
- Mock 的目的是**模拟行为**
- LLM 的核心能力是**根据输入生成输出**
- Mock 代码本质上是**行为的确定性描述**

那么：
- **Mock = Model + Natural Language Description**
- 不需要写 Mock 代码
- 不需要维护数据结构
- 用一行自然语言即可定义任意复杂的行为

---

## Source Context

From conversation: [natural-language-mock-origin](../conversations/2026-03-08-natural-language-mock.md)

**Key case**: 在讨论 Mock-Driven Validation 时，用户提出既然 Mock 只是模拟而非实际执行，为何不直接用 LLM 本身作为 Mock 引擎

**Key insight**: 传统 Mock 需要编写代码来模拟 API，但 LLM 本身就是通用的输入输出模拟器——用自然语言描述行为比写代码更直接。

**User's original words**:
> "我们要开始颠覆mock的概念，传统的mock需要去模拟各种现有的api接口，既然他的目的就是mock，并不是实际执行，那他能不能就变成model本身，反正model就是负责input->output，我们只要用一行自然语言就可以代替任何mock实现来模拟mock的功能"

---

## Core Mechanism

### 范式对比

| 维度 | 传统 Code Mock | Natural Language Mock |
|------|----------------|----------------------|
| **实现方式** | 写代码定义返回值 | 用自然语言描述行为 |
| **数据结构** | 需要精确定义 | 隐式处理 |
| **边界情况** | 手动编写每种 case | 一句话描述规则 |
| **维护成本** | API 变更需同步修改 | 描述不变则行为不变 |
| **复杂度表达** | 代码复杂度线性增长 | 自然语言可直接表达复杂逻辑 |
| **不确定性** | 难以模拟随机性 | 天然支持"有时成功有时失败" |

### 实现模式

```
传统 Mock:
┌─────────────┐     ┌──────────────┐     ┌─────────┐
│ Application │ ──→ │ Mock Server  │ ──→ │  Code   │
│   (被测系统)  │     │ (硬编码返回)  │     │定义的返回值│
└─────────────┘     └──────────────┘     └─────────┘

NL Mock:
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ Application │ ──→ │   LLM Core   │ ──→ │ Natural Lang │
│   (被测系统)  │     │ (通用模拟器)  │     │  Behavior    │
│             │     │              │     │ Description  │
└─────────────┘     └──────────────┘     └──────────────┘
                              ↑
                              │
                    "用户不存在时返回404，
                     有时返回延迟2秒，
                     订单金额>1000时触发风控审核"
```

### 行为描述示例

```yaml
# mock-config.yaml
# 不再需要写代码，用自然语言描述行为

apis:
  get_user:
    behavior: >
      如果 user_id 存在，返回用户信息，
      包含 id, name, email, 随机生成的注册时间；
      如果 user_id 以 'test_' 开头，返回测试账号标记；
      如果 user_id = 'error'，50%概率返回 500 错误，
      50%概率返回空数据；
      响应延迟 100-500ms 随机

  create_order:
    behavior: >
      验证商品库存，库存不足返回错误；
      订单金额 > 1000 元时，30% 概率触发风控审核状态；
      成功时返回订单号（格式：ORD + 时间戳 + 4位随机数）；
      并发请求时有 5% 概率返回"系统繁忙"

  get_recommendations:
    behavior: >
      根据用户历史返回 5-10 个推荐项；
      每个推荐项包含商品名、价格（浮动 ±20%）、匹配度分数；
      新用户返回热门商品；
      深夜时段（0-6点）返回助眠相关商品
```

---

## Key Advantages

### 1. 零代码维护
不需要编写、维护 Mock 代码。API 接口变化时，只需要调整自然语言描述。

### 2. 复杂逻辑的天然表达
```
传统方式：需要写 if/else 模拟各种条件
NL方式："如果是VIP用户且购买过3次以上，返回专属折扣价格"
```

### 3. 不确定性的优雅处理
```
传统方式：需要引入随机数逻辑
NL方式："10%概率返回网络超时错误"
```

### 4. 语义化边界情况
```
传统方式：定义具体的错误码和数据
NL方式："模拟第三方服务限流时的行为：前5次请求成功，
         第6次开始返回429错误，持续30秒后恢复"
```

---

## Integration with Mock-Driven Validation

这个概念是 [[mock-driven-validation]] 的技术基础：

- **Mock-Driven Validation**: 方法论——用 Mock 验证用户主观感受
- **Natural Language Mock**: 技术实现——用自然语言生成 Mock，降低 Mock 成本到趋近于零

两者结合，使得"快速生成-用户验证-迭代修正"的循环成为可能：

```
用户描述需求 ──→ AI生成NL Mock描述 ──→ 生成交互原型
                                      ↓
用户反馈修正 ←── 观察用户交互行为 ←── 部署Mock服务
```

---

## Potential Challenges

1. **确定性问题**
   - LLM 生成的输出可能有随机性
   - 需要设计"种子"机制确保可重复测试

2. **性能开销**
   - LLM 推理比硬编码返回慢
   - 需要缓存机制或本地小模型

3. **精确性边界**
   - 对于需要精确数值的场景（如财务计算），可能需要混合模式
   - NL描述 + 代码校验

---

## Related Concepts

- [[mock-driven-validation]] - 用 Mock 验证需求的方法论
- [[gradual-consultation]] - 渐进式咨询，降低表达门槛
- [[pattern-primacy]] - 从具体案例出发的认知模式

---

## Personal Notes

- 这个概念的颠覆性在于：**把 Mock 从"代码工程"变成"意图表达"**
- 技术实现上，需要一个"NL Mock 引擎"来解析自然语言并生成一致性的模拟响应
- 可能的演进：从"描述行为"到"描述场景"——用更高层次的抽象
- 与 [[ai-thinking-scaffold]] 的关系：都是把"思考/意图"直接映射为"执行/表现"
