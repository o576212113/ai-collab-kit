# lean 写码模式(Lean Code Mode)

> 协议细则。角色红线、铁律见 [../PROTOCOL.md](../PROTOCOL.md);审稿细则见 [review-loop.md](review-loop.md)。
> 适用:进入写代码阶段后的日常协作。这是三环里**使用频率最高**的模式。
> 核心思想:**文档阶段的重协议(逐步 mode 路由 + 自动轮询)在写码阶段仪式成本不划算**——降级为 Owner 直驱 + 整段审 + 硬停点,把 Owner 打扰次数压到最少,同时保住全部审查纪律。

---

## 一、模式标记

进入 lean 模式 = `mode.json` 写:

```json
{ "mode": "execution", "lean": true, "orchestrator_suspended": true, "active_task_id": "<当前单元>" }
```

lean 期间:

- `mode` 只是**粗粒度阶段标记,不是逐步门禁**——不做"写完切 review、审完切回 execution"的机械路由
- **Reviewer 按 READY 目标审,不按 mode 拒审**:判定依据是 `review/state.json` 的 `next_action=wait_for_reviewer_*` + `last_writer.md status: READY_FOR_REVIEW`,而不是 mode 字段(这条来自一次 mode 设错导致 Reviewer 按协议拒审、白白阻塞 40 分钟的教训)
- 协作流由 **Owner 直接驱动各窗口**:Writer 写完告诉 Owner → Owner 让 Reviewer 审 → 审完 Owner 回 Writer 修——大任务一口气跑完,不靠定时轮询

## 二、两层开发文档制度

写码阶段的防漂移支柱。**先有 spec 再有代码,代码永远跟着 dev-log 走。**

### 层 1:单元开发规约(unit spec)——开码前写,Owner 拍板后锁死

模板:[../templates/unit_spec.md](../templates/unit_spec.md)(9 节)。要点:

- §0 心智与红线:这个单元**是什么、绝不是什么**(一开始就锁死,防实现漂移)
- 硬升级对照:逐条过 `escalation_rules.md`,声明命中/未命中
- **现状核实**:基于真实代码/文档现状写(亲读源码),不凭印象——"凭训练知识凑"的 spec 一文不值
- 增量切分:每个增量独立可审、独立可验证
- Owner 亲测点:模块完成时 Owner 用什么步骤亲手验收

spec 本身走一轮审稿环(Reviewer 审)+ **Owner 验收拍板(硬停点①)**,然后才许开码。

### 层 2:dev-log——每个增量随代码累积追加

模板:[../templates/dev_log.md](../templates/dev_log.md)(6 段,每增量一份):

1. **这次做了什么** 2. **为什么这么做** 3. **怎么验证的**(命令+结果原文) 4. **Owner 怎么亲测**(可照抄执行的步骤) 5. **没完成什么**(诚实 scoping) 6. **风险与硬边界**

dev-log 与代码**同一个 commit** 交付;缺 dev-log = 交付不完整,Reviewer 可退回。它的读者是 Owner——写到"不懂代码的 Owner 能跟上项目发生了什么"的程度。

## 三、六步增量循环

每个增量走同一循环:

```
1. Writer 按 spec 写代码 + 测试 + dev-log 增量段
2. Writer 三硬自检:编译 / 测试 / lint(+ CI 绿,若已配置)
   大增量加对抗自审(铁律 #10):先自己推翻自己,修完再 READY
3. Writer 覆盖写 last_writer.md(status: READY_FOR_REVIEW)
   + 更新 review/state.json(review_target_commit + next_action=wait_for_reviewer_<unit>)
   + commit(业务前缀)+ push
   ★ state 两字段是 Reviewer 的点火信号(lean 期 Reviewer 全靠它判断有无待审)
4. Reviewer 整段审(见 review-loop.md §六 代码审基线清单)
5a. APPROVED → 自动进下一增量(回第 1 步,不打扰 Owner)
5b. CHANGES_REQUESTED → Writer 亲读原文逐条修(铁律 #8)→ 回第 3 步
6. 模块全部增量完成 → Owner 亲测(硬停点②)→ 绿了才收口
```

## 四、硬停点(Owner 只在这四处出现)

| # | 停点 | 谁触发 |
|---|---|---|
| ① | **单元 spec 拍板**:spec 审过后必须 Owner 说"开始"才开码 | 流程 |
| ② | **模块完成亲测**:全部增量 APPROVED 后,Owner 按 dev-log §4 亲手验收,绿了才算收口 | 流程 |
| ③ | **硬升级**:任何增量触碰 escalation_rules.md → 立即停,Owner 拍板后继续 | 内容 |
| ④ | **换单元授权**:一个模块收口后,下一个模块必须 Owner 授权启动 | 流程 |

**停点之外一律自动续跑**:增量之间 APPROVED 后直接进下一增量,不逐个请示。(这是对 Owner 注意力的保护,也是效率来源——但四个停点绝不跳过。)

**硬停点②为什么不可省**:单元测试、对抗自审、模块级审稿全绿之后,依然存在只有真人在真界面上点一遍才能发现的 bug(实证:某模块三层审查全过,Owner 亲测第一屏就发现凭证解锁门坏了)。AI 的"全绿"证明的是"AI 能想到的都验了",Owner 亲测验的是 AI 想不到的。

## 五、交审时的"Owner 已拍板"横幅

若本增量落地的是 Owner 已拍板的硬升级类决策(如凭证方案),Writer 交审时必须在 `last_writer.md` **顶部**加横幅:

```markdown
> **[Owner 已拍板]** 本增量实现的 <决策> 已由 Owner 于 <日期> 拍板(<决策记录位置>)。
> 这是代码实现审查,不是设计决策征询——请勿以"等待 Owner 决策"跳过。
```

来历:协议信号全对时,Reviewer 仍可能把"实现已拍板决策的代码"误判为"决策未定"而拒审——设计决策(Owner 的事)和代码审查(Reviewer 的事)在语言上容易混淆,横幅显式拆开。

## 六、lean 期的死锁自管

中控挂起期间没人核验死锁阈值 → **Reviewer 自记自检**(铁律 #13):每轮审稿在 `last_reviewer.md` 记录本单元 attempt/gate 计数;同 gate 连续 2 次或单元累计 3 次打回 → 顶部标 `DEADLOCK-BLOCKED(escalate_owner)`,停下等 Owner 裁断,不静默清零、不静默继续。

Owner 裁断后 deadlock 基线重置。

## 七、验证链与机检守卫

- 项目应有一条**一键验证链**(`collab.config.json` 的 `verify_commands`,如 typecheck + lint + test + build + 自定义检查),READY 前全跑
- **同类审稿发现第二次出现 → 追加为验证链里的检查脚本**(铁律 #11)。新守卫必须 prove-catch:把问题样本写回 → 跑守卫 → 亲见拦截(exit≠0)→ 还原。没证明能拦住的守卫等于没有
- 声称"验证全绿"之前必须**真的跑完整链**,只跑冒烟测试不算(铁律 #12)

## 八、退出 lean

Owner 说"开启审核模式 / 恢复中控 / 停"→ 退出 lean,`mode.json` 恢复常规路由(写=execution、审=review、由中控切换)。lean 与常规是同一套审稿协议的两种驱动方式,产物格式、字段属权、铁律完全相同。
