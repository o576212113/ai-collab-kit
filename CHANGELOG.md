# CHANGELOG

## 1.2.0(2026-07-05)pipeline 流水线(空项目开局导航,OPC 全链路蒸馏)

- **四阶段流水线**:一句话需求 → 需求书(含★Owner 决策问题清单)→ 规划书 → 模块规约 → lean 增量执行;四门禁全部 Owner 拍板
- **体量自适应三档**(轻/标准/重):门禁①定档;轻型跳过规划书、重型展开实体/状态机锁定 + 风险探针先行——搬 OPC 机制不搬吨位
- **决策账本** `_collab/locked_decisions.md`(OPC"已锁口径 + Owner 拍板追踪"机制的通用化):`collab.mjs decide` 机械誊录,每门禁/议事/裁断入账;硬升级第 1 类以账本为判定依据;废弃不删只标注
- 模板:pipeline/templates/{requirements,plan}.md;init 自动创建账本;账本文件归中控誊录类(discuss(decision) 前缀)


## 1.1.0(2026-07-05)议事环四包优化(Owner 拍板全采纳)

- **效率包**:`topic --lite` 轻量档(只走 R1 盲发,起草方直接 synthesis + 对方三问复核,AI 动作 7→4)+ `next` 命令(输出可整句粘贴的下一步指令与目标窗口,Owner 从消息泵降级为复读机)
- **反懒惰同意包**:footer 新增 `concession` 必填字段(agree 必须写明让了什么步,空缺卡流程)+ 矛盾探针(字段 agree 但正文含强异议措辞 → advance 输出警告提示 Owner 展开)
- **synthesis 公正性包**:起草权单双议题轮换(`state.synthesis_author`)+ 复核 ack 升级为结构化三问(摘要与立场一致?分歧表遗漏?我方方案被公正陈述?)
- **议题质量包**:`topic` 命令打印好议题三要素提示(背景/边界/纠结点)+ draft 新增必备"假设声明"段(缺则卡住;题目留白导致的偏差就地显形)

## 1.0.0(2026-07-05)

首个通用化版本。蒸馏自 OPC 项目三窗口 Git-Bus 协议(审稿 loop v1.4.1 + 议事 loop v0.6.7 + lean 写码 T-015/E 协议,271+ 轮实战)。

相对原版的结构性升级:

- **角色抽象**:Claude-A/Codex-A/Claude-B → Writer/Reviewer/Orchestrator,任何 AI 工具组合可接入(适配层:Claude Code / Codex / Antigravity / 通用)
- **中控脚本化**:Orchestrator 默认由 `scripts/collab.mjs` 承担(init/status/mode/topic/advance/decision/check/archive/install-hook),LLM 中控降级为可选项——纯机械角色不再消耗模型、不再产生越权风险
- **写权限矩阵机检**:commit-msg hook 校验"前缀 ↔ 触碰路径"守恒,红线从纪律升级为机器强制
- **state 瘦身制度**:state 文件只放活跃字段 + 大小告警 + `archive` 命令轮转历史(源自 434KB state.json 事故)
- **单一事实源**:全部协议细节收敛进 PROTOCOL.md,角色卡/适配层/模板只引用不复述(原版协议文本自身存在四处复本)
- **硬升级清单配置化**:原版 5 类(V-X/02/03/MVP/凭证)泛化为 `escalation_rules.md` 模板(五类通用默认 + 项目自定义)
- **两层开发文档制度模板化**:unit spec 9 节 + dev-log 6 段(源自 T-015)
- **双层命名**:对话/文档用中文身份名(开发员/审核员/中控),机械层(文件名/前缀/字段)固定英文——机检按字面匹配,不随语言翻译
- **GitHub 增强件**:`adapters/github.md`(CI 绿前置 workflow 模板 + gh 自核方法 + 仓库设置建议;协议本体平台无关)

原版铁律全部保留(见 PROTOCOL.md §八,共 18 条,每条标注"防什么")。
