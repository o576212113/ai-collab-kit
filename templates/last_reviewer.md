# Reviewer Round

actor: reviewer
reviewed_commit: <具体 hash,禁止写 HEAD>
unit: <单元 ID>
target: <被审交付物>
status: <APPROVED | CHANGES_REQUESTED | BLOCKED>
round: <N>
attempt: <N>
timestamp: <ISO 8601>

<!-- 死锁熔断:同 gate 连续 2 次或本单元累计 3 次打回时,在最顶部加:
     DEADLOCK-BLOCKED(escalate_owner):<现象一句话 + 建议>,然后停下等 Owner。 -->

## 结论

<一句话:放行进下一单元 / 打回原因 / 阻塞原因 + 下一步(next_action 值)>

## Findings

> 定级标准见 roles/reviewer.md。P3 不驱动项目节奏。建议 ≠ 决策;命中 escalation_rules.md → 直接 BLOCKED。

### P1
- 文件:<路径>
- 行:<行号(必须锚到实现行,不是提到符号名的注释行)>
- 问题:<是什么、为什么错(引证据)>
- 建议:<怎么修(这是建议,采纳与否 Writer 可反审)>
- gate_id: <本 finding 的 gate 标识,用于死锁计数,如 unit3_auth_bypass>

### P2 / P3
<同上格式>

<无 findings 时写"无 P1 / P2 / P3"。>

## 已审 / 未审范围声明

- 已审:commit <hash>;文件 <清单>;执行的检查:<diff 范围 / 跑过的测试或探针 / grep 项>
- **未审**:<明确列出,如"未跑全量测试(采信 Writer 自检)/ 未审相邻模块 / 未做 GUI 实测">
- 同族扫描建议:<若发现模板型缺陷,指出应扫的同族范围;无则删>

## 死锁自记

- 本单元 attempt:<N>;unit_rejections 累计:<N>/3
- gate 计数:<gate_id>: <N>/2
- 阈值判定:<未触发 / 已触发 → 顶部已标 DEADLOCK-BLOCKED>

## 高影响建议附加段(有 P0/P1 级建议或推翻既有做法时必填)

- 最强反方论据:<我的建议可能错在哪、会引入什么成本>
- Challenge me on:<最值得 Writer 质疑的假设>
