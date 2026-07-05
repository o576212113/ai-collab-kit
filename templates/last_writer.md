# Writer Round

actor: writer
unit: <单元 ID,与 state.json.unit_id 一致>
target: <本轮交付物,如 "用户导入模块 §2" 或 "增量2 数据校验">
commit: HEAD
status: READY_FOR_REVIEW
<!-- 交审必做:同步更新 review/state.json 的 review_target_commit(可 HEAD 占位)
     + next_action=wait_for_reviewer_<unit>——这是 Reviewer 的点火信号,漏写=没交审 -->
round: <N>
attempt: <N>

<!-- 若本单元实现的是 Owner 已拍板的硬升级类决策,在此处顶部加"Owner 已拍板"横幅,
     格式见 loops/lean-code-mode.md §五;否则删除本注释 -->

## 反审上轮 finding(上轮为 CHANGES_REQUESTED 时必填,不可省略)

> 必须先 `git pull` 亲读 `last_reviewer.md` 原文,逐条对照。转述不作数。
> 不允许只写"合理,接受"——每条必须有验证命令+结果。推翻必须给反证。

| Finding | 合理性判断 | 验证命令 + 结果 | 结论 |
|---------|-----------|----------------|------|
| P1: <finding 摘要(引用原文)> | 合理 / 不合理 | `<grep/test 命令>` → <结果> | 接受已修 / 推翻(反证:<行号/输出>) |

<上轮为 APPROVED 则写"上轮 APPROVED,无整改项",进入本轮新内容。>

## 本轮变更

<列点:改了什么。不重复 commit message,说审稿需要的上下文。>

## 自检证据

<实跑记录,原文粘贴关键结果:>
- 编译/typecheck:<命令 → 结果>
- 测试:<命令 → N passed / N failed>
- lint:<命令 → 结果>
- CI(若配置):<run 链接/结论>
- 其他(grep 清零等):<命令 → 结果>

## 对抗自审声明(大单元必填;行级窄修可删)

<以"怀疑者"视角试图推翻本次交付,发现并已修复的问题清单;或"自审未发现额外问题 + 检查了哪几个角度">

## 希望 Reviewer 重点审

<指向具体担心的点,如"X 与 Y 的边界一致性">

## 断点恢复清单(给下一个会话实例;新实例必须先跑 git 三连核实,不可直接信任本清单)

- 最后业务 commit:<hash>(git log 验证)
- commit + push 是否完成:<是/否>(git status + git log origin 验证)
- 下一步动作:<具体,如"等 Reviewer 审" / "整改 P1" / "进增量3">
