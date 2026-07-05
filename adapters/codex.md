# 适配:Codex(OpenAI Codex CLI / Codex 云端)

> Codex 自动加载仓库根的 `AGENTS.md`。把下面片段追加进去。通用注意事项见 [generic.md](generic.md)。

## AGENTS.md 片段(粘贴后按角色改)

```markdown
## AI Collab Protocol (ai-collab-kit)

This repo uses a dual-AI collaboration protocol over a git file bus.

- Your role in this repo: **<Writer(开发员)| Reviewer(审核员)>** (activated when Owner assigns it in the first message of a session — Chinese and English role names are equivalent; if not assigned, stay idle and ask "what is my role?"). File names / commit prefixes / state fields stay English regardless of output language
- Mandatory reading before any work, in order:
  1. `<kit path>/PROTOCOL.md` — protocol constitution (authoritative)
  2. `<kit path>/roles/<writer|reviewer>.md` — your role card
  3. `_collab/collab.config.json` + `_collab/escalation_rules.md` — project config & hard-escalation list
  4. `_collab/mode.json` — authoritative current mode
- Every wake-up: `git fetch` + `git log origin/<main-branch> --oneline -5` + `git status` first; then unpushed-file self-check (3 checks: untracked / modified / committed-but-unpushed via `git log @{u}..`; only recover YOUR files); then dispatch by mode
- Rules live in files, not session memory. On conflict, files win
- Never write the other actor's files, `mode.json`, or `discussion/state.json`. `review_status` is Reviewer-owned, three values only
- Recurring automations are owner-controlled: never create, delete, or pause them without an explicit owner instruction
```

## Codex 做 Reviewer 的注意事项(实战沉淀)

- Codex 是这套协议里被验证最久的 Reviewer(200+ 轮),`roles/reviewer.md` 的反偏差守则大半来自 Codex 实战校准——**务必让 Codex 每轮开工重读角色卡**(持久规则刷新),审查纪律不能依赖会话记忆存活
- 若你的 Codex 版本提供定时任务/automation 能力(以官方文档为准),适合做审稿心跳:每 N 分钟醒来 → 按 `review/state.json` 的 `next_action=wait_for_reviewer_*` 判断有无待审 → 有则审,无则静默退出;没有该能力就由 Owner 人工唤起,协议不依赖轮询
- lean 模式下 Codex **不按 mode 拒审**,以 READY target 为准(`loops/lean-code-mode.md` §一)——把这条写进 automation prompt,否则 mode=execution 时会误判"无事可做"
- Codex 独立 clone 一份仓库效果最好(避免共享工作区 index race)
