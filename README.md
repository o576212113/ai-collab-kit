# AI Collab Kit — 双 AI 对抗协作协议套件

> 让两个不同厂商的 AI 编程工具在同一个 git 仓库上**一个写、一个审、人拍板**,把"AI 自嗨、互相背书、虚报完成、替你做主"这些坑用制度堵死。
>
> 工具无关:Claude Code、Codex、Antigravity、Gemini CLI、Cursor……任何能读文件、跑 git 的 AI 都能接入。
> 血统:蒸馏自一个真实项目 271+ 轮双 AI 互审、上百条事故教训打磨出的协作制度。**这里每条规则都是伤疤,不是理论。**

---

## 一、为什么需要这套东西

单独用一个 AI 写代码,你会遇到四个反复发作的问题:

| 问题 | 表现 |
|---|---|
| **自嗨** | AI 写完自己看自己,越看越对,盲点永远是盲点 |
| **虚报** | "已完成、测试通过"——实际没跑过,或只跑了一半 |
| **替你做主** | 顺手改了架构、挪了范围、动了安全边界,还觉得是在帮你 |
| **失忆漂移** | 会话一长/一压缩,之前定好的规矩悄悄变形 |

请第二个 AI 来审能解决"自嗨"——但**两个 AI 又会产生新问题**:它们可能互相说服、达成"共识"、然后一起绕过你。这套协议的核心洞察是:

> **两 AI 共识只能证明"内部一致",不能证明你的产品意图、成本约束、风险偏好被尊重了。在这些维度上,两个 AI 是共同失明的。**

所以协议做了四件事:**角色分权**(写/审/中控/拍板严格分离)、**硬升级清单**(AI 不许拍板的事项枚举出来,碰到就停)、**机械信号**(状态推进靠 grep 字段,不靠"理解")、**证据纪律**(一切声称必须带可复跑的证据)。

## 二、架构一图流

```
                     Owner(人,唯一决策者)
                    拍板 / 验收 / 裁断死锁
                            ▲
              5行摘要、硬停点、一句话采纳
                            │
   ┌────────────────────────┼───────────────────────┐
   │                git 文件总线 _collab/             │
   │   mode.json / review/state.json / last_*.md     │
   │   discussion/topics/T-NNN/...                    │
   └───▲──────────────────▲──────────────────▲───────┘
       │                  │                  │
   开发员 Writer      审核员 Reviewer     中控 Orchestrator
   写代码/文档/观点    对抗审查/观点      (默认=脚本 collab.mjs)
   如 Claude Code     如 Codex          查齐/推进/报告/机检
```

- 对话用中文身份名(开发员/审核员/中控);文件名、commit 前缀等机械层固定英文(writer/reviewer),机检靠字面匹配,不得翻译
- **开发员和审核员用不同厂商的模型**——训练偏差不同,盲点不重叠,这是对抗审查的红利来源
- 三个协作环共享同一套角色与铁律:
  - **审稿环**:Writer 交付 → Reviewer 对抗审查 → APPROVED 才过(最常用)
  - **议事环**:你抛议题 → 双方**盲发**独立观点 → 收敛或升级给你拍板
  - **lean 写码**:你直接驱动,增量自动续跑,只在 4 类硬停点找你

## 三、目录结构

```
ai-collab-kit/
  README.md            ← 本文件
  PROTOCOL.md          ← ★ 协议宪法(单一事实源,一切细节以它为准)
  QUICKSTART.md        ← 15 分钟上手
  CHANGELOG.md
  config/              ← 配置模板(collab.config.json / 硬升级清单)
  loops/               ← 三环细则(review / discussion / lean-code)
  roles/               ← 三张角色卡(开发员 writer / 审核员 reviewer / 中控 orchestrator)
  adapters/            ← 各工具接入片段(claude-code / codex / antigravity / github / generic)
  templates/           ← 文件总线模板(state / last_writer / synthesis / spec / dev-log …)
  pipeline/            ← 从一句话需求到代码的四阶段流水线(体量自适应;含需求书/规划书模板)
  scripts/collab.mjs   ← 中控脚本(init/status/mode/topic/advance/next/decision/decide/proposals/check/archive/install-hook)
  examples/            ← 配对示例(Claude+Codex / Codex+Antigravity)
```

**阅读顺序**:README(本文)→ QUICKSTART → PROTOCOL.md;AI 窗口只需读 PROTOCOL.md + 自己的角色卡。

## 四、15 秒理解核心机制

1. **写权限矩阵**:每个文件只有一个主人。Writer 绝不碰 Reviewer 的结论文件,谁也不许替 Owner 写决策。矩阵由 git hook **机器强制**(`collab.mjs install-hook`),不靠自觉
2. **状态字段属权**:`review_status` 只归 Reviewer,只有三个值(APPROVED / CHANGES_REQUESTED / BLOCKED);Writer 的"我写完了"只能写在自己的文件里
3. **硬升级清单**(`config/escalation_rules.md`):推翻已锁决策、动数据契约、挪范围边界、碰安全信任边界、不可逆动作——**命中即停,双 AI 意见再一致也得等你**
4. **机械收敛**:议事推进只看双方产物末尾的 `convergence_signal: agree|disagree` 字段,中控不"理解"正文——理解就会加工,加工就会失真
5. **证据纪律**:"已修复"必须带 grep/测试输出;修复必须亲读审稿原文(转述会失真);大交付前先自己派"怀疑者"推翻自己
6. **死锁熔断**:同一问题两轮修不掉、同一单元三次被打回 → 自动停下找你裁断,不无限乒乓烧 token

## 五、快速开始

**最快路径(拷一次 + 每窗口一句话)**:
1. 把 ai-collab-kit/ 整个目录放进项目根(ZIP 下载解压出的 `ai-collab-kit-main` 记得重命名为 `ai-collab-kit`)
2. 对**第一个** AI 窗口说首启句:"你是开发员,按 ai-collab-kit/START.md 自举开工,然后帮我做 XX"
   ——**空目录零请示全自动**([START.md](START.md):git init、默认 .gitignore、总线、机检、把协议写进项目根 AGENTS.md + CLAUDE.md 双文件);已有文件的老项目只多一次 .gitignore 确认
3. 等它报告完成后,**其余窗口以及以后的所有会话,只需四个字**:"你是审核员" / "你是开发员"

(不放心让 AI 自己接线的,也可手工把 [bootstrap/](bootstrap/) 下两个文件拷到项目根——效果等价)

配置两件套(config + 硬升级清单)可后补:清单从默认五类起步,协作中 AI 把发现的红线缺口记为候选(escalation_candidates 机制),你跑 `collab.mjs proposals` 一句话逐条采纳——越用越准。

**已有指令文件的老项目 / 想显式控制安装过程**:把 [INSTALL_PROMPT.md](INSTALL_PROMPT.md) 的通用安装提示词整段粘贴给任何 AI 工具(一个字不用改)。

手动安装:

```bash
# 1. 把 ai-collab-kit/ 整个目录拷进(或克隆到)你的项目
# 2. 初始化总线
node ai-collab-kit/scripts/collab.mjs init
# 3. 编辑 _collab/collab.config.json(角色→工具)和 _collab/escalation_rules.md(你的"AI 不许拍板"清单)
# 4. 把 adapters/ 对应片段贴进各工具的指令文件(CLAUDE.md / AGENTS.md / 规则文件)
# 5. 可选但强烈推荐:每个 clone 安装机检 hook
node ai-collab-kit/scripts/collab.mjs install-hook
```

然后开两个 AI 窗口,各自第一句指派角色("你是开发员,读角色卡开工"/"你是审核员……"),开始干活。完整走查见 [QUICKSTART.md](QUICKSTART.md)。

## 六、空项目开局:走流水线

拿到一个新点子,不知道从哪开始?对开发员说:

> 你是开发员,按 ai-collab-kit/START.md 自举开工(已部署过则直接接活);然后我要做 <一句话需求>,按 ai-collab-kit/pipeline/PIPELINE.md 走流水线,先出需求书。

四阶段:需求书(含 Owner 决策问题清单)→ 规划书(轻型项目自动跳过)→ 模块规约 → lean 增量执行。**体量自适应**——流水线在第一个门禁给项目"称重"定档,小工具三次拍板走完,重型项目才展开实体锁定与风险探针。每次拍板进决策账本(`_collab/locked_decisions.md`),此后任何文档与代码违背账本 = 自动停下找你。详见 [pipeline/PIPELINE.md](pipeline/PIPELINE.md)。

## 七、三环什么时候用哪个

| 场景 | 用哪个环 | 你的参与度 |
|---|---|---|
| 写文档/写代码,要另一个 AI 把关 | **审稿环** | 单元起点与终点 |
| 拿不定主意,想听两个独立观点 | **议事环** | 出题 + 看 5 行摘要拍板 |
| 进入密集写码期,想少被打扰 | **lean 写码** | 只在 4 类硬停点出现 |

## 八、常见问题

**Q:只有一个 AI 工具能用吗?**
能跑,但价值减半:自审的盲点仍是盲点。协议的红利来自跨厂商对抗。哪怕 Reviewer 用免费档位的另一家模型,也强于同一模型自审。

**Q:两个 AI 用同一个仓库 clone 还是各一份?**
各一份最稳(纯靠 push/pull 交换,零 index 冲突)。同一份也能跑,但 commit 必须显式路径、快提快推(见 `adapters/generic.md`)。

**Q:中控为什么是脚本不是第三个 AI?**
中控职责是纯机械的(查文件齐否、推枚举值、报路径)。经验证明**让生成式模型扮演纯机械角色是违规重灾区**——模型天然想加工、想帮忙,而中控恰恰不许。脚本百分百守规。想用 LLM 当中控也支持,红线见 `roles/orchestrator.md`。

**Q:协议这么多规矩,AI 记得住吗?**
不靠记。规则以文件为准:角色卡要求每次开工重读关键文件;写权限有 hook 机器强制;状态有 `collab.mjs check` 体检;会话压缩后按"断点恢复清单 + git 三连"重建现场。**制度设计的出发点就是"假设 AI 会失忆"。**

**Q:能加第三个 AI 吗?**
当前版本是 1 Writer + 1 Reviewer + 脚本中控。多 Reviewer(评审团)是自然扩展方向,协议骨架(状态属权/硬升级/机械信号)不变,欢迎在此基础上演化。

## 九、设计哲学(给想改协议的人)

1. **每条规则必须对应一个真实失效模式**——写不出"防什么"的规则不要加
2. **能机检的不靠纪律**:同类问题第二次出现就脚本化;新守卫必须先证明能拦住(prove-catch)
3. **单一事实源**:协议细节只在 PROTOCOL.md;其他文件引用不复述——副本必漂移
4. **Owner 注意力是最稀缺资源**:一切设计向"更少但更关键的打扰"收敛
5. **改协议本身也要走协议**:双 AI 审文本(Phase A)+ Owner 拍板落地(Phase B)

## 十、许可与致谢

自由使用、修改、分发(建议保留来源说明)。蒸馏自 OPC 项目的三窗口 Git-Bus 协议实战(2026),感谢每一轮被打回的 attempt——它们变成了这里的铁律。
