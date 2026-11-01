# Bili Owner Video Sync

**Goal:** Complete the approved owner-video layout with periodic UID-based synchronization, verify locally, then deploy through a protected-master PR after the user's explicit release approval.

**Contract:** `GET /api/v1/bili/videos` returns `{ owner: { uid, name, profileUrl }, items: [{ bvid, title, description, cover, publishedAt, duration }], ready, syncedAt }`. The owner is the configured `BILIBILI_UID` (currently 1061280173), not a visitor-supplied account. `ready:false` means no successful sync yet. A successful zero-public-video result is `ready:true, items:[]`. Requests only read local cached data and never trigger upstream traffic.

**Backend:** Use the existing Go/SQLite patterns and public Bilibili archive listing, no account credentials or cookies. Fetch complete paginated results with time/page/body bounds and ownership validation. Reject partial, malformed and failed responses without replacing the prior successful snapshot. Persist owner-scoped data and last-sync time atomically. Serve cached cover files where available, retain a validated public cover URL if download fails. Schedule roughly hourly and include owner data in the existing authorized manual sync. No frontend visitor can write or force refresh.

**Frontend:** Keep the accepted design and on-demand player. Read the cached endpoint when the page mounts; safely validate results and use recorded metadata as an explicitly labelled fallback when the cache is unavailable/pending. Correctly distinguish a successfully empty feed from a failure. Larger lists start with six cards and have an accessible load-more button; desktop/mobile column rules stay unchanged. Explicit fixture props bypass fetching in tests/previews.

- [x] Add failing frontend service, live-feed and load-more tests.
- [x] Implement backend fetch/cache/read endpoint and scheduler with mocked upstream tests.
- [x] Wire the frontend to the cached feed, safe media URLs, failure/empty states and bounded rendering.
- [x] Verify frontend and backend together locally, first/empty/failed sync cases, playback, phone/desktop layouts and existing bangumi layout.
- [ ] Run Go tests, scoped frontend tests/lint/build and independent review, then deploy through PR and verify the public release.

**Release approval:** The user explicitly selected "deploy after validation" on 2026-11-01. Use the existing server pull deployment; do not bypass master protection or change production secrets/firewall configuration.

**Local verification:** Go full tests and vet passed; ten focused frontend tests and scoped lint passed; the full frontend/project build including 25 project tests passed. Owner video QA passed at 320/390/430/1440, live-feed failure/empty/load-more/recovered-cover tests passed at 390/1440, and all six existing Bili layout tests passed. A clean local API process successfully synchronized the actual BV1jK7W6MEAj and its JPEG cover. The final binary retained that snapshot after a later upstream rejection; its real API, cached cover and frontend passed at 390/1440. Independent reviews found no remaining P1/P2 after the URL-keyed image failure fix, complete bounded image decoding, shared cache mutex and 256MiB/1024-file quota.

**Test limitation:** The Windows race-detector process could not start (0xc0000139); no race-detector pass is claimed. Deterministic lock/quota tests passed, including the worker's repeated runs. The unrelated pre-existing About/Story/PWA source-assertion failures documented in the previous release remain out of scope.
