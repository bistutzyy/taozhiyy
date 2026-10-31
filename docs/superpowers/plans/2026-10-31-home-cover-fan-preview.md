# Folding Fan Cover Implementation Plan

**Goal:** Preview a shared-pivot folding fan with direct leaf selection and restrained ornamental transitions.

**Architecture:** Keep Hero/state helpers and native modal lifecycle. Replace CoverScreening with CoverFan and scoped CSS. CoverFan emits onPreview(index) for hover/focus and onSelect(index,element) for explicit selection; CoverPicker uses a captured index and GSAP Flip to expand a temporary selected-image layer to the viewport, then calls onApply(index,brightness). Existing commands stay available.

**Tech Stack:** React, existing GSAP/Flip, Lucide icons, SVG clip geometry, CSS and Playwright. No added packages.

- [x] Update source/SSR tests before implementation: require shared fan geometry, fine-pointer hover, keyboard focus, direct selection, selected-image Flip expansion, decorations and reduced motion. Keep state/modal tests.
- [x] Add `main/src/components/cover-picker/CoverFan.jsx` and `fan-screen.css`: four clipped curved leaves with one transform origin, smaller mobile angles, ready-only hover/focus and explicit onSelect. Retain native command controls and truthful retry states. Add small ribs, pivot/tassel and gold arc ornament.
- [x] Update CoverPicker to capture the selected index/element, prepare a real image overlay and animate from `Flip.fit(overlay,source,{getVars:true})` to fullscreen. Cancel clears its timeline; reduced motion bypasses it. Add finite peach petal burst. Preserve native lifecycle, drafts and clean-view controls.
- [x] Remove unused rejected screening component/CSS and run focused tests/lint/build.
- [x] Adapt browser tests: focus/hover previews without applying, explicit leaf click/tap directly applies, correct captured index, expansion and cancellation, all retained controls, failed/slow images, blocked storage and exact body styles.
- [x] Check screenshots/bounds at desktop, tablet, phones and short landscape, including 320x568 and 500x400; run independent review and fix actionable issues.
- [x] Save scoped local commits and leave port5202 preview running. No push, PR, merge or deployment.

## Handoff Detail
The completed fan animation calls Hero's apply callback with `{skipTransition:true}`. Hero's default transition behavior is preserved for other callers, but an already-expanded cover does not replay the old-image fade. This fixes a browser-reproduced opacity0.54 flashback after the modal closed; the regression now requires opacity1 and no old-image layer immediately after direct leaf application.

## Verification (2026-10-31)
- 50 focused Node tests passed, along with targeted ESLint and the main Vite build. Existing shared AI-assistant asset and bundle-size warnings remain; no deployment pipeline ran.
- Browser cases passed at 1440x900, 1024x768, 768x1024, 390x844, 320x568, 844x390, 667x375 and 500x400 with real images and screenshots inspected.
- Checked fine-pointer hover/focus previews, direct leaf click/tap and Enter apply, six finite transition petals, visible expansion, stale-hover index capture, cancelling during expansion, immediate opaque handoff, brightness/reset/persistence, clean view, blocked storage, reduced motion, delayed/failed images and retries, exact body/overflow-axis restoration.
- Bounded independent review found no P1/P2 issues; the subsequent handoff metadata change was also reviewed.
- Local URL: http://127.0.0.1:5202/?cover=select&v=folding-fan. No push, PR, merge or deployment.
