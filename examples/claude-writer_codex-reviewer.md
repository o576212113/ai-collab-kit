# 配对示例:Claude Code(Writer)+ Codex(Reviewer)

> 这是被实战验证最久的组合(本套件的娘家配置,271+ 轮)。适合:以 Claude Code 为主力开发、用 Codex 做独立审查。

## 配置

`_collab/collab.config.json` 关键字段:

```json
"actors": {
  "writer":   { "tool": "claude-code", "label": "Claude Code 本地窗口" },
  "reviewer": { "tool": "codex",       "label": "Codex CLI / 云端" },
  "orchestrator": { "mode": "script" }
}
```

## 接线

1. 项目根 `CLAUDE.md` 追加 [../adapters/claude-code.md](../adapters/claude-code.md) 片段,角色填 **Writer**
2. 仓库根 `AGENTS.md` 追加 [../adapters/codex.md](../adapters/codex.md) 片段,角色填 **Reviewer**
3. 两边各自 `install-hook`
4. (可选)Codex 云端建一个定时任务做审稿心跳:prompt 就一句——"你是 Reviewer,按 AGENTS.md 协议,pull 后检查 `_collab/review/state.json`,`next_action` 是 `wait_for_reviewer_*` 就审,否则静默退出"

## 一天的典型工作流(lean 写码)

```
早上  你:在 Claude 窗口 "你是开发员。今天做用户导入模块,先按模板写 unit spec"
      Claude 写 spec → 交审 → Codex 审 → APPROVED → 你看一眼 spec 说"开始"   ← 硬停点①
白天  Claude 增量1 写码+自检+dev-log → READY → Codex 审 → APPROVED → 增量2 …(自动续跑)
      中途 Codex 打回一次 → Claude 亲读原文整改 → 复审过
下午  某增量涉及"把导入文件存到哪" → 命中硬升级清单第2类 → BLOCKED          ← 硬停点③
      你拍板"存本地 data/ 目录" → 继续
傍晚  全部增量完成 → 你按 dev-log §4 步骤亲手点一遍                          ← 硬停点②
      绿了 → 模块收口;明天的模块等你授权                                    ← 硬停点④
```

## 这个组合的实战经验

- **Claude 做 Writer 的强项**:长上下文重构、跟 spec、写 dev-log 人话;对抗自审用子代理很顺手
- **Codex 做 Reviewer 的强项**:定向探针(自己跑小验证)、抓边界条件;**务必让它每轮重读角色卡**——审查纪律不能靠会话记忆存活
- 已知摩擦:双方同时 push 偶尔撞车 → 后到方 pull --rebase,rebase 后**重取自己 commit 的 hash** 再写引用(铁律 #18)
- Claude 窗口断线重开后,第一句重新指派角色即可,它会按断点恢复清单 + git 三连接上
