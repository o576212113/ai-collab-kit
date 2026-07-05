# 硬升级候选(实战沉淀区,append-only)

> **用途**:协作中发现"这事本该停下问 Owner,但 escalation_rules.md 里没有对应规则"时,任何角色在此**追加**一行候选。**不得直接改 escalation_rules.md**——被清单约束的一方不能自己改清单,这是防共谋底线。
> **Owner 处理方式**:跑 `node <kit>/scripts/collab.mjs proposals` 查看候选,逐条拍板;采纳的由 Owner 以 `owner(config): 采纳硬升级候选 [skip-review]` 前缀写进 escalation_rules.md 的"项目自定义追加"段,同一 commit 从本文件删除已处理条目。

格式(一行一条,照抄下面示例的结构):

ESCALATION-CANDIDATE(填写示例): 不许调用任何付费 API —— 触发场景:增量2 开发员拿不准是否可用付费转码服务 / 提议人:writer / 日期:2026-07-05

---
