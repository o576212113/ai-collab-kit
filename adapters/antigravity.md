# 适配:Antigravity(Google)

> Antigravity 是 agent-first IDE,支持项目级规则文件(Rules)。**规则文件的确切位置/名称以你安装版本的官方文档为准**——常见形态:工作区级 Rules 设置、`AGENTS.md`(多工具通用标准)、或 `.agent/rules/` 目录。找到它读取的那个文件,贴入下面片段即可。通用注意事项见 [generic.md](generic.md)。

## 规则片段(粘贴后按角色改)

```markdown
## AI 协作协议(ai-collab-kit)

本项目使用双 AI 协作协议,通过 git 文件总线与另一个 AI 工具协作。

- 你在本项目的角色:**<开发员(Writer)| 审核员(Reviewer)>**(Owner 会话首句指派后生效;未指派 → 保持 idle,先问"我是什么角色")。中文身份名与英文机械名等价;文件名/前缀/字段固定英文不翻译
- 开工前必读(按顺序):
  1. `<kit 路径>/PROTOCOL.md` — 协议宪法(权威)
  2. `<kit 路径>/roles/<writer|reviewer>.md` — 你的角色卡
  3. `_collab/collab.config.json` + `_collab/escalation_rules.md`
  4. `_collab/mode.json` — 当前模式(权威)
- 每次开工:git fetch+log+status 三连 → 漏 push 自检(只补救自己的文件)→ 按 mode 分发
- 红线:不写对方文件;不写 mode.json / discussion/state.json;review_status 只归 Reviewer;命中 escalation_rules.md 即停等 Owner
- 规则以文件为准,与你的记忆冲突时信文件
```

## Antigravity 特有注意事项

- **Agent Manager / 并行代理**:Antigravity 可以同时跑多个代理。接入本协议时,**同一时刻只让一个代理扮演本窗口的角色**——协议的角色模型是"一个角色一个执行者",多代理并行写同一批总线文件会撕裂状态。想利用并行能力,用在角色内部(如 Writer 的对抗自审派多视角检查),不要用在角色之间
- **Artifacts(任务清单/实现计划/走查记录)**:Antigravity 代理默认产出自己的 Artifacts。这些是好东西,但**不能替代协议产物**——`last_writer.md` 的自检证据、dev-log 的 6 段仍然必须写(那是给另一个 AI 和 Owner 看的跨工具契约,Artifacts 只在 Antigravity 里可见)
- **自动执行终端命令的权限**:按协议红线收敛——git push 业务/协作 commit 可自动,`reset --hard`、force push、删文件类操作必须人工确认(铁律与 `loops/review-loop.md` §七)
- Antigravity 做 Writer 时,浏览器内验证能力(截图/录屏)很适合产出 dev-log §3"怎么验证的"与 §4"Owner 怎么亲测"的素材
