# Bili Owner Video Sync

**Goal:** Complete the approved owner-video layout with periodic UID-based synchronization and local verification, without deploying yet.

**Contract:** `GET /api/v1/bili/videos` returns `{ owner: { uid, name, profileUrl }, items: [{ bvid, title, description, cover, publishedAt, duration }], ready, syncedAt }`. The owner is the configured `BILIBILI_UID` (currently 1061280173), not a visitor-supplied account. `ready:false` means no successful sync yet. A successful zero-public-video result is `ready:true, items:[]`. Requests only read local cached data and never trigger upstream traffic.

**Backend:** Use the existing Go/SQLite patterns and public Bilibili archive listing, no account credentials or cookies. Fetch complete paginated results with time/page/body bounds and ownership validation. Reject partial, malformed and failed responses without replacing the prior successful snapshot. Persist owner-scoped data and last-sync time atomically. Serve cached cover files where available, retain a validated public cover URL if download fails. Schedule roughly hourly and include owner data in the existing authorized manual sync. No frontend visitor can write or force refresh.

**Frontend:** Keep the accepted design and on-demand player. Read the cached endpoint when the page mounts; safely validate results and use recorded metadata as an explicitly labelled fallback when the cache is unavailable/pending. Correctly distinguish a successfully empty feed from a failure. Larger lists start with six cards and have an accessible load-more button; desktop/mobile column rules stay unchanged. Explicit fixture props bypass fetching in tests/previews.

- [ ] Add failing frontend service, live-feed and load-more tests.
- [ ] Implement backend fetch/cache/read endpoint and scheduler with mocked upstream tests.
- [ ] Wire the frontend to the cached feed, safe media URLs, failure/empty states and bounded rendering.
- [ ] Verify frontend and backend together locally, first/empty/failed sync cases, playback, phone/desktop layouts and existing bangumi layout.
- [ ] Run Go tests, scoped frontend tests/lint/build and independent review; save local commits and preview URL. No push/PR/deployment this turn.
