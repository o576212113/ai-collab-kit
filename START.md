# START — 一句话自举入口(AI 被指派角色后从这里开始)

> **触发方式**:Owner 对你说了类似 **"你是开发员(/审核员/中控),按 ai-collab-kit 协议开工"** 的话,而项目尚未部署协议(没有 `_collab/` 目录,或你的指令文件里没有协议声明)。
> 本文件是你的自举手册:**按你自己的情况**完成部署。幂等执行——已完成的步骤检测后跳过;任何一步失败,停下问 Owner,不要跳步。

## 自举步骤

0. **认识你自己 + 环境**:
   - 确认 ①你是哪个 AI 工具;②你每次会话**自动读取**的项目级指令文件是哪个(Codex → `AGENTS.md`;Claude Code → `CLAUDE.md`;Antigravity/其他 → 你自己的规则文件——你比任何人清楚)
   - **目录名核查**:套件目录若不叫 `ai-collab-kit`(ZIP 下载解压常见 `ai-collab-kit-main`)→ 请示 Owner 后重命名为 `ai-collab-kit`(协议内所有路径引用以此为准)
   - **多窗口仲裁**:若 `_collab/` 不存在而 Owner 可能同时对多个窗口下发了首启句 → 部署只能由**一个**窗口执行。问 Owner"由我来完成部署吗?";Owner 未点名你 → 等总线就绪后再继续(那时你只需做第 3 步接入自己 + 第 6 步上岗)。

1. **git 仓库**:若当前项目还不是 git 仓库 → 先问 Owner 是否就地初始化;确认后 `git init -b main` + 起草 `.gitignore`(排除依赖/构建产物/大体积媒体与数据/临时文件,清单先给 Owner 确认)+ 现有文件快照 `git commit -m "chore: 初始项目快照"`。

2. **总线**:若 `_collab/` 不存在 → `node ai-collab-kit/scripts/collab.mjs init`

3. **接入你自己**(这一步让 Owner 以后只需说"你是开发员"四个字):若你的指令文件里还没有"项目 AI 协作规则(ai-collab-kit)"内容 → 把 `ai-collab-kit/bootstrap/AGENTS.md` 的**全部内容追加**到你自己那个指令文件的末尾(文件不存在就创建;**已有内容绝不覆盖,只追加**)。

4. **提交 + 机检**(顺序不可反):先提交——`git add -A && git commit -m "chore(collab): 引入 ai-collab-kit 协作协议 [skip-review]"`(有 remote 才 push,没有则仅本地);**提交之后**再装 hook——`node ai-collab-kit/scripts/collab.mjs install-hook`(先装 hook 会拦住 bootstrap 的混类提交,那是机检在正确工作)。

5. **模式**:Owner 指派角色时**已布置了具体任务** → 开工授权成立(PROTOCOL §四),执行 `node ai-collab-kit/scripts/collab.mjs mode execution --lean` 并在回复中报告;只指派了身份没派活 → 不切,待命。

6. **上岗**:读 `ai-collab-kit/PROTOCOL.md` + `ai-collab-kit/roles/` 下你的角色卡,用 5 行以内向 Owner 复述你的角色红线,报告部署结果(做了哪几步、跳过哪几步),然后开始干活。同时提醒 Owner 一句:`_collab/` 两份配置可后补——协作中你会把发现的红线缺口记进 `_collab/escalation_candidates.md`,Owner 跑 `proposals` 命令逐条采纳即可。

## 已部署项目的日常握手

项目已部署过(你的指令文件里已有协议声明)→ 本文件与你无关:直接按指令文件 + 角色卡工作,等 Owner 每次会话第一句指派角色。
