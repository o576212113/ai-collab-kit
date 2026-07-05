# 议事环(Discussion Loop)

> 协议细则。角色红线、硬升级、铁律见 [../PROTOCOL.md](../PROTOCOL.md)。
> 适用:方案选型、架构争议、协作规则升级——凡是"Owner 抛一个议题,想听两个 AI 独立观点再拍板"的场景。
> **词汇隔离**:议事环终态只有 `converged / escalated_owner`,永远不出现 `APPROVED / CHANGES_REQUESTED / BLOCKED`(那是审稿环专属,铁律 #17)。

---

## 一、核心机制:并行盲发

双方在同一阶段**互不可见对方草稿**、各自独立成文,然后互看再回应。这是议事环的灵魂——先看到对方观点的一方会被锚定,盲发保证观点独立性(这正是用两个不同厂商模型的意义)。

## 二、状态机

```
idle
 → parallel_draft_round_1     双方各写 r1_draft(盲发,互不可见)
 → cross_response_round_1     互看对方 draft,各写 r1_response
    ├─ 双方 agree             → converged → synthesis → 等 Owner
    └─ 任一 disagree          → parallel_draft_round_2
 → cross_response_round_2
    ├─ 双方 agree             → converged
    └─ 任一 disagree          → escalated_owner(2 轮上限,不再拖)
converged / escalated_owner
 → synthesis.md(Writer 起草 + Reviewer 复核 ack)
 → Owner 拍板 → owner_decision.md → 回 idle
```

**2 轮上限**:AI 之间的分歧超过 2 轮基本不会自行收敛,继续只是烧 token。升级给 Owner 的 synthesis 是 advisory(利弊矩阵 + 决策项),不是败局。

### 轻量档(`topic <slug> --lite`)

中等分量的议题不值得全套仪式。lite 档砍掉 response 轮和 R2:

```
R1 盲发 draft ×2 → 起草方(轮换)读双方 draft 直接写 synthesis
 → 另一方复核(结构化三问 + ack | ack_with_amendments | disagree)
 → ack 通过且无硬升级 → converged;disagree 或命中硬升级 → escalated_owner
 → Owner 拍板收口
```

盲发的核心价值(R1 独立观点)一点不丢,AI 动作从 7 次降到 4 次。**标准档留给"拍错疼半年"的决策,lite 吃中等问题;拿不准用哪档 → 用标准档。**

## 三、议题目录

```
_collab/discussion/topics/T-NNN-<slug>/
  topic.md                 ← Owner 议题原文(中控机械誊录)
  writer_r1_draft.md       ← Writer R1 盲发
  reviewer_r1_draft.md     ← Reviewer R1 盲发
  writer_r1_response.md    ← 互看后回应
  reviewer_r1_response.md
  writer_r2_draft.md       ← (若 R1 未收敛)
  ...
  synthesis.md             ← Writer 起草 + Reviewer 复核
  owner_decision.md        ← Owner 拍板后中控誊录
```

## 四、topic.md 铁律:Owner 原文优先

topic.md 主体是 **Owner 议题原文,一字不改**。允许的段只有 3 类:

1. `## Owner 议题原文`(一字不改)
2. `## 机械字段`(topic_id / 启动时间 / phase)
3. `## 硬升级筛查`(机械对照 escalation_rules.md 逐条判定)

**禁止清单**(中控/任何 AI 严禁往 topic.md 加,即使出于善意):关联议题、背景解读、边界约束(除非 Owner 原文有)、期望产出形态、议题重述/通俗版、"Owner 必拍板的点"(那是 synthesis 的事)、任何 AI 视角的提示。**判别标准:不在 Owner 原文里 + 不是机械字段 = 越权。** Owner 想加背景就自己加在原文里。

(这条清单是同一违规发生两次后逐项枚举出来的——"帮 worker 理解"的善意加工会淹没 Owner 原意、锚定双方观点。)

## 五、读权限矩阵(盲发纪律)

| 阶段 | 允许读 | 禁止读 |
|---|---|---|
| R1 draft | topic.md / 协议文件 / state | 对方任何文件 |
| R1 response | + 对方 R1 draft | 对方 R1 response(同时在写) |
| R2 draft | + 对方 R1 response | 对方 R2 draft |
| R2 response | + 对方 R2 draft | 对方 R2 response |
| synthesis | 全部 | — |

技术上无法强制(证明不了"没偷看"),靠**协议自律 + 审计字段**:双方每次读了对方文件后,在自己下一份产物头部自报 `seen_opponent_round: <N>`(state.discussion.json 也有对应的 `writer_seen_reviewer_round` / `reviewer_seen_writer_round` 字段供留痕),事后可查。**看到对方同阶段文件想偷看 → 立即停止。**

## 六、产物必备两段(机械收敛信号)

每份 draft / response / synthesis **末尾必须有**(缺任一,流程卡住):

```markdown
## 给 Owner 的人话摘要
<2-3 句,无术语堆砌,客观陈述本轮观点/方案/立场>

## 收敛信号(机械字段,推进用)
- convergence_signal: <agree | disagree>
- concession: <agree 时必填:我放弃了自己方案的哪一点/接受了对方哪个论据;disagree 填 null>
- hard_escalation_topic: <true | false>
- hard_escalation_category: <escalation_rules.md 中的类别名 | null>
```

**draft 额外必备一段"## 假设声明"**:列出"我假设 X 成立;若 X 不成立,我的结论变为 Y"——议题原文留白导致的偏差就地显形,不用打断流程回问 Owner。缺此段 draft 阶段推不动。

**`concession` 是反懒惰同意机制**:说不出自己让了什么步的 agree,大概率是讨好式附和——agree 而 concession 空缺,流程卡住。另有**矛盾探针**:字段填 agree 但正文含强异议措辞(不同意/强烈反对/风险过大/保留意见等)时,advance 会向 Owner 输出警告(不拦截),提示展开原文核对。

**两个段的标题是机械字面量**:脚本按字面 grep(接受中文"人话摘要"或英文 "Owner Summary"),无论产物用什么语言写,这两个标题不得翻译成其他措辞,否则 advance 会卡 `missing_*`。

**收敛判定完全机械**(`collab.mjs advance` 执行,中控不读正文;三个机械字段**缺任一都卡住**,fail-closed):

- 双方 `agree` + 双方 `hard_escalation_topic=false` → `converged`
- 双方 `agree` + 任一 `true` → **强制 `escalated_owner`**(即使双方一致——见 PROTOCOL §七)
- 任一 `disagree`(R1)→ 进 R2;(R2)→ `escalated_owner`

## 七、synthesis.md:顶部 5 行决策摘要

synthesis **第一段必须是**(在一切内容之前):

```markdown
## 给 Owner 的 5 行决策摘要

1. **议题**:<一句话>
2. **共识方案**:<一句话;无共识写"未收敛">
3. **关键分歧**:<一句话;无则写"无">
4. **Owner 必拍板的点**:<最多 3 个,每个一句话>
5. **推荐**:<采纳/驳回/部分采纳 X,一句话理由>
```

后续再放:共识方案详述、分歧矩阵(维度 × 双方倾向 × 影响面)、推荐落地步骤、利弊矩阵。完整模板:[../templates/synthesis.md](../templates/synthesis.md)。

**起草权轮换(公正性)**:单数议题开发员起草、双数议题审核员起草(`topic` 命令自动写入 `state.synthesis_author`)。起草方掌握叙事框架,轮换让滤镜不总朝一个方向。

**复核 ack 是结构化三问,不是橡皮图章**——复核方必须逐条回答:

1. "5 行决策摘要"与我的实际立场一致吗?
2. 分歧表有遗漏吗?
3. 我的方案在利弊矩阵里被公正陈述了吗?

然后填 `<复核方>_ack: ack | ack_with_amendments`(字段名按角色:开发员起草则审核员填 `reviewer_ack`,反之填 `writer_ack`;lite 档额外允许 `disagree` 直接升级 Owner)。

**流转**:起草方(按轮换)起草 → 复核方三问 + ack(有问题 → `ack_with_amendments` 列具体修正)→ 通知 Owner。

**来历**:曾经三次议事全部跑通、零次 Owner 拍板——synthesis 几百行 Owner 看不下去。Owner 默认只看这 5 行,说"展开"才看全文。

## 八、Owner 一句话拍板

| Owner 说 | 落地 |
|---|---|
| `T-NN 全采纳` | owner_decision.md 引 synthesis 原文 + 标全采纳 |
| `T-NN 采纳但 X 改 Y` / `采纳除 A2` | 引原文 + 应用 Owner 修改 |
| `T-NN 驳回` | 标 rejected + Owner 原话 |

owner_decision.md 的写入是**机械誊录**(引用 synthesis 原文 + Owner 当前消息原文,不改写不解读),由中控执行。脚本形态:把 Owner 原话存成文件后跑

```bash
node <kit>/scripts/collab.mjs decision --from owner话.txt [--status adopted|adopted_with_changes|rejected]
```

脚本会誊录原文、逐字抄录 synthesis 的"推荐落地步骤"段、把议题收口(phase→idle、mode→idle)。`adopted_with_changes` 的"Owner 修改项"段需人工按 Owner 口述补齐(脚本不解读)。

## 九、硬升级议题的特殊处理

与审稿环不同:议事环命中硬升级**不跳过讨论**——仍走完整 R1/R2 收集双方利弊(Owner 需要这些分析来拍板),但:

1. 双方发言在收敛信号段如实标 `hard_escalation_topic: true` + 类别——这就是"决策权归 Owner"的机械标记,中控据此强制升级
2. synthesis 不得给"自动落地"建议,只给利弊矩阵 + Owner 决策项
3. 收敛判定强制走 `escalated_owner`(见 §六)

## 十、commit 约定

议事环**所有 commit 都加 `[skip-review]`**(防止误触发审稿环):

| 场景 | 前缀 |
|---|---|
| 启动议题 | `discuss(topic): T-NNN 启动 — <slug> [skip-review]` |
| Writer 观点 | `writer(opinion): T-NNN R{N} {draft\|response} [skip-review]` |
| Reviewer 观点 | `reviewer(opinion): T-NNN R{N} {draft\|response} [skip-review]` |
| synthesis 起草/复核 | `discuss(synthesis): T-NNN ... [skip-review]` |
| phase 推进 | `chore(collab): T-NNN → <new_phase> [skip-review]` |
| Owner 拍板 | `discuss(decision): T-NNN ... [skip-review]` |
