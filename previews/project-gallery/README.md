# Project gallery: local design preview

Approved scope: a small interactive 3D exhibition combining spatial exploration
with project panels and accessible HTML project details. Magic Portfolio remains
the fallback direction. The name is provisional. No production integration,
publication, API credentials, account changes, or paid trial APIs.

Deployment authorized on 2026-10-28: main's build now invokes
tools/build-project-gallery.mjs, runs the project tests and builds with /projects/
as its base, then stages the output in main/dist/projects. The existing server
pull deploy backs up and syncs main/dist without any new SSH ingress or secrets.
Homepage fragment 01 links to /projects/. Production omits the local-preview badge.

Implementation: standalone Vite + Three.js, using OrbitControls for exploration.
Current design: explorable project starfield with near-black space, real project
covers and rose/cyan markers. Replaces garden and exhibition previews (DESIGN.md).
Space is a continuously scrollable path without pagination controls. Wheel,
trackpad, mouse drag and one-finger touch move the view. It mounts at most seven
nearby nodes (four on mobile), retaining overlapping resources. The directory
still renders 12 cards per page.
Preview textures are generated at 480x300 by tools/build-thumbnails.cjs. Detached
project panels are reused within a total 12-project desktop / 8-project mobile
budget. Full-resolution covers remain available in the catalogue and details.
The browser verifier injects 500 synthetic records only into its isolated page
to check bounded rendering, page navigation and full-catalogue search. The actual
preview contains nine attributed projects and no ownership-based categories.
Tutorials are editorial summaries of official docs. Original authors and source,
docs, license and external trial links are included in each detail. RuiC has an
author demo video; skill repositories are not presented as hosted generators.
Project data is shared by scene, searchable catalogue, and native dialog details.
Screenshots represent the actual linked websites, not claimed new products.

Checklist:
- [x] Define catalogue and filtering tests, then implementation.
- [x] Capture local compressed covers with source attribution.
- [x] Build a full-viewport light exhibition and HTML controls/details.
- [x] Verify canvas pixels, camera motion, selection, filtering, dialog keyboard
      behavior, mobile framing, image loads, and reduced-motion fallback.
- [x] Run build and leave a loopback preview server available for review.

Run `npm ci`, `npm test`, and `npm run dev -- --port 5196 --strictPort` here.
This folder is deliberately outside `main/`, `build/`, and deployment scripts.

## Reader And Silver Atlas Preview (2026-10-30)

Initially previewed on `codex/project-reader-silver-preview`; the user authorized
production release on 2026-10-30 after review. The gallery now has an explicit same-tab home link. Project details
use a full-viewport native dialog, a compact real cover, a desktop reading index,
and a mobile section selector. Back restores the scene or catalogue position.

Cosmos remains the default. Silver Atlas is a second selectable theme shared by
the scene, directory, and reader. Its Three.js materials update in place without
reloading covers or recreating project nodes. A validated preference is saved
when browser storage is available. The reader pauses WebGL rendering.

Current preview: `http://127.0.0.1:5201/?theme=silver`. The optional theme query
is consumed once, so subsequent manual choices are not pinned by the URL.
Run `node tools/verify.cjs http://127.0.0.1:5201` for the original WebGL/catalogue
regressions, and `node tools/verify-reader.cjs http://127.0.0.1:5201` for both
themes, full-screen reader, state restoration, media, and responsive bounds.

Captures: `tools/capture-covers.cjs` uses Playwright and Sharp from the bundled
Codex runtime through NODE_PATH. `tools/verify.cjs` uses the same runtime.
Public external screenshots are credited within each project's source link;
reference projects remain attributed to their respective authors. They are
illustrative entries in a local preview, not redistributed source code.
