# 决策账本(locked decisions)

> **每条 = Owner 拍过的板。** 任何文档、任何代码与本账本冲突 = 硬升级第 1 类,立即停下找 Owner——两个 AI 意见再一致也不例外。
> **追加方式**(机械誊录,AI 不得擅自增删改):
> `node ai-collab-kit/scripts/collab.mjs decide "<决策一句话>" --why "<理由>" --source "<门禁①/议事T-001/裁断>"`
> **废弃决策不删除**:Owner 推翻旧决策时新增一条并在旧条"状态"标"已废弃(被 D-NNN 取代)"——历史必须可追溯。该手工修改用前缀 `discuss(decision): ... [skip-review]`(或 Owner 的 `owner(config):`)提交,其他前缀会被机检拦下。

| # | 日期 | 决策 | 理由(一句话) | 出处 | 状态 |
|---|---|---|---|---|---|
