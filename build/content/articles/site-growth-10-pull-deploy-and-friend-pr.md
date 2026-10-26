---
date: 2026-08-13
slug: site-growth-10-pull-deploy-and-friend-pr
title_zh: 建站成长记录 10｜把发布交还给服务器：拉取式部署与友链 PR
title_en: Site Growth Log 10 | Handing Deployment Back to the Server: Pull Deploys and Friend-Link Pull Requests
excerpt_zh: 这篇记录发布链路的一次重构。原来的 GitHub Actions 要拿着 SSH 密钥进生产机，服务器一收紧端口，自动部署立刻断掉。最后改成服务器自己定时拉 master、本机构建部署；顺带因为 master 开了分支保护，站长后台发布友链也换成了自动开 PR。
excerpt_en: This post records a rebuild of the release pipeline. GitHub Actions used to SSH into the production host with a key, so tightening the server's ports broke auto-deploy immediately. The final shape is a server that pulls master on a timer and deploys locally — plus friend-link publishing that opens a pull request, because master is now protected.
words: 3800
reads: 22
minutes: 13
---

# 建站成长记录 10：部署不该依赖一台永远开着的公网 SSH

有一段时间，我的发布流程是这样的：本地提交，推到 GitHub，GitHub Actions 在一个临时机器上构建，然后拿着服务器私钥 SSH 进去，`scp` 上传，重启服务。

只要服务器对全网开放 22 端口，这条链路就一直能用。直到我发现自己在做一件矛盾的事：白天刚把 SSH 收紧到只允许自己的 IP，晚上又希望 GitHub 的临时机器能连进去。

这两件事不可能同时成立。

## 断点出现的位置

有一次站长后台发布友链，页面上写“已发布”，线上却一点变化都没有。我以为是前端缓存，刷新几次都一样。

查下来，问题不在发布功能，而在它的下一环：

| 环节 | 实际状态 |
| --- | --- |
| 站长后台写入 GitHub | 成功，commit 真的进了仓库 |
| GitHub Actions 启动 | 成功 |
| Setup SSH key 步骤 | 失败，`ssh-keyscan` 连不上服务器 |
| 上传与重启 | 全部跳过 |
| 线上页面 | 还是旧版本 |

所以后台不是“发不出去”，而是“发出去之后没人把它搬上线”。

## 第一次尝试：把 runner 搬进服务器

最直接的想法是 self-hosted runner：让 GitHub 的任务跑在我自己的服务器上，就不用从公网连 SSH 了。

这个方案确实能解决连通性。但装之前我读到一句提醒：**公共仓库不建议使用自托管运行者**。原因是自托管 runner 不是每次都在干净环境里执行，外部提交的代码一旦被触发，可能污染这台机器，而它同时还在跑我的网站。

这句话让我停下来。我的仓库是公开的，等于把两个风险叠在一起：生产机和代码执行环境共用一台机器，而代码执行环境对陌生人开放。

于是这个方案被放弃。不是因为它跑不通，而是因为它跑通了也不安全。

## 换成反方向：让服务器自己去取

真正的转折是调换推动方向。

原来：GitHub 把代码推到服务器。
现在：服务器自己去 GitHub 取代码。

服务器上装了一个 systemd timer，每五分钟执行一次部署脚本。脚本的骨架很短：

```bash
git fetch origin master
if [ "$(git rev-parse origin/master)" = "$(cat last-deployed-sha)" ]; then
  exit 0
fi
```

没有新提交就直接退出，什么都不做。有新提交才继续：本机构建、备份现有静态目录、覆盖部署、检查后端服务、reload nginx、跑健康检查，最后把新 SHA 写回去。

这样做的几个收益：

| 变化 | 说明 |
| --- | --- |
| 不接受公网 SSH | 部署不再需要任何入方向连接 |
| 不接触生产密钥 | GitHub 那边不再持有服务器凭据 |
| 只认 master | 陌生 PR 的代码不会进服务器 |
| 幂等 | 没有新提交时几乎不消耗资源 |

代价是延迟。原来推送后两分钟内上线，现在最多等五分钟。我接受这个延迟——个人站的发布节奏不值得为这几分钟牺牲一条干净的边界。

## 密钥边界要画在构建之前

拉取式部署带来一个新问题：构建脚本在服务器上跑，而服务器上有生产环境变量。

所以部署被拆成了两段，由不同身份执行：

| 阶段 | 执行身份 | 能做什么 |
| --- | --- | --- |
| 安装、同步静态文件、reload nginx | root | 固定动作，不执行仓库里的任意脚本 |
| 拉代码、装依赖、构建 | `taozhiyy-deploy` | 普通用户，读不到生产 env |

生产配置 `/opt/acg-api/.env` 保持 `root:root` 且权限 `600`。构建用户没有读取权限，只有后端进程启动时才由 systemd 交给它。

这条边界很重要，因为构建本身要执行仓库里的 `npm` 脚本和 `go build`。一旦以后有人往 `master` 里塞了恶意构建脚本，至少拿不到密钥。

## 分支保护带来的副作用

部署安全了，紧接着撞上另一件事。

我给 `master` 开启了分支保护：不允许直接 push，必须走 PR，管理员也受保护。

这个决定本身是对的，但它立刻让站长后台失效了：友链发布逻辑是直接改仓库里的 `friendCards.js` 并提交到 `master`。分支保护一开，GitHub 直接拒绝，页面上出现那句让人困惑的报错：

> Could not update file: Changes must be made through a pull request.

这不是 bug，是保护生效了。

## 把发布也改成 PR

我选择了保留保护，改写发布逻辑。

现在站长后台点发布，后端做的事变了：

1. 从 `master` 读出当前友链数据
2. 在内存里追加新友链，检查链接是否已存在
3. 新建分支 `owner/friend-<时间戳>-<slug>`
4. 把更新后的文件提交到这个分支
5. 用 GitHub API 自动开一个 PR
6. 把 PR 链接返回给后台页面

页面上的提示也跟着改了：发布成功不等于已上线，还需要去 GitHub 点一次 Merge。合并进入 `master` 之后，服务器的定时任务才会把它部署出去。

多了一步人工确认。但这一步本身就是价值：线上内容永远对应一个可回滚、有记录的变更。

## 这一轮留下的经验

回头看，这次改动没有加任何可见功能，页面一模一样。变化全在“东西怎么到达线上”这件事上。

几条我后来反复验证过的结论：

- 部署链路的信任边界，应该和网站本身一样认真设计
- 能不用公网入站就不用，主动去取比被动被推更安全
- 分支保护与自动化发布不是二选一，自动化可以产出 PR 而不是直接提交
- 构建阶段和生产密钥之间必须有一层身份隔离

小站也会长出基础设施。区别是它的基础设施只有几十行脚本，但同样值得认真画一条线。

---en---

# Site Growth Log 10: Deployment Should Not Depend on a Publicly Reachable SSH Port

For a while my release flow was this: commit locally, push to GitHub, let GitHub Actions build on a temporary machine, then SSH into the server with a stored private key, `scp` the build up, and restart.

It worked as long as the server accepted SSH from the whole internet. Then I noticed I was doing something contradictory: during the day I tightened SSH to my own IP only, and at night I expected GitHub's throwaway machine to still get in.

Both cannot be true at the same time.

## Where it broke

One day the owner console said a friend link was published, yet the live site never changed. I assumed caching. Refreshing did not help.

The problem was not the publishing feature. It was the step after it:

| Step | Actual state |
| --- | --- |
| Owner console writes to GitHub | worked; the commit existed |
| GitHub Actions starts | worked |
| Setup SSH key step | failed; `ssh-keyscan` could not reach the server |
| Upload and restart | skipped |
| Live site | still the old version |

So the console was not failing to publish. It was publishing into a place that nothing was carrying to production.

## First attempt: put the runner on the server

The obvious fix was a self-hosted runner: run the GitHub job on my own machine so no inbound SSH is needed.

That does solve connectivity. But before installing it I ran into a warning: **self-hosted runners should almost never be used for public repositories**. The runner is not guaranteed to be a clean environment each job, so code from outside contributors could persist and contaminate the machine — which is also serving my website.

That stopped me. My repository is public, so the two risks stack: production and code execution share one machine, and the execution environment is open to strangers.

I dropped the approach. Not because it would not run, but because running it would still be unsafe.

## Inverting the direction

The real turn was flipping who initiates.

Before: GitHub pushes code to the server.
After: the server fetches code from GitHub.

A systemd timer runs a deploy script every five minutes. The core is short:

```bash
git fetch origin master
if [ "$(git rev-parse origin/master)" = "$(cat last-deployed-sha)" ]; then
  exit 0
fi
```

No new commit, leave immediately. Otherwise: build locally, back up the current static directory, deploy, verify the backend service, reload nginx, run a health check, and record the new SHA.

What this buys:

| Change | Effect |
| --- | --- |
| No inbound SSH required | deployment needs zero inbound connections |
| No production secrets in CI | GitHub no longer holds server credentials |
| `master` only | code from unknown pull requests never reaches the server |
| Idempotent | an unchanged commit costs almost nothing |

The cost is latency. Before, a push went live in about two minutes; now it can take five. I accepted that. A personal site's release rhythm is not worth trading away a clean boundary.

## The secret boundary belongs before the build

Pull deploys introduce a question: the build runs on the server, and the server holds production environment variables.

So deployment was split across two identities:

| Phase | Identity | Responsibility |
| --- | --- | --- |
| Install, sync static files, reload nginx | root | fixed actions only, never arbitrary repo scripts |
| Fetch, install deps, build | `taozhiyy-deploy` | unprivileged user that cannot read production env |

The production config `/opt/acg-api/.env` stays `root:root` mode `600`. The build user cannot read it; only the backend process receives it at startup through systemd.

That matters because the build does execute repository code — npm scripts, `go build`. If something malicious ever lands on `master`, at least it does not get the secrets.

## The side effect of protecting master

Deployment got safer, and immediately hit the next problem.

I enabled branch protection on `master`: no direct pushes, pull requests required, administrators included.

The decision was right, but it instantly broke the owner console. Friend-link publishing edited `friendCards.js` and committed straight to `master`. With protection on, GitHub refused, and the page showed a confusing error:

> Could not update file: Changes must be made through a pull request.

That is not a bug. That is the protection working.

## Turning publishing into a pull request

I kept the protection and changed the publishing flow instead.

Now when the console publishes, the backend:

1. reads the current friend data from `master`
2. appends the new entry in memory, checking for duplicate URLs
3. creates a branch named `owner/friend-<timestamp>-<slug>`
4. commits the updated file to that branch
5. opens a pull request through the GitHub API
6. returns the pull request link to the console

The console hint changed too: publishing succeeds but is not live yet — a Merge is still needed. Only after it lands on `master` does the timer deploy it.

One extra human click. But that click is the value: whatever is live always corresponds to a reviewable, revertible change.

## What this round left behind

No visible feature was added. The pages look identical. Everything changed in how things reach production.

A few conclusions I have since re-verified:

- the trust boundary of a deploy pipeline deserves as much care as the site itself
- prefer pulling over being pushed to; fewer inbound holes
- branch protection and automation are not exclusive — automation can produce pull requests instead of commits
- identity isolation between build and production secrets is not optional

Even a small site grows infrastructure. It is only a few dozen lines of script, but the line still has to be drawn deliberately.
