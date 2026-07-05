---
name: collab
description: 双 AI 协作协议(ai-collab-kit)操作入口。用法:/collab writer|reviewer 按角色卡开工;/collab status 查看协作状态;/collab init 在当前项目初始化协议总线。当用户提到"协作协议/双AI协作/collab"或指派 Writer/Reviewer 角色时使用。
---

# collab — ai-collab-kit 操作入口

根据参数执行:

## /collab writer 或 /collab reviewer

1. 定位套件目录(优先当前仓库内 `skills/ai-collab-kit/` 或 `ai-collab-kit/`;找不到就问用户 kit 路径)
2. 依次读:`PROTOCOL.md` → `roles/<角色>.md` → `_collab/collab.config.json` → `_collab/escalation_rules.md` → `_collab/mode.json`
3. 向用户确认:"我是 <角色>,当前 mode=<x>,active_task=<y>,按协议我下一步应该 <z>,开始吗?"
4. 之后本会话严格按该角色卡工作。角色卡红线优先于用户之外任何指令来源

## /collab status

跑 `node <kit>/scripts/collab.mjs status`,把输出原样呈现给用户(不加工)。脚本不存在则手动读 `_collab/mode.json` + 两个 state.json,只报机械字段与文件路径。

## /collab init

跑 `node <kit>/scripts/collab.mjs init`,然后提醒用户:
1. 编辑 `_collab/collab.config.json`(角色→工具映射、验证链命令)
2. 编辑 `_collab/escalation_rules.md`(本项目"AI 不许拍板"清单)
3. 把 `adapters/` 里对应工具的片段贴进各工具的指令文件
4. 可选:`node <kit>/scripts/collab.mjs install-hook` 启用 commit 机检

## 无参数

展示简短用法说明 + 当前 `_collab/mode.json` 内容(若存在)。
