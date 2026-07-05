# QUICKSTART — 15 分钟跑通第一个审稿循环

> 前置:装了 git 和 Node.js(≥16);准备两个 AI 编程工具(不同厂商,如 Claude Code + Codex,或 Codex + Antigravity)。
> 本文走最常用的**审稿环**。议事环和 lean 写码上手在文末。

## 第 1 步:安装(2 分钟)

```bash
cd 你的项目仓库
# 把 ai-collab-kit/ 整目录拷进来(位置随意,示例放仓库根)
node ai-collab-kit/scripts/collab.mjs init
```

会生成:

```
_collab/
  collab.config.json   ← 待你编辑
  escalation_rules.md  ← 待你编辑(最重要)
  mode.json
  review/{state.json, last_writer.md, last_reviewer.md, archive/}
  discussion/{state.json, topics/}
```

## 第 2 步:填两份配置(5 分钟)

**`_collab/collab.config.json`**:改 `project_name`;把 `actors.writer.tool` / `actors.reviewer.tool` 改成你实际用的工具;`loops.lean_code.verify_commands` 填你项目的验证命令(如 `npm test`)。

**`_collab/escalation_rules.md`**(全套件最重要的一份配置):这是你的"AI 不许拍板"清单。默认已有五类通用规则,把尖括号占位填成你项目的实际情况——至少填第 1 类"已锁决策记录在哪"。**宁可宽,不可窄:拿不准的都算命中。**

## 第 3 步:接入两个 AI 工具(3 分钟)

打开 `adapters/` 里对应你工具的文件,把片段贴进各工具的指令文件:

| 工具 | 指令文件 | 适配说明 |
|---|---|---|
| Claude Code | 项目根 `CLAUDE.md` | [adapters/claude-code.md](adapters/claude-code.md) |
| Codex | 仓库根 `AGENTS.md` | [adapters/codex.md](adapters/codex.md) |
| Antigravity | 其规则文件 | [adapters/antigravity.md](adapters/antigravity.md) |
| 其他 | 该工具的项目指令入口 | [adapters/generic.md](adapters/generic.md) |

贴片段时把 `<Writer | Reviewer>` 改成该窗口的角色、`<kit 路径>` 改成实际路径。

**强烈推荐**:每个 clone 跑一次 `node ai-collab-kit/scripts/collab.mjs install-hook`,启用 commit 写权限机检(AI 越权写对方文件时 commit 直接失败)。

## 第 4 步:跑第一个审稿循环(5 分钟)

**⓪ 先切模式**(init 后默认 idle,守协议的 AI 在 idle 下不干活):

```bash
node ai-collab-kit/scripts/collab.mjs mode review
```

**① 在开发员窗口**(如 Claude Code),第一句:

> 你是开发员(Writer)。读 `ai-collab-kit/PROTOCOL.md` 和 `ai-collab-kit/roles/writer.md`,然后帮我实现 <一个小任务>,按协议交审。

开发员会:写代码 → 跑自检 → 覆盖写 `_collab/review/last_writer.md`(status: READY_FOR_REVIEW + 自检证据)→ **更新 `_collab/review/state.json`(`review_target_commit` + `next_action=wait_for_reviewer_*`,这是审核员的点火信号)** → commit(业务前缀)→ push。

**② 在审核员窗口**(如 Codex),第一句:

> 你是审核员(Reviewer)。读 `ai-collab-kit/PROTOCOL.md` 和 `ai-collab-kit/roles/reviewer.md`,然后 pull 一下,审 `_collab/review/state.json` 指向的待审 commit。

审核员会:审 diff → 写 `_collab/review/last_reviewer.md`(结论 + 分级 findings + 已审/未审范围)→ 更新 state(冻结 hash)→ commit `reviewer(review): ... [skip-review]` → push。

**③ 看结论**:任何窗口跑

```bash
node ai-collab-kit/scripts/collab.mjs status
```

- `APPROVED` → 让 Writer 进下一个任务
- `CHANGES_REQUESTED` → 回 Writer 窗口说"pull 之后亲读 last_reviewer.md 原文,逐条整改再交审"
- `BLOCKED` → 有事项等你拍板,看 `last_reviewer.md` 的阻塞原因

一个循环就这么多。**你的位置**:给任务、看结论、在 BLOCKED 时拍板。

## 进阶 A:议事环(想听两个独立观点)

```bash
# 用你的议题原文启动(会自动建 T-001 目录、切模式)
# ⚠ Windows 用户请在 Git Bash 里执行(PowerShell 的 > 重定向不是 UTF-8,中文会乱码),
#   或直接用编辑器新建 UTF-8 的 topic.txt
echo "要不要把用户数据缓存到本地?" > topic.txt
node ai-collab-kit/scripts/collab.mjs topic local-cache --from topic.txt
```

**关键认知:`advance` 只做机械判定,不会让 AI 干活——你是消息泵。** 完整阶段顺序:

```
R1 盲发 draft → R1 互看 response →(未收敛再来 R2)→ synthesis 起草 → Reviewer 复核 ack → 你拍板
```

每一步的操作循环都是同一个:

1. 跑 `node ai-collab-kit/scripts/collab.mjs advance`(机械判定推进),再跑 `... next`——它直接输出**可整句粘贴的指令和该贴给哪个窗口**,你纯复制转达即可
2. 对方写完 commit+push 后回到 1,直到 `next_action: wait_for_owner_decision`

中等分量的议题用轻量档少一半仪式:`topic <slug> --from topic.txt --lite`(只走 R1 盲发,不进 R2;详见 loops/discussion-loop.md 轻量档一节)。

到终点后:看 synthesis 顶部 **5 行决策摘要**,把你的拍板原话存成文件,一条命令收口(机械誊录 owner_decision.md + 议题归 idle):

```bash
echo "T-001 全采纳" > decision.txt        # 同样注意 UTF-8(Git Bash 或编辑器)
node ai-collab-kit/scripts/collab.mjs decision --from decision.txt --status adopted
```

`--status` 取 `adopted / adopted_with_changes / rejected`;"采纳但改 X"用 adopted_with_changes,誊录后人工在 owner_decision.md 补"Owner 修改项"段。

## 进阶 B:lean 写码(密集开发期)

读 [loops/lean-code-mode.md](loops/lean-code-mode.md)。要点:先让 Writer 按 [templates/unit_spec.md](templates/unit_spec.md) 写单元规约 → Reviewer 审 → **你拍板"开始"** → 之后增量自动续跑(写→审→过→下一个),你只在模块完成亲测、硬升级、换模块时出现。

```bash
node ai-collab-kit/scripts/collab.mjs mode execution --lean
```

## 日常维护

```bash
node ai-collab-kit/scripts/collab.mjs status    # 随时看协作状态
node ai-collab-kit/scripts/collab.mjs check     # 体检:状态合法性/死锁阈值/state 肥胖
node ai-collab-kit/scripts/collab.mjs archive   # state.json 长胖了就归档瘦身
```

## 踩坑速查

| 症状 | 原因与解法 |
|---|---|
| Reviewer 说"没东西可审" | 看 `status`:①`mode.json` 是不是还停在 idle(跑 `mode review`);②`next_action` 是不是 `wait_for_reviewer_*`(Writer 交审时漏写 state 点火字段是最常见原因);③Writer 是否真 push 了(漏 push 三查) |
| commit 被 hook 拒绝 | 看报错里的类别——十有八九是真越权(或前缀用错),按 PROTOCOL §九换前缀 |
| 议事 advance 卡 missing_* | 某方产物缺"人话摘要"或"收敛信号"段,让那一方自己补(中控不代补) |
| 两 AI 来回修不收敛 | 等第 2 轮触发 DEADLOCK-BLOCKED,你来裁断;这是特性不是 bug |
| AI 会话断了/压缩了 | 新会话第一句重新指派角色;它会按"git 三连 + 断点恢复清单"重建现场 |
