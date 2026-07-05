# 通用安装提示词(贴给任何 AI 工具)

> **用法**:把下面代码块里的内容**整段复制**,粘贴给任何 AI 编程工具(Codex / Claude Code / Antigravity / Gemini CLI / Cursor……)。粘贴前只改一处:第一行的角色二选一。
> 设计为**幂等**:项目里第一个 AI 会装全套;第二个 AI 粘同一段,会自动检测到已装过,只接入自己的角色声明。
> 前提:该 AI 工具启动在目标项目的 git 仓库根目录,且机器装有 git 和 Node.js(≥16)。

```text
请帮我在当前项目安装 ai-collab-kit 双 AI 协作协议(https://github.com/o576212113/ai-collab-kit)。
你在本项目的长期角色是【开发员(Writer)| 审核员(Reviewer)←二选一,删掉另一个】。
按顺序执行,任何一步失败就停下问我,不要跳步:

0.【幂等检测】若项目里已同时存在 ai-collab-kit/ 目录和 _collab/ 目录(说明另一个 AI 已装过),
   跳过第 2、3 步,从第 4 步继续。

1. 确认当前目录是项目 git 仓库根(git rev-parse --show-toplevel);不是就停下问我。

2. 引入套件:
   git clone https://github.com/o576212113/ai-collab-kit.git ai-collab-kit
   然后删除 ai-collab-kit 目录内的 .git 子目录(套件文件归属本项目仓库,不做嵌套仓库)。

3. 初始化协作总线:
   node ai-collab-kit/scripts/collab.mjs init

4. 找到你自己每次会话会自动读取的项目级指令文件(Codex 读 AGENTS.md、Claude Code 读
   CLAUDE.md、其他工具读各自的规则文件——你最清楚自己读哪个;没有就在正确位置创建),
   在末尾追加下面这段,并把两处 <角色> 按我上面指定的角色填好:

   ## AI 协作协议(ai-collab-kit)

   本项目使用双 AI 协作协议,通过 git 文件总线与另一个 AI 工具协作。

   - 你在本项目的角色:**<开发员(Writer)|审核员(Reviewer)>**(Owner 会话首句指派后生效;
     未指派保持 idle,先问"我是什么角色")。中文身份名与英文机械名等价;
     文件名/commit 前缀/state 字段固定英文,不随语言翻译
   - 开工前必读(按顺序):ai-collab-kit/PROTOCOL.md → ai-collab-kit/roles/<writer|reviewer>.md
     → _collab/collab.config.json + _collab/escalation_rules.md → _collab/mode.json
   - 每次开工:git fetch + git log origin/<主分支> --oneline -5 + git status 三连
     → 漏 push 三查(untracked / modified / git log @{u}..,只补救自己的文件)→ 按 mode 分发
   - lean 模式(mode.json 里 lean=true)下审核员不按 mode 拒审,
     以 _collab/review/state.json 的 next_action=wait_for_reviewer_* 为审稿依据
   - 红线:不写对方角色的文件;不写 mode.json / discussion/state.json;
     review_status 只归审核员且只有三值;命中 _collab/escalation_rules.md 即停等 Owner
   - 规则以文件为准,与你的会话记忆冲突时信文件;Owner 建立的定时任务未经明示不得增删停

5. 通读 ai-collab-kit/PROTOCOL.md 和 ai-collab-kit/roles/ 下你的角色卡,
   用 5 行以内向我复述你的角色红线,确认理解。

6. 提交并推送(⚠️ 首装时必须在第 7 步装 hook 之前完成):
   - 首装(第 0 步判定未装过):git add -A,
     commit message 用:chore(collab): 引入 ai-collab-kit 协作协议 [skip-review]
   - 已装过、本次只改了你的指令文件:只 add 该文件,
     commit message 用:docs: 接入 ai-collab-kit <角色>声明(不带 [skip-review])
   然后 git push。

7. 安装写权限机检 hook(每台机器的每个 clone 各装一次):
   node ai-collab-kit/scripts/collab.mjs install-hook

8. 向我报告:创建/修改了哪些文件、hook 是否安装成功。若是首装,提醒我(Owner)还有三件事:
   ① 编辑 _collab/collab.config.json(actors 的工具映射、verify_commands 验证命令)
   ② 编辑 _collab/escalation_rules.md(本项目"AI 不许拍板"清单,占位符全部填实)
   ③ 这两个文件由我本人编辑后用前缀 owner(config): xxx [skip-review] 提交
   你不要替我编辑这两个文件。
```

## 装完之后

- 两个 AI 都装好后,按 [QUICKSTART.md](QUICKSTART.md) 第 4 步跑第一个审稿循环(先 `node ai-collab-kit/scripts/collab.mjs mode review`)
- 每个新会话第一句由你口头指派角色("你是开发员/审核员"),指令文件里的声明是底、口头指派是门
- 随时 `node ai-collab-kit/scripts/collab.mjs status` 看全局、`... next` 看下一步该贴什么给哪个窗口
