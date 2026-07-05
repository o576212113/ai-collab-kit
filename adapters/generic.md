# 通用适配:把任何 AI 工具接入协议

> 适配层的唯一职责:让该工具**知道自己是什么角色 + 去哪读协议**。协议内容不复述(单一事实源,见 [../PROTOCOL.md](../PROTOCOL.md))。

## 接入三步

1. **找到该工具读取的项目级指令文件**——每个 AI 编程工具都有一个开会话自动加载的项目指令文件(如 `AGENTS.md`、`CLAUDE.md`、`GEMINI.md`、`.cursorrules`、工具设置里的 Rules 等,以工具当前文档为准)
2. **把下面的片段贴进去**,按该窗口的角色改 `<角色>`
3. **开会话第一句,Owner 口头指派角色**(启动握手铁律)——指令文件里的角色声明是底,口头指派是门

## 粘贴片段(模板)

```markdown
## AI 协作协议(ai-collab-kit)

本项目使用双 AI 协作协议,通过 git 文件总线协作。

- 你在本项目的角色:**<开发员(Writer)| 审核员(Reviewer)>**(Owner 开会话首句指派后生效;未指派默认 idle,先问"我是什么角色")。中文身份名与英文机械名等价;文件名/前缀/字段固定英文不翻译
- 开工前必读(按顺序):
  1. `<kit 路径>/PROTOCOL.md` — 协议宪法
  2. `<kit 路径>/roles/<writer|reviewer>.md` — 你的角色卡
  3. `_collab/collab.config.json` + `_collab/escalation_rules.md` — 本项目配置与硬升级清单
  4. `_collab/mode.json` — 当前模式(权威)
- 每次开工固定动作:git fetch + log + status 三连 → 漏 push 自检 → 读 mode.json 分发
- 你的红线以角色卡为准;规则以文件为准,不靠会话记忆
```

## 双窗口同仓的注意事项

- **共享工作区 race**:两个工具跑在同一个 clone 里时,一方 `git add` 的文件可能被另一方连带提交。commit 一律用**显式路径**(`git commit -- <files>` 前先 `git add <files>` 且只 add 自己的),commit 后 `git log -1 --stat` 核对没带上别人的东西
- 更稳的做法:两个工具各用一个 clone(或 git worktree),纯靠 push/pull 交换——总线协议天然支持,代价只是多一份磁盘
- 轮询/自动化按铁律 #16:opt-in only

## 判断一个工具能不能接入

能满足这三条就能接:① 能读写仓库文件;② 能执行 git 命令(或由人代执行);③ 有会话级指令入口(项目指令文件或系统提示)。不满足 ③ 的工具,每次开会话手动粘贴角色卡开头亦可。
