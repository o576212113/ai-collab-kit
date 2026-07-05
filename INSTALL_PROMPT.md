# 通用安装提示词(贴给任何 AI 工具,无需预先定角色)

> **新项目有更快的路径**:见 README"最快路径"——把 `bootstrap/` 下两个文件拷到项目根,每个窗口一句话指派角色,安装由第一个被指派的 AI 自举完成。本提示词适合**已有指令文件**、或想显式控制安装过程的场景。
>
> **用法**:把下面代码块里的内容**原样整段复制**,粘贴给任何 AI 编程工具(Codex / Claude Code / Antigravity / Gemini CLI / Cursor……),一个字都不用改。
> **角色不在安装时确定**:装的是底座;之后每次会话第一句由你口头指派("你是开发员"/"你是审核员")。想给某个工具固定默认角色,日后在它的指令文件里把角色行改成具体角色即可(写法参考 `adapters/` 各文件)。
> **幂等**:项目里第一个 AI 装全套;第二个 AI 粘同一段,自动检测到已装过,只补自己缺的部分。
> 前提:该 AI 工具启动在目标项目的 git 仓库根目录,且机器装有 git 和 Node.js(≥16)。

```text
请帮我在当前项目安装 ai-collab-kit 双 AI 协作协议(https://github.com/o576212113/ai-collab-kit)。
这是一个"开发员写、审核员审、Owner 拍板"的双 AI 协作制度;你的具体角色我之后会在会话里
单独指派,安装阶段不需要确定。按顺序执行,任何一步失败就停下问我,不要跳步:

0.【幂等检测】若项目里已同时存在 ai-collab-kit/ 目录和 _collab/ 目录(说明另一个 AI 已装过),
   跳过第 2、3 步,从第 4 步继续。

1. 确认当前目录是项目 git 仓库根(git rev-parse --show-toplevel)。
   若还不是 git 仓库:先问我是否就地初始化;我确认后依次做——
   ① git init -b main(身份未配则补 git config user.name / user.email)
   ② 起草一份合理的 .gitignore(排除依赖目录、构建产物、大体积媒体/数据文件、临时文件,
      清单先列给我确认再写入)
   ③ 现有项目文件做一次初始快照提交:git add -A && git commit -m "chore: 初始项目快照"
      (不要与套件引入混在同一个 commit)
   然后继续第 2 步。

2. 引入套件:
   git clone https://github.com/o576212113/ai-collab-kit.git ai-collab-kit
   然后删除 ai-collab-kit 目录内的 .git 子目录(套件文件归属本项目仓库,不做嵌套仓库)。

3. 初始化协作总线:
   node ai-collab-kit/scripts/collab.mjs init

4. 找到你自己每次会话会自动读取的项目级指令文件(Codex 读 AGENTS.md、Claude Code 读
   CLAUDE.md、其他工具读各自的规则文件——你最清楚自己读哪个;没有就在正确位置创建)。
   若该文件里已存在"## AI 协作协议(ai-collab-kit)"段(可能另一个 AI 与你读同一个文件),
   跳过本步;否则在末尾原样追加下面这段:

   ## AI 协作协议(ai-collab-kit)

   本项目使用双 AI 协作协议,通过 git 文件总线与另一个 AI 工具协作。

   - 你在本项目的角色**由 Owner 指派**:每次会话第一句,Owner 会说"你是开发员(Writer)"
     或"你是审核员(Reviewer)"。未被指派 → 保持 idle,只许问"我是什么角色",
     禁止看文件、看 commit 风格自我判断角色。被指派后立即读 ai-collab-kit/roles/ 下
     对应角色卡(writer.md / reviewer.md)并严格遵守其红线
   - 中文身份名与英文机械名等价;文件名/commit 前缀/state 字段固定英文,不随语言翻译
   - 开工前必读(按顺序):ai-collab-kit/PROTOCOL.md → 你的角色卡
     → _collab/collab.config.json + _collab/escalation_rules.md → _collab/mode.json
   - 每次开工:git fetch + git log origin/<主分支> --oneline -5 + git status 三连
     → 漏 push 三查(untracked / modified / git log @{u}..,只补救自己角色的文件)→ 按 mode 分发
   - lean 模式(mode.json 里 lean=true)下审核员不按 mode 拒审,
     以 _collab/review/state.json 的 next_action=wait_for_reviewer_* 为审稿依据
   - 红线:不写对方角色的文件;不写 mode.json / discussion/state.json;
     review_status 只归审核员且只有三值;命中 _collab/escalation_rules.md 即停等 Owner
   - 规则以文件为准,与你的会话记忆冲突时信文件;Owner 建立的定时任务未经明示不得增删停

5. 通读 ai-collab-kit/PROTOCOL.md,用 5 行以内向我复述:①写权限矩阵的要点
   ②"未指派即 idle"的握手规矩 ③什么情况必须停下等 Owner。确认理解。

6. 提交并推送(⚠️ 首装时必须在第 7 步装 hook 之前完成):
   - 首装(第 0 步判定未装过):git add -A,
     commit message 用:chore(collab): 引入 ai-collab-kit 协作协议 [skip-review]
   - 已装过、本次只改了你的指令文件:只 add 该文件,
     commit message 用:docs: 接入 ai-collab-kit 协作协议声明(不带 [skip-review])
   - 已装过且第 4 步也跳过了(无任何改动):本步跳过。
   然后 git push;若仓库尚未配置 remote,跳过 push(仅本地 commit),
   并在最后报告里提醒我:两个 AI 共用同一目录时本地总线即可工作,
   需要备份或跨机协作时再配远程仓库。

7. 安装写权限机检 hook(每台机器的每个 clone 各装一次):
   node ai-collab-kit/scripts/collab.mjs install-hook

8. 向我报告:创建/修改了哪些文件、hook 是否安装成功。若是首装,提醒我(Owner)还有三件事:
   ① 编辑 _collab/collab.config.json(actors 的工具映射、verify_commands 验证命令)
   ② 编辑 _collab/escalation_rules.md(本项目"AI 不许拍板"清单,占位符全部填实)
   ③ 这两个文件由我本人编辑后用前缀 owner(config): xxx [skip-review] 提交
   你不要替我编辑这两个文件。
   最后告诉我:两个 AI 都装好后,开工方式是——每个会话第一句指派角色,
   例如"你是开发员,读你的角色卡,帮我做 XX,按协议交审"。
```

## 装完之后

- 两个 AI 都装好、你填完 `_collab/` 两份配置后,按 [QUICKSTART.md](QUICKSTART.md) 第 4 步跑第一个审稿循环(先 `node ai-collab-kit/scripts/collab.mjs mode review`)
- **角色随会话指派**:同一个工具今天当开发员、换个项目当审核员都行;想固定就改它指令文件里的角色行
- 随时 `node ai-collab-kit/scripts/collab.mjs status` 看全局、`... next` 看下一步该贴什么给哪个窗口
