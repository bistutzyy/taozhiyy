# acg-api (minimal Go)

Lightweight API for guestbook (SQLite) and Bilibili tracker placeholders.

## Config (built-in defaults)

- Bilibili UID: `1061280173` (override `BILIBILI_UID`)
- Radar creators:
  - 罗翔说刑法 `517327498`
  - 你的影月月 `431073645`
  - 黑马程序员 `37974444`
  - 挪威的月亮 `398915225`

Sync: owner uploads and bangumi every **1h**, radar every **15m**, image cache cleanup **7 days**.

## Run locally

```bash
cd acg-api
go run .
```

Default listen: `:8787`

Trigger manual sync: `POST /api/v1/sync/trigger`

## Endpoints

- `GET /api/v1/health`
- `GET /api/v1/guestbook?limit=50`
- `POST /api/v1/guestbook` — JSON `{ "name": "...", "content": "..." }`
- `GET /api/v1/bangumi/list`
- `GET /api/v1/radar/feed`
- `GET /api/v1/bili/videos` - cached public uploads for the configured Bilibili UID
- `GET /api/chat` — quota status (blog AI assistant)
- `POST /api/chat` — `{ "message": "...", "pageUrl", "pageTitle" }` → DeepSeek-v4-flash (see `blog/AI-ASSISTANT.md`)
- `POST /api/auth/register` — 邮箱注册（站长邮箱不可注册）
- `POST /api/auth/login` — 登录；站长邮箱需再调 `verify-security`
- `POST /api/auth/verify-security` — `{ "challengeToken", "answer" }` 学号验证 → 无限 AI
- `POST /api/auth/logout` / `GET /api/auth/me`

### Owner Video Cache

`/api/v1/bili/videos` is read-only and accepts no UID or refresh query parameters.
It returns `owner`, `items`, `ready`, and `syncedAt`. Before the first successful
sync, `ready` is false; a successfully empty public list has `ready: true` and
`items: []`. Startup, the hourly loop, and the existing authorized manual sync
update an owner-scoped SQLite snapshot atomically. Failed, partial or rejected
upstream requests retain the last successful snapshot. No Bilibili password or
Cookie is used.

The response also includes optional additive diagnostics:

```json
{"sync":{"state":"error","attemptedAt":"2026-11-01T00:00:00Z","reason":"upstream_rejected","upstreamCode":-412}}
```

`sync.state` is `pending`, `syncing`, `ok`, or `error`. `attemptedAt` is the
latest attempt's UTC ISO timestamp (start time), or an empty string before any
attempt. `reason` is empty unless an error occurred, then one of
`upstream_rejected`, `network_error`, `invalid_response`, or `cache_error`.
`upstreamCode` is present only for rejections: an HTTP status or nonzero Bilibili
API code. No upstream messages, URLs, headers, credentials or internal paths
are included in diagnostics. Success clears the previous reason and code.

Attempts persist separately from successful snapshots, scoped by owner UID,
including failures before the first successful sync. `ready` and `syncedAt`
still describe only the last successful snapshot; cover-download fallbacks do
not fail an otherwise successful sync. A legacy snapshot without an attempt
record reports `ok` with its `syncedAt` as `attemptedAt`. Diagnostic read errors
report `error` / `cache_error` with an empty timestamp while keeping feed data.
Diagnostic write errors never prevent successful snapshot publication. A crash
or failed final diagnostic write can leave `syncing` until the next attempt.
Reading this endpoint never starts a sync or writes diagnostic records.

Owner covers use the existing image endpoint and a shared cleanup/sync lock.
The cache is limited to 256 MiB / 1024 owner files, including old versions;
each image is limited to 8 MiB, 8192 pixels per side, and 16 Mi pixels in total.
JPEG, PNG and bounded GIF images are fully decoded before caching; unsupported
formats such as WebP remain remote. Invalid images or exhausted cache budgets
keep a previous good cover when available, otherwise a validated CDN URL.

### 站长控制器（`/api/owner/`）

站长控制器统一要求 `acg_session` 登录态，并且用户必须是站长二次验证后的 unlimited session。浏览器只提交内容、图片或公开 URL，GitHub Token、COS 密钥等写入凭据保留在服务器环境变量里。

| 方法 | 路径 | 控制器文件 | 说明 |
|------|------|------|------|
| GET | `/api/owner/status` | `owner_controller.go` | 返回站长信息、注册用户、未读留言提醒、AI 今日调用数、草稿和上传限制。 |
| GET/POST | `/api/owner/drafts` | `owner_controller.go` | 读取和保存站长草稿。 |
| PATCH | `/api/owner/notifications/:id/read` | `owner_controller.go` | 只写入 `owner_read_at`，不会隐藏公开留言。 |
| POST | `/api/owner/uploads` | `owner_controller.go` | 保存本地临时图片到 `ACG_DATA_DIR/owner-uploads`，最大 8 MiB。 |
| GET | `/api/owner/uploads/:name` | `owner_controller.go` | 读取本地临时上传图片。 |
| POST | `/api/owner/assets` | `owner_controller.go` + `owner_cos.go` | 使用服务器端 COS 凭据上传文章/相册图片，返回公开 URL 和对象 key。 |
| POST | `/api/owner/publish` | `owner_publish.go` | 发布 Markdown 到 `blog/source/_posts/`，通过 GitHub Contents API 产生真实 commit。 |
| POST | `/api/owner/friends` | `owner_friend_publish.go` | 生成友链数据变更分支并创建 Pull Request，检测重复 URL，避免直接写入受保护的 `master`。 |
| POST | `/api/owner/moments` | `owner_moment_publish.go` | 写入碎语到 `main/src/data/moments.js`，校验年份、日期、分类和内容，按日期插入并返回 commit 信息。 |
| POST | `/api/owner/gallery/images` | `owner_gallery_publish.go` | 写入公开图片 URL 到 `main/src/data/galleryAlbums.js`，必要时创建相册并避免重复图片。 |

常用站长发布请求：

```http
POST /api/owner/moments
{
  "year": "2026",
  "date": "6.8",
  "type": "心事",
  "content": "一滴泪真正的重量取决于它落在谁的心上"
}
```

`/api/owner/moments` 也兼容 `category` 字段作为 `type` 的 fallback。发布成功后，GitHub Actions 会按仓库部署流程更新主站。

### 留言小纸条（`/api/guestbook/`）

自研轻量留言板，复用 `acg_session` 登录态；支持访客与登录用户留言，顶层友链留言必须填写联系邮箱，站长（`is_owner`）可删/隐藏。

建表：启动时自动创建 `guestbook_messages`（见 `deploy/guestbook.sql`）。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/guestbook/messages?page=1&pageSize=20` | 列表；普通用户仅 `visible`，管理员含 `hidden` |
| POST | `/api/guestbook/messages` | 发布；普通留言访客提交 `{ nickname, content }`、登录用户提交 `{ content }`，顶层友链留言提交 `{ nickname, contactEmail, content }` |
| DELETE | `/api/guestbook/messages/:id` | 软删除（`deleted`），仅 admin |
| PATCH | `/api/guestbook/messages/:id/status` 或 `/:id` | `{ "status": "hidden" }`，仅 admin |

限流：访客 3/小时、10/天；登录 10/小时、30/天；60 秒内同内容防重复。429 返回 `RATE_LIMITED`。

IP：仅存 `ip_hash`、`ip_masked`；公开展示 `ipRegion`（依赖 `ip-api.com`，失败时为「未知地区」）。

前端页面：`main/` 路由 `/guestbook`，首页 Story「LEAVE A MESSAGE」入口。

Copy `.env.example` → `/opt/acg-api/.env` with `DEEPSEEK_API_KEY`, `AUTH_OWNER_PASSWORD`, `AUTH_OWNER_SECURITY_ANSWER`, and owner publish GitHub settings: `OWNER_PUBLISH_GITHUB_TOKEN` (required), `OWNER_PUBLISH_GITHUB_OWNER`, `OWNER_PUBLISH_GITHUB_REPO`, `OWNER_PUBLISH_GITHUB_BRANCH`（站长 `173236231@qq.com` 学号二次验证）。

For owner asset uploads to Tencent COS, also set:

- `TENCENT_COS_SECRET_ID`
- `TENCENT_COS_SECRET_KEY`
- `TENCENT_COS_BUCKET`
- `TENCENT_COS_REGION`
- optional `TENCENT_COS_BASE_URL`

## Frontend

In `main/`, set for production build:

```env
VITE_API_BASE=https://taozhiyy.top
```

Dev: Vite proxies `/api` → `http://127.0.0.1:8787`.

## Deploy on UCloud (outline)

1. Build: `CGO_ENABLED=0 go build -o acg-api .`
2. systemd unit runs `./acg-api` with `ACG_DATA_DIR=/var/lib/acg-api`
3. Nginx:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}
```

Image cache (later): serve `/api/v1/acg/image/` via Nginx `alias` + `sendfile`, not through Go.

## Memory

Stdlib `net/http` + SQLite file DB. No Docker. Typical RSS **~60–180MB** under light load.

## Follow-Up Plan

- 服务器数据和状态监测：在站长控制台中展示服务健康、资源使用、同步状态和关键数据趋势。
- 邮箱绑定与发送：补充账号邮箱绑定、验证和通知发送能力。
- 设计艺术字主页：前端继续探索更有辨识度的首页标题与艺术字主视觉方向。
