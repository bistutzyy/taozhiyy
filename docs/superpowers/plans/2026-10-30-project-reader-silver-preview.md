# Project Reader And Silver Atlas Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the isolated Three.js theme work; implement the tightly coupled reader integration locally. The initial preview was local-only. User approved production deployment after review; follow the authorized release checklist below.

**Goal:** Preview a full-screen project reader, explicit home navigation, and a switchable Silver Atlas theme without replacing the approved starfield.

**Architecture:** Retain the native dialog, project data renderer, catalogue, and scene instance. Add scoped reader/theme CSS, a validated theme module, a segmented control in both headers, and `scene.setTheme(id)` that updates materials without rebuilding project nodes. Preserve state on close and theme changes.

**Tech Stack:** Existing Vite, vanilla JS, Three.js, Lucide, Node tests, Playwright/Sharp.

## Tasks
- [x] Add failing reader and navigation contracts to `tests/detail.test.js` and `tests/brand.test.js`. Render a compact project masthead, author facts, introductory sections, demo, and source sections from `src/detail.js`; retain escaping and HTTPS-only external links.
- [x] Implement theme definitions, validation tests, and in-place scene material changes in `src/gallery-themes.js`, `tests/gallery-themes.test.js`, and `src/scene.js`. API: `GALLERY_THEMES`, `GALLERY_THEME_STORAGE`, `resolveGalleryTheme(value)`, `getScenePalette(value)`, and scene `setTheme(value)`.
- [x] Modify `index.html` and `src/main.js`: explicit same-tab main-site link, gallery/reader theme controls, context-aware back action, pause/resume, focus/scroll restoration, active reader index, and safe preference persistence. Do not change the bottom summary layout or content catalogue.
- [x] Add `src/reader.css` and `src/gallery-themes.css`: unframed full-screen reader, compact image, sticky desktop index/mobile selector, dark/silver surfaces, responsive stable toolbar dimensions, reduced motion. Use the existing real images, Lucide icons, and no new dependencies.
- [x] Run `npm test` and `npm run build:site`; verify browser behavior, both canvas themes, all nine details, mobile clipping, media loading, source links, state preservation, and existing performance bounds. Review and fix actionable issues.
- [x] Save scoped local commits, update this checklist with evidence, and leave the preview URL available. Do not deploy.

## Commands
From `previews/project-gallery`: `npm test`, `npm run build:site`, and `node tools/verify.cjs http://127.0.0.1:5201` with bundled Playwright/Sharp in `NODE_PATH`. Extend the browser verifier for the approved reader/theme behavior and use a URL argument instead of a fixed port. Preview assets must remain nonblank at 1440x900, 768x1024, 390x844, 320x740, and 844x390.

## Verification Record
- 20 Node tests and the standalone production build passed. The existing Three.js chunk-size warning remains; no dependencies were added.
- Original browser verifier passed: actual textures, nonblank canvas pixels, picking and camera motion, idle rendering, all nine safe detail views, media/copy controls, catalogue, touch browsing, reduced motion, WebGL fallback, and the 500-project fixture with bounded resources.
- Reader verifier passed both themes at 1440x900, 768x1024, 390x844, 320x740, 844x390, and 667x375. Checks include full-viewport reader bounds, live theme/material switching without recreated nodes, loaded cover images, inactive background rendering, navigation, Escape/back focus, catalogue query/scroll restoration, clipboard, persistence and blocked storage.
- Review reproduced two short-landscape issues. Added failing assertions, then fixed the clipped sticky TOC with bounded internal scrolling and kept the summary/dock inside narrower landscape screens. Targeted re-review found no remaining issue in those fixes.
- Hidden local Vite server remains on port 5201. Preview with `?theme=silver` or `?theme=cosmos`; the query is consumed once. No push, PR, production configuration change, or deployment was performed.

## Authorized Release (2026-10-30)
- [x] User explicitly requested deployment of the reviewed preview. No additional visual or behavior changes are included in this release.
- [x] Re-run 20 project tests, six-size dual-theme browser checks, and the complete main build that includes project staging. Resolve the local Windows native-module lock by stopping only our port-5201 preview during `npm ci`; no application change was required.
- [ ] Push the scoped branch, create a PR into protected master, wait for successful validation, and merge without bypassing branch protection.
- [ ] Confirm the public release commit and run the reader/theme checks on production. Verify main-site links, details, catalogue position, both canvases and loaded images before reporting success.
