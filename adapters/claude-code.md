# 适配:Claude Code

> Claude Code 自动加载项目根的 `CLAUDE.md`。把下面片段追加进去即可。通用注意事项见 [generic.md](generic.md)。

## CLAUDE.md 片段(粘贴后按角色改)

```markdown
## AI 协作协议(ai-collab-kit)

本项目使用双 AI 协作协议(git 文件总线)。

- 本窗口默认角色:**<开发员(Writer)| 审核员(Reviewer)>**;Owner 开会话首句指派后生效。未指派 → 默认 idle,主动问"我是什么角色",禁止自我判断。中文身份名与英文机械名等价;文件名/前缀/字段固定英文不翻译
- 开工前必读:`<kit 路径>/PROTOCOL.md` → `<kit 路径>/roles/<writer|reviewer>.md` → `_collab/collab.config.json` + `_collab/escalation_rules.md` → `_collab/mode.json`
- 每次开工:git fetch+log+status 三连 → 漏 push 自检(三查,只补救自己的文件)→ 按 mode 分发
- `_collab/` 内的协作 commit(带 [skip-review])push 无需再次确认
- 定时轮询 opt-in:Owner 明确说"开"才启动;开启后 Owner 不说"停"不停
```

## 可选:做成 Claude Code Skill

想用 `/collab` 一类的斜杠命令唤起,把 [claude-code-skill/SKILL.md](claude-code-skill/SKILL.md) 拷到目标项目的 `.claude/skills/collab/SKILL.md`(项目级)或 `~/.claude/skills/collab/SKILL.md`(全局)。之后:

- `/collab writer` → 本会话按 Writer 角色卡开工
- `/collab reviewer` → 按 Reviewer 角色卡开工
- `/collab status` → 跑 `collab.mjs status` 汇报当前状态

Skill 只是入口糖:它做的事就是"读角色卡 + 按协议开工",与手动指派完全等价。**其他工具(Codex/Antigravity)不需要也用不了这个 skill,协议本体不依赖它。**

## Claude Code 特有优势

- 若你的 Claude Code 版本提供定时唤醒/后台任务能力(以官方文档为准),可用来做自调度轮询——但记住铁律 #16,opt-in only;没有该能力就用外部 cron 或人工唤起,协议不依赖轮询
- 子代理(Task/Agent)适合 Writer 的对抗自审(铁律 #10):READY 前派 1-2 个怀疑者子代理专门推翻自己的交付
