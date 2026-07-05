# 审稿环(Review Loop)

> 协议细则。角色红线、字段属权、铁律见 [../PROTOCOL.md](../PROTOCOL.md)(单一事实源,本文不复述)。
> 适用:文档审稿、代码审查——凡是"Writer 产出一个单元,Reviewer 对抗审查,收敛后进下一单元"的工作。

---

## 一、一轮完整流转

```
Writer                          Reviewer
──────                          ────────
1. 改业务文件(代码/文档)
2. 覆盖写 review/last_writer.md
   (本轮变更+自检证据+重点审什么)
3. 更新 review/state.json:
   review_target_commit(可 HEAD 占位)
   + next_action=wait_for_reviewer_<unit>
   ★ 这是审稿环的点火信号,漏写则
     Reviewer 判"无事可审"
4. commit(业务前缀,不加 [skip-review])
5. push                    →    6. git fetch + pull --ff-only
                                7. 读 last_writer.md + state.review_target_commit
                                   (HEAD 占位按 PROTOCOL §六 解析约定
                                    定位到最新业务/请审 commit)
                                8. 审该 commit 的 diff + 相关上下文
                                9. 覆盖写 review/last_reviewer.md
                                   (结论 + Findings,reviewed_commit 写具体 hash)
                                10. 更新 state.json:冻结 target hash、
                                    写 review_status / last_reviewed_commit
                                    / next_action,收口 round/attempt
                                11. commit `reviewer(review): ... [skip-review]` + push
12. pull,亲读 last_reviewer.md 原文
    (先核对过期判定:last_reviewed_commit
     == review_target_commit 才作数,PROTOCOL §六)
13. 按 review_status 决策:
    APPROVED          → 进下一单元(有硬停点则等 Owner)
    CHANGES_REQUESTED → 原单元整改,回到第 1 步(attempt+1)
    BLOCKED           → 停,等 Owner 拍板
```

## 二、`last_writer.md` 必备结构

模板:[../templates/last_writer.md](../templates/last_writer.md)。四个不可省略的段:

1. **头部机械字段**:`actor / unit / target / commit(允许 HEAD 占位) / status: READY_FOR_REVIEW / round / attempt`
2. **反审上轮 finding 表**(上轮是 CHANGES_REQUESTED 时必填):逐条列 finding → 合理性判断 → **验证命令+结果**(grep/测试输出) → 接受或推翻(推翻须给反证)。不允许只写"合理,接受"
3. **本轮变更 + 自检证据**:改了什么、跑了什么验证、结果原文
4. **断点恢复清单**:最后业务 commit hash、是否已 push、下一步动作——给下一个会话实例用,新实例必须先跑 git 三连核实,不可直接信任此清单(铁律 #7)

大单元附加:**对抗自审声明**(铁律 #10)——列出自己试图推翻自己时发现并已修复的问题。

## 三、`last_reviewer.md` 必备结构

模板:[../templates/last_reviewer.md](../templates/last_reviewer.md)。要点:

1. **头部机械字段**:`actor / reviewed_commit(必须具体 hash,禁止 HEAD) / status / round / attempt / timestamp`
2. **结论**:一句话放行/打回/阻塞 + 下一步
3. **Findings 按严重度分级**(定级标准见 [../roles/reviewer.md](../roles/reviewer.md)):
   - `P0/BLOCKED`:产品模型错误 / 安全权威边界失守 / 与已锁决策直接冲突
   - `P1`:阻塞下一阶段,必修
   - `P2`:一致性/可追溯性问题,可延后
   - `P3`:措辞/格式/卫生,**不允许 P3 驱动项目节奏**
   - 每条 finding:文件、行号、问题、建议(建议≠决策)
4. **已审/未审范围声明**:审了哪个 commit、哪些文件、跑了什么检查;明确说没审什么。禁止让 APPROVED 被误读为"全仓通过"
5. **死锁自记**:本单元 attempt 计数、per-gate 计数;达到阈值(同 gate 连续 2 / 单元累计 3)→ 顶部标 `DEADLOCK-BLOCKED(escalate_owner)`(铁律 #13)
6. 高影响建议附:**最强反方论据** + **"Challenge me on..."**(最值得质疑的假设)

## 四、单元粒度与节奏

- **审稿单元** = 一次可独立评审的交付(一章文档 / 一个功能增量 / 一个模块)。单元开启时在 `state.json.unit_id` 写明确 ID;新单元 deadlock 计数归零
- **round** 跨单元递增(APPROVED 后 +1),**attempt** 单元内整改递增
- 大改拆增量提交,不要一次糊一大坨——审稿质量与 diff 大小成反比

## 五、共识通道(可协商争议专用)

见 PROTOCOL.md §七。操作要点:

```
Round 1: Reviewer 写 CHANGES_REQUESTED
         + next_action: writer_challenge_reviewer_<topic>_round_1
         + 内容含:推荐方案 / 反方理由 / 风险 / Challenge me on...
         Writer 反审:ACCEPTED / COUNTERPROPOSAL / DISAGREE
         + next_action: reviewer_reconsider_<topic>_round_2

Round 2: Reviewer 复议 Writer 的反提案:
         接受 Writer 论据 → 达成共识,自动继续
         仍坚持原推荐   → next_action: writer_challenge_reviewer_<topic>_round_2

         Writer 最后反审:
         接受 Reviewer 的坚持 → 达成共识,自动继续
         仍未收敛           → status: BLOCKED
                              + next_action: owner_decision_required_<topic>
```

(Round 2 的最后一步是 Writer 的——给 Writer 一次"被说服"的机会再升级 Owner,少打扰一次是一次。)

分歧必须留痕在 `last_writer.md` / `last_reviewer.md` 里,**不许悄悄抹平**。

## 六、代码单元的附加要求

(lean 写码模式全貌见 [lean-code-mode.md](lean-code-mode.md);以下是审稿环视角的增量约定)

- Writer READY 前:编译 / 测试 / lint 三硬自检全过;配置了 CI 的项目须附 CI 绿证据(铁律 #9)。**dev-log 与代码同 commit 交付**(6 段结构见 [../templates/dev_log.md](../templates/dev_log.md)),缺 dev-log 视为交付不完整,可退回
- Reviewer 审代码基线清单:
  1. 信任边界(敏感逻辑在正确的进程/层;凭证不进 git、不进日志)
  2. 代码是否符合已批准的 spec / 架构约束;偏离 → 走变更审批,不在代码里擅改架构
  3. 测试覆盖关键路径;`skip` 的测试必须如实标注归属(skip honesty)
  4. Writer 自检证据可信度核验(声称的测试结果抽查实跑)
  5. dev-log 是否够 Owner 看懂 + 复现验证
- Reviewer 不必重跑全量构建(CI 绿前置的意义),聚焦静态正确性;需要时做定向探针

## 七、异常处理

- `git pull --ff-only` 失败:先按写权限矩阵自检是否自己漏 commit(PROTOCOL §五"漏 push 自检"),恢复后重试;退避 30s,连续 3 次失败 → 通知 Owner 退出本轮
- 双方同时 push 撞车:后到方 pull --rebase 重放;**rebase 后自己 commit 的 hash 会变,写任何引用前重取**(铁律 #18)
- **禁止 `git reset --hard` 类破坏性恢复**(共享仓库可能有对方/Owner 的未提交工作),需要时必须 Owner 明确授权
