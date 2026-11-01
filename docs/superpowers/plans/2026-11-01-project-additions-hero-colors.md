# Project Additions And Hero Text Colors

**Goal:** Add the four requested source projects to their specified collections and improve homepage text colors over each wallpaper without changing typography or layout.

**Design:** OpenCheck joins the existing About project showcase in the spring theme. LocalSend, nature-skills and Anti-Defensive Writing join the existing Project Cosmos catalog with source, author, license, useful tutorials and honest external-use links. Reuse real author screenshots/branding where available; no new external software installation or skill activation. Homepage changes affect color, outline and shadow only, with palettes matched to the current cover rather than the previous offset palette.

## Tasks

- [ ] Verify official source metadata, README, license and media for all four repositories.
- [ ] Add OpenCheck to About using the existing card/detail pattern and focused tests.
- [ ] Add three catalog entries, real media, attribution and appropriate use/tutorial sections; update count/search tests.
- [ ] Inspect four real wallpapers at desktop/mobile sizes; add failing color/palette tests, implement scoped contrast fixes without changing fonts, dimensions, positions or animation.
- [ ] Run scoped tests/lint, main/project production builds, browser screenshots and color/pixel checks, then request independent review.
- [ ] Commit, use the existing protected-master PR release flow, and verify the actual production release and requested entries.

## Verification

Use mocked API reads for UI tests and never write to production APIs. Capture all four actual cover images at 1440x900 and 390x844 before/after; verify cover switching updates text variables immediately, large and small text stay legible, and sizing/positioning remain unchanged. Confirm About OpenCheck source and details, all three new Cosmos projects searchable/readable with attribution, and real cover images decode. Do not claim the linked tools have been installed, executed, security-audited, or trialed locally.
