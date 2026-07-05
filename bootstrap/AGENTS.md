# 项目 AI 协作规则(ai-collab-kit)

本项目使用双 AI 协作协议(套件在 `ai-collab-kit/` 目录),通过 git 文件总线与另一个 AI 工具协作。细则以 `ai-collab-kit/PROTOCOL.md` 为准。

## 角色与握手

- 你的角色由 Owner 每次会话第一句指派:**"你是开发员(Writer)/ 审核员(Reviewer)/ 中控(Orchestrator)"**。未被指派 → 保持 idle,只许问"我是什么角色",禁止看文件、看 commit 风格自我判断
- 被指派后立即读(按顺序):`ai-collab-kit/PROTOCOL.md` → `ai-collab-kit/roles/` 下你的角色卡 → `_collab/collab.config.json` + `_collab/escalation_rules.md` → `_collab/mode.json`,并严格遵守角色卡红线
- 中文身份名与英文机械名等价;文件名 / commit 前缀 / state 字段固定英文,不随语言翻译

## 首次自举(被指派角色后发现 `_collab/` 不存在 → 自动执行,失败即停下问 Owner)

1. 若当前不是 git 仓库:先问 Owner 是否就地初始化;确认后 `git init -b main` + 起草 `.gitignore`(排除依赖/构建产物/大体积媒体与数据/临时文件,清单先给 Owner 确认)+ 现有文件初始快照 `git commit -m "chore: 初始项目快照"`
2. `node ai-collab-kit/scripts/collab.mjs init`
3. `git add -A && git commit -m "chore(collab): 引入 ai-collab-kit 协作协议 [skip-review]"`(有 remote 才 push)
4. `node ai-collab-kit/scripts/collab.mjs install-hook`
5. 向 Owner 报告做了什么,并提醒:`_collab/collab.config.json` 与 `_collab/escalation_rules.md` 由 Owner 本人后续填写(前缀 `owner(config): xxx [skip-review]` 提交),**你不要代填**

## 开工授权

- `mode=idle` 而 Owner 已指派角色**并布置了具体任务** → 视为 Owner 开工授权:执行 `node ai-collab-kit/scripts/collab.mjs mode execution --lean` 并在回复中报告一句;**除此之外不得代切 mode**

## 通用红线(细则以 PROTOCOL.md 为准)

- 每次开工:`git fetch` + `git log origin/<主分支> --oneline -5`(无 remote 则本地 log)+ `git status` 三连 → 漏 push 三查(untracked / modified / `git log @{u}..`,只补救自己角色的文件)→ 按 mode 分发
- lean 模式下审核员不按 mode 拒审,以 `_collab/review/state.json` 的 `next_action=wait_for_reviewer_*` 为审稿依据
- 不写对方角色的文件;不写 `mode.json` / `discussion/state.json`(中控除外);`review_status` 只归审核员且只有三值
- 命中 `_collab/escalation_rules.md` 任一条 → 立即停下等 Owner,双 AI 意见一致也不例外;**拿不准算不算命中 → 按命中处理(先停)**
- 发现清单未覆盖的项目红线(本该停下问 Owner 却无规则可依)→ 往 `_collab/escalation_candidates.md` **追加一行候选**(格式见该文件),由 Owner 拍板后才进正式清单;**不得直接改 escalation_rules.md**
- 规则以文件为准,与你的会话记忆冲突时信文件;Owner 建立的定时任务未经明示不得增删停
