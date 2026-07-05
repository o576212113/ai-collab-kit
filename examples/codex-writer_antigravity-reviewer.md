# 配对示例:Codex(Writer)+ Antigravity(Reviewer)

> 适合:主力开发在 Codex(CLI 或云端),用 Antigravity(Gemini 3)做独立审查。也可以反过来配——把两份适配片段的角色对调即可,协议完全对称。

## 配置

```json
"actors": {
  "writer":   { "tool": "codex",       "label": "Codex CLI 主开发" },
  "reviewer": { "tool": "antigravity", "label": "Antigravity 审查" },
  "orchestrator": { "mode": "script" }
}
```

## 接线

1. 仓库根 `AGENTS.md` 追加 [../adapters/codex.md](../adapters/codex.md) 片段,角色填 **Writer**
2. Antigravity 的规则文件(以其版本文档为准,见 [../adapters/antigravity.md](../adapters/antigravity.md))贴入片段,角色填 **Reviewer**
3. 两边 `install-hook`

## 注意事项(这对组合的特殊点)

- **两个工具可能都想读 `AGENTS.md`**(AGENTS.md 正在成为多工具通用标准)。若 Antigravity 也读它,会看到"你是 Writer"的声明——冲突。解法二选一:
  - **推荐**:Antigravity 用自己的独立规则文件/工作区 Rules 声明 Reviewer 角色,`AGENTS.md` 里写清楚"本文件的角色声明只对 Codex 生效"
  - 或两个工具各用一个 clone,各自仓库里的 `AGENTS.md` 写各自的角色(总线靠 push/pull 同步,天然支持)
- **Antigravity 的并行代理**:同一时刻只让一个代理扮演 Reviewer;并行能力用在角色内部(多视角审查探针),不要多代理同时写总线文件
- **Antigravity 的 Artifacts 不替代协议产物**:走查记录/截图很适合作为审查证据引用,但结论必须落到 `last_reviewer.md`(那是跨工具契约,Artifacts 只在 Antigravity 里可见)
- Codex 做 Writer 时,`writer.md` 角色卡的三硬自检(编译/测试/lint)+ dev-log 随 commit 交付照常适用

## 第一循环点火

```
你 → Codex:  "你是开发员(Writer),读 ai-collab-kit/PROTOCOL.md + roles/writer.md,
              实现 <小任务>,按协议交审。"
你 → Antigravity:"你是审核员(Reviewer),读 ai-collab-kit/PROTOCOL.md + roles/reviewer.md,
              pull 后审 _collab/review/state.json 指向的 commit,
              结论写 last_reviewer.md,冻结 hash,commit 带 [skip-review]。"
你:          node ai-collab-kit/scripts/collab.mjs status   # 看结论
```
