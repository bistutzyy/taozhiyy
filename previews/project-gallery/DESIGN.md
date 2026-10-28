# Project cosmos preview

Approved revised direction (2026-10-28): near-black, spatially explorable stars,
silver-white starlight and restrained rose/cyan accents. Remove all exhibition
architecture. Keep catalogue, project details, real covers, and camera controls.
Local preview only; no production route, deployment, or remote Git changes.

Implementation sequence:
1. Test catalogue pagination with 500 synthetic records before implementation.
2. Replace architecture with three fixed-size background star fields, perspective
   camera exploration and six billboarding project nodes per active field.
3. Paginate directory by 12 and space by 6; keep search over the full catalogue.
   Load only current space textures; dispose outgoing geometry, label textures,
   and materials, and dispose asynchronous texture results from stale fields.
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
