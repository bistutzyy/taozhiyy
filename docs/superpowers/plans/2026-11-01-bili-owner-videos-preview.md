# Bili Owner Videos Preview

**Goal:** Preview the owner's real video above the existing autumn bangumi section, without deploying or changing backend infrastructure.

**Approved direction:** UID 1061280173. One centered, bounded 16:9 card now; two columns for two videos, three desktop columns for larger collections, and two mobile columns for multiple videos. No empty cards. Preserve the autumn background and existing mobile bangumi two-column layout.

**Data:** A public Bilibili archive-list request on 2026-11-01 returned one video: BV1jK7W6MEAj, author 桃之夭夭io, duration 04:36. The preview uses a checked-in snapshot of this public metadata and its actual cover URL; it does not pretend to have automatic synchronization. Future backend integration can replace the supplied list without changing the presentation component.

**Implementation:** Add `MyBiliVideos.jsx` and scoped CSS; add a small BV validation/player URL/grid/date model and the public metadata file. Insert the section in BiliHubPage only. Create a native modal with the official Bilibili iframe only after a click, autoplay off, an external Bilibili link, Escape/close/backdrop dismissal, focus and body-style restoration. No credentials required or added.

- [x] Write and run failing model and server-rendered component tests.
- [x] Implement the responsive video list, safe embed URLs and on-demand native player.
- [x] Verify actual cover images, 1/2/7-card layouts, mobile bangumi preservation, modal lifecycle, image failures, keyboard/focus and no overflow at 320/390/430/1440 widths.
- [x] Run scoped lint, tests and frontend build; commit locally and leave the preview server running. Do not push, PR or deploy before visual approval.

**Verification:** Five model/SSR tests passed after failing for the missing feature; all four owner-video browser viewports passed with real decoded covers, future 2/7-card fixtures, native modal lifecycle, iframe removal, focus, body-style priorities, image failure fallback and no horizontal overflow. All six existing Bili layout cases passed. Scoped ESLint has no errors; the frontend Vite build passed (existing shared-assistant and bundle-size warnings remain). Review identified the mixed overflow-axis restoration case, independently reproduced by a failing browser assertion and fixed; follow-up review found no P1/P2. A separate real-player check received HTTP 200 and showed the actual Bilibili video image. Playback restrictions/quality remain controlled by Bilibili.

**Preview:** http://127.0.0.1:5203/bili?v=owner-video-preview. Only local commits; no push, PR, backend change or deployment. The metadata is a preview snapshot; automatic syncing is explicitly deferred pending layout approval.
