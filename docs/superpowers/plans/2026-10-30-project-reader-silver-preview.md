# Project Reader And Silver Atlas Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the isolated Three.js theme work; implement the tightly coupled reader integration locally. User approved the design in chat. Keep all work local.

**Goal:** Preview a full-screen project reader, explicit home navigation, and a switchable Silver Atlas theme without replacing the approved starfield.

**Architecture:** Retain the native dialog, project data renderer, catalogue, and scene instance. Add scoped reader/theme CSS, a validated theme module, a segmented control in both headers, and `scene.setTheme(id)` that updates materials without rebuilding project nodes. Preserve state on close and theme changes.

**Tech Stack:** Existing Vite, vanilla JS, Three.js, Lucide, Node tests, Playwright/Sharp.

## Tasks
- [ ] Add failing reader and navigation contracts to `tests/detail.test.js` and `tests/brand.test.js`. Render a compact project masthead, author facts, introductory sections, demo, and source sections from `src/detail.js`; retain escaping and HTTPS-only external links.
- [ ] Implement theme definitions, validation tests, and in-place scene material changes in `src/gallery-themes.js`, `tests/gallery-themes.test.js`, and `src/scene.js`. API: `GALLERY_THEMES`, `GALLERY_THEME_STORAGE`, `resolveGalleryTheme(value)`, `getScenePalette(value)`, and scene `setTheme(value)`.
- [ ] Modify `index.html` and `src/main.js`: explicit same-tab main-site link, gallery/reader theme controls, context-aware back action, pause/resume, focus/scroll restoration, active reader index, and safe preference persistence. Do not change the bottom summary layout or content catalogue.
- [ ] Add `src/reader.css` and `src/gallery-themes.css`: unframed full-screen reader, compact image, sticky desktop index/mobile selector, dark/silver surfaces, responsive stable toolbar dimensions, reduced motion. Use the existing real images, Lucide icons, and no new dependencies.
- [ ] Run `npm test` and `npm run build:site`; verify browser behavior, both canvas themes, all nine details, mobile clipping, media loading, source links, state preservation, and existing performance bounds. Review and fix actionable issues.
- [ ] Save scoped local commits, update this checklist with evidence, and leave the preview URL available. Do not deploy.

## Commands
From `previews/project-gallery`: `npm test`, `npm run build:site`, and `node tools/verify.cjs http://127.0.0.1:5201` with bundled Playwright/Sharp in `NODE_PATH`. Extend the browser verifier for the approved reader/theme behavior and use a URL argument instead of a fixed port. Preview assets must remain nonblank at 1440x900, 768x1024, 390x844, 320x740, and 844x390.
