# T-NNN-<slug> synthesis

## 给 Owner 的 5 行决策摘要

1. **议题**:<一句话>
2. **共识方案**:<一句话,双方一致的方向;未收敛写"未收敛">
3. **关键分歧**:<一句话;无则写"无">
4. **Owner 必拍板的点**:<最多 3 个,每个一句话>
5. **推荐**:<采纳 / 驳回 / 部分采纳 X,一句话理由>

---

- decision_authority: <ai_consensus | owner(硬升级议题强制 owner)>
- converged_round: <R1 | R2 | none(escalated)>
- writer_draft_commit: <hash>
- reviewer_ack: <pending | ack | ack_with_amendments>

## 共识方案

<双方一致认可的方案描述>

## 分歧点(若有)

| 维度 | Writer 倾向 | Reviewer 倾向 | 影响面 |
|---|---|---|---|

## 推荐落地步骤

1. <...>

## 必须 Owner 拍板的点(advisory 模式必填)

- [ ] <决策点 1:选项 A vs 选项 B,各自代价>

## 利弊矩阵(双方各自总结对方方案的优点)

<Writer 眼中 Reviewer 方案的优点 / Reviewer 眼中 Writer 方案的优点——强制换位,防止立场固化>

## 复核 ack(结构化三问,复核方=非起草方填写)

1. 5 行决策摘要与我的实际立场一致吗?<一致 / 不一致:哪里>
2. 分歧表有遗漏吗?<无 / 有:补什么>
3. 我的方案在利弊矩阵里被公正陈述了吗?<是 / 否:怎么改>

- reviewer_ack: <ack | ack_with_amendments | disagree(lite 档)>
  <!-- 字段名按角色:审核员起草时本行改为 writer_ack;机检两个名字都识别 -->

## 给 Owner 的人话摘要

<2-3 句,无术语>

## 收敛信号(机械字段,推进用)

- convergence_signal: <agree | disagree>
- hard_escalation_topic: <true | false>
- hard_escalation_category: <类别名 | null>
