# Project cosmos preview

Approved revised direction (2026-10-28): near-black, spatially explorable stars,
silver-white starlight and restrained rose/cyan accents. Remove all exhibition
architecture. Keep catalogue, project details, real covers, and camera controls.
Local preview only; no production route, deployment, or remote Git changes.

Implementation sequence:
1. Test catalogue pagination with 500 synthetic records before implementation.
2. Replace architecture with three fixed-size background star fields, perspective
   camera exploration and a continuously sliding project path.
3. Paginate directory by 12; the space has no pagination arrows. Wheel, trackpad,
   mouse drag, one-finger touch and canvas keyboard navigation move continuously.
   Mount six nearby projects plus one incoming node (mobile: three plus one).
   Retain overlapping nodes and textures; dispose only outgoing resources and
   stale asynchronous texture results. Clamp navigation at both catalogue ends.
4. Run npm test, npm run build, and tools/verify.cjs. Inspect desktop/mobile
   screenshots, project textures, focus transitions, and canvas pixels.
5. Save a local Git checkpoint and open the loopback preview for design review.

Background stars are independent of catalogue size. Mobile uses fewer stars.
Render on demand; optional orbit is disabled with reduced motion. Keep WebGL
fallback to HTML catalogue. No live APIs, credentials, or new dependencies.
The 500-record browser fixture is test-only; the preview now contains the personal
website plus eight user-selected repositories. Projects are not split by owner.
Each detail includes a practical tutorial, original author/source/license links,
and a clearly labeled author video or external demo/reference link. No iframe
loads silently and no model runs or API keys are collected by this static site.
Repository/documentation checks are not a complete source-code security audit.

Brightness/performance revision: brighter white cores, restrained blue/gold
highlights and a more visible Milky Way band. No full-screen bloom pass or
continuously running idle animation. Use 480x300 preview textures, a bounded
detached-panel cache (12 desktop / 8 mobile including active nodes), and only
reconcile the window when it changes. Damping uses elapsed milliseconds rather
than a fixed factor per frame; pointer drag follows more closely than wheel.
