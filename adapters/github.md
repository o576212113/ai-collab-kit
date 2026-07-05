# 适配:GitHub(可选增强件)

> 协议总线是**纯 git**,平台无关——GitHub / Gitee / GitLab / 自建 git 服务都能跑,一个远程仓库 + 双方能 push/pull 就够。本文是**用 GitHub 时的可选增强**:CI 绿前置 + 自核方法 + 仓库设置建议。不用 GitHub 可跳过,协议不受影响。

## 一、CI 绿前置(协议接口:铁律 #9 的执行化)

思路:代码单元 READY 前必须验证全绿——与其让审核员每轮重跑构建,不如让 GitHub Actions 跑,审核员只核验结论、专注代码正确性。

**① 开启**:`_collab/collab.config.json` 把 `loops.lean_code.require_ci_green` 改为 `true`(修改属 Owner 配置,用 `owner(config):` 前缀提交)。

**② 建最小 workflow**(`.github/workflows/collab-ci.yml`,跑你项目的验证链,与 config 的 `verify_commands` 保持同一套命令):

```yaml
name: collab-ci
on:
  push:
    branches: [main]
jobs:
  verify:
    runs-on: ubuntu-latest   # 项目依赖 Windows 就换 windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci            # ← 换成你的安装命令
      - run: npm run verify    # ← 换成你的验证链(typecheck+lint+test+build)
```

小优化:`[skip-review]` 的协作元层 commit 不值得跑 CI,可在 job 上加
`if: "!contains(github.event.head_commit.message, '[skip-review]')"`。

**③ 开发员自核**(push 后、标 READY 前):

```bash
gh run list --limit 1          # conclusion=success 才允许标 READY
gh run view <run-id> --log-failed   # 跑红了自取报错自修,不用 Owner 转录
```

没装 gh CLI 就看仓库 Actions 页面;开发员在 `last_writer.md` 自检证据里附 run 结论/链接。

**④ 审核员核验**:CI 绿是 APPROVED 的前置(红 = 不可 APPROVED);审核员默认不重跑构建,需要时做定向探针。

## 二、仓库设置建议

- **默认工作流是双方直推 main**(总线协议的原生形态,状态文件需要快速流转)。因此 main **不要开** "require pull request" 类分支保护——那会卡死总线;想要的约束协议已用 commit 前缀机检 + 审稿环本身提供
- 私有仓库 + 每个 AI 端各自的凭证(deploy key / PAT):审核员端只需要 pull + push 两个权限;**任何 AI 的凭证不进仓库文件**(硬升级第 4 类)
- 双机/双端各自 clone(而非共享工作区)时,GitHub 就是天然的总线中枢——这是最稳的部署形态
- Dependabot / 安全告警可以开,但**AI 不自动升级依赖**:告警当作一个审稿单元走审稿环,升不升 Owner 拍板

## 三、PR 模式(可选,不推荐首选)

想要"每个单元一个 PR"的团队习惯也能兼容:开发员每单元开分支 + PR,审核员把 `last_reviewer.md` 结论同步为 PR review,APPROVED 后合并。代价:状态文件(`_collab/`)必须仍走 main 直推(否则总线断流),等于双轨,复杂度明显上升。**单人 Owner + 双 AI 的场景,直推 main + 审稿环已经覆盖 PR 的全部价值**,建议默认不用 PR 模式。
