# Project Additions And Hero Text Colors

**Goal:** Add the four requested source projects to their specified collections and improve homepage text colors over each wallpaper without changing typography or layout.

**Design:** OpenCheck joins the existing About project showcase in the spring theme. LocalSend, nature-skills and Anti-Defensive Writing join the existing Project Cosmos catalog with source, author, license, useful tutorials and honest external-use links. Reuse real author screenshots/branding where available; no new external software installation or skill activation. Homepage changes affect color, outline and shadow only, with palettes matched to the current cover rather than the previous offset palette.

## Tasks

- [x] Verify official source metadata, README, license and media for all four repositories.
- [x] Add OpenCheck to About using the existing card/detail pattern and focused tests.
- [x] Add three catalog entries, real media, attribution and appropriate use/tutorial sections; update count/search tests.
- [x] Inspect four real wallpapers at desktop/mobile sizes; add failing color/palette tests, implement scoped contrast fixes without changing fonts, dimensions, positions or animation.
- [x] Run scoped tests/lint, main/project production builds, browser screenshots and color/pixel checks, then request independent review.
- [ ] Commit, use the existing protected-master PR release flow, and verify the actual production release and requested entries.

## Verification

Use mocked API reads for UI tests and never write to production APIs. Capture all four actual cover images at 1440x900 and 390x844 before/after; verify cover switching updates text variables immediately, large and small text stay legible, and sizing/positioning remain unchanged. Confirm About OpenCheck source and details, all three new Cosmos projects searchable/readable with attribution, and real cover images decode. Do not claim the linked tools have been installed, executed, security-audited, or trialed locally.

**Verification on 2026-11-02:** Main production build and packaged gallery build passed, including 34 gallery tests. 41 focused main tests passed; scoped lint has zero errors and existing custom-class warnings. About browser tests passed at 320/390/768/1440; all three new readers, search, two-page directory, real images and nonblank canvas passed at 320/390/1440. Default scene motion, pause/resume and reduced-motion checks passed at 390/1440. Four real wallpaper palettes passed screenshot/pixel checks at 320/390/1440 with unchanged typography/geometry and restored navigation variables after leaving home. Title photo-sample median contrast ranged from 5.54 to 13.73; this is not a complete WCAG audit. Independent review found no P1/P2.

**Preview environment:** A gallery dev process had locked a Windows native build dependency before the interruption; after it stopped, the complete build passed without source changes to the build pipeline. The production-like preview additionally stages `shared/ai-assistant` into `main/dist/ai-assistant`, matching the existing server deploy copy, to avoid treating SPA HTML fallback as JavaScript. No backend, credentials, firewall or production environment changes.
