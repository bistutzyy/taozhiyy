# Bili Owner Videos Preview

**Goal:** Preview the owner's real video above the existing autumn bangumi section, without deploying or changing backend infrastructure.

**Approved direction:** UID 1061280173. One centered, bounded 16:9 card now; two columns for two videos, three desktop columns for larger collections, and two mobile columns for multiple videos. No empty cards. Preserve the autumn background and existing mobile bangumi two-column layout.

**Data:** A public Bilibili archive-list request on 2026-11-01 returned one video: BV1jK7W6MEAj, author 桃之夭夭io, duration 04:36. The preview uses a checked-in snapshot of this public metadata and its actual cover URL; it does not pretend to have automatic synchronization. Future backend integration can replace the supplied list without changing the presentation component.

**Implementation:** Add `MyBiliVideos.jsx` and scoped CSS; add a small BV validation/player URL/grid/date model and the public metadata file. Insert the section in BiliHubPage only. Create a native modal with the official Bilibili iframe only after a click, autoplay off, an external Bilibili link, Escape/close/backdrop dismissal, focus and body-style restoration. No credentials required or added.

- [ ] Write and run failing model and server-rendered component tests.
- [ ] Implement the responsive video list, safe embed URLs and on-demand native player.
- [ ] Verify actual cover images, 1/2/7-card layouts, mobile bangumi preservation, modal lifecycle, image failures, keyboard/focus and no overflow at 320/390/430/1440 widths.
- [ ] Run scoped lint, tests and frontend build; commit locally and leave the preview server running. Do not push, PR or deploy before visual approval.
